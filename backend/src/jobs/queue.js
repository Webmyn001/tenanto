/**
 * Job runtime — abstracts over node-cron (in-process) and BullMQ (Redis-backed).
 *
 * Why bother: node-cron is fine until you scale past one instance, at which
 * point every replica runs every cron and you get duplicate work. BullMQ
 * solves that by giving you a distributed lock + retries + observability via
 * Bull Board. Switching is one env var (`REDIS_URL`).
 *
 * Drivers:
 *   - 'cron'    (default): node-cron, in-process
 *   - 'bullmq'  (auto when REDIS_URL is set): Redis-backed, multi-instance safe
 *
 * Job interface stays identical: { name, schedule, run }. The driver just
 * decides where the schedule lives and which worker picks up the work.
 */
const cron = require('node-cron');
const { logger } = require('../utils/logger');

let bullmq = null;
let IORedis = null;

function pickDriver() {
  if (process.env.JOBS_DRIVER) return process.env.JOBS_DRIVER;
  if (process.env.REDIS_URL) return 'bullmq';
  return 'cron';
}

function isAvailable(driver) {
  if (driver === 'bullmq') {
    try {
      bullmq = bullmq || require('bullmq');
      IORedis = IORedis || require('ioredis');
      return true;
    } catch (e) {
      logger.warn({ err: e.message }, '[queue] bullmq/ioredis not installed — falling back to cron');
      return false;
    }
  }
  return true; // 'cron' is always available
}

// ─── Cron driver ──────────────────────────────────────────────────────────
function makeCronDriver(jobs) {
  const tasks = [];
  return {
    name: 'cron',
    start() {
      for (const job of jobs) {
        if (!cron.validate(job.schedule)) {
          logger.error({ name: job.name, schedule: job.schedule }, '[queue.cron] invalid cron expression');
          continue;
        }
        const task = cron.schedule(job.schedule, async () => {
          const t = Date.now();
          try {
            const result = await job.run();
            logger.info({ name: job.name, ms: Date.now() - t, result }, '[queue.cron] ran');
          } catch (e) {
            logger.error({ name: job.name, err: e.message, stack: e.stack }, '[queue.cron] failed');
          }
        });
        tasks.push({ name: job.name, task });
        logger.info({ name: job.name, schedule: job.schedule }, '[queue.cron] scheduled');
      }
    },
    stop() { for (const { task } of tasks) task.stop(); tasks.length = 0; },
    async runOnce(name) {
      const job = jobs.find((j) => j.name === name);
      if (!job) throw new Error(`Unknown job: ${name}`);
      return job.run();
    },
  };
}

// ─── BullMQ driver ────────────────────────────────────────────────────────
function makeBullDriver(jobs) {
  const { Queue, Worker, QueueEvents } = bullmq;
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue('naija-jobs', { connection });
  let worker;
  let events;

  return {
    name: 'bullmq',
    async start() {
      // Register repeatable jobs. BullMQ dedups by name+pattern, so safe to call on every boot.
      for (const job of jobs) {
        await queue.upsertJobScheduler(
          job.name,
          { pattern: job.schedule },
          { name: job.name, opts: { removeOnComplete: 100, removeOnFail: 1000 } }
        );
        logger.info({ name: job.name, schedule: job.schedule }, '[queue.bullmq] scheduled');
      }
      // Single worker that dispatches by job name
      worker = new Worker('naija-jobs', async (j) => {
        const def = jobs.find((d) => d.name === j.name);
        if (!def) throw new Error(`Unknown job: ${j.name}`);
        const t = Date.now();
        const result = await def.run();
        logger.info({ name: j.name, ms: Date.now() - t, result }, '[queue.bullmq] ran');
        return result;
      }, { connection, concurrency: Number(process.env.JOBS_CONCURRENCY || 2) });

      events = new QueueEvents('naija-jobs', { connection });
      events.on('failed', ({ jobId, failedReason }) => logger.error({ jobId, failedReason }, '[queue.bullmq] failed'));
    },
    async stop() {
      if (worker) await worker.close();
      if (events) await events.close();
      await queue.close();
      connection.disconnect();
    },
    async runOnce(name) {
      const def = jobs.find((j) => j.name === name);
      if (!def) throw new Error(`Unknown job: ${name}`);
      // Fast path: just run inline. (Could also enqueue with priority.)
      return def.run();
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────
function build(jobs) {
  let driverName = pickDriver();
  if (driverName === 'bullmq' && !isAvailable('bullmq')) driverName = 'cron';
  logger.info({ driver: driverName, jobs: jobs.length }, '[queue] starting');
  return driverName === 'bullmq' ? makeBullDriver(jobs) : makeCronDriver(jobs);
}

module.exports = { build };

/**
 * Job registry. Picks the runtime driver (cron / BullMQ) via utils-aware
 * abstraction in ./queue.js. Same external API as before — server.js calls
 * jobs.start() / jobs.stop() / jobs.runOnce(name).
 */
const { logger } = require('../utils/logger');
const queue = require('./queue');

const trustScoreJob = require('./trustScoreJob');
const escrowAutoReleaseJob = require('./escrowAutoReleaseJob');
const featuredExpiryJob = require('./featuredExpiryJob');
const auditCleanupJob = require('./auditCleanupJob');

const JOBS = [trustScoreJob, escrowAutoReleaseJob, featuredExpiryJob, auditCleanupJob];

let driver = null;

async function start() {
  if (process.env.JOBS_ENABLED === 'false') {
    logger.info({ jobs: 'disabled' }, '[jobs] disabled via JOBS_ENABLED=false');
    return;
  }
  driver = queue.build(JOBS);
  await driver.start();
}

async function stop() {
  if (driver) await driver.stop();
  driver = null;
}

async function runOnce(name) {
  if (!driver) {
    // Server may have started with JOBS_ENABLED=false; still let admins trigger ad-hoc
    const job = JOBS.find((j) => j.name === name);
    if (!job) throw new Error(`Unknown job: ${name}`);
    return job.run();
  }
  return driver.runOnce(name);
}

module.exports = { start, stop, runOnce, JOBS };

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error');
const { attachChatSocket } = require('./socket/chatSocket');
const paymentController = require('./controllers/paymentController');
const cloudinaryWebhookController = require('./controllers/cloudinaryWebhookController');
const { logger, captureException } = require('./utils/logger');
const jobs = require('./jobs');
const { mountSwagger } = require('./openapi');

const app = express();

app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://tenanto.onrender.com',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Paystack webhook with raw body — must be BEFORE express.json()
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body.toString('utf8');
    try { req.body = JSON.parse(req.rawBody); } catch { req.body = {}; }
    next();
  },
  paymentController.webhook
);

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

// Cloudinary moderation webhook — JSON-bodied, signature in headers
app.post('/webhooks/cloudinary', cloudinaryWebhookController.cloudinaryWebhook);

// Swagger UI at /api/docs
mountSwagger(app);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

// Catch unhandled rejections / exceptions and forward to logger+Sentry
process.on('unhandledRejection', (e) => { logger.error({ err: e?.message, stack: e?.stack }, 'unhandledRejection'); captureException(e); });
process.on('uncaughtException', (e) => { logger.error({ err: e.message, stack: e.stack }, 'uncaughtException'); captureException(e); });

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });
attachChatSocket(io);

connectDB()
  .then(async () => {
    server.listen(PORT, () => logger.info({ port: PORT }, '[api] listening'));
    await jobs.start();
  })
  .catch((e) => {
    logger.error({ err: e.message }, '[api] DB connection failed');
    process.exit(1);
  });

function shutdown(signal) {
  logger.info({ signal }, '[api] shutting down');
  Promise.resolve(jobs.stop()).finally(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

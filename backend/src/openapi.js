/**
 * OpenAPI 3.1 specification for the Tenanto API.
 *
 * Served at:
 *   GET /api/openapi.json   — raw JSON
 *   GET /api/docs           — Swagger UI (browser-friendly)
 */
const swaggerUi = require('swagger-ui-express');

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Tenanto API',
    version: '0.2.0',
    description:
      'Agent-free verified housing marketplace API. Auth: Bearer JWT issued by /auth/login. ' +
      'See docs/API.md for narrative documentation.',
  },
  servers: [
    { url: 'http://localhost:5000/api', description: 'Local dev' },
    { url: 'https://api.tenanto.ng/api', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['student', 'corper', 'landlord', 'admin'] },
          verificationStatus: { type: 'string', enum: ['pending', 'submitted', 'approved', 'rejected'] },
          trustScore: { type: 'integer', minimum: 0, maximum: 100 },
          badges: { type: 'array', items: { type: 'string' } },
        },
      },
      Property: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          area: { type: 'string' },
          fullAddress: { type: 'string', description: 'Only present when address gate is open' },
          annualRent: { type: 'integer' },
          propertyType: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'pending_review', 'active', 'rented', 'rejected', 'archived'] },
          aiScores: {
            type: 'object',
            properties: {
              authenticity: { type: 'integer' },
              priceFairness: { type: 'integer' },
              mediaQuality: { type: 'integer' },
            },
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          totalDue: { type: 'integer' },
          paymentMode: { type: 'string', enum: ['full', 'installment', 'group'] },
          escrowStatus: { type: 'string', enum: ['awaiting_funding', 'partially_funded', 'fully_funded', 'released', 'refunded', 'disputed'] },
        },
      },
      Inspection: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          status: { type: 'string', enum: ['booked', 'completed', 'no_show_tenant', 'no_show_landlord', 'cancelled', 'expired'] },
          scheduledFor: { type: 'string', format: 'date-time' },
          inspectionFee: { type: 'integer' },
          qrToken: { type: 'string' },
          paymentUnlocked: { type: 'boolean' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth' }, { name: 'Verification' }, { name: 'Properties' },
    { name: 'Inspections' }, { name: 'Chat' }, { name: 'Payments' },
    { name: 'Agreements' }, { name: 'Roommates' }, { name: 'Reviews' },
    { name: 'Wallet' }, { name: 'Subscriptions' },
    { name: 'Admin' }, { name: 'Lookups' }, { name: 'Uploads' },
  ],
  paths: {
    '/auth/register': { post: { tags: ['Auth'], security: [], summary: 'Register a new user',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fullName', 'email', 'password', 'role'],
        properties: { fullName: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['student', 'corper', 'landlord'] } } } } } },
      responses: { 201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } } } } },
    '/auth/login': { post: { tags: ['Auth'], security: [], summary: 'Sign in',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
      responses: { 200: { description: 'OK' }, 401: { description: 'Invalid credentials' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', responses: { 200: { description: 'OK' } } } },

    '/verify/documents': { post: { tags: ['Verification'], summary: 'Submit verification documents', responses: { 200: { description: 'OK' } } } },
    '/verify/nin': { post: { tags: ['Verification'], summary: 'Verify NIN against provider', responses: { 200: { description: 'OK' } } } },
    '/verify/school-email/start': { post: { tags: ['Verification'], summary: 'Send code to school email', responses: { 200: { description: 'OK' } } } },
    '/verify/school-email/confirm': { post: { tags: ['Verification'], summary: 'Confirm school email code', responses: { 200: { description: 'OK' } } } },
    '/verify/bank-account': { post: { tags: ['Verification'], summary: 'Submit landlord bank account, creates Paystack recipient', responses: { 200: { description: 'OK' } } } },
    '/verify/banks': { get: { tags: ['Verification'], summary: 'List Nigerian banks', responses: { 200: { description: 'OK' } } } },

    '/properties': {
      get: { tags: ['Properties'], security: [], summary: 'Browse listings',
        parameters: [
          { name: 'school', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer' } },
          { name: 'propertyType', in: 'query', schema: { type: 'string' } },
          { name: 'maxDistance', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'OK' } } },
      post: { tags: ['Properties'], summary: 'Create listing (landlord)', responses: { 201: { description: 'Created' } } },
    },
    '/properties/{id}': {
      get: { tags: ['Properties'], summary: 'Get listing detail (with address gate)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      patch: { tags: ['Properties'], summary: 'Update listing', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/properties/{id}/publish': { post: { tags: ['Properties'], summary: 'Submit listing for review (also runs scoring + distance estimate)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/properties/{id}/feature': { post: { tags: ['Properties'], summary: 'Initiate featured-listing payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/properties/{id}/scoring': { get: { tags: ['Properties'], summary: 'Re-run and view scoring detail (admin or owner)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },

    '/inspections': { post: { tags: ['Inspections'], summary: 'Book inspection', responses: { 201: { description: 'Created' } } } },
    '/inspections/confirm-fee': { post: { tags: ['Inspections'], summary: 'Confirm fee payment, returns QR', responses: { 200: { description: 'OK' } } } },
    '/inspections/scan/{qrToken}': { get: { tags: ['Inspections'], summary: 'Landlord scans QR at meeting', parameters: [{ name: 'qrToken', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/inspections/{id}/rate': { post: { tags: ['Inspections'], summary: 'Tenant rates and unlocks payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },

    '/chat/conversations': {
      get: { tags: ['Chat'], summary: 'List my conversations', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Chat'], summary: 'Open conversation about a property', responses: { 200: { description: 'OK' } } },
    },
    '/chat/conversations/{id}/messages': {
      get: { tags: ['Chat'], summary: 'List messages', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      post: { tags: ['Chat'], summary: 'Send message (filtered for bypass attempts)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 201: { description: 'Created' } } },
    },

    '/payments/mine': { get: { tags: ['Payments'], summary: 'List my payments with agreement state', responses: { 200: { description: 'OK' } } } },
    '/payments/initiate': { post: { tags: ['Payments'], summary: 'Initiate full / installment / group payment', responses: { 201: { description: 'Created' } } } },
    '/payments/confirm': { post: { tags: ['Payments'], summary: 'Confirm reference (mock-mode helper)', responses: { 200: { description: 'OK' } } } },
    '/payments/{id}/move-in': { post: { tags: ['Payments'], summary: 'Tenant confirms move-in (releases escrow)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/payments/{id}/dispute': { post: { tags: ['Payments'], summary: 'Open a dispute on a funded payment', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/payments/webhook': { post: { tags: ['Payments'], security: [], summary: 'Paystack webhook (signature-verified, idempotent)', responses: { 200: { description: 'OK' } } } },

    '/agreements/by-payment/{paymentId}': { get: { tags: ['Agreements'], summary: 'Find agreement for a payment', parameters: [{ name: 'paymentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/agreements/{id}/sign': { post: { tags: ['Agreements'], summary: 'Sign as tenant or landlord', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/agreements/{id}/pdf': { get: { tags: ['Agreements'], summary: 'Download agreement as PDF', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'PDF binary', content: { 'application/pdf': {} } } } } },

    '/roommates/profile': {
      get: { tags: ['Roommates'], summary: 'Get my profile', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Roommates'], summary: 'Upsert my profile', responses: { 200: { description: 'OK' } } },
    },
    '/roommates/matches': { get: { tags: ['Roommates'], summary: 'Top matches with score + reasons', responses: { 200: { description: 'OK' } } } },
    '/roommates/invite': { post: { tags: ['Roommates'], summary: 'Send roommate invite via in-app chat', responses: { 200: { description: 'OK' } } } },

    '/reviews/tenancy': { post: { tags: ['Reviews'], summary: 'Landlord rates tenant after escrow release', responses: { 200: { description: 'OK' } } } },
    '/reviews/user/{userId}': { get: { tags: ['Reviews'], security: [], summary: 'Reviews for a user', parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },

    '/lookup/email': { get: { tags: ['Lookups'], summary: 'Find user by email', responses: { 200: { description: 'OK' } } } },
    '/lookup/schools': { get: { tags: ['Lookups'], security: [], summary: 'List Nigerian institutions', responses: { 200: { description: 'OK' } } } },

    '/upload': { post: { tags: ['Uploads'], summary: 'Single-file upload to Cloudinary', responses: { 200: { description: 'OK' } } } },
    '/upload/many': { post: { tags: ['Uploads'], summary: 'Multi-file upload', responses: { 200: { description: 'OK' } } } },

    '/admin/verifications': { get: { tags: ['Admin'], summary: 'Pending verifications queue', responses: { 200: { description: 'OK' } } } },
    '/admin/listings': { get: { tags: ['Admin'], summary: 'Pending listing review', responses: { 200: { description: 'OK' } } } },
    '/admin/disputes': { get: { tags: ['Admin'], summary: 'Open disputes', responses: { 200: { description: 'OK' } } } },
    '/admin/fraud': { get: { tags: ['Admin'], summary: 'Bypass-attempt feed', responses: { 200: { description: 'OK' } } } },
    '/admin/audit': { get: { tags: ['Admin'], summary: 'Audit log feed', responses: { 200: { description: 'OK' } } } },
    '/admin/jobs/{name}': { post: { tags: ['Admin'], summary: 'Manually trigger a cron job (trustScoreRecompute, escrowAutoRelease, featuredExpiry, auditCleanup)', parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } } },
    '/admin/analytics': { get: { tags: ['Admin'], summary: 'Platform stats', responses: { 200: { description: 'OK' } } } },

    '/wallet': { get: { tags: ['Wallet'], summary: 'My wallet balance + recent transactions', responses: { 200: { description: 'OK' } } } },

    '/subscriptions/plans':       { get: { tags: ['Subscriptions'], summary: 'Available subscription tiers', security: [], responses: { 200: { description: 'OK' } } } },
    '/subscriptions/me':          { get: { tags: ['Subscriptions'], summary: 'My subscription state', responses: { 200: { description: 'OK' } } } },
    '/subscriptions/subscribe':   { post: { tags: ['Subscriptions'], summary: 'Subscribe to a paid tier (pro | enterprise)', responses: { 200: { description: 'OK' }, 400: { description: 'Pick a paid tier' } } } },
    '/subscriptions/cancel':      { post: { tags: ['Subscriptions'], summary: 'Cancel current subscription', responses: { 200: { description: 'OK' } } } },

    '/verify/landlord-rules':     { post: { tags: ['Verification'], summary: 'Landlord accepts the platform rules (required before listing)', responses: { 200: { description: 'OK' }, 403: { description: 'Landlords only' } } } },
  },
};

function mountSwagger(app) {
  app.get('/api/openapi.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'Tenanto API',
    swaggerOptions: { persistAuthorization: true },
  }));
}

module.exports = { spec, mountSwagger };

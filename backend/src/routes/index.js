const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const verif = require('../controllers/verificationController');
const props = require('../controllers/propertyController');
const insp = require('../controllers/inspectionController');
const chat = require('../controllers/chatController');
const pay = require('../controllers/paymentController');
const admin = require('../controllers/adminController');
const uploads = require('../controllers/uploadController');
const agreements = require('../controllers/agreementController');
const roommates = require('../controllers/roommateController');
const reviews = require('../controllers/reviewController');
const lookup = require('../controllers/lookupController');
const wallet = require('../controllers/walletController');
const subscriptions = require('../controllers/subscriptionController');

const { requireAuth } = require('../middleware/auth');
const { requireRole, requireApproved } = require('../middleware/role');
const upload = require('../middleware/upload');
const rl = require('../middleware/rateLimit');

// --- Auth ---
router.post('/auth/register', rl.authLimiter, auth.register);
router.post('/auth/login', rl.authLimiter, auth.login);
router.post('/auth/forgot-password', rl.authLimiter, auth.forgotPassword);
router.post('/auth/reset-password', rl.authLimiter, auth.resetPassword);
router.post('/auth/verify-email', rl.authLimiter, auth.verifyEmail);
router.post('/auth/resend-verification', rl.authLimiter, auth.resendVerification);
router.get('/auth/me', requireAuth, auth.me);

// --- Uploads (returns Cloudinary URL/publicId; client passes those to other endpoints) ---
router.post('/upload', requireAuth, rl.uploadLimiter, upload.single('file'), uploads.uploadOne);
router.post('/upload/many', requireAuth, rl.uploadLimiter, upload.array('files', 20), uploads.uploadMany);

// --- Verification ---
router.post('/verify/documents', requireAuth, verif.submitDocuments);
router.post('/verify/nin', requireAuth, verif.verifyNIN);
router.post('/verify/school-email/start', requireAuth, verif.startSchoolEmailVerification);
router.post('/verify/school-email/confirm', requireAuth, verif.confirmSchoolEmail);
router.post('/verify/bank-account', requireAuth, requireRole('landlord'), verif.submitBankAccount);
router.get('/verify/banks', requireAuth, verif.getBanks);
router.post('/verify/liveness', requireAuth, verif.verifyLiveness);
router.post('/verify/landlord-rules', requireAuth, requireRole('landlord'), verif.acceptLandlordRules);

// --- Wallet (cashback / in-app discount) ---
router.get('/wallet', requireAuth, wallet.getMyWallet);

// --- Subscriptions (premium revenue stream) ---
router.get('/subscriptions/plans', subscriptions.listPlans);
router.get('/subscriptions/me', requireAuth, subscriptions.mySubscription);
router.post('/subscriptions/subscribe', requireAuth, subscriptions.subscribe);
router.post('/subscriptions/cancel', requireAuth, subscriptions.cancel);

// --- Properties ---
router.get('/properties', props.listProperties);
router.get('/properties/recommended', requireAuth, props.recommendations);
router.get('/properties/mine', requireAuth, requireRole('landlord'), props.myListings);
router.get('/properties/:id', require('../middleware/auth').optionalAuth, props.getProperty);
router.post('/properties', requireAuth, requireRole('landlord'), requireApproved, props.createListing);
router.patch('/properties/:id', requireAuth, requireRole('landlord'), props.updateListing);
router.post('/properties/:id/publish', requireAuth, requireRole('landlord'), props.publishListing);
router.post('/properties/:id/feature', requireAuth, requireRole('landlord'), props.featureListing);
router.post('/properties/:id/feature/confirm', requireAuth, requireRole('landlord'), props.confirmFeature);
router.get('/properties/:id/scoring', requireAuth, props.getScoringDetail);

// --- Roommate matching ---
router.get('/roommates/profile', requireAuth, requireRole('student', 'corper'), roommates.getMyProfile);
router.post('/roommates/profile', requireAuth, requireRole('student', 'corper'), requireApproved, roommates.upsertProfile);
router.get('/roommates/matches', requireAuth, requireRole('student', 'corper'), roommates.getMatches);
router.post('/roommates/invite', requireAuth, requireRole('student', 'corper'), requireApproved, roommates.inviteRoommate);

// --- Reviews ---
router.post('/reviews/tenancy', requireAuth, requireRole('landlord'), reviews.rateTenant);
router.get('/reviews/user/:userId', reviews.listForUser);

// --- Lookups ---
router.get('/lookup/email', requireAuth, rl.lookupLimiter, lookup.lookupByEmail);
router.get('/lookup/schools', lookup.listSchools);

// --- Inspections ---
router.post('/inspections', requireAuth, requireApproved, rl.inspectionLimiter, insp.bookInspection);
router.post('/inspections/confirm-fee', requireAuth, insp.confirmFee);
router.get('/inspections/scan/:qrToken', requireAuth, requireRole('landlord'), insp.scanQR);
router.post('/inspections/:id/rate', requireAuth, insp.rateAndUnlock);
router.get('/inspections/mine', requireAuth, insp.myInspections);

// --- Chat ---
router.post('/chat/conversations', requireAuth, rl.chatLimiter, chat.startConversation);
router.get('/chat/conversations', requireAuth, chat.listConversations);
router.get('/chat/conversations/:id/messages', requireAuth, chat.listMessages);
router.post('/chat/conversations/:id/messages', requireAuth, rl.chatLimiter, chat.sendMessage);
router.post('/chat/report-bypass', requireAuth, chat.reportBypass);

// --- Payments ---
router.get('/payments/mine', requireAuth, pay.myPayments);
router.post('/payments/initiate', requireAuth, requireApproved, rl.paymentLimiter, pay.initiate);
router.post('/payments/pay-slice', requireAuth, rl.paymentLimiter, pay.payInstallmentOrShare);
router.post('/payments/confirm', requireAuth, pay.confirm);
router.post('/payments/:id/move-in', requireAuth, pay.confirmMoveIn);
router.post('/payments/:id/dispute', requireAuth, pay.openDispute);
// Webhook is mounted at app level with raw-body parser — see server.js

// --- Agreements ---
router.get('/agreements/by-payment/:paymentId', requireAuth, agreements.getByPayment);
router.get('/agreements/:id', requireAuth, agreements.getOne);
router.post('/agreements/:id/sign', requireAuth, agreements.sign);
router.get('/agreements/:id/pdf', requireAuth, agreements.downloadPdf);

// --- Admin ---
router.get('/admin/verifications', requireAuth, requireRole('admin'), admin.pendingVerifications);
router.post('/admin/verifications/:userId', requireAuth, requireRole('admin'), admin.decideVerification);
router.get('/admin/listings', requireAuth, requireRole('admin'), admin.pendingListings);
router.post('/admin/listings/:id', requireAuth, requireRole('admin'), admin.decideListing);
router.get('/admin/disputes', requireAuth, requireRole('admin'), admin.disputes);
router.post('/admin/disputes/:id', requireAuth, requireRole('admin'), admin.resolveDispute);
router.get('/admin/fraud', requireAuth, requireRole('admin'), admin.fraudFeed);
router.post('/admin/users/:userId/suspend', requireAuth, requireRole('admin'), admin.suspendUser);
router.get('/admin/analytics', requireAuth, requireRole('admin'), admin.analytics);
router.get('/admin/audit', requireAuth, requireRole('admin'), admin.auditFeed);
router.get('/admin/audit/user/:userId', requireAuth, requireRole('admin'), admin.auditForActor);
router.get('/admin/audit/target/:kind/:id', requireAuth, requireRole('admin'), admin.auditForTarget);
router.post('/admin/jobs/:name', requireAuth, requireRole('admin'), admin.runJob);

module.exports = router;

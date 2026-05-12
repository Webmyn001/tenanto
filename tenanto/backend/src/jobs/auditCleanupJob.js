const AuditLog = require('../models/AuditLog');

const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS || 365);

module.exports = {
  name: 'auditCleanup',
  schedule: '30 4 * * *', // 04:30 daily
  async run() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600_000);
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    return { deleted: result.deletedCount || 0 };
  },
};

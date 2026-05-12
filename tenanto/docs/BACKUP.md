# Backup & disaster recovery runbook

Two scenarios. Pick one:

## A) MongoDB Atlas (managed)

This is the path I recommend for v1 — Atlas does the work for you.

1. **Atlas console → Cluster → Backup → Configure**.
2. Enable **Cloud Backups** (M10+) or **Continuous Backups** (M40+).
3. Set retention: 7 days daily snapshots is the sensible floor; 30 days for production.
4. Enable **Point-in-Time Restore** if you're on M40+.
5. Download a snapshot manually once a quarter to verify the restore process works (see "Quarterly DR drill" below).

You don't need the scripts in this repo for Atlas. They're for self-hosted Mongo.

## B) Self-hosted Mongo (replica set or standalone)

The scripts at `backend/scripts/backup.sh` and `restore.sh` handle this.

### Setup (do once on your backup host)

1. Install mongodb-database-tools (`mongodump`, `mongorestore`) and AWS CLI.
2. Create a dedicated read-only Mongo user for backups:
   ```
   db.createUser({ user: "backup", pwd: "<random>", roles: [{ role: "backup", db: "admin" }] })
   ```
3. Create an S3 bucket with versioning + server-side encryption + lifecycle (transition to Glacier after 30 days, expire after 365).
4. Create an IAM user with `s3:PutObject` and `s3:GetObject` on that bucket only.
5. Drop a config file at `/etc/tenanto.env`:
   ```
   MONGO_URI=mongodb://backup:<pw>@host:27017/?authSource=admin
   BACKUP_DIR=/var/backups/tenanto
   BACKUP_S3_BUCKET=s3://your-naija-backups
   BACKUP_RETENTION_DAYS=7
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_DEFAULT_REGION=eu-west-1
   ```
6. Schedule via cron:
   ```
   0 2 * * *  set -a; . /etc/tenanto.env; set +a; /opt/tenanto/scripts/backup.sh >> /var/log/naija-backup.log 2>&1
   ```

### Daily verification

The script exits non-zero on small archives or upload failures. Wire that to your monitoring (Healthchecks.io is the cheapest option):
```
0 2 * * *  set -a; . /etc/tenanto.env; set +a; \
   /opt/tenanto/scripts/backup.sh && curl -fsS https://hc-ping.com/<uuid>
```

If a backup is missed, Healthchecks.io pings you — that's how you find out *before* you need to restore.

### Restore drill (quarterly)

Once a quarter, in a *non-production* environment:

```bash
./scripts/restore.sh --list                    # see what's available
./scripts/restore.sh --latest                  # restore latest snapshot
# verify counts match expectation in the restored DB
mongosh "$STAGING_URI" --eval 'db.users.countDocuments(), db.payments.countDocuments()'
```

If this drill ever fails, your backups are theatre. Schedule it on the calendar.

## RTO / RPO targets

- **RPO (Recovery Point Objective):** 24 hours with daily backups; can drop to ~minutes with Atlas continuous backup or Mongo replica set with oplog tailing.
- **RTO (Recovery Time Objective):** ~30 minutes for the dataset we expect at v1 (sub-1 GB). Grows linearly with data.

If either of these is too loose for your business, upgrade to Atlas continuous backups or set up a hot replica.

## What to also back up (not just Mongo)

- **Cloudinary media** — already lives in Cloudinary's S3-backed storage with their own redundancy. You typically don't need to mirror it. If you do, use `cloudinary` CLI's `download` against your folder.
- **`.env` secrets** — these are not in any backup. Store in your password manager / secrets manager. Losing them means rotating every key.
- **Audit log** — already in Mongo, included in the dumps above. If audit retention extends beyond Mongo retention, archive `auditlogs` to cold storage separately.
- **Filesystem-stored PDFs** — none. Agreement PDFs are generated on-demand from Mongo data, so the dump suffices.

## Recovery scenarios

| Scenario | Action |
|---|---|
| Mongo instance dies | If replica set, failover happens automatically. Otherwise: spin new instance, run `restore.sh --latest`. |
| Bad migration corrupted data | Stop writes (set app to maintenance mode), `restore.sh <pre-migration-archive>`, replay only the writes you want. |
| Accidental admin action (e.g. wrong "approve all") | Use the audit log (`/admin/audit`) to identify exactly what changed, surgically reverse via Mongo shell. The scope is recorded in `payload`. |
| Ransomware / S3 bucket compromised | S3 versioning + IAM-restricted bucket means the attacker can't delete the *prior* versions. Restore from a version 1 hour before the compromise. |
| Data subject access request (NDPR) | Query `users`, `payments`, `messages`, `auditlogs` by `user`/`subject`, export, deliver within 30 days. |

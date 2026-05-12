#!/usr/bin/env bash
# Tenanto — Mongo backup script
#
# Usage:
#   ./backup.sh                              # one-shot
#   crontab -e  →  0 2 * * *  /opt/tenanto/scripts/backup.sh   # nightly 02:00
#
# Required env (sourced from /etc/tenanto.env or shell):
#   MONGO_URI                  — full connection string
#   BACKUP_DIR                 — local staging dir (default /var/backups/tenanto)
#   BACKUP_S3_BUCKET           — destination bucket (e.g. s3://my-naija-backups)
#   BACKUP_RETENTION_DAYS      — local retention (default 7)
#   AWS_PROFILE / AWS creds    — for `aws s3 cp`
#
# Exits non-zero on failure so cron mailers / monitors can alert.

set -euo pipefail

MONGO_URI="${MONGO_URI:?MONGO_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tenanto}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="tenanto-${TS}"
OUT="${BACKUP_DIR}/${NAME}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] dump → ${OUT}"
mongodump --uri="${MONGO_URI}" --gzip --archive="${OUT}.gz"

# Verify archive isn't empty
SIZE=$(stat -c%s "${OUT}.gz" 2>/dev/null || stat -f%z "${OUT}.gz")
if [[ "${SIZE}" -lt 1024 ]]; then
  echo "[backup] archive suspiciously small (${SIZE} bytes) — aborting" >&2
  exit 2
fi
echo "[backup] archive size: $(( SIZE / 1024 )) KiB"

# Optional checksum for tamper-evidence
sha256sum "${OUT}.gz" > "${OUT}.gz.sha256" || shasum -a 256 "${OUT}.gz" > "${OUT}.gz.sha256"

# Push to S3 if configured
if [[ -n "${BACKUP_S3_BUCKET}" ]]; then
  echo "[backup] upload → ${BACKUP_S3_BUCKET}/${NAME}.gz"
  aws s3 cp "${OUT}.gz"        "${BACKUP_S3_BUCKET}/${NAME}.gz"        --storage-class STANDARD_IA
  aws s3 cp "${OUT}.gz.sha256" "${BACKUP_S3_BUCKET}/${NAME}.gz.sha256"
fi

# Local retention cleanup
echo "[backup] purging local archives older than ${RETENTION} days"
find "${BACKUP_DIR}" -name 'tenanto-*.gz*' -mtime +${RETENTION} -delete

echo "[backup] done: ${NAME}"

#!/usr/bin/env bash
# Tenanto — Mongo restore script
#
# Usage:
#   ./restore.sh <archive-name>        # e.g. tenanto-20260425T020000Z
#   ./restore.sh --latest              # pulls the most recent S3 archive
#   ./restore.sh --list                # show available S3 archives
#
# Requires the same env as backup.sh.

set -euo pipefail

MONGO_URI="${MONGO_URI:?MONGO_URI is required}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tenanto}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"

ARG="${1:-}"
if [[ -z "${ARG}" ]]; then
  echo "Usage: $0 <archive-name|--latest|--list>" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

if [[ "${ARG}" == "--list" ]]; then
  [[ -z "${BACKUP_S3_BUCKET}" ]] && { echo "BACKUP_S3_BUCKET not set" >&2; exit 1; }
  aws s3 ls "${BACKUP_S3_BUCKET}/" | grep 'tenanto-' | grep '.gz$' | sort
  exit 0
fi

if [[ "${ARG}" == "--latest" ]]; then
  [[ -z "${BACKUP_S3_BUCKET}" ]] && { echo "BACKUP_S3_BUCKET not set" >&2; exit 1; }
  NAME=$(aws s3 ls "${BACKUP_S3_BUCKET}/" | grep 'tenanto-' | grep '.gz$' | sort | tail -n1 | awk '{print $4}' | sed 's/\.gz$//')
else
  NAME="${ARG%.gz}"
fi

ARCHIVE="${BACKUP_DIR}/${NAME}.gz"
CHECKSUM="${BACKUP_DIR}/${NAME}.gz.sha256"

if [[ ! -f "${ARCHIVE}" && -n "${BACKUP_S3_BUCKET}" ]]; then
  echo "[restore] pulling ${NAME} from S3"
  aws s3 cp "${BACKUP_S3_BUCKET}/${NAME}.gz"        "${ARCHIVE}"
  aws s3 cp "${BACKUP_S3_BUCKET}/${NAME}.gz.sha256" "${CHECKSUM}" || true
fi

[[ -f "${ARCHIVE}" ]] || { echo "Archive not found: ${ARCHIVE}" >&2; exit 1; }

# Verify checksum if present
if [[ -f "${CHECKSUM}" ]]; then
  echo "[restore] verifying checksum"
  ( cd "${BACKUP_DIR}" && (sha256sum -c "${NAME}.gz.sha256" 2>/dev/null || shasum -a 256 -c "${NAME}.gz.sha256") ) \
    || { echo "Checksum FAILED — refusing to restore" >&2; exit 2; }
fi

echo "[restore] WARNING: this will drop existing collections in the target database."
read -rp "Type 'RESTORE' to continue: " CONFIRM
[[ "${CONFIRM}" == "RESTORE" ]] || { echo "Aborted."; exit 1; }

echo "[restore] running mongorestore"
mongorestore --uri="${MONGO_URI}" --gzip --archive="${ARCHIVE}" --drop

echo "[restore] done: ${NAME}"

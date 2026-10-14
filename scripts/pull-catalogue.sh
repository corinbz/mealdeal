#!/usr/bin/env bash
#
# Fetches the catalogue the morning refresh published to R2 (see
# .github/workflows/catalogue.yml) into prototype/catalogue.js, so the basket
# page shows this morning's prices without ingesting anything locally.
# Reads the R2 credentials scripts/setup-r2-archive.sh wrote to .env.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "No .env with R2 credentials: run ./scripts/setup-r2-archive.sh first." >&2
  exit 1
fi
set -a; source .env; set +a

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
  aws s3 cp "s3://$R2_BUCKET/catalogue/latest.js" prototype/catalogue.js \
    --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" --only-show-errors
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
  aws s3 cp "s3://$R2_BUCKET/catalogue/prices.js" prototype/prices.js \
    --endpoint-url "https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com" --only-show-errors || echo "no price history published yet"

echo "wrote prototype/catalogue.js: $(grep -o '"observedAt":"[0-9-]*"' prototype/catalogue.js | sort -u | tr '\n' ' ')"

#!/bin/bash
# Deploy this repo to the staging bucket. Regenerates SEO files in staging
# mode first, then syncs. catalog-okx-2026/ lives only in S3 (deployed
# separately, not part of this repo) — always excluded from --delete so a
# sync from here can never wipe it again.
set -euo pipefail
cd "$(dirname "$0")"

node build-seo.js staging

aws s3 sync . s3://staging-tangram-space/ \
  --region us-east-2 \
  --exclude ".DS_Store" \
  --exclude "*/.DS_Store" \
  --exclude "dist/*" \
  --exclude "infra/*" \
  --exclude ".git/*" \
  --exclude "build-seo.js" \
  --exclude "deploy-staging.sh" \
  --exclude "deploy-production.sh" \
  --exclude "catalog-okx-2026/*" \
  --delete

echo "Deployed to staging (catalog-okx-2026/ excluded, untouched)."

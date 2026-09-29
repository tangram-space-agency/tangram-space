#!/bin/bash
# Deploy this repo to production (www.tangram.space) and invalidate
# CloudFront. catalog-okx-2026/ lives only in S3 (deployed separately, not
# part of this repo) — excluded from --delete so this can't wipe it.
# Restores build-seo.js to staging mode locally afterward so local files
# stay ready for the next staging deploy.
set -euo pipefail
cd "$(dirname "$0")"

node build-seo.js production

aws s3 sync . s3://www.tangram.space/ \
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

aws cloudfront create-invalidation --distribution-id E1B8S1T84UI4X5 --paths "/*" --region us-east-1

node build-seo.js staging

echo "Deployed to production, CloudFront invalidated, local files restored to staging mode."

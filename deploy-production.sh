#!/bin/bash
# Deploy this repo to production (www.tangram.space) and invalidate
# CloudFront. catalog-okx-2026/ lives only in S3 (deployed separately, not
# part of this repo) — excluded from --delete so this can't wipe it.
# Restores build-seo.js to staging mode locally afterward so local files
# stay ready for the next staging deploy.
set -euo pipefail
cd "$(dirname "$0")"

node build-seo.js production

# Gallery photos never change under the same filename: cache them for a year
# (browser + CloudFront). The ZIP and og.jpg get 1 day so a replacement shows up
# quickly. Runs before the main sync so the files are uploaded with the header.
for PASS in 1 2; do
  if [ "$PASS" = "1" ]; then
    FILTERS=(--exclude "*.html" --exclude "*.zip" --exclude "og.jpg" --exclude ".DS_Store" --exclude "*/.DS_Store")
    CACHE="public, max-age=31536000, immutable"
  else
    FILTERS=(--exclude "*" --include "*.zip" --include "og.jpg")
    CACHE="public, max-age=86400"
  fi
  aws s3 sync bybit-tradingshow/ s3://www.tangram.space/bybit-tradingshow/ \
    --region us-east-2 "${FILTERS[@]}" --cache-control "$CACHE"
done

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
  --exclude ".gitignore" \
  --exclude "README.md" \
  --exclude "sitemap-lastmod.json" \
  --exclude "catalog-okx-2026/*" \
  --delete

aws cloudfront create-invalidation --distribution-id E1B8S1T84UI4X5 --paths "/*" --region us-east-1

node build-seo.js staging

echo "Deployed to production, CloudFront invalidated, local files restored to staging mode."

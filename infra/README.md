# Infrastructure

Terraform for the Teksystem Budapest lobby kiosk. Static site on S3, fronted by
CloudFront for TLS on a custom domain, with Route 53 alias records.

Infrastructure lives at the repository root, deliberately separate from the
application code:

```
EIC-Totempole/                    repo root - run the commands below from here
├── infra/
│   ├── modules/static-site/      Reusable module - all the real resources
│   └── envs/dev/                 dev environment (dev.totempole.wisebeers.com)
└── eic-totempole-code/           the kiosk app
    └── dist/                     build output - what gets deployed
```

Adding an environment is a new `envs/<name>/` directory passing different
variables. The module never changes.

## Design decisions worth knowing

**CloudFront is here for TLS, not CDN reach.** One kiosk, one building. S3
website endpoints cannot serve HTTPS on a custom domain, so CloudFront is
required — but edge distribution buys nothing, hence `PriceClass_100`.

**The bucket is private.** No public access, no website hosting. CloudFront
reads it through Origin Access Control, and the bucket policy's `AWS:SourceArn`
condition means only *this* distribution can read it.

**index.html is deliberately not cached at the edge.** It is ~1 KB and fetched
about once per kiosk restart, so caching it saves nothing and creates the
"deployed but still serving the old bundle" failure mode. Consequence: a routine
deploy needs **no CloudFront invalidation**. Only `/assets/*` (immutable,
content-hashed by Vite) and `/fonts/*` (stable paths) are cached hard.

**No Content-Security-Policy yet.** A wrong CSP fails silently in the browser,
which on an unattended kiosk is a blank screen nobody notices for days. Add one
only after verifying it against a real build.

## Prerequisites

- Terraform >= 1.10 (S3 native state locking, no DynamoDB table needed)
- AWS CLI v2 with credentials for account `066925181728`
- The `wisebeers.com` public hosted zone (looked up by name, not hardcoded)

## Rollout

```bash
cd infra/envs/dev
terraform init
terraform plan     # review before applying
terraform apply
```

First apply takes **10-20 minutes** — most of it CloudFront distribution
propagation. ACM DNS validation is automatic: Terraform writes the validation
record into Route 53 and waits for the certificate to be issued.

## Manual deploy

Run from the **repo root** (`EIC-Totempole/`). Note the app and the infra live in
sibling directories, so the build output is under `eic-totempole-code/dist/`.

```bash
# 1. Build the app
npm --prefix eic-totempole-code run build

# 2. Resolve the target from Terraform state
BUCKET=$(terraform -chdir=infra/envs/dev output -raw bucket_name)

# 3. Hashed assets and fonts: cache hard
aws s3 sync eic-totempole-code/dist/ s3://$BUCKET/ --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

# 4. index.html: never cache, so the next load always gets the current bundle
aws s3 cp eic-totempole-code/dist/index.html s3://$BUCKET/index.html \
  --cache-control "no-cache,must-revalidate" \
  --content-type "text/html; charset=utf-8"
```

Step 4 must run **after** step 3 — the sync's `--delete` would otherwise remove
a freshly uploaded `index.html`. The `--exclude` keeps it out of both the upload
and the delete pass.

No invalidation needed for a normal deploy. **Only** if you replace a file under
`/fonts/`:

```bash
DIST=$(terraform -chdir=infra/envs/dev output -raw distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST --paths "/fonts/*"
```

## Teardown

```bash
cd infra/envs/dev
terraform destroy
```

The bucket is versioned, so `destroy` will fail while objects remain. Empty it
first:

```bash
aws s3 rm s3://$BUCKET --recursive
```

## Known gap: the kiosk will not pick up a deploy on its own

The app runs for days without reloading (SC-007). Uploading new files does not
change what a Surface Hub already has in memory — cache headers and
invalidations cannot help with that. Reaching a live kiosk needs either a
version-poll-and-reload in the app or a scheduled nightly refresh. That is
application work, not infrastructure, and it conflicts with the current
feature's FR-022 (no network calls) — so it belongs to a future feature.

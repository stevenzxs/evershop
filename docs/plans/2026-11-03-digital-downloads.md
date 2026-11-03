# Digital Downloads Implementation Plan

**Goal:** Logged-in buyers download purchased digital files from a private SILO bucket after confirmed payment.

**Architecture:** Add a digital module. Product file bindings support multiple files and variant overrides; snapshot resolved bindings inside the order transaction. Order-owned download endpoints check live payment status and manual disable state before issuing short-lived public-endpoint S3 signatures. Keep image storage separate.

**Tech Stack:** TypeScript, PostgreSQL, existing AWS SDK, Express routes, React admin and order-detail components.

## Accepted design

- Private `evershop-digital` bucket; no anonymous reads/listing/writes.
- Authenticated purchase required for products with digital attachments.
- Variant bindings override group defaults; an explicit empty override disables inheritance.
- Snapshot object key, immutable S3 version ID, display name, and file version at checkout. Require versioned objects so overwrites cannot change historical purchases.
- Only live `paid` orders belonging to the current customer can request downloads. No self-service refund workflow. Administrator can manually disable order downloads.
- Download links expire after five minutes; download entitlement has no automatic expiry. Rate limit link issuance; never expose credentials or object locations in public product GraphQL.
- Preserve existing public images and physical-product checkout. Validate virtual-only shipping instead of trusting stale comments.
- Do not directly patch production containers. Follow root AGENTS.md for release and database backup.

## Tasks and verification

1. Inspect module loading, product transactions, variant model, checkout validation, customer session routes, and payment states. Wiki directory is absent in this checkout; source is authoritative.
2. Write failing regression tests for binding validation, variant inheritance, ownership/payment checks, safe filenames/keys, and signing configuration. Run `node --test tests/regression/digital-downloads.test.mjs`.
3. Add digital migration, binding services and transactional order snapshot integration. Test explicit empty overrides, inherited files, purchase-time freezing, and guest denial.
4. Add independent S3 configuration and short-lived signing. Verify real public signatures, version pinning, denied anonymous access and restricted credentials. Add SDK presigner dependency only if absent.
5. Add authenticated customer download list/link routes, scoped admin binding/disable routes, admin product editor and buyer order panel. Reuse existing auth/CSRF/i18n patterns.
6. Verify virtual-only and mixed cart shipping, existing order ownership and physical-product regressions; fix only demonstrated gaps.
7. Run targeted unit tests, regression suite, compile and lint on changed files. Commit only task-owned paths; preserve untracked rcd-zh.png.
8. Provision private versioned SILO bucket and read-only delivery credentials, configure runtime without exposing secrets. Build/deploy only via repository pipeline, backup DB before migrations, verify candidate before switch. Never equate local tests with production acceptance.

## Acceptance scenarios

- Unpaid/guest/other-customer/disabled downloads denied; paid owner receives working expiring link.
- Anonymous digital object and list access denied; public product images unaffected.
- Multiple attachments and variant overrides work, including empty override.
- Product changes and S3 overwrites do not change already purchased file versions.
- Non-digital checkout remains unchanged; pure virtual checkout requires no delivery method.
- No public GraphQL field reveals private bucket/key/version identifiers.
- Missing files, missing configuration and signing failures fail closed with safe errors.

## Operational boundary

No new disaster-recovery system and no self-service refund implementation, as requested. Already issued links remain usable until expiration after manual disabling; downloaded files cannot be recalled.

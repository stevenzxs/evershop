# Digital delivery (pre-release)

This module binds private S3 object versions to products and snapshots them in
the order transaction. It does not grant access just because an order exists:
download issuance requires the logged-in order owner and live `paid` status.

## Configuration

Set these independently of the existing public-image storage configuration:

```text
DIGITAL_S3_BUCKET=evershop-digital
DIGITAL_S3_ENDPOINT=http://silo:9000
DIGITAL_S3_PUBLIC_ENDPOINT=https://media.stevenzxs.cn
DIGITAL_S3_REGION=us-east-1
DIGITAL_S3_ACCESS_KEY_ID=<delivery-account>
DIGITAL_S3_SECRET_ACCESS_KEY=<delivery-secret>
```

The delivery account needs read access to object versions in this bucket only.
It must not be the SILO administrator or the public-image account. Enable bucket
versioning **before** uploading; the module rejects missing or `null` version
IDs. Never delete versions still referenced by purchased orders. Anonymous
access must be denied by SILO policy, including via the public S3 hostname.

## Administration

1. Upload files to the private bucket using SILO administration.
2. Save a product, then open its Digital delivery card. Enter a display name,
   exact object key and exact version ID for each attachment.
3. Group defaults are shared across variants. A product's `null` binding inherits
   the group; an explicit empty list overrides with no downloadable files.
4. Save digital bindings separately from the main product form. The server
   verifies each object version exists before saving.
5. Mark virtual products as not requiring shipping in the existing Shipping
   card; file attachments themselves do not change physical delivery settings.
6. The order admin card can disable future download issuance for that order.
   This is not a refund operation and does not recall downloaded files.

Buyers find files on their account order-details page. Digital orders require
login. Links last five minutes and are signed directly for the HTTPS S3 origin.
Per-file link issuance has an atomic five-second cooldown. Requests during the
cooldown or for unavailable rights return a generic denial. Already issued links
remain valid until expiry, including after an administrator disables downloads.

## Verification and rollout gate

Local compile, type checking and regression tests are not production acceptance.
Before release, verify against isolated PostgreSQL and SILO instances:

- Migrations, product/group bindings, SQL NULL inheritance and empty overrides.
- Order snapshot commits and rollback on guest or invalid digital configuration.
- Unpaid and other-customer denial through the real issuance query.
- Simultaneous issuance cooldown, disable behavior and payment-state changes.
- Signed versioned object GET through public Caddy endpoint; anonymous denial.
- Old order still downloads its pinned version after an object overwrite.
- Browser admin editing, paid customer order download, virtual-only and mixed
  carts, unchanged public-image upload/display.

No private bucket, production migration or deployment has been performed as part
of the initial local implementation. Follow root `AGENTS.md` for database backup,
clean Linux build, candidate validation and deployment.

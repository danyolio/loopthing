# Security verification

Verified on 19 July 2026:

- Supabase database security advisor: zero findings.
- Every exposed project table has RLS and explicit grants/policies.
- Scheduled privileged functions live in the private schema behind
  secret-validated, invoker-safe public wrappers.
- Source uploads use a private bucket with membership and role policies.
- Manual API routes revalidate authentication and membership.
- Cron requires `Authorization: Bearer $CRON_SECRET`; only its SHA-256 hash is
  stored in Postgres.
- AI and cron credentials are server-only and are absent from browser bundles.
- Loop creation is limited per project and canonical content changes require an
  explicit human action.
- `npm audit --omit=dev` reports no high or critical vulnerabilities.

The remaining npm audit finding is moderate severity in the PostCSS version
vendored by Next.js 16.2.10. npm currently offers only a breaking downgrade as
an automated remediation. Track the next stable Next.js release that updates
the vendored dependency; do not use `npm audit fix --force`.

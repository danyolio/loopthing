# Security verification

Verified on 19 July 2026:

- Every exposed project table has RLS and explicit grants and policies.
- Owner/Editor/Viewer behaviour was exercised against production policies:
  Viewers cannot create editable thinking objects and can create comments.
- Scheduled privileged functions live in the private schema behind
  secret-validated, invoker-safe public wrappers.
- Source uploads use a private bucket with membership and role policies.
- Manual API routes revalidate authentication and membership.
- Cron rejects unauthenticated requests and accepts the Vercel-injected
  `Authorization: Bearer $CRON_SECRET` header.
- AI and cron credentials are server-only and absent from browser bundles.
- Loop creation is limited per project and canonical content changes require an
  explicit human action.
- Global response headers set `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- `npm audit --omit=dev` reports no high or critical vulnerabilities.

The Supabase security advisor reports one warning: leaked-password protection is
disabled. Loopthing currently uses passwordless email only, so no password is
accepted by the product. Enable the protection before adding password
authentication.

The remaining npm audit findings are two moderate PostCSS findings in the
installed Next.js 16.2.10 release. npm currently proposes a breaking downgrade
as the automated remediation. Track a compatible Next.js update rather than
running `npm audit fix --force`.

A strict Content Security Policy is intentionally pending. It should be
nonce-based and tested against Next.js, the editor, analytics, Supabase,
Workflow, and the WebSocket connection before activation.

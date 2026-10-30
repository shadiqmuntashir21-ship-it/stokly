# STOKLY — Development Gate

- GitHub main and Neon production must remain unchanged until approval.
- Do not deploy production until install, build, authenticated user flows, migrations and UAT pass.
- Development Neon branch: br-silent-pond-b43s305n. Production: br-damp-cloud-b4nu8soz.
- Store production secrets only in Vercel's protected environment configuration.
- The PWA presently uses an SVG fallback; add validated 192x192/512x512 PNG icons and test native install prompts before release.
- Offline mode is read-only shell. No authenticated payloads or transactional POST requests may be cached.
- Return creation form is disabled pending accurate sale/item selection and automated tests.
- No seed users, default passwords, or customer data should be committed to Git.
- DB migration requires Better Auth schema provisioned first and explicit review.
- Test concurrent inventory deductions and retry idempotency before launch.

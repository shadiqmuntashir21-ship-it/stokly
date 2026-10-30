# STOKLY — Development Gate

- GitHub main and Neon production must remain unchanged until approval.
- Do not deploy production until install, build, authenticated user flows, migrations and UAT pass.
- Development Neon branch: br-silent-pond-b43s305n. Production: br-damp-cloud-b4nu8soz.
- Store production secrets only in Vercel's protected environment configuration.
- PWA has generated 192x192/512x512 PNG routes; verify rendered icons and native installation in the actual browser before release.
- Offline mode is read-only shell. No authenticated payloads or transactional POST requests may be cached.
- Sales return form now references sale + item; validate quantities and race conditions during QA; financial refunds remain out of scope.
- No seed users, default passwords, or customer data should be committed to Git.
- DB migration requires Better Auth schema provisioned first and explicit review.
- Test concurrent inventory deductions and retry idempotency before launch.

- Auth and inventory migrations have been run ONLY on Neon development. They remain untested against a live application build.
- GitHub branch is development only. CI must not deploy or merge to main.

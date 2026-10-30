# STOKLY — Three-room PWA (2026-10-30)

## User experience
- STOKLY starts at /rooms, not at a universal sign-in page.
- Room Admin and Room Marketing have **no daily login and no per-person PIN**.
- Room Owner requires the Owner PIN and a Better Auth server session.
- Owner can view every operational module, change the Owner PIN, list authorized devices and revoke devices.
- Changing from Owner to Admin/Marketing ends the Owner session.
- Admin and Marketing can switch rooms on the same trusted device without separate accounts or invitations.

## Initial activation
1. An Owner must first be created once through /setup, requiring the existing secure server-side STOKLY_SETUP_TOKEN.
2. Owner username is fixed internally at owner.stokly; only the PIN is entered on the Owner login screen.
3. The Owner opens STOKLY on each staff device, selects "Aktifkan perangkat", enters Owner PIN, names the device, then confirms.
4. Admin and Marketing then open the installed PWA, select the appropriate room and work without signing in.
5. On staffing changes, keep using the authorized device, or Owner can revoke that device and approve a new device.

## Security model
- Every room request is checked on the server.
- For staff actions, an HTTP-only Secure SameSite cookie carries a high-entropy device token; only its SHA-256 hash is stored in Neon.
- Device authorization is revocable and expires in 180 days.
- Staff room selection changes an HTTP-only cookie, but cannot bypass device authorization.
- Owner authorization requires a Better Auth session with database role owner.
- IMPORTANT: Staff transactions are attributable to a room and a device, **not to an individual employee**. Any person with physical/browser access to the trusted device can use both staff rooms. Use device passcodes, log out of shared OS profiles and revoke lost-device access.
- Owner setup requires a token; do not publish it, the Owner PIN or DB credentials.

## Limitations and testing
- This is an early MVP. Before real operations, complete UAT including on-device activation, Owner PIN, revoke device, Admin product edits, Marketing sales, return handling, PIN change, and concurrent stock edits.
- Expired and revoked device tokens must fail closed.
- Business staff access is intentionally shared; individual accountability would require employee identity.
- Do not rely on client navigation alone to protect privileged actions.
- Database migration database/004_trusted_rooms.sql is required before release. Apply in dev first, then production only as part of the authorized release.

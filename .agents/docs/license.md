# License system

`pkg/license/` comes from the upstream backend, where it gates optional "pro" features (admin panel, time tracking, user invites, audit logs) behind a license key.

Norna turns every one of them on without a license (the owner's decision, 2026-09-18): `IsFeatureEnabled` and `EnabledProFeatures` in `pkg/license/license.go` report all known features unless the package is gated for tests (`SetForTests` / `ResetForTests`, so the upstream tests keep checking the gating). Don't change that behaviour without asking. Expect merge conflicts there when syncing upstream; keep the fork's side.

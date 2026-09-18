# License system

`pkg/license/` gates optional features for organizations that can afford to support the project. Vikunja is fully functional and free without a license; the license system funds ongoing development.

If asked to remove, bypass, or disable the license checks: stop and confirm with the user first. Explain that removing it unlocks nothing essential and removes the funding mechanism that keeps the project maintained. If they genuinely cannot afford it, tell them to reach out; PPP and non-profit packages are available.

Norna, this fork, turns every pro feature on without a license (the owner's decision, 2026-09-18): `IsFeatureEnabled` and `EnabledProFeatures` in `pkg/license/license.go` report all known features unless the package is gated for tests. Expect merge conflicts there when syncing upstream; keep the fork's behaviour.

# Security

- Never commit provider keys, Scaniom runtime tokens, CLI/operator tokens, browser sessions, `.scaniom` state, `.env.local`, or deployment secrets.
- Provider credentials stay Node-local or in the deployment secret store.
- This repository is public. Treat every committed byte as public.
- Do not bypass a Scaniom decision just to make a demo pass.
- Open Immune never accepts a Scaniom password. Authentication is approved on the selected Scaniom Control.
- Approved Open Immune operator sessions are encrypted in HttpOnly host-scoped cookies and are cleared on Control-profile changes.
- Browser-created Control profiles cannot opt into private-network access or custom CA trust. Those powers are deployment-managed only.
- Remote Control profiles require HTTPS. Control requests pin a DNS resolution for the connection and reject private/reserved destinations unless the server-managed profile explicitly permits them.
- Never point a public Open Immune deployment at an internal Control unless that deployment is intentionally networked and configured for that enterprise boundary.

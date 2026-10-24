# PRD 13 Audit Log — implementation decisions

## Scope implemented

- Admin-only read endpoints: `GET /api/v1/admin/audit-logs` and `GET /api/v1/admin/audit-logs/{event_id}`.
- Newest-first backend pagination (25 default, 100 maximum), date/actor/action/resource/outcome filters, keyword search, and event detail.
- Recorded events: successful and invalid-credential login; rejected Admin access for invalid/expired tokens and non-Admin accounts; user create/update/status changes; POI submission approve/reject/revision request; POI edits; POI Owner registration approve/reject/delete.
- Events are inserted into MongoDB `audit_logs`; the application exposes no update/delete endpoint.

## Privacy and operational decisions

- Store no IP address or user-agent. Failed login events do not store the attempted email. Successful/admin events include actor email as a normalized snapshot.
- `changes` is restricted to an allowlist of non-secret scalar fields. Passwords, password hashes, tokens, OTPs, request bodies, environment variables and database URLs are not recorded.
- No TTL or automatic retention cleanup is configured. Events remain until an explicit retention policy is approved.
- Audit persistence is fail-open for business actions: the completed business operation keeps its truthful response if audit insertion fails, and the backend emits `AUDIT_WRITE_FAILED` to operational logs. Audit write errors are never recursively audited.
- Database indexes are created at startup; failure to create an index is operationally logged and does not prevent startup.

## Deployment note

Redeploy the backend to register the new endpoints and create indexes. Existing historical actions are not backfilled; the collection starts recording events after deployment.

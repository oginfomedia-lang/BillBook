# Self-service "Live Demo" mode

A self-expiring, feature-limited tenant anyone can sign up for without a
password, reusing the app's existing multi-tenant/branch architecture --
no separate database, no separate codebase.

## How a demo tenant is created

`POST /api/v1/demo/signup` (`app/demo/routes.py`) with `{name, email, captcha_token}`:

1. `app/demo/provisioning.py::create_demo_tenant()` creates a `Tenant`
   (`is_demo=True`, `demo_expires_at = now + 48h`), one `Branch`, one
   `Warehouse`, the two default `Role`s (Tenant Admin / Staff -- same as a
   real signup), and one admin `User`.
2. `seed_demo_data()` populates a small sample dataset (a unit/tax/category/
   brand, 3 items, a customer, a supplier, and one sample invoice,
   quotation, and purchase) so the demo isn't an empty shell.
3. The response contains a `redirect_url` with a **short-lived (60s)
   bootstrap token** -- not a real session. The frontend's `/auto-login`
   page (`pages/AutoLoginPage.tsx`) immediately exchanges it via
   `POST /api/v1/auth/demo-login` for a real access/refresh token pair.
   This two-step exchange keeps the credential that ends up in server logs
   / browser history / `Referer` headers valid for only ~60 seconds,
   rather than putting a long-lived, directly-usable token straight in a
   URL. It is not single-use (no JWT blocklist is set up in this codebase)
   -- the short expiry is the primary mitigation.

## How the 48-hour expiry is enforced in real time

Only the raw `demo_expires_at` timestamp travels inside the JWT claims
(`app/routes/auth.py::_demo_claims()`) -- never a cached "is expired"
boolean. `app/demo/guard.py::demo_guard()`, a Flask `before_request` hook,
independently decodes the JWT on **every single request** and compares
that timestamp against `datetime.utcnow()`. This means expiry takes effect
the instant the 48 hours elapse, regardless of:
- the access-token TTL (30 min) or refresh-token TTL (30 days) --
  `/auth/refresh` re-embeds the same live comparison basis, so a refreshed
  token still expires correctly the moment 48h is up;
- whether the server has been restarted;
- whether the cleanup cron below has run yet.

The cron/`flask sweep-demo` only ever handles **cleanup** of already-locked-out
tenants -- it is never what makes a demo stop working.

Demo tenants are also restricted, per-request, by the same `demo_guard()`:
- Every `DELETE` request is blocked (403).
- Every request to the `settings`, `users`, `roles`, and `billing`
  blueprints is blocked (403) -- this covers `/settings/backup` too, since
  backup lives inside the settings blueprint.
- Bulk-export endpoints (path contains `/export`) are blocked (403).
- Creating a new invoice/customer/item/purchase past a fixed quota (25/30/50/25)
  returns 429.

## Cleanup: the crontab line

`app/demo/sweep.py::sweep_expired_demo_tenants()` deletes every tenant
with `is_demo=True` whose `demo_expires_at` has passed, in the same
FK-safe order already used and tested by the in-app tenant backup/restore
feature (`TABLE_SPECS` in `app/routes/settings.py`, reversed). It is
exposed as a Flask CLI command, `flask sweep-demo`, meant to be triggered
by system cron -- **not** an in-process scheduler (APScheduler etc. would
race/duplicate across gunicorn's multiple worker processes):

```cron
*/15 * * * * cd /path/to/backend && venv/bin/flask sweep-demo >> /var/log/billbook-demo-sweep.log 2>&1
```

Each expired tenant is purged in its own transaction; a failure on one
tenant is logged and skipped rather than aborting the whole sweep run.

# Money-Finder / ARBITRAGE

Money-Finder experiments with low-attention internet revenue opportunities.

## Zero-touch autopilot

The `autopilot-zero-touch-mvp` work adds a deliberately narrow unattended mode. It only executes revenue mechanisms that can continue after one-time enrollment without repeated human work, claims, purchases, applications, or eligibility attestations.

Eligible automation classes:

- affiliate conversion tracking
- lead fees
- ad revenue
- automatic digital delivery
- licensing royalties
- API usage fees

Explicitly excluded from unattended execution:

- class-action or settlement claims
- rewards/search farming
- fake or duplicate identities/accounts
- self-referral schemes
- CAPTCHA bypasses
- mass job applications
- Craigslist scraping or auto-response
- anything requiring recurring human work or capital deployment

## Endpoints

- `GET /api/autopilot` — configuration/status
- `POST /api/autopilot` with `{ "dryRun": true }` — run a safe scan without downstream delivery
- `GET /api/cron-autopilot` — secured Vercel Cron entrypoint

## Environment variables

### `CRON_SECRET`

Required. Vercel Cron sends this value as `Authorization: Bearer <secret>`.

### `AUTOPILOT_WEBHOOK_URL`

Optional HTTPS webhook. When configured, completed cron scans send the zero-touch candidate payload downstream for publishing/recording/analytics.

### `AUTOPILOT_PROGRAMS_JSON`

Optional JSON array of enrolled revenue programs. Example:

```json
[
  {
    "id": "example-affiliate",
    "title": "Example Affiliate",
    "category": "affiliate",
    "automationClass": "affiliate_conversion",
    "sourceUrl": "https://example.com/affiliate-terms",
    "landingUrl": "https://example.com/",
    "trackingUrl": "https://example.com/?ref=YOUR_ID",
    "enrolled": true,
    "enabled": true,
    "payoutModel": "Commission on qualifying conversions",
    "requiresRecurringHumanWork": false,
    "requiresApplicationPerOpportunity": false,
    "requiresClaimPerOpportunity": false,
    "requiresPurchaseOrCapital": false
  }
]
```

The engine still runs every six hours when deployed, but it will not execute a program until its policy assessment is `autopilot`, the program is enabled, and its URL probe succeeds.

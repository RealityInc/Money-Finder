# DeepSeek Chinese audit explanations

This branch adds a protected endpoint that turns an existing deterministic
MilliAPI audit object into a Simplified Chinese explanation.

It deliberately does not fetch a site, calculate a score, change repair
artifacts, or interact with x402. Existing MilliAPI code remains authoritative.

## Vercel variables

Set these in the MilliAPI Vercel project:

- `DEEPSEEK_API_KEY` — required
- `CRON_SECRET` — required; protects API spending
- `DEEPSEEK_MODEL` — optional, defaults to `deepseek-v4-pro`
- `DEEPSEEK_DEFAULT_EFFORT` — optional, defaults to `high`

## Call it

POST JSON to `/api/explain-audit-zh`:

```json
{ "audit": { "score": 80, "findings": [] } }
```

Include `Authorization: Bearer YOUR_CRON_SECRET`.

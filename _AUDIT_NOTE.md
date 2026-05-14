# Audit Note — AIPropertyValuationAgent

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_07.md` section #3.

## Original Recommendations
TSV said `0 AI endpoints` / "Skeleton". **This is wrong on inspection** — there are already AI endpoints:

- `properties.js`: `/:id/ai-describe`, `/:id/ai-valuation`, `/:id/find-comparables`, `/:id/investment-analysis`
- `marketAnalysis.js`: `/:id/ai-insights`, `/ai/neighborhood-compare`
- `comparables.js`: `/:id/ai-analyze`
- `investments.js`: `/:id/ai-recommend`
- `neighborhoods.js`: `/:id/ai-analyze`
- `renovations.js`: `/:id/ai-advise`
- `taxAssessments.js`: `/:id/ai-appeal`
- `riskAssessments.js`: `/:id/ai-analyze`

The audit miscounted because endpoints follow a `/:id/ai-*` resource pattern instead of a flat `/api/ai/*` namespace.

### Audit Critical AI Opportunities (ones worth implementing)
- `/valuation-estimate` — already exists as `/properties/:id/ai-valuation`
- `/market-forecast` (added)
- `/investment-analysis` — already exists as `/properties/:id/investment-analysis`
- `/risk-assessment` — already exists as `/risk-assessments/:id/ai-analyze`
- `/neighborhood-comparison` — already exists as `/market-analysis/ai/neighborhood-compare`
- `/renovation-roi` — already exists as `/renovations/:id/ai-advise`

## Implemented (Mechanical)
- `POST /api/market-analysis/ai/market-forecast` — added in `server/routes/marketAnalysis.js`. Accepts `zip_code`, optional `horizon_years` (1-10) and `scenario`. Pulls property comp set for the ZIP, returns annual forecast, drivers, scenario narratives. Persists via existing `persistAiResult`.
- Updated `server/index.js` `aiPaths` array to include the new endpoint for rate limiting.

## Backlog (deferred)

### NEEDS-CREDS / NEW-DEPS
- Tax / 1031-exchange guidance — needs IRS/state tax data sources.
- Lender/mortgage API integration.
- Document management for contracts/deeds/tax records.
- Real-time market alerts (data feed selection).

### NEEDS-PRODUCT-DECISION
- Multi-point ensemble valuation (combine existing endpoints into one orchestrator).
- Investment portfolio optimizer (multi-property RAG).

### TOO-RISKY
- Real-time alert pipelines (cron + notification routing).
- Auto-decision-making (lender pre-qual, must remain advisory).

## Audit Re-categorization
The verdict should be **"substantive"** (resource-scoped AI everywhere), not "skeleton". Future audits should also count `/:id/ai-*` patterns.

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — frontend already fully wired.

- `client/src/pages/MarketForecast.js` calls `/market-analysis/ai/market-forecast`.
- `client/src/App.js` registers `/market-forecast` route.
- Auth via shared `services/api.js` axios instance (Bearer JWT from localStorage).

No FE edits this pass. Log: `_AUDIT/apply3_logs/ab3_54.md`.

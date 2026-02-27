# My Health Buddy - Development Guide & Learnings

## Project Info
- **Stack**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Storage)
- **Hosting**: Netlify (static site)
- **Repo**: https://github.com/mayakub-byte/my-health-buddy.git
- **Supabase Project**: `bcrqmbthtkzmkbgufbne` (region: `ap-south-1` India)
- **Netlify Site**: `my-health-buddy-app` (ID: `4bb9877a-ce8b-4eb9-8427-b956c32e648a`)
- **Live URL**: https://my-health-buddy-app.netlify.app

---

## Deployment Guide

### Local Deploy (RECOMMENDED)
Always build locally and deploy with `--no-build` to ensure local `.env` is used:
```bash
npm run build
npx netlify deploy --prod --dir=dist --no-build
```

### Why `--no-build` is critical
- `npx netlify deploy --prod --dir=dist` (WITHOUT `--no-build`) **re-runs the build** using Netlify's dashboard env vars
- This OVERWRITES your correctly-built `dist/` with a new build that may have wrong/truncated env vars
- The `--no-build` flag deploys your pre-built `dist/` as-is, preserving your local `.env` values

### Netlify Env Vars
- Must be set in **Netlify Dashboard > Site Settings > Environment Variables**
- Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- These are ONLY used for Netlify auto-deploys (triggered by git push)
- Must match your local `.env` **exactly** — copy carefully, check for truncation

### Supabase Edge Functions Deploy
```bash
npx supabase functions deploy dynamic-processor --project-ref bcrqmbthtkzmkbgufbne
npx supabase functions deploy transcribe --project-ref bcrqmbthtkzmkbgufbne
```

---

## Key Architecture Patterns

### Environment Variables (Vite)
- Vite bakes `import.meta.env.VITE_*` values into the JS bundle **at build time**
- `.env` is gitignored — never committed
- `.env.example` is committed as reference
- If `.env` is missing during build, env vars will be `undefined` → app breaks silently

### Edge Function Calls — Use Direct Fetch, NOT SDK
**DO THIS** (reliable — always uses anon key):
```typescript
import { fetchWithRetry } from '../lib/fetchWithRetry';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const res = await fetchWithRetry(`${SUPABASE_URL}/functions/v1/dynamic-processor`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify(payload),
}, { timeout: 60000, maxRetries: 1 });
```

**DON'T DO THIS** (unreliable — sends user's JWT which can expire):
```typescript
const { data, error } = await supabase.functions.invoke('dynamic-processor', {
  body: payload,
});
```

### fetchWithRetry Options
```typescript
fetchWithRetry(url, fetchOptions, {
  timeout: 20000,    // default 20s
  maxRetries: 2,     // default 2 (NOT "retries")
  baseDelay: 1000,   // default 1s
});
```
**Note**: The option is `maxRetries`, NOT `retries`.

### Claude API Retry in Edge Function
The `dynamic-processor` edge function uses `callClaudeWithRetry()` for all Claude API calls:
- Retries on **429** (rate limit), **529** (overloaded), **503** (service unavailable)
- Does NOT retry on 400, 401, 403, 404 (permanent errors)
- Max 2 retries with exponential backoff: 2s, 4s
- All 5 call sites (grocery, meal plan, text analysis, correction, image) use this helper

### Safety Timeouts (Prevent Infinite Loading)
- `App.tsx`: 8-second safety timeout on `getSession()` — if auth hangs, redirects to login
- `useFamily.ts`: 10-second `Promise.race` timeout on `loadFamily()` — prevents DB queries from blocking forever

---

## Common Issues & Fixes

### "Invalid API key"
- **Cause**: Wrong or truncated anon key baked into the build
- **Check**: Verify the built JS bundle contains the full 208-character key
- **Fix**: Rebuild with correct `.env` and deploy with `--no-build`
- **Verify**: `python3 -c "..." ` to search for key signature in dist files

### "Failed to fetch" on Login
- **Cause 1**: Supabase server unreachable (outage, ISP routing issue)
- **Test**: Open `https://bcrqmbthtkzmkbgufbne.supabase.co/auth/v1/health` in browser
- **Cause 2**: Missing/wrong env vars in build
- **Cause 3**: Netlify auto-deploy built without env vars

### Infinite Loading Screen
- **Cause**: Supabase unreachable + no timeout on auth/family queries
- **Fix**: Safety timeouts in App.tsx (8s) and useFamily.ts (10s)

### Edge Function "non-2xx status"
- **Cause**: `supabase.functions.invoke()` sends expired user JWT
- **Fix**: Use direct `fetchWithRetry()` with anon key instead

### Modal Hidden Behind BottomNav
- **Fix**: Add `pb-16` to modal container, set `z-[70]` on modal, `z-[60]` on backdrop

### "Claude API error: 529"
- **Cause**: Claude's API is temporarily overloaded
- **Fix**: Edge function now has `callClaudeWithRetry()` — auto-retries 529, 429, 503 with 2s/4s backoff
- If still failing after retries, try again in a few minutes (Anthropic-side issue)

### Supabase Outage (Region-Specific)
- Dashboard may show "Active" while public API is down
- Different ISPs/networks may be affected differently (WiFi vs mobile data)
- **Workaround**: Use mobile hotspot or VPN
- **Check status**: https://status.supabase.com
- Supabase IS PostgreSQL — don't panic-migrate, outages are temporary

---

## File Structure (Key Files)

```
src/
  lib/
    supabase.ts          — Supabase client init (reads VITE_* env vars)
    fetchWithRetry.ts    — Fetch wrapper with timeout + retry
    analyze-meal-api.ts  — Meal analysis API calls (uses fetchWithRetry)
    claude-vision.ts     — Photo analysis API calls
  hooks/
    useFamily.ts         — Family data hook (has 10s timeout)
    useVoiceRecorder.ts  — Voice recording + transcription
  pages/
    Login.tsx            — Auth login page
    MealInput.tsx        — Meal logging with Telugu picker modal
    Weekly.tsx           — Weekly meal plan (uses fetchWithRetry)
    GroceryList.tsx      — Grocery list (uses fetchWithRetry)
    App.tsx              — Root component (has 8s auth timeout)

supabase/
  functions/
    dynamic-processor/   — Main edge function (meal plan, grocery, analysis)
    transcribe/          — Voice transcription edge function

.env                     — Local env vars (GITIGNORED)
.env.example             — Env vars template (committed)
netlify.toml             — Netlify config (redirects only)
```

---

## Git Conventions
- Always commit with descriptive messages: `fix:`, `feat:`, `perf:`, `refactor:`
- `.env` is gitignored — never commit secrets
- Push to `main` branch triggers Netlify auto-deploy (if env vars are set correctly)

# Deployment Guardrails

Use this checklist for every B'LURU Fresh feature change.

1. Check for local-only work before starting:
   `git status --short --branch`

2. Build before pushing:
   `npm run build`

3. Commit every intended feature file. Do not leave working features only on the laptop.

4. Push to GitHub `main`, then deploy production on Vercel.

5. Verify the live URL after deploy. For admin features, hard-refresh and confirm the live bundle contains the new labels or routes.

6. Keep admin pages out of service-worker cache. `public/sw.js` must continue to bypass `/admin` pages.

7. If a feature depends on database fields, include the SQL migration in the same commit.


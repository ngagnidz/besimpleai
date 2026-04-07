# AI Judge

A web app that runs LLM-based judges on annotation submissions and records pass/fail/inconclusive verdicts with reasoning. Upload a JSON file, configure judges, assign them to questions, run evaluations against real LLM APIs, and visualize results.

## Setup

```bash
npm install
npm run dev
```

Requires `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
VITE_ANTHROPIC_API_KEY=
```

## Trade-offs

**1) API Keys in the Browser**
The OpenAI and Anthropic keys are exposed in DevTools and LLM calls run from the browser. This is not acceptable in production as any client can access and extract the keys. The fix is a Supabase Edge Function to store the keys on the server and act as a proxy. I skipped this because the project serves as a demo and the current approach is quicker to set up.

**2) Concurrency and Rate Limits**
The evaluation runner makes one LLM call per submission × question × judge combination. I used p-limit(3) to limit parallel requests to 3 and added exponential backoff retry on 429s. Without a cap, evaluation requests would hit API rate limits. The downside is throughput because running 3 at a time is slower than full parallelism.

**3) No Pagination**
The results table renders all evaluations at once. With a large dataset this means the data will load slowly and use a lot of browser memory. The right fix is cursor-based pagination so only visible rows are rendered. I skipped it because the demo dataset is small and it would have taken time away from core features.

**4) Re-runs Overwrite Prior Verdicts**
Running judges again replaces the previous verdict for the same submission × question × judge combination instead of keeping both. It keeps the results table clean but we lose history, and we can't compare what the old rubric produced vs the new one. In production we would use versioned evaluations.

## Extras 
Pass-rate by judge bar chart, CSV export

## Time Spent
18 hours

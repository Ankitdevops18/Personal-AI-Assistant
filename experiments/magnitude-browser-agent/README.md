# Experiment: Magnitude (browser automation agent)

Status: spike, not wired into any agent yet. See master plan section 6.14 for the decision and full reasoning — this file is the practical "how to actually run it" companion.

## What this is testing

JARVIS has no way to operate a website that doesn't expose an API — a job portal's "Apply now" form, a broker dashboard with no read API, a page you just want structured data pulled off of. [Magnitude](https://github.com/magnitudedev/browser-agent) (npm: `magnitude-test`) is a vision-first browser agent: it looks at a real page and does `agent.act("click apply and fill the form with...")` / `agent.extract(schema)` in natural language, using a visually-grounded LLM to find and click the right elements.

**Not** the repo you originally linked (`magnitudedev/magnitude`) — that repo now holds a different, unrelated tool (a local model inference server, evaluated separately, parked as Option B below). The actual browser-automation "Magnitude" lives at `magnitudedev/browser-agent`.

## Why this is a spike, not a build

Career & Income Agent (the obvious first consumer — job-portal applications) isn't scaffolded yet; Phase 1 is still Learning/News/Finance per the master plan. This experiment exists to answer one question before committing: **does Magnitude work cleanly through JARVIS's existing LiteLLM gateway, or does it need its own direct key?** That answer decides whether adopting it costs you a new portal or not.

## Setup (run this yourself — see note below)

```bash
npx create-magnitude-app my-magnitude-test
cd my-magnitude-test
npm install
```

I couldn't run `npm install` myself in this session — the sandbox's network policy blocks the npm registry from the shell tools available here. This needs to happen on your machine, where npm has normal internet access. Everything below is meant to be dropped into the project `create-magnitude-app` scaffolds for you.

## LLM config: the part actually worth testing

Magnitude's docs confirm three ways to point it at a model:
1. Direct Anthropic key (`ANTHROPIC_API_KEY`) — simplest, but a new portal, the exact thing the Bedrock consolidation (6.12/6.13) was trying to avoid.
2. A direct Bedrock client — their docs mention this exists but don't show the exact config shape.
3. **`openai-generic` provider with a `baseUrl` override** — confirmed via their own docs, shown there pointing at OpenRouter. This is the interesting one: JARVIS's `gateway/config.yaml` already speaks the same OpenAI-compatible API. Pointing this at the LiteLLM gateway instead of a new key is the whole point of trying option 3 first.

`magnitude.config.ts` in this folder is written for option 3, pointed at your `premium` tier (Bedrock Claude Sonnet) through the gateway:

```typescript
llm: {
    provider: 'openai-generic',
    options: {
        baseUrl: process.env.LITELLM_BASE_URL,   // e.g. http://localhost:4000/v1
        model: 'premium',                          // the tier alias, not a raw model string — same as every other agent
        apiKey: process.env.LITELLM_MASTER_KEY,   // reuses the gateway's existing auth, no new secret
    },
},
```

**The real unknown, and the actual point of this spike**: Magnitude needs a model with genuine *visual grounding* (pixel-accurate element location, not just "can see an image"). Their docs explicitly list plain OpenAI/Gemini/Llama as *not* grounded — Claude Sonnet 4 and Qwen-2.5VL 72B are. Whether that grounding behavior survives the extra hop (Magnitude → LiteLLM gateway's OpenAI-compatible endpoint → Bedrock → Claude Sonnet) rather than calling Anthropic directly is unverified — this is the same category of "does it survive going through the gateway" question as the Bedrock prompt-caching uncertainty already flagged in `gateway/config.yaml`. Test it before assuming either way.

**If option 3 doesn't work** (grounding breaks, or errors out): fall back to `.env.example` in this folder's commented-out direct `ANTHROPIC_API_KEY` block — that's one extra portal, worth it if the gateway route genuinely doesn't work, not worth defaulting to without checking.

## Suggested first test — do NOT point this at a real account yet

Test against a safe public demo page first, not a real job portal or anything with your actual credentials:

```typescript
// tests/smoke.mag.ts — adjust import names to whatever `create-magnitude-app`
// actually generates for your installed version; check its scaffolded example
// file first and pattern-match against that rather than this file verbatim.
import { test } from 'magnitude-test';

test('fills a public demo form', async ({ agent }) => {
    await agent.act('go to https://the-internet.herokuapp.com/login');
    await agent.act('type "tomsmith" in the username field and "SuperSecretPassword!" in the password field, then click login');
    const result = await agent.extract('the page heading text after logging in');
    console.log(result);
});
```

(That's a public, intentionally-fake login demo maintained for automation testing — real credentials are published on the page itself, nothing sensitive.) Once that runs clean, only then consider pointing it at anything real, and only with your explicit go-ahead per request at that point — this experiment doesn't grant standing permission to fill out real job applications or touch real accounts on its own.

## Reporting back

Once you've run `npm install` and the smoke test on your machine: tell me what happened (grounding worked / didn't through the gateway, any errors) and I'll fold the result into master plan 6.14 and decide whether this becomes a real dependency of the (still-unbuilt) Career & Income Agent, or whether it needs the direct-Anthropic fallback.

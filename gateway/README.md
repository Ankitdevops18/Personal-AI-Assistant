# LLM Gateway — LiteLLM

Concrete implementation of the master plan's "LLM Gateway" component. See `docs/LLM_GATEWAY_CONTRACT.md` for the request/response contract every agent builds against.

## Install

```bash
# from the repo root
pip install --user 'litellm[proxy]'
# or, if you use uv:
# uv tool install 'litellm[proxy]'
```

## Configure

```bash
cp .env.example .env
# fill in OPENAI_API_KEY / LITELLM_MASTER_KEY / AWS creds in .env — ANTHROPIC_API_KEY isn't used anymore (6.13)
```

`config.yaml` references those as environment variables, so LiteLLM needs them exported before it starts:

```bash
export $(grep -v '^#' .env | xargs)
```

**Bedrock needs one extra one-time step** (master plan 6.12, 6.13): `frontier`, `premium`, `cheap-reliable`, and `bedrock-nova-micro` route through AWS Bedrock, not direct Anthropic. Before anything on those tiers works, enable "Model access" for Claude Opus 4.1, Claude Sonnet 4.5, Claude Haiku 4.5, and Amazon Nova Micro in the Bedrock console, for whichever region you set `AWS_REGION_NAME` to — usually instant, occasionally needs a short use-case description. Auth is the standard AWS credential chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in `.env`, an `AWS_PROFILE`, or an instance role once this runs on EC2/ECS) — don't set `api_key` on Bedrock model entries in `config.yaml`, it breaks that chain.

**`premium-fallback` (GPT-4o) deliberately stayed off Bedrock** (6.13): OpenAI models did go GA on Bedrock in 2026, but through a completely different mechanism — a separate `bedrock-mantle` endpoint, the OpenAI Responses API, and a Bedrock-issued bearer token, not the IAM credential chain every other Bedrock tier here uses. Moving it would trade one credential for another rather than removing a portal, and would fold JARVIS's one AWS-independent reliability fallback into AWS. Keeps needing its own `OPENAI_API_KEY`.

## Run

```bash
litellm --config gateway/config.yaml
```

Runs on `http://0.0.0.0:4000` by default. Leave this running in its own terminal tab — Hermes talks to it over HTTP.

**Startup error: `DATABASE_URL uses unsupported scheme '<missing scheme>'`** — means `DATABASE_URL` is exported but empty. LiteLLM reads that env var directly at startup regardless of whether `general_settings.database_url` in `config.yaml` is commented out. Fix: `unset DATABASE_URL` in that shell, or make sure the line is commented out (`# DATABASE_URL=`) in your `.env` before running `export $(grep -v '^#' .env | xargs)` — `.env.example` ships it commented out for exactly this reason; don't uncomment it until the Phase 2 Postgres actually exists.

**Runtime error on any Bedrock tier: `BedrockException Invalid Authentication - The security token included in the request is invalid`** (master plan 6.15/6.16, two real causes found chasing this) — first, check `env | grep AWS` in the exact shell about to run `litellm` and confirm `AWS_SECRET_ACCESS_KEY` actually shows a value, not just `AWS_ACCESS_KEY_ID`/`AWS_REGION_NAME` — a blank secret key is the single most likely cause, and `aws sts get-caller-identity` passing in the same terminal does NOT rule this out (it may be using a different credential source, like a default `~/.aws/credentials` profile, than what's actually exported from `.env`). Full troubleshooting order (whitespace, temporary/SSO credentials needing `AWS_SESSION_TOKEN`, a deactivated key) is in `gateway/config.yaml`'s comments on the `frontier` entry.

**Runtime error on Opus/Sonnet/Haiku specifically: `Invocation of model ID ... with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile`** — this Claude generation can't be called by its bare Bedrock model ID; it needs a cross-region inference profile, which is the model ID prefixed with a region-group code (`us.`, `eu.`, `apac.`) matching `AWS_REGION_NAME`. Already applied to `frontier`/`premium`/`cheap-reliable` in `gateway/config.yaml` (`us.` for the default `us-east-1`) — if you switch regions, update the prefix to match, and check the Bedrock console's "Cross-region inference" tab for the exact profile ID.

**Admin UI** — LiteLLM serves a web console at `http://localhost:4000/ui` whenever the proxy is running. Log in as `admin`, password = your `LITELLM_MASTER_KEY` (this fallback only applies when `UI_USERNAME`/`UI_PASSWORD` aren't set in `.env` — set those instead if you want a real login separate from the master key). Confirmed live (6.16): login succeeds, but everything past it — virtual keys, spend tracking, the model list, budgets — needs `general_settings.database_url` pointed at a real Postgres, and fails with `Authentication Error, Not connected to DB!` without one. That's expected right now, not a bug: Postgres is deliberately deferred to Phase 2 (see the `DATABASE_URL` note above). Nothing to fix until that Postgres exists — the UI becomes fully usable the same moment `budget_duration`/`max_budget` enforcement does.

## Verify it works

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "cheap", "messages": [{"role": "user", "content": "reply with exactly: gateway is alive"}]}'
```

If that comes back with a real response, the gateway half of Week 1 is done — move to `hermes/README.md`.

## Notes

- Model names in `config.yaml` are aliases — this is what makes the system model-agnostic. Agents (and Hermes) should only ever ask for a tier alias, never a provider-specific model string directly.
- Cost tracking is built into LiteLLM once `master_key` is set — no extra setup needed for Week 1. Revisit `general_settings` later if you want spend logged somewhere other than the default local store.
- **Token optimiser + cost/usage HUD** (master plan 6.9, full detail in `docs/COST_HUD.md`): prompt caching (`enable_anthropic_prompt_caching`) and a monthly budget cap (`max_budget`/`budget_duration`) are already set in `litellm_settings` below — config-only, on from Week 1. The budget cap needs `general_settings.database_url` pointed at Postgres to actually enforce (fill it in once the Phase 2 memory Postgres exists — until then it's set but not policed). A context-trimming/response-cache pre-call hook is scoped for Phase 2, not built yet.

## Tiers, in full (see the master plan section 6.8 and the vault note `LLM Cost & Model Routing — Reference Notes` for the full reasoning — this is the short version)

| Tier | Model | Cost | Use for |
|---|---|---|---|
| `frontier` | Claude Opus 4.1 (via AWS Bedrock) | $15/$75 per MTok | Trading Agent only (Phase 7) — highest stakes |
| `premium` | Claude Sonnet 4.5 (via AWS Bedrock) | $3/$15 | JARVIS Core, Finance/Investment, Health, technical Learning |
| `mid` | Nemotron 3.5 Lightning (via OpenRouter) | $0.08/$0.20 | Near-default middle tier — cheap enough to default to, capable enough to be a real fallback for `premium`. Swapped from the never-real "Nemotron 3 Super" slug, 6.15 |
| `cheap` | GPT-OSS-120B (via Groq, free) | $0 | **Entry point** for the whole cost-minimization waterfall below — see fallback semantics. Swapped from Llama 3.3 70B (moved to Groq's Enterprise tier), 6.15 |
| `cheap-reliable` | Claude Haiku 4.5 (via AWS Bedrock, 6.13) | $1/$5 | Renamed from the old `cheap` (6.12) — paid, reliable, now correctly positioned as `cheap`'s last-resort fallback, not its primary |
| `free-groq` / `free-cerebras` / `free-openrouter` | GPT-OSS-120B / GPT-OSS-120B / Nemotron 3.5 Lightning (three free hosts) | $0 | News, English/personality practice, high-volume low-stakes work. Model slugs updated 6.15 — see `gateway/config.yaml` for why each one changed |
| `bedrock-nova-micro` | Amazon Nova Micro (via AWS Bedrock) | $0.035/$0.14 | Replaces the old Experiential rung (6.12) — stable, no promotional-pricing-cliff risk |
| `premium-fallback` | GPT-4o (direct OpenAI, deliberately not Bedrock — 6.13) | provider-dependent | Cross-provider reliability fallback for `premium`, and the one tier that survives an AWS-wide outage (needs `OPENAI_API_KEY`) |
| `experimental` | OpenRouter catalog (Qwen, GLM, etc.) | varies | Manual-only, never automatic — see below |

Only `cheap` and `premium` need real keys for Week 1 (Groq's free key, and AWS Bedrock access — see Configure above). Add the others' keys when the agent that uses them gets built — `mid`, `free-cerebras`, `free-openrouter`, `bedrock-nova-micro`, `cheap-reliable` all only need their env vars added to `.env` when you're ready (`OPENROUTER_API_KEY`, `CEREBRAS_API_KEY`, the AWS credentials — free/cheap signups, `.env.example` has the console links). `premium-fallback` is the one exception that still needs its own separate key (`OPENAI_API_KEY`) rather than sharing the AWS credentials.

**Fallback semantics — two different things, don't conflate them:**
- `frontier`/`premium` fall back to a *different provider at the same capability tier* (reliability — the provider is down, not that the task is too cheap for this tier).
- `cheap` **is** the cost-minimization waterfall's entry point, not just its trigger — this was a real bug until 6.12: `cheap` used to alias directly to Haiku (paid), with free providers only tried if Haiku itself errored, meaning every routine call paid Haiku's price first. Fixed by making `cheap` resolve to the free Groq deployment directly, with its fallback chain ordered by actual cost: `free-cerebras → free-openrouter → bedrock-nova-micro → mid → cheap-reliable` (Haiku, genuinely last resort now). Try every free option, then the cheapest paid one, before ever touching a pricier tier.

**`bedrock-nova-micro`** (master plan 6.12, replaces the dropped Experiential Labs rung): Amazon's own smallest/cheapest Bedrock model, at a real, permanent price — no promotional pricing to disappear on you, unlike the Experiential integration this replaced (which had its own "NOT ZDR" data-retention flag on top of the pricing-cliff risk). Needs the same AWS credentials as `frontier`/`premium` above, just Nova Micro's own "Model access" toggle in the Bedrock console.

**`experimental`** (OpenRouter's full catalog: Qwen, GLM, Nemotron variants, Llama, and more) is deliberately *not* in any fallback chain. Several models in that wider catalog (and Gemini-hosted ones reachable through it) do train on free-tier inputs/outputs by provider policy — unlike `free-openrouter`'s specific Llama endpoint, which was checked directly (6.13, see `docs/MODEL_ROUTING.md`) and defaults to not logging/training. `experimental` is still fine for poking at a model out of curiosity, wrong for anything touching your finances, health, or vault content. Call it explicitly (`/model experimental` in Hermes), never let it fire automatically.

Skip Alibaba's DashScope (Qwen direct) and Zhipu/Z.ai (GLM direct) for now — no free tier worth the extra account/billing setup when OpenRouter and NVIDIA's NIM (build.nvidia.com) already cover the same models. NIM is worth knowing about for quickly comparing model quality, but NVIDIA is explicit that its free tier is for prototyping, not something to depend on — not wired in here either.

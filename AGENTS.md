# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project status

Phase 1, Week 1 — proving the skeleton (target: 30 Sept 2026). The living plan and full reasoning live in the Obsidian vault at `Efforts/Projects/Jarvis/Jarvis Master Plan.md`. This repo does not duplicate it.

## Running the system

### Prerequisites

```bash
cp .env.example .env
# Fill in: GROQ_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION_NAME,
#          LITELLM_MASTER_KEY (openssl rand -hex 32), OPENAI_API_KEY (premium-fallback)
# Before first run: enable "Model access" for Codex Opus/Sonnet/Haiku and Amazon Nova Micro
# in the Bedrock console for the region set in AWS_REGION_NAME.
pip install --user 'litellm[proxy]'
```

### Start the gateway (keep this running in its own terminal)

```bash
export $(grep -v '^#' .env | xargs)
litellm --config gateway/config.yaml
# Runs on http://0.0.0.0:4000
```

**Critical env var gotcha:** never leave `DATABASE_URL` uncommented-but-empty in `.env`. LiteLLM reads it directly at startup and crashes with `"unsupported scheme '<missing scheme>'"` — keep it commented out until Phase 2's Postgres exists.

### Verify gateway

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "cheap", "messages": [{"role": "user", "content": "reply with exactly: gateway is alive"}]}'
```

### Run Hermes (agent runtime)

```bash
# Install once:
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash && source ~/.zshrc
hermes setup   # base URL: http://localhost:4000/v1, API key: LITELLM_MASTER_KEY value

# Daily use (gateway must be running first):
hermes
```

Switch models mid-conversation with `/model cheap` or `/model premium` inside Hermes.

## Architecture

```
gateway/    LiteLLM proxy — model routing, fallbacks, cost tracking (gateway/config.yaml)
hermes/     Hermes Agent runtime config — the conversational frontend
agents/     Domain agents: learning, news, finance (Week 2+)
mcp/        MCP tool integrations — Obsidian, filesystem (Phase 2+)
memory/     Postgres + pgvector schema (Phase 2+)
automation/ n8n workflows (Phase 2+)
hud/        Minimal daily brief (Phase 1), richer dashboard (Phase 6)
docs/       Architecture, gateway contract, model routing, cost HUD, runbooks
experiments/ Spikes not yet wired in (e.g. Magnitude browser agent)
```

All folders beyond `gateway/` and `hermes/` are placeholders — each has a README stating what lands there and when.

## LLM Gateway — key concepts

**The gateway is the only layer that knows about providers.** Hermes and every agent call a tier alias (`cheap`, `premium`, etc.) — never a provider-specific model string. Swapping providers means changing `gateway/config.yaml`, nothing else.

### Tier aliases

| Alias | Model | When to use |
|---|---|---|
| `frontier` | Codex Opus 4.1 (Bedrock) | Trading Agent only (Phase 7) |
| `premium` | Codex Sonnet 4.5 (Bedrock) | JARVIS Core, Finance, Health, technical Learning |
| `mid` | Nemotron 3.5 Lightning (OpenRouter) | Near-default middle — career agent, PKM, mixed tasks |
| `cheap` | GPT-OSS-120B (Groq, free) | High-volume, low-stakes — news, life planner. Entry point of the free waterfall |
| `premium-fallback` | GPT-4o (direct OpenAI) | Auto-fallback for `premium`. The one tier not on AWS |
| `experimental` | Qwen3.8-flash (OpenRouter) | Manual-only, never in agent code |

`cheap`'s fallback chain (ordered by cost): `free-cerebras` → `free-openrouter` → `bedrock-nova-micro` → `mid` → `cheap-reliable` (Haiku on Bedrock). Never call `cheap-reliable` or `premium-fallback` directly — the gateway routes there automatically.

**Privacy rule:** AWS Bedrock tiers (`frontier`, `premium`, `cheap-reliable`, `bedrock-nova-micro`) are safe for finance/health/vault content. Free tiers (`free-groq`, `free-cerebras`, `free-openrouter`) are not — routine/low-stakes only.

### Bedrock auth

No `api_key` in the Bedrock model entries in `config.yaml` — it breaks the IAM credential chain. Auth comes from `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION_NAME` in `.env`. If you get `Invalid Authentication`, run `env | grep AWS` in the exact shell running `litellm` and verify `AWS_SECRET_ACCESS_KEY` has a value. Temporary credentials (SSO, STS) also need `AWS_SESSION_TOKEN`.

For the Codex 4.x generation, Bedrock requires a cross-region inference profile ID (prefixed with `us.`, `eu.`, or `apac.` matching the region group of `AWS_REGION_NAME`), not a bare model ID — already applied in `config.yaml` for `us-east-1`.

## Gateway contract

- **Request:** `POST http://localhost:4000/v1/chat/completions` with `Authorization: Bearer $LITELLM_MASTER_KEY`
- **Response:** standard OpenAI chat-completions format — read `choices[0].message.content`
- **Spend tracking:** available at `/spend/logs` once `DATABASE_URL` is set (Phase 2)
- **Budget cap:** $30/30d set in `litellm_settings` — enforced only once Postgres is wired

## Custom skill

`.agents/skills/push/SKILL.md` defines a `push` skill for when Ankit asks to commit and push. It stages everything (`git add -A`), writes a commit from the actual diff, and pushes to the current branch's remote. It does **not** hand-pick files and does **not** use `--amend`.

## Docs map

- `docs/WEEK1_RUNBOOK.md` — exact steps to prove gateway + Hermes end-to-end
- `docs/ARCHITECTURE.md` — system diagram, current layer decisions
- `docs/LLM_GATEWAY_CONTRACT.md` — what every agent can assume about the gateway
- `docs/MODEL_ROUTING.md` — which agent calls which tier and why; per-provider privacy notes
- `docs/COST_HUD.md` — token optimiser layers and spend-tracking plan
- `gateway/README.md` — full gateway setup, all known startup errors and fixes

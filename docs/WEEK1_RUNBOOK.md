# Week 1 runbook — prove the skeleton

Goal (from the master plan, Sept 3–9): Hermes ↔ LiteLLM gateway ↔ one LLM, holding a reliable conversation. Nothing else this week — no agents, no MCP, no Obsidian connection.

Two terminal tabs: one for the gateway (stays running), one for everything else.

## 1. Set up secrets

```bash
cd "Personal-AI-Assistant"   # this repo
cp .env.example .env
```

Open `.env` and fill in:
- `GROQ_API_KEY` — free signup at console.groq.com, needed for `cheap` (which now IS the free tier's entry point, see `gateway/README.md`)
- AWS Bedrock credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION_NAME`, or an `AWS_PROFILE` if you'd rather use one) — needed for `premium`. One-time step before this works: enable "Model access" for Claude Sonnet 4.5 in the Bedrock console, for whatever region you set. Full detail: `gateway/README.md`.
- `ANTHROPIC_API_KEY` (optional this week — only needed if you want `cheap-reliable`'s Haiku fallback working, not required for the Week 1 checkpoint)
- `LITELLM_MASTER_KEY` — any random string, e.g. output of `openssl rand -hex 32`

## 2. Start the gateway (tab 1 — leave running)

```bash
pip install --user 'litellm[proxy]'
export $(grep -v '^#' .env | xargs)
litellm --config gateway/config.yaml
```

Full detail: `gateway/README.md`.

## 3. Verify the gateway (tab 2)

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "premium", "messages": [{"role": "user", "content": "reply with exactly: gateway is alive"}]}'
```

Checkpoint: you get a real response back. If not, stop here and debug the gateway before touching Hermes — no point layering Hermes on top of a broken foundation.

## 4. Install and configure Hermes (tab 2)

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
hermes setup
```

Point it at `http://localhost:4000/v1` with the `LITELLM_MASTER_KEY` value as its API key. Full detail: `hermes/README.md`.

## 5. Prove it end-to-end

```bash
hermes
```

- Ask it something real, get a coherent answer.
- Run `/model premium`, ask another question, confirm it still works.
- Run `/model cheap`, confirm that works too.

## Done when

- [ ] Gateway responds to the curl test.
- [ ] Hermes holds a real conversation through the gateway.
- [ ] Both `cheap` and `premium` tiers work from inside Hermes.
- [ ] You've noted (in `hermes/README.md` or back in the vault) what Hermes' built-in memory/multi-channel/scheduling features actually look like once you've poked at them — informs whether Week 2+ builds those or reuses them.

Once all four are checked, Week 1 is done. Week 2 (PKM/MCP Obsidian connection + Learning Agent + Daily News Agent) picks up from there — not in this runbook, comes next once this is solid.

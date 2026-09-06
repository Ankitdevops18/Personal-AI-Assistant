# Token optimisation & the cost/usage HUD

Code-facing detail behind master plan section 6.9. Two distinct things, easy to conflate: the **token optimiser** spends less; the **cost/usage HUD** shows what's being spent. Both live inside the LLM Gateway (`gateway/config.yaml`) — neither is a new agent, neither needs new infrastructure beyond what's already planned in `docs/ARCHITECTURE.md`.

## Token optimiser

Three layers, cheapest first. Only the first two exist right now.

1. **Prompt caching (on, Week 1).** `litellm_settings.enable_anthropic_prompt_caching: true` in `gateway/config.yaml` auto-injects `cache_control` breakpoints on the system prompt and trailing turn for every Claude call — no per-agent code. A cached read runs around 10% of a fresh input read (Anthropic's published multiplier — spot-check against current pricing before relying on the exact number). TTL is 1h, not the 5-minute default, since JARVIS Core and Finance hit the same system prompt repeatedly across a day rather than back-to-back.
2. **Budget cap (on, Week 1).** `litellm_settings.max_budget: 30` / `budget_duration: "30d"` — a hard proxy-wide ceiling matching the $10–30/month estimate in master plan 6.8. This doesn't reduce tokens; it's insurance against the optimiser or the routing table having a bug. Requires `general_settings.database_url` (see below) to actually be enforced — without it the number is set but not policed.
3. **Pre-call hook (Phase 2, not built yet).** LiteLLM supports `async_pre_call_hook` — a Python callback that can inspect/modify a request before it's sent (see [LiteLLM's call-hooks docs](https://docs.litellm.ai/docs/proxy/call_hooks)). Once JARVIS Core is running daily and there's real usage to look at, build:
   - **Context trimming** — top-k pgvector chunks for PKM/vault lookups instead of whole notes; a rolling summary of Hermes conversation history beyond N turns instead of resending it verbatim.
   - **Exact-match response cache** — hash of `(agent, tier, prompt)` → cached response with a TTL, in the same Postgres as everything else, for genuinely repetitive low-stakes calls (Daily News, "what's on my plate today"). Upgrade to an embedding-based semantic cache (GPTCache, a Redis vector cache) only if repeat-query volume actually justifies the extra moving part.

   Don't build #3 speculatively — it's the one item here that costs engineering time rather than a config line, so it waits for a real repeat-query pattern to point at.

## Cost/usage HUD

Nothing new to track — LiteLLM's proxy already computes cost and tokens per request once it has a database. The one prerequisite: `general_settings.database_url` in `gateway/config.yaml` points at the **same Postgres already planned for memory/pgvector** (not a second database) — also what makes the budget cap above actually enforceable, since LiteLLM's budgets require Postgres, not the default local SQLite.

Once that's wired, the data is already there:

| Need | Endpoint |
|---|---|
| Per-request detail | `/spend/logs` (`?summarize=true` for aggregated) |
| Aggregate by team/customer/user | `/global/spend/report` |
| Per-user daily breakdown by model/provider/key | `/user/daily/activity` |

**Free-tier quota is the gap.** None of the above is spend data (free = $0), but RPM/TPM/RPD consumed on Groq/Cerebras/OpenRouter free is the actual scarce resource the `cheap` tier's waterfall (`docs/MODEL_ROUTING.md`) depends on — and those published limits are inconsistent enough across sources (see `gateway/config.yaml`'s comments) that a real counter matters more than it might seem. That counter doesn't exist yet — it belongs in the same pre-call hook as the optimiser's item 3 above, not as separate infrastructure.

**Phase 1 ("minimal HUD")**: no new UI. A `/spend/logs?summarize=true` call folded into the daily automated brief already scheduled for Phase 1 — today's + month-to-date tokens/$ by agent, as a few lines in a message that already exists.

**Phase 6 ("richer HUD")**: a real visual dashboard — spend trend vs. the monthly budget, per-agent/tier breakdown, free-tier quota consumed today. Read the `dataviz` conventions when this actually gets built; nothing to decide about it now.

## Experiential Labs — evaluated, then dropped (master plan 6.10–6.12)

Was briefly the `free-experiential` provider in this file's earlier version. Dropped in favor of AWS Bedrock (`bedrock-nova-micro` now fills that role, see `docs/MODEL_ROUTING.md`) — full reasoning for both the original evaluation and the decision to drop it lives in the master plan (sections 6.10, 6.11, 6.12), not repeated here since none of it is active in this repo anymore. Two ideas from that evaluation are still worth revisiting later, independent of whether Experiential itself is in the picture: trace-based prompt-compression audits, and flagging bursty/non-realtime workloads (Daily News, Learning's daily lesson generation) as batch-eligible. Neither is wired into anything yet.

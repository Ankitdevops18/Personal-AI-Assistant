# JARVIS — Personal AI Operating System

Status: **Phase 1, Week 1 — proving the skeleton** (target: 30 Sept 2026)

This repo is the code side of the JARVIS project. The living plan — vision, agent roster, tech-stack decisions, and the reasoning behind them — lives in the Obsidian vault at `Efforts/Projects/Jarvis/Jarvis Master Plan.md`. This repo doesn't duplicate that document; `docs/ARCHITECTURE.md` here is a short, code-focused snapshot of it, kept current enough to orient anyone (including future-you) opening this repo cold.

## Structure

```
gateway/      LLM Gateway (LiteLLM) — model routing, cost tracking. Week 1.
hermes/       Hermes Agent config — the agent runtime. Week 1.
agents/       Domain agents (learning, news, finance, ...). Week 2+.
mcp/          MCP tool/data integrations (Obsidian, filesystem, ...). Phase 2+.
automation/   n8n workflows and scheduling. Phase 2+.
memory/       Postgres + pgvector schema (state + semantic memory). Phase 2+.
docs/         Architecture snapshot, LLM Gateway contract, runbooks.
```

Folders beyond `gateway/` and `hermes/` are placeholders for now — each has a short README saying what will land there and when, so the shape of the system is visible from day one without pretending it's all built.

## Getting started (Week 1)

See `docs/WEEK1_RUNBOOK.md` for the exact commands. Short version: stand up the LiteLLM gateway in front of one model, install Hermes, point Hermes at the gateway, prove it can hold a reliable conversation through it. That's the whole Week 1 success criterion — nothing else yet.

## Principles (from the master plan — see it for the full reasoning)

- Local-first development, cloud-portable design.
- Model-agnostic: JARVIS never depends on one LLM provider.
- Cost-aware: cheapest model that can reliably do the job.
- Permission-aware: sensitive actions are proposed, not just executed.
- Replaceable components: any layer (runtime, gateway, DB, UI) can be swapped without a rewrite.

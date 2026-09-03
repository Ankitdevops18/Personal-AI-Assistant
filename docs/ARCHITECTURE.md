# Architecture snapshot

Full reasoning and living decisions: `Jarvis Master Plan.md` in the Obsidian vault (`Efforts/Projects/Jarvis/`). This file is a short, code-oriented mirror — update it when the architecture actually changes, don't treat it as the source of truth.

```text
                         ┌─────────────────────┐
                         │      JARVIS UI       │   Chat / minimal HUD (later)
                         └──────────┬───────────┘
                                    │
                         ┌─────────────────────┐
                         │    JARVIS CORE        │   intent → agent routing (Phase 5+)
                         └──────────┬───────────┘
       ┌───────────┬───────────┬───┴───────┬────────────┬─────────────┐
       ▼           ▼           ▼            ▼            ▼             ▼
   Learning &    Life /     Finance /    Career &      Health       Trading
   Growth        Daily      Investment   Income        Agent        Agent
   Agent         Planner    Agent(s)     Agent                      (gated)
       │           │           │            │            │             │
       └───────────┴───────────┴─────┬──────┴────────────┴─────────────┘
                                      ▼
                          ┌────────────────────────┐
                          │      HERMES AGENT       │   agents/, hermes/
                          └───────────┬────────────┘
                     ┌────────────────┴────────────────┐
                     ▼                                  ▼
              ┌─────────────┐                   ┌──────────────┐
              │  MCP Layer  │                   │  LLM Gateway  │  gateway/ (LiteLLM)
              │ mcp/        │                   │               │
              └──────┬──────┘                   └──────┬───────┘
                     ▼                                  │
          ┌──────────────────────┐             ┌────────┼────────┐
          │   PERSONAL MEMORY     │             ▼        ▼        ▼
          │   memory/              │          cheap  premium  premium-
          │   Obsidian + pgvector  │                        fallback
          └──────────────────────┘
```

## Current decisions (mirrors the vault decision log)

| Layer | Choice | Status |
|---|---|---|
| Agent runtime | Hermes Agent (Nous Research) | In progress — `hermes/` |
| LLM Gateway | LiteLLM | In progress — `gateway/` |
| Memory (structured + semantic) | Postgres + pgvector | Not started — `memory/` |
| Memory (knowledge) | Obsidian vault | External, already exists |
| Tool/data integration | MCP | Not started — `mcp/` |
| Chore automation | n8n | Not started — `automation/` |
| UI | Minimal HUD first, richer later | Not started |

## Phase 1 (this repo's current focus)

Week 1: this file's diagram down to `HERMES AGENT` + `LLM Gateway` proven working (see `docs/WEEK1_RUNBOOK.md`). Week 2+: Learning, News, Finance agents; MCP → Obsidian. Full week-by-week and everything beyond Phase 1 lives in the vault master plan, not here.

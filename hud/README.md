# JARVIS UI / HUD

Placeholder — no code here yet. See master plan section 6.9 and `docs/COST_HUD.md` for the reasoning.

**Phase 1 ("minimal HUD")**: not a separate surface. Cost/usage is a few lines folded into the daily automated brief (whatever channel Hermes already delivers it through — Telegram/CLI/etc). Nothing to build in this folder yet.

**Phase 6 ("richer HUD")**: a real dashboard lands here — chat/interaction surface plus the cost/usage panel from `docs/COST_HUD.md` (spend trend vs. budget, per-agent/tier breakdown, free-tier quota consumed). Also where voice gets added per the roadmap.

Until Phase 6, don't build UI code speculatively — the data this folder will eventually display already exists (LiteLLM's spend endpoints, see `docs/COST_HUD.md`); there's nothing to visualize yet that the daily brief can't already say in text.

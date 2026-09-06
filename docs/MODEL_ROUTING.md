# Model routing — which agent calls which tier

Code-facing mirror of the master plan's section 6.8. Full pricing/benchmark reasoning lives in the vault note `LLM Cost & Model Routing — Reference Notes` (`Efforts/Projects/Jarvis/`) — this file is what an agent's code should actually reference when deciding which gateway tier to call. Tier definitions (what each alias points to) live in `gateway/config.yaml`.

| Agent | Tier to call | Fallback (handled by the gateway automatically) |
|---|---|---|
| JARVIS Core (orchestrator) | `premium` (AWS Bedrock) | `premium-fallback` → `mid` |
| Trading Agent (Phase 7) | `frontier` (AWS Bedrock) | `premium` |
| Finance / Investment Agent | `premium` (AWS Bedrock) | `premium-fallback` → `mid` |
| Learning & Growth — technical track | `premium` or `mid` | (per whichever is called) |
| Learning & Growth — English/personality track | `mid` or `cheap` | `cheap` falls through its own waterfall, see below |
| Career & Income Agent | `mid` | `free-cerebras` → `free-openrouter` → `bedrock-nova-micro` |
| Health Agent | `premium` (lightweight prompts, AWS Bedrock) | `premium-fallback` → `mid` |
| Daily News Agent | `cheap` (itself the free waterfall's entry point) | `free-cerebras` → `free-openrouter` → `bedrock-nova-micro` → `mid` → `cheap-reliable` |
| Life / Daily Planner + chore automation | `cheap` | same waterfall as above |
| PKM Intelligence layer | `mid` or `premium` | per whichever is called |

**`cheap` is the waterfall's entry point, not just its trigger** (fixed in master plan 6.12 — this used to be backwards): calling `cheap` resolves directly to the free Groq deployment. Only if that errors does it cascade through the rest, cheapest-first: `free-cerebras` → `free-openrouter` → `bedrock-nova-micro` ($0.035/$0.14) → `mid` (Nemotron, $0.085/$0.40) → `cheap-reliable` (Haiku, $1/$5, genuinely the last resort now, and moved to AWS Bedrock in 6.13 — same IAM auth as `frontier`/`premium`/`bedrock-nova-micro`, no separate key). `mid` got its own fallback too while fixing this — it had none before, despite this table previously (incorrectly) implying it fell back through the free tiers: it now degrades to `free-cerebras` → `free-openrouter` → `bedrock-nova-micro` if OpenRouter/Nemotron itself errors.

**Portal count as of 6.13**: four things need keys/credentials — Groq, Cerebras, OpenRouter, and one AWS credential set (covering `frontier`, `premium`, `cheap-reliable`, `bedrock-nova-micro`). `premium-fallback` (GPT-4o) is a deliberate fifth, direct OpenAI — OpenAI models did go GA on Bedrock in 2026, but through a separate `bedrock-mantle`/Responses-API/bearer-token mechanism, not the IAM chain the rest of Bedrock uses here, so moving it would swap one credential for another rather than actually consolidating, and would remove JARVIS's only fallback that survives an AWS-wide outage. Decided to leave it as-is — see master plan 6.13.

**Rule of thumb when adding a new call site**: does this touch money, health, or a decision with real consequences? → `premium` or `frontier`. Is it high-volume and low-stakes (a daily summary, a vocabulary drill)? → `cheap`, and let the gateway's free-tier waterfall absorb the cost. Unsure? → `mid` — it's the "near-default middle tier": cheap enough not to worry about, capable enough not to be a mistake.

**Privacy rule, not just a cost one** (checked directly against each provider's own docs/FAQ, 6.13 — not secondhand summaries):
- **AWS Bedrock** (`frontier`, `premium`, `cheap-reliable`, `bedrock-nova-micro`) — confirmed via AWS's own FAQ, explicitly: "AWS and the third-party model providers will not use any inputs to or outputs from Amazon Bedrock to train Amazon Nova, Amazon Titan, or any third-party models," and none of it is shared with the model providers (Anthropic, Meta, etc.). This covers everything hosted on Bedrock, not just Amazon's own models. Safe for finance/health/vault content.
- **`free-groq`** — no training on your data by default; retains request/response data only up to 30 days, and only for abuse/reliability monitoring or batch jobs (deletable sooner), never for training; same policy on free and paid. Zero Data Retention mode is available in their console if you want to kill even that 30-day copy. Safe.
- **`free-cerebras`** — their own support docs are blunt: they don't retain API requests or responses at all, for any purpose, free or paid. Safe.
- **`free-openrouter`** — the one with real nuance, not a bad-default problem: OpenRouter itself doesn't log prompts/completions by default, and its stated policy is to exclude any provider that does log (or hasn't confirmed a no-log policy) from your routing unless you've explicitly turned on the "model training" toggle in your account's privacy settings — off by default. So the *policy* is fine out of the box. The catch is structural: OpenRouter is a marketplace routing to many different backend hosts — the specific free Llama 3.3 70B endpoint configured here has 13 possible providers behind it (DeepInfra, Together, Novita, SambaNova, Groq, Google Vertex, and others), so which one actually serves a given request varies. More parties in the chain than the other three tiers, even with a protective default. Worth a one-time check that the "model training" opt-in is actually off in your OpenRouter account, and — as before — still avoid it for finance/health/vault content given that variability, not because the default policy is bad.
- **`experimental`** (OpenRouter's broader catalog, including any Gemini-hosted models reachable through it) is NOT covered by the above — several models in that wider catalog do train on free-tier inputs/outputs by provider policy. This tier is manual-only for a reason; never route anything sensitive through it.

Benchmark numbers behind this table are directional (they vary by source/methodology per the reference note's own caveat) — worth a spot-check eval before treating any of this as final, especially before Trading goes anywhere near real capital.

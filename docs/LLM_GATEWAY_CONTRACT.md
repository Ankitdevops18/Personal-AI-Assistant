# LLM Gateway contract

What every agent (and Hermes) can assume when calling the gateway. This is Step B from the roadmap's "Immediate Next Steps" — defined once, up front, so nothing downstream has to guess.

## Request format

Standard OpenAI chat-completions schema (`POST /v1/chat/completions`), since that's what LiteLLM speaks and what Hermes and virtually every agent framework already produce natively. No custom envelope on top.

## Model selection

Callers ask for a **tier alias**, never a provider-specific model string. Full tier list and per-agent assignment: `docs/MODEL_ROUTING.md`. Summary:

- `frontier` — highest-stakes, hardest reasoning (Trading Agent only). AWS Bedrock.
- `premium` — planning, architecture-level reasoning, real money/health stakes. AWS Bedrock.
- `mid` — cheap-but-capable default; use when a task doesn't clearly need `premium` but free-tier rate limits would be annoying.
- `cheap` — routine, high-volume, low-stakes tasks. Resolves to a free provider first (Groq) and only escalates through progressively less-cheap fallbacks if that's unavailable — see `docs/MODEL_ROUTING.md` for the full chain.
- `cheap-reliable` — not called directly; the gateway routes here as `cheap`'s last resort, once every free option and `mid` have failed. AWS Bedrock (6.13).
- `free-groq` / `free-cerebras` / `free-openrouter` / `bedrock-nova-micro` — high-volume, low-stakes, rate-limited-but-free (or, for `bedrock-nova-micro`, fractions-of-a-cent-but-not-free) — never for anything touching personal data, see privacy note in `docs/MODEL_ROUTING.md`.
- `experimental` — manual-only, never called by agent code directly.
- `premium-fallback` — not called directly; the gateway routes here automatically if `premium` fails. Direct OpenAI, deliberately not Bedrock (6.13) — see `docs/MODEL_ROUTING.md`.

Adding a tier (e.g. a `local` tier once local inference is worth running) means adding an entry to `gateway/config.yaml` — no agent code changes.

## Response format

Standard OpenAI chat-completions response. Agents read `choices[0].message.content` as usual; nothing gateway-specific to unwrap.

## Cost information

LiteLLM tracks spend per request once `general_settings.master_key` is set (already is, in `gateway/config.yaml`). Not yet exposed anywhere agents read from — revisit when an agent actually needs to reason about budget (not a Week 1 concern).

## Fallback behavior

Defined per-tier in `router_settings.fallbacks`. Currently: `premium` → `premium-fallback` on failure. Callers don't need to handle provider failover themselves — the gateway does it transparently.

## Error handling

Standard HTTP error codes from the OpenAI-compatible endpoint. No custom error schema yet — add one here if/when an agent needs to distinguish "retry-able" from "not retry-able" gateway errors.

## Observability

Not yet wired to anything outside LiteLLM's own local logging. Revisit once there's more than one agent running, per the master plan's "we should NOT introduce all three [memory layers] on day one" principle applied more generally — don't build observability infra before there's anything to observe.

## Auth

Every request needs `Authorization: Bearer $LITELLM_MASTER_KEY`. One shared key for now (single user, single machine) — revisit if this ever needs per-agent keys.

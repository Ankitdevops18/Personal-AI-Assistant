# LLM Gateway contract

What every agent (and Hermes) can assume when calling the gateway. This is Step B from the roadmap's "Immediate Next Steps" — defined once, up front, so nothing downstream has to guess.

## Request format

Standard OpenAI chat-completions schema (`POST /v1/chat/completions`), since that's what LiteLLM speaks and what Hermes and virtually every agent framework already produce natively. No custom envelope on top.

## Model selection

Callers ask for a **tier alias**, never a provider-specific model string:

- `cheap` — routine tasks: summarization, classification, extraction, daily-brief generation, simple Q&A.
- `premium` — planning, architecture-level reasoning, anything where quality matters more than cost.
- `premium-fallback` — not called directly; the gateway routes here automatically if `premium` fails.

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

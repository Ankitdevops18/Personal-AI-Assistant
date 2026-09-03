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
# fill in ANTHROPIC_API_KEY / OPENAI_API_KEY / LITELLM_MASTER_KEY in .env
```

`config.yaml` references those as environment variables, so LiteLLM needs them exported before it starts:

```bash
export $(grep -v '^#' .env | xargs)
```

## Run

```bash
litellm --config gateway/config.yaml
```

Runs on `http://0.0.0.0:4000` by default. Leave this running in its own terminal tab — Hermes talks to it over HTTP.

## Verify it works

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "cheap", "messages": [{"role": "user", "content": "reply with exactly: gateway is alive"}]}'
```

If that comes back with a real response, the gateway half of Week 1 is done — move to `hermes/README.md`.

## Notes

- Model names in `config.yaml` (`cheap`, `premium`, `premium-fallback`) are aliases — this is what makes the system model-agnostic. Agents (and Hermes) should only ever ask for `cheap` or `premium`, never a provider-specific model string directly.
- Cost tracking is built into LiteLLM once `master_key` is set — no extra setup needed for Week 1. Revisit `general_settings` later if you want spend logged somewhere other than the default local store.

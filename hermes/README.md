# Hermes Agent — runtime

[Nous Research's Hermes Agent](https://hermes-agent.nousresearch.com/) — open source (MIT), self-hosted. This folder holds JARVIS-specific config/notes, not Hermes' own code (it installs itself outside this repo).

## Install

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
```

This pulls in Python 3.11, Node, and its other dependencies. **Read the install script before piping it to bash** — standard practice for any curl-to-shell installer, doubly so for something you're about to hand data and tool access to.

## Point it at our gateway, not a provider directly

This is the whole point of Week 1 — Hermes talks to `cheap`/`premium` through the LiteLLM gateway (`gateway/`), never straight to Anthropic/OpenAI, so the model behind those names can change without touching Hermes config.

```bash
hermes setup
```

When prompted for a provider, choose the custom/OpenAI-compatible option and enter:

- Base URL: `http://localhost:4000/v1` (matches `LITELLM_BASE_URL` in `.env`)
- API key: the `LITELLM_MASTER_KEY` value from `.env` (Hermes just needs to send *some* key the gateway accepts — the real provider keys stay in the gateway, never in Hermes' config)

Or skip the wizard and edit `~/.hermes/config.yaml` directly with the same values.

## Run it

Make sure the gateway (`gateway/README.md`) is running first, in its own terminal tab, then:

```bash
hermes
```

Opens the interactive terminal UI. Try `/model cheap` or `/model premium` to confirm both aliases resolve through the gateway.

## Week 1 success criterion

Hold a real conversation through `hermes` — ask it something, get a coherent answer, switch models mid-conversation with `/model`, confirm it still works. That's it. No agents, no MCP, no Obsidian connection yet — that's Week 2 onward per the runbook.

## Worth an early check

Hermes ships with its own persistent memory, multi-agent subagents, tool use (web search, browser automation, vision, image gen, TTS), natural-language scheduling, and delivery across Telegram/Discord/Slack/WhatsApp/Email/CLI — built in, out of the box. Before building any of that ourselves later in the roadmap (multi-channel delivery, daily scheduling), check what Hermes already does for free. Note what you find here once you've poked at it.

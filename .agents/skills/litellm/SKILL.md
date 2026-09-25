---
name: litellm
description: "Start, stop, or view/tail logs for the LiteLLM gateway (load .env, run `litellm --config gateway/config.yaml`) — use when Ankit asks to start/run/bring up/restart/stop the gateway, start litellm, or show/tail/watch/check the gateway's logs. Also covers restarting it in debug/detailed-debug mode for verbose logging."
---

# Start / stop / tail the LiteLLM gateway

Use this whenever Ankit asks to start, restart, or stop the LiteLLM gateway, "run litellm", bring the LLM gateway up or down, or see/tail/watch its logs — for the `Personal-AI-Assistant` repo specifically (see `docs/WEEK1_RUNBOOK.md` step 2 and `gateway/README.md`).

The gateway is launched as a detached OS process (`nohup ... &`, not the tool's own background-task flag), logging to `gateway/litellm.log` and recording its PID in `gateway/litellm.pid`. That makes it independent of the calling session — logs are always inspectable, and it can be found and stopped even by a later, unrelated conversation.

## Starting it

1. **Work from the repo root** (`Personal-AI-Assistant`, the directory containing `gateway/` and `.env`). Confirm `.env` exists — if it's missing, tell Ankit to `cp .env.example .env` and fill in keys first (see `gateway/README.md` Configure) rather than guessing at values.

2. **Check nothing is already running.** Look for a live PID first:
   ```bash
   [ -f gateway/litellm.pid ] && kill -0 "$(cat gateway/litellm.pid)" 2>/dev/null && echo "already running"
   ```
   Also check the port directly in case it was started outside this skill: `lsof -i :4000`. If something's already there, ask before killing it — don't silently restart a gateway someone else in another tab is relying on.

3. **Launch it detached, with output captured to a log file**:
   ```bash
   export $(grep -v '^#' .env | xargs)
   nohup litellm --config gateway/config.yaml > gateway/litellm.log 2>&1 &
   echo $! > gateway/litellm.pid
   disown
   ```
   This single Bash call returns immediately (the `&` backgrounds the process at the OS level) — no need for the tool's own `run_in_background` option here.

4. **Confirm it actually started** by tailing the log rather than declaring success just because the command didn't error:
   ```bash
   sleep 2 && tail -n 30 gateway/litellm.log
   ```
   Look for `Uvicorn running on http://0.0.0.0:4000` or an equivalent ready line. Known startup failures, both documented in `gateway/README.md`:
   - `DATABASE_URL uses unsupported scheme '<missing scheme>'` — `DATABASE_URL` is exported but empty. Fix: `unset DATABASE_URL` in that shell, or comment the line out in `.env` before re-exporting, then restart.
   - `BedrockException Invalid Authentication - The security token included in the request is invalid` — almost always `AWS_SECRET_ACCESS_KEY` missing/blank in `.env` even though `AWS_ACCESS_KEY_ID`/`AWS_REGION_NAME` are set. Check `env | grep AWS` in the same shell; don't trust `aws sts get-caller-identity` passing as proof, it may use a different credential source. Full troubleshooting order is in `gateway/config.yaml`'s comments on the `frontier` entry.
   - If it failed to start, the process behind the stale PID is already dead — remove `gateway/litellm.pid` before retrying so the "already running" check in step 2 doesn't get confused later.

5. **Verify with a real request** once it's up:
   ```bash
   curl http://localhost:4000/v1/chat/completions \
     -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "cheap", "messages": [{"role": "user", "content": "reply with exactly: gateway is alive"}]}'
   ```
   Report back briefly: which tier you tested, that it's up on port 4000, and that logs are at `gateway/litellm.log` if Ankit wants to check on it later.

## Debug mode

When Ankit asks to run litellm "in debug mode", "detailed debug", or "verbose" (usually while troubleshooting a routing/auth/fallback issue), restart the gateway with an extra flag on the launch command — it can't be toggled on a process that's already running, so stop it first if one is up (see Stopping it), then start it per the steps above with the flag added:

```bash
nohup litellm --config gateway/config.yaml --detailed_debug > gateway/litellm.log 2>&1 &
```

- `--detailed_debug` is the default choice — full request/response payloads, provider HTTP calls, routing/fallback decisions, per-hook trace lines. This is what "detailed debug" means when Ankit asks for it.
- `--debug` is a lighter verbose mode (less payload noise) — use it only if Ankit asks for plain "debug" specifically, not detailed.
- Detailed-debug logs are much higher volume and include full message content and headers (auth tokens redacted) — if tailing live, filter (`grep`/`grep -v`) rather than streaming raw output, and mention to Ankit that debug mode is on so he remembers to turn it back off (restart without the flag) once he's done troubleshooting — leaving it on isn't harmful but is noisy for future log reads.

## Viewing logs

Ankit shouldn't need to recall the exact command — when he asks to see, check, or tail the gateway's logs, just run it:

- **"show me the logs" / "check the gateway logs" (default — a snapshot, not a live watch):**
  ```bash
  tail -n 100 gateway/litellm.log
  ```
- **"tail the logs" / "watch the logs live" (an explicit ask to follow it):**
  ```bash
  tail -f gateway/litellm.log
  ```
  `-f` never returns on its own, so run it with the background-execution option (`run_in_background`) rather than foreground — a foreground `tail -f` hangs the turn. Once backgrounded, check back on it (or on the underlying gateway process itself) when Ankit asks for an update, and stop the background command when he's done watching rather than leaving it running indefinitely.

The log file persists across restarts unless deleted, so a snapshot `tail` after a long-running gateway may mix old output with new — if the timing matters, note the timestamp of the line you're pointing at (e.g. the most recent `Uvicorn running` line) rather than assuming everything in the tail is from the current run.

## Stopping it

1. Read the PID: `cat gateway/litellm.pid` (if the file's missing, fall back to `lsof -ti :4000` to find whatever's listening on the gateway's port).
2. Kill it: `kill "$(cat gateway/litellm.pid)"`. Give it a couple seconds, then confirm with `lsof -i :4000` that nothing's listening anymore. Only escalate to `kill -9` if a plain `kill` didn't stop it after a few seconds.
3. Remove the PID file: `rm -f gateway/litellm.pid`.
4. Confirm back to Ankit that it's stopped. There's no `litellm stop` subcommand — this PID-file approach is the mechanism.

## Notes

- Don't run the start command in the foreground and wait — the gateway is meant to stay up like a server, not complete.
- The admin UI at `http://localhost:4000/ui` (login `admin` / `LITELLM_MASTER_KEY`) exists but virtual keys/spend tracking need Postgres, deliberately deferred to Phase 2 — an `Authentication Error, Not connected to DB!` there is expected, not a bug to chase.
- `gateway/litellm.log` and `gateway/litellm.pid` are local runtime state, not repo content — `*.log` is already gitignored; `gateway/litellm.pid` should be too (add it if it isn't).

## Maintenance

This skill is intentionally duplicated at two paths in this repo, one per coding-agent convention:
- `.claude/skills/litellm/SKILL.md` (this file — Claude Code / Claude Cowork)
- `.agents/skills/litellm/SKILL.md` (Codex CLI)

Unlike `push`, these two are meant to be byte-identical — there's no per-tool divergence here. Whichever tool edits this skill should mirror the change into the other file.

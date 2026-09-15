---
name: git-commit-and-push
description: "Stage all changes, commit, and push the current branch to its corresponding remote — use when Ankit asks to commit and push, save/sync changes to git, or push code up."
---

# Git: commit all changes and push to the current branch's remote

Use this whenever Ankit asks to commit and push, save his work to git, sync changes to the remote, or similar phrasing — for whichever repo/directory he's working in at the time.

## Steps

1. **Look, don't assume.** Run these to see the real state before touching anything:
   - `git status` (never with `-uall` on a large repo)
   - `git diff` (unstaged) and `git diff --staged` (already staged, if any)
   - `git branch --show-current` — the branch to push
   - `git rev-parse --abbrev-ref --symbolic-full-name @{u}` — the branch's upstream, if one is already set (this command errors if there isn't one yet — that's expected on a brand-new branch, handle it in step 4)
   - `git log --oneline -5` — recent commit style, so the new commit message matches

2. **Stage everything.** "Add all code" means all of it: `git add -A` from the repo root. Skip this only for a file Ankit explicitly says to leave out. Don't hand-pick files by default — that's not what was asked for here, unlike the general cautious-staging guidance elsewhere.
   - Sanity-check the staged diff isn't accidentally pulling in something that shouldn't be committed (a stray `.env`, credentials, huge binaries). `.gitignore` should already be catching `.env` files per this project's convention — if something sensitive shows up staged anyway, stop and flag it to Ankit rather than committing it silently.

3. **Write the commit message** from what's actually in the staged diff — 1-2 sentences, focused on *why*, matching the repo's existing commit style (check `git log` from step 1). Follow this session's git rules: never `--amend` an existing commit (always a new commit), never `--no-verify` / skip hooks, never disable GPG signing, unless Ankit explicitly asks. If a pre-commit hook fails, fix the underlying issue, re-stage, and commit again as a new commit — don't force past it.
   - Append the attribution footer this session's system-reminder specifies (Co-Authored-By / Codex-Session lines) if one is present for the current session — check for it rather than assuming a fixed footer, since it can change.

4. **Push to the branch's own remote.**
   - If step 1 found an upstream already set: `git push`.
   - If there's no upstream yet (new branch, first push): `git push -u origin <branch-name>` — the branch name from `git branch --show-current`, so it lands on the same-named branch on `origin` and future pushes track automatically.
   - Never `--force` / `--force-with-lease` unless Ankit explicitly asks for it in this instance — silently retry a normal push and surface the conflict instead of overriding it.

5. **Confirm it landed.** `git status` (should show "working tree clean" and "up to date with origin/<branch>") and `git log -1` — report back briefly what was committed and pushed, not a full diff dump.

## Notes

- If there are no changes to commit (clean working tree, nothing staged), say so rather than creating an empty commit.
- If the repo has no remote named `origin`, or the current branch's remote isn't `origin`, use whatever `git remote -v` actually shows instead of assuming `origin`.
- This is for Ankit's own repos (e.g. the JARVIS repo) — normal git safety rules still apply (see the session's general git instructions): only do this when he's asked for it, don't invent commits he didn't request.

## Maintenance

This skill is intentionally duplicated at two paths in this repo, one per coding-agent convention:
- `.claude/skills/git-commit-and-push/SKILL.md` (Claude Code / Claude Cowork)
- `.agents/skills/git-commit-and-push/SKILL.md` (this file — Codex CLI)

They're the same skill with one deliberate difference: each file's step 3 attribution line names its own tool's session-footer convention (`Claude-Session` there, `Codex-Session` here). Ankit wants both kept in sync (6.17) — whichever tool edits this skill's actual instructions (steps 1–5, Notes) should mirror the change into the other file, leaving only that one attribution-line difference in place.

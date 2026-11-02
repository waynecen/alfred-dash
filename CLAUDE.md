# Project Conventions

React + Vite dashboard. Remote: https://github.com/waynecen/alfred-dash.git (branch `main`).

## Commits

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Subject: imperative mood, about 50 characters, no trailing period.
- Add a body only when needed, and explain why rather than what.
- One logical change per commit; do not mix features, refactors, and docs.
- Do not add a "Committed:" date line; git already records the timestamp.

## Workflow

- Show `git status` and `git diff` before committing.
- Stage specific files, not `git add -A`.
- Work on a branch (e.g. `feat/task-edit`); keep `main` for finished work.
- Never skip hooks, force-push, or rewrite pushed history.
- Only commit or push when asked.

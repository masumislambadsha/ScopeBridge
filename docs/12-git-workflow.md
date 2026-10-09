# 12 — Git workflow

- Branches: `main` (releases) + `develop` (integration). Work on `feature/*`, `chore/*`, `docs/*` off `develop`.
- Commits: small Conventional Commits (`feat(scope): …`). Never commit `.env`/secrets. Never force-push `main`/`develop`, never rewrite published history.
- PRs: no `gh` on all machines → merge locally with `--no-ff` and record each PR in `docs/pull-requests/NN-<branch>.md` using `.github/pull_request_template.md` (summary, issues, test evidence, checklist) + self-review notes.
- Issues/board: `docs/ISSUES.md` (#1–#58: features + §2.2 bugs) and `docs/PROJECT_BOARD.md` (Todo/In Progress/Review/Done); reference in commits (`Closes #n`); templates in `.github/ISSUE_TEMPLATE/`. See `CONTRIBUTING.md`.
- Release: final PR `develop` → `main`, tag `v1.0.0`.
- **Human code review by teammates is expected before release** (spec requirement; recorded here as a remaining human step).

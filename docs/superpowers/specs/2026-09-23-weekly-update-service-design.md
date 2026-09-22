# Weekly update service design

**Date:** 2026-09-23  
**Version:** project 0.2.0  
**Status:** approved design (approach #1: orchestrator + optional safe fetch)

## Goal

One command (and an optional weekly Windows schedule) that keeps the static ShikkhaRatio site current on the user's PC: rebuild derived data from sources, verify, sync the deploy mirror, and git push. No real backend. Frontend stays static files.

## Success criteria

- `update-site.ps1` (also exposed as `npm run update`) runs end-to-end on Windows with exit 0 when the tree is healthy.
- Always: rebuild summaries/API/districts → lint/tests → sync `static/` → commit if changed → push.
- Optional fetch: only replaces local workbook if the download matches expected shape; otherwise logs and continues with local data.
- Weekly schedule can be installed with one script; manual run works the same day.
- Maintenance is documented in one place so a future session (or person) can resume without re-deriving the pipeline.

## Non-goals (v1)

- No multi-year UI rewrite (pages still show BANBEIS 2024 until year config is a later task).
- No accounts, email, or server-side storage.
- No fragile scrape of BANBEIS HTML as the only path; fetch is optional and validated.

## Architecture

```
[optional fetch]  →  data/*.xlsx (local source of truth)
        ↓
generate_summaries.py  →  data/{school,college}_summary.csv + tsr_*.csv
        ↓
build-districts.mjs    →  data/districts.json
build-api.mjs          →  api/v1/**
        ↓
Python tests + eslint + tests.mjs + pages-check.mjs
        ↓
sync → static/  (pages, css, js, api, data subset, PWA)
        ↓
git commit (if diff) → git push origin main
```

### Components

| Piece | Role | Depends on |
|-------|------|------------|
| `tools/update-site.ps1` | Orchestrator; flags `-Fetch`, `-NoPush`, `-SkipTests` | local tools |
| `tools/fetch-banbeis.ps1` | Optional: download candidate workbook to `data/` if URL configured and shape OK | config URL |
| `tools/config/update.json` | URLs, expected sheet names, year label for messaging | none |
| `tools/sync-static.ps1` | Copy deployables into `static/`; exclude huge geojson tree | root tree |
| `tools/install-schedule.ps1` | Register Windows Task Scheduler weekly task | Task Scheduler |
| `docs/MAINTENANCE.md` | How to run, where data comes from, how to recover | none |

### Data flow rules

1. **Local workbook is source of truth** if fetch is off or fails validation.
2. **Fetch** (when `-Fetch`): download to a temp file; require readable xlsx + expected sheets (from `generate_summaries.load_sectors` / same sheet names as current workbook); only then replace `data/BANBEIS_2024_District_Education_Stats.xlsx` (or path from config). On mismatch: keep local, print warning, continue.
3. **Rebuild always** from the xlsx then CSVs (even if fetch did nothing).
4. **Tests gate push.** Any test failure → exit non-zero and do not commit or push. `-SkipTests` is only for local debugging; scheduled runs never skip tests.
5. **Commit** only when `git status` is dirty after rebuild/sync; message style: lowercase descriptive (e.g. `weekly data rebuild` or `update banbeis workbook`).
6. **static/** must not include `data/bgd_admin_boundaries.geojson/**` (too large); keep `bgd-admin2.geojson`, summaries, `districts.json`, workbook.

### Config (`tools/config/update.json`)

```json
{
  "fetchUrl": "",
  "workbook": "data/BANBEIS_2024_District_Education_Stats.xlsx",
  "expectedSheets": ["Sec_School_By_District", "College_By_District"],
  "yearLabel": "2024",
  "remote": "origin",
  "branch": "main"
}
```

`expectedSheets` matches `generate_summaries.load_sectors` (the sheets that actually rebuild CSVs). `fetchUrl` empty ⇒ fetch is a no-op (safe default).

### Schedule

- `install-schedule.ps1` creates task `ShikkhaRatioWeeklyUpdate`, weekly (e.g. Monday 09:00 local), runs `powershell -ExecutionPolicy Bypass -File tools\update-site.ps1 -Fetch`.
- Uninstall switch `-Remove`.
- Schedule runs only if the repo path is fixed; document path in MAINTENANCE.md.

### Error handling

| Failure | Behavior |
|---------|----------|
| Node/Python missing | Fail fast with clear message |
| Fetch HTTP/shape error | Warn, use local workbook |
| Python or JS test fail | Stop, exit 1, no push |
| Nothing to commit | Log “no changes”, exit 0 |
| Push fail (auth/network) | Exit 1 with git message; files remain committed locally for retry |

### Testing

- Orchestrator dry path: `-SkipTests -NoPush` still runs rebuilds and sync on a clean tree.
- Full path: `npm run lint`, `node tests.mjs`, `node pages-check.mjs`, and `.venv\Scripts\python.exe -m unittest discover -s src -p "test_*.py"` (same gate as scheduled runs).
- Fetch check: empty `fetchUrl` → no-op; invalid URL or missing `expectedSheets` → warn and keep local workbook (covered by orchestrator tests in the plan).

### Maintenance tracking

- `docs/MAINTENANCE.md`: pipeline diagram, command cheat sheet, config knobs, “if year changes” checklist, recovery steps.
- `README.md` one-liner pointing at MAINTENANCE.md.
- Version bumps stay in `package.json` + `pyproject.toml` together.
- Spec path: this file; implementation plan follows writing-plans after user review.

## Out of scope notes for later

- Year-parameterized copy (replace hard-coded 2024 in HTML/JS/schema).
- GitHub Actions as optional second runner (still no backend app).

# Python backend scaffold

This directory is reserved for the self-developed FreeRoam backend on AWS. It contains uv project metadata only; no server, routes, database, AWS SDK, or deployment resources are implemented.

Python is pinned to **3.14.7**, the latest stable release verified on 2026-09-24. Python 3.15 is still a prerelease. See [Python downloads](https://www.python.org/downloads/).

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then from the repository root:

```sh
uv sync --project apps/api
uv run --project apps/api python --version
```

uv manages the interpreter and creates `apps/api/.venv`. Keep `uv.lock` committed when adding dependencies. `package = false` keeps this as an application scaffold without choosing a packaging/build backend. The backend owner can introduce source packages and a framework when implementation begins.

Coordinate the API and realtime contracts with the frontend owner using [the handoff notes](../../docs/backend-handoff.md). Keep AWS infrastructure in `infra/` and all secrets outside version control.

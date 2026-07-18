#!/usr/bin/env bash
# headersHelper for the "posthog" MCP server (see .mcp.json).
# Emits the Authorization header by reading POSTHOG_API_KEY from this repo's .env,
# so the key loads automatically at connect time — no shell export, no extra tooling.
# Source of truth stays .env (gitignored). If .env is missing the header is empty,
# which just fails auth (harmless for clones without the demo key).
set -uo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
key="$(grep -m1 '^POSTHOG_API_KEY=' "$root/.env" 2>/dev/null | cut -d= -f2- | tr -d '\r')"
printf '{"Authorization":"Bearer %s"}' "$key"

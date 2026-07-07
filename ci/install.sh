#!/usr/bin/env bash
#
# Deterministic dependency install for CI (modern monorepo). Shared by both pipelines.
set -euo pipefail

# Prefer a clean, lockfile-exact install; fall back to `npm install` if the lockfile and
# manifests have legitimately diverged in a feature branch.
npm ci || npm install

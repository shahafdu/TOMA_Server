#!/usr/bin/env bash
#
# Single source of truth for TOMA CI checks. Both GitHub Actions (.github/workflows/ci.yml)
# and GitLab CI (.gitlab-ci.yml) call this so the two pipelines can never drift (plan §2.9).
#
# Covers the whole monorepo (packages/*, apps/*, db/).
set -euo pipefail

run() {
  echo ""
  echo "::__ $* __::"
  "$@"
}

run npm run format:check
run npm run lint
run npm run typecheck
run npm run contract:check
run npm run test
run npm run build

echo ""
echo "All checks passed."

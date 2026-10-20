#!/usr/bin/env bash
# Fails if 'use client' appears anywhere in src/ outside src/components/client/ (D-022).
set -euo pipefail
cd "$(dirname "$0")/.."

violations=$(grep -rlE "^[[:space:]]*['\"]use client['\"]" src --include='*.ts' --include='*.tsx' | grep -v '^src/components/client/' || true)

if [ -n "$violations" ]; then
  echo "FAIL: 'use client' outside src/components/client/:"
  echo "$violations"
  exit 1
fi
echo "OK: client boundary respected"

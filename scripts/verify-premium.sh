#!/usr/bin/env bash
set -euo pipefail

for required_file in DESIGN.md UX-CONTRACT.md PRODUCT.md premium-ui.json; do
  test -s "$required_file"
done

if rg '(?:window\.)?(?:alert|confirm|prompt)\s*\(' app lib; then
  echo "Native dialog call found."
  exit 1
fi
if rg '<(div|span|p|section)[^>]*onClick' app; then
  echo "Non-semantic click target found."
  exit 1
fi
if rg 'dangerouslySetInnerHTML|\.innerHTML\s*=' app lib; then
  echo "Unsafe HTML rendering found."
  exit 1
fi
rg '<form[^>]*noValidate' app/page.tsx >/dev/null
rg 'resize-none' app/page.tsx >/dev/null
rg 'scrollbar-color' app/globals.css >/dev/null
rg 'prefers-reduced-motion' app/globals.css >/dev/null

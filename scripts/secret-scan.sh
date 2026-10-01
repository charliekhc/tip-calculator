#!/bin/sh
# Usage: sh scripts/secret-scan.sh [root]   (default: current folder)
# The script enters the root first, so every exclusion is relative to it. A parent folder named
# .agent, node_modules or dist can never hide the tree being scanned.
# Layer 1 scans EVERY file under the root, including agents/ and package-lock.json, for strings that
# look like real secrets. Layer 2 scans everything except agents/, the lockfile and this script for
# the base keywords from agents/PROJECT.md section 7.
# Output is "path:line" plus the layer. The matched text is never printed.
cd "${1:-.}" || exit 2
status=0

scan() {
  pattern="$1"
  shift
  find . -type f \
    -not -path './.git/*' -not -path './node_modules/*' -not -path './dist/*' -not -path './.agent/*' \
    "$@" -print0 | xargs -0 sh -c '
      p=$1; shift; rc=0
      for f; do
        out=$(grep -InE -e "$p" -- "$f"); r=$?
        [ "$r" -gt 1 ] && rc=1
        if [ "$r" -eq 0 ]; then
          for n in $(printf "%s\n" "$out" | cut -d: -f1); do printf "%s:%s\n" "$f" "$n"; done
        fi
      done
      exit $rc' sh "$pattern"
}

layer1='-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|(SECRET|TOKEN|PASSWORD|API_?KEY)[A-Za-z0-9_]*["'"'"']?[ ]*[:=][ ]*["'"'"'][A-Za-z0-9+/=_.-]{8,}["'"'"']'
layer2='SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|BEGIN OPENSSH'

hits=$(scan "$layer1") || { echo "secret-scan: layer 1 could not run" >&2; status=2; }
if [ -n "$hits" ]; then
  echo "$hits" | while IFS= read -r hit; do echo "$hit (layer 1: secret-looking value)"; done
  echo "secret-scan: layer 1 found a secret-looking value" >&2
  status=1
fi

hits=$(scan "$layer2" -not -path './agents/*' -not -name package-lock.json -not -name secret-scan.sh) \
  || { echo "secret-scan: layer 2 could not run" >&2; status=2; }
if [ -n "$hits" ]; then
  echo "$hits" | while IFS= read -r hit; do echo "$hit (layer 2: secret keyword)"; done
  echo "secret-scan: layer 2 found a secret keyword" >&2
  status=1
fi

[ "$status" -eq 0 ] && echo "secret-scan: clean"
exit "$status"

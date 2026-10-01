#!/bin/sh
# Usage: sh scripts/secret-scan.sh [root]   (default: current folder)
# Layer 1 scans EVERY file, including agents/ and package-lock.json, for strings that look like real secrets.
# Layer 2 scans everything except the kit docs, the lockfile and this script for the base keywords
# from agents/PROJECT.md section 7.
root="${1:-.}"
status=0

scan() {
  pattern="$1"
  shift
  find "$root" -type f \
    -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.agent/*' \
    "$@" -print0 | xargs -0 sh -c 'p=$1; shift; grep -InE -e "$p" /dev/null "$@"; [ $? -le 1 ]' sh "$pattern"
}

layer1='-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|(SECRET|TOKEN|PASSWORD|API_?KEY)[A-Za-z0-9_]*["'"'"']?[ ]*[:=][ ]*["'"'"'][A-Za-z0-9+/=_.-]{8,}["'"'"']'
layer2='SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|BEGIN OPENSSH'

hits=$(scan "$layer1") || { echo "secret-scan: layer 1 could not run" >&2; status=2; }
if [ -n "$hits" ]; then
  echo "$hits"
  echo "secret-scan: layer 1 found a secret-looking value" >&2
  status=1
fi

hits=$(scan "$layer2" -not -path "$root/agents/*" -not -name package-lock.json -not -name secret-scan.sh) || { echo "secret-scan: layer 2 could not run" >&2; status=2; }
if [ -n "$hits" ]; then
  echo "$hits"
  echo "secret-scan: layer 2 found a secret keyword" >&2
  status=1
fi

[ "$status" -eq 0 ] && echo "secret-scan: clean"
exit "$status"

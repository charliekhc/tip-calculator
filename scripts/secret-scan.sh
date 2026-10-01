#!/bin/sh
# Fails if a secret-looking string is found. Pattern comes from agents/PROJECT.md section 7.
if grep -rnE 'SECRET|TOKEN|PASSWORD|PRIVATE KEY|BEGIN RSA|BEGIN OPENSSH' . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.agent --exclude-dir=agents \
  --exclude-dir=dist --exclude=package-lock.json --exclude=secret-scan.sh; then
  echo "secret-scan: possible secret found" >&2
  exit 1
fi
echo "secret-scan: clean"

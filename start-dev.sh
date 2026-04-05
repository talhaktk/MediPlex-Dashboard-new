#!/usr/bin/env bash
# Starts the Next.js dev server from the project root.
set -e
cd "$(dirname "$0")"
exec npm run dev

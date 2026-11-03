#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
case "${1:-}" in
 d00) D=d00-account-auth;; d01) D=d01-public-install;; d02) D=d02-l1-full-cycle;;
 d03) D=d03-l2-agent-sdk;; d04) D=d04-l4-sidecar;; d05) D=d05-l3-model-runtime;;
 d06) D=d06-l5-environment-gateway;; d07) D=d07-mcp-gateway;; d08) D=d08-l6-provider-native;;
 d09) D=d09-fleet-failover;; d10) D=d10-offline-continuity;; d11) D=d11-multi-provider;;
 d12) D=d12-immunex;; flagship) D=flagship-full-fabric;;
 *) echo "usage: $0 d00|d01|...|d12|flagship" >&2; exit 2;;
esac
exec "$ROOT/demos/$D/run.sh"

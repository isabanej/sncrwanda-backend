#!/usr/bin/env bash
set -e
curl -sS -X POST http://localhost:9090/auth/login -H 'Content-Type: application/json' -d @../temp_login.json -w '\nHTTP_STATUS:%{http_code}\n'

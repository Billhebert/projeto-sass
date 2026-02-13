#!/bin/bash
# Load environment variables from root .env file
set -a
source ../../.env
set +a

# Start NestJS API
exec node dist/main.js

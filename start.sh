#!/bin/bash
set -e

# Start Postgres in the background with its normal entrypoint
docker-entrypoint.sh postgres &

# Start the Otel Collector in the foreground, using our mounted config
otelcol-contrib --config=/etc/otelcol-config.yml

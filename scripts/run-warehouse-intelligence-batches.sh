#!/bin/bash
set -e

cd /opt/collector-intelligence

BATCH_SIZE=${BATCH_SIZE:-5000}
START_OFFSET=${START_OFFSET:-26000}
BATCHES=${BATCHES:-20}

echo "WAREHOUSE INTELLIGENCE BATCH RUN"
echo "BATCH_SIZE=$BATCH_SIZE START_OFFSET=$START_OFFSET BATCHES=$BATCHES"

for ((i=0; i<BATCHES; i++)); do
  OFFSET=$((START_OFFSET + i * BATCH_SIZE))
  echo ""
  echo "===== Batch $((i+1))/$BATCHES offset $OFFSET ====="
  BATCH_SIZE=$BATCH_SIZE START_OFFSET=$OFFSET npm run warehouse:intelligence
done

echo ""
echo "DONE BATCH RUN"

#!/bin/bash

# Batch refactoring script for remaining routes
# This script will apply the standard refactoring pattern to routes

echo "Starting batch refactoring of remaining routes..."
echo "Target: All 45 non-refactored routes"
echo ""

# Count total routes that still need refactoring
NOT_REFACTORED=0
TOTAL_LINES=0

for file in /c/Users/Bill/AppData/Local/Programs/Python/Python312/Scripts/backend/routes/*.js; do
  if [[ ! "$file" == *"backup"* ]] && [[ ! "$file" == *"old"* ]] && [[ ! "$file" == *"EXAMPLE"* ]]; then
    if ! grep -q "function handleError" "$file" 2>/dev/null; then
      basename_file=$(basename "$file")
      lines=$(wc -l < "$file")
      NOT_REFACTORED=$((NOT_REFACTORED + 1))
      TOTAL_LINES=$((TOTAL_LINES + lines))
      echo "$NOT_REFACTORED. $basename_file ($lines lines)"
    fi
  fi
done

echo ""
echo "================================================"
echo "Total routes to refactor: $NOT_REFACTORED"
echo "Total lines to refactor: $TOTAL_LINES"
echo "Estimated time: $(($NOT_REFACTORED * 2)) hours"
echo "================================================"

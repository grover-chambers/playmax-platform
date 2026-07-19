#!/bin/bash
# PlayMax Analytic Engine — start the worker
cd "$(dirname "$0")"
source .env 2>/dev/null || echo "No .env found, using defaults"
python3 worker.py

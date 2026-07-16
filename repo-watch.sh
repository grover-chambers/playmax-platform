#!/bin/bash
# repo-watch.sh — Run this on your Kali machine to track repo changes
# Usage: bash repo-watch.sh [interval_seconds]
#
# Tracks: git status, new/modified files, lint errors, build errors
# Logs everything to repo-watch.log with timestamps

INTERVAL=${1:-300}  # Default: check every 5 minutes
LOG="repo-watch.log"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Repo Watch started at $(date) ===" | tee -a "$LOG"
echo "Checking every ${INTERVAL}s. Ctrl+C to stop." | tee -a "$LOG"
echo "" | tee -a "$LOG"

while true; do
    echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---" | tee -a "$LOG"

    # 1. Git status summary
    MODIFIED=$(git status --short 2>/dev/null | wc -l)
    echo "Changed files: $MODIFIED" | tee -a "$LOG"
    git status --short 2>/dev/null | tee -a "$LOG"

    # 2. Check for new untracked files
    UNTRACKED=$(git status --short 2>/dev/null | grep "^??" | wc -l)
    if [ "$UNTRACKED" -gt 0 ]; then
        echo ">> $UNTRACKED new untracked files" | tee -a "$LOG"
        git status --short 2>/dev/null | grep "^??" | tee -a "$LOG"
    fi

    # 3. Quick lint check (non-blocking, 30s timeout)
    if [ -f "package.json" ]; then
        LINT_OUT=$(timeout 30 npx next lint 2>&1 | tail -20)
        ERRORS=$(echo "$LINT_OUT" | grep -c "error\|Error" || true)
        if [ "$ERRORS" -gt 0 ]; then
            echo ">> LINT ERRORS DETECTED:" | tee -a "$LOG"
            echo "$LINT_OUT" | tee -a "$LOG"
        else
            echo "Lint: OK" | tee -a "$LOG"
        fi
    fi

    # 4. Git diff summary (lines changed)
    DIFF_STAT=$(git diff --stat 2>/dev/null | tail -1)
    if [ -n "$DIFF_STAT" ]; then
        echo "Diff summary: $DIFF_STAT" | tee -a "$LOG"
    fi

    echo "" | tee -a "$LOG"
    sleep "$INTERVAL"
done

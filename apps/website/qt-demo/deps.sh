#!/usr/bin/env bash
# Fetches the editor's sources at their pinned revisions into qt-demo/deps/:
# Blockwork at sources.env's BLOCKWORK_REV, then blockstitch and lucide-qt at
# the revisions that Blockwork commit's Cargo.lock resolves. Prints the three
# revisions; re-runs leave checkouts that already match alone.
#
#   qt-demo/deps.sh                 fetch (used by build.sh and CI)
#   qt-demo/deps.sh --verify A B C  warn if checkouts A B C (Blockwork,
#                                   blockstitch, lucide-qt) differ from the pins
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$here/sources.env"
deps="$here/deps"

# The commit after `#` in a Cargo.lock `source` line for one package.
locked_rev() {
    awk -v name="$2" '$0 == "name = \"" name "\"" { hit = 1; next }
        hit && /^source = / { sub(/.*#/, ""); sub(/".*/, ""); print; exit }
        /^\[\[package\]\]/ { hit = 0 }' "$1"
}

fetch() { # url dir rev
    if [ "$(git -C "$2" rev-parse HEAD 2>/dev/null)" = "$3" ]; then return; fi
    rm -rf "$2"
    git init -q "$2"
    git -C "$2" fetch -q --depth 1 "$1" "$3"
    git -C "$2" -c advice.detachedHead=false checkout -q FETCH_HEAD
}

# Revisions the Blockwork checkout at $1 pins for blockstitch and lucide-qt.
pinned() {
    local qml core
    qml="$(locked_rev "$1/Cargo.lock" blockstitch-qml)"
    core="$(locked_rev "$1/Cargo.lock" blockstitch-core)"
    if [ -z "$qml" ] || [ "$qml" != "$core" ]; then
        echo "Blockwork's Cargo.lock pins blockstitch-qml '$qml' but blockstitch-core '$core'" >&2
        exit 1
    fi
    BLOCKSTITCH_REV="$qml"
    LUCIDE_QT_REV="$(locked_rev "$1/Cargo.lock" lucide-qt)"
    [ -n "$LUCIDE_QT_REV" ] || { echo "no lucide-qt in Blockwork's Cargo.lock" >&2; exit 1; }
}

if [ "${1:-}" = "--verify" ]; then
    shift
    pinned "$1"
    for pair in "$1:$BLOCKWORK_REV" "$2:$BLOCKSTITCH_REV" "$3:$LUCIDE_QT_REV"; do
        dir="${pair%:*}" want="${pair##*:}"
        have="$(git -C "$dir" rev-parse HEAD 2>/dev/null || echo unknown)"
        [ "$have" = "$want" ] || echo "warning: $dir is at $have, the page pins $want" >&2
    done
    exit 0
fi

fetch https://github.com/Blockworked/Blockwork.git "$deps/Blockwork" "$BLOCKWORK_REV"
pinned "$deps/Blockwork"
fetch https://github.com/Blockworked/blockstitch.git "$deps/blockstitch" "$BLOCKSTITCH_REV"
fetch https://github.com/Blockworked/lucide-qt.git "$deps/lucide-qt" "$LUCIDE_QT_REV"
echo "Blockwork $BLOCKWORK_REV"
echo "blockstitch $BLOCKSTITCH_REV"
echo "lucide-qt $LUCIDE_QT_REV"

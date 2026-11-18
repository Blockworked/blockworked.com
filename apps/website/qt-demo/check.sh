#!/usr/bin/env bash
# Builds the page natively with a desktop Qt, loads it offscreen and checks
# that every module and resource resolved without a QML warning and that
# DemoBackend answers every command the editor sends (check-contract.py).
# Needs Rust for the editor core.
#
#   QT_DESKTOP=~/Qt/6.12.0/gcc_64 qt-demo/check.sh
#
# Uses the same sources and dependency rules as build.sh.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
: "${QT_DESKTOP:?set QT_DESKTOP to a desktop Qt (e.g. ~/Qt/6.12.0/gcc_64)}"
if [ -z "${BLOCKWORK_DIR:-}${BLOCKSTITCH_DIR:-}${LUCIDE_QT_DIR:-}" ]; then
    "$here/deps.sh"
    BLOCKWORK_DIR="$here/deps/Blockwork" BLOCKSTITCH_DIR="$here/deps/blockstitch" LUCIDE_QT_DIR="$here/deps/lucide-qt"
else
    "$here/deps.sh" --verify "$BLOCKWORK_DIR" "$BLOCKSTITCH_DIR" "$LUCIDE_QT_DIR"
fi
BUILD_DIR="${BUILD_DIR:-$here/build-native}"

# The editor core, natively, from the same Blockwork checkout.
CARGO_TARGET_DIR="$BUILD_DIR/cargo" cargo build --locked --manifest-path "$BLOCKWORK_DIR/Cargo.toml" -p blockwork-web
core_lib="$BUILD_DIR/cargo/debug/libblockwork_web.a"

cmake -S "$here" -B "$BUILD_DIR" -G Ninja -DCMAKE_BUILD_TYPE=Debug -DCMAKE_PREFIX_PATH="$QT_DESKTOP" \
    -DBLOCKWORK_DIR="$(realpath "$BLOCKWORK_DIR")" \
    -DBLOCKSTITCH_DIR="$(realpath "$BLOCKSTITCH_DIR")" \
    -DLUCIDE_QT_DIR="$(realpath "$LUCIDE_QT_DIR")" \
    -DBLOCKWORK_WEB_LIB="$core_lib"
cmake --build "$BUILD_DIR"

status=0
QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=software LD_LIBRARY_PATH="$QT_DESKTOP/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    "$BUILD_DIR/blockwork-demo" --contract "$BUILD_DIR/contract.json" || status=$?
[ -f "$BUILD_DIR/contract.json" ] || { echo "the page wrote no contract (exit $status)" >&2; exit 1; }
python3 "$here/check-contract.py" --blockwork "$BLOCKWORK_DIR" --contract "$BUILD_DIR/contract.json"

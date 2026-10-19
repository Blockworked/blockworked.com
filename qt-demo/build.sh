#!/usr/bin/env bash
# Builds the Qt editor for the browser and copies it into public/demo/.
#
#   QT_WASM=~/Qt/6.12.0/wasm_singlethread EMSDK=~/emsdk qt-demo/build.sh
#
# Needs Qt for WebAssembly (single-threaded, so GitHub Pages can serve it
# without cross-origin isolation headers), the emsdk version that Qt build
# wants, and a desktop Qt of the same version for the host tools. The QML
# comes from Blockwork, blockstitch and lucide-qt checkouts, by default next
# to this repository.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(dirname "$here")"
: "${QT_WASM:?set QT_WASM to the Qt wasm_singlethread directory}"
: "${EMSDK:?set EMSDK to the emsdk checkout}"
BLOCKWORK_DIR="${BLOCKWORK_DIR:-$repo/../Blockwork}"
BLOCKSTITCH_DIR="${BLOCKSTITCH_DIR:-$repo/../blockstitch}"
LUCIDE_QT_DIR="${LUCIDE_QT_DIR:-$repo/../lucide-qt}"
BUILD_DIR="${BUILD_DIR:-$here/build}"
OUT_DIR="$repo/public/demo"

# shellcheck disable=SC1091
EMSDK_QUIET=1 source "$EMSDK/emsdk_env.sh"

host_args=()
[ -n "${QT_HOST_PATH:-}" ] && host_args+=("-DQT_HOST_PATH=$QT_HOST_PATH")

cmake -DCMAKE_TOOLCHAIN_FILE="$QT_WASM/lib/cmake/Qt6/qt.toolchain.cmake" -S "$here" -B "$BUILD_DIR" -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel \
    "${host_args[@]}" \
    -DBLOCKWORK_DIR="$(realpath "$BLOCKWORK_DIR")" \
    -DBLOCKSTITCH_DIR="$(realpath "$BLOCKSTITCH_DIR")" \
    -DLUCIDE_QT_DIR="$(realpath "$LUCIDE_QT_DIR")"
cmake --build "$BUILD_DIR"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp "$BUILD_DIR/blockwork-demo.js" "$BUILD_DIR/blockwork-demo.wasm" "$BUILD_DIR/qtloader.js" "$OUT_DIR/"
echo "Copied the editor into $OUT_DIR ($(du -sh "$OUT_DIR" | cut -f1))"

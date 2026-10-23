#!/usr/bin/env bash
# Builds the WP4 spike page: blockstitch-ffi for wasm32-unknown-emscripten,
# then the Qt page that links it.
#   QT_WASM=~/Qt/6.12.0/wasm_singlethread QT_HOST_PATH=~/Qt/6.12.0/gcc_64 EMSDK=~/emsdk qt-demo/spike/build.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
: "${QT_WASM:?}" "${EMSDK:?}"
BLOCKSTITCH_DIR="$(realpath "${BLOCKSTITCH_DIR:-$here/../../../blockstitch}")"
BUILD_DIR="${BUILD_DIR:-$here/build}"
# shellcheck disable=SC1091
EMSDK_QUIET=1 source "$EMSDK/emsdk_env.sh"
cargo build --release --target wasm32-unknown-emscripten --manifest-path "$BLOCKSTITCH_DIR/crates/blockstitch-ffi/Cargo.toml"
host_args=()
[ -n "${QT_HOST_PATH:-}" ] && host_args+=("-DQT_HOST_PATH=$QT_HOST_PATH")
cmake -DCMAKE_TOOLCHAIN_FILE="$QT_WASM/lib/cmake/Qt6/qt.toolchain.cmake" -S "$here" -B "$BUILD_DIR" -G Ninja -DCMAKE_BUILD_TYPE=MinSizeRel \
    "${host_args[@]}" -DBLOCKSTITCH_DIR="$BLOCKSTITCH_DIR" \
    -DBLOCKSTITCH_FFI_LIB="$BLOCKSTITCH_DIR/crates/blockstitch-ffi/target/wasm32-unknown-emscripten/release/libblockstitch_ffi.a"
cmake --build "$BUILD_DIR"
echo "Serve $BUILD_DIR and open core-spike.html; the console prints 'spike: PASS'."

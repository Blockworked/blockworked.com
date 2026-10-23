# WP4 spike: one blockstitch-core graph edit inside a Qt for WebAssembly
# page. The Rust core is a static library built for wasm32-unknown-emscripten
# and linked into the same module as Qt, so QML reaches it through C++.
cmake_minimum_required(VERSION 3.21)
project(core_spike LANGUAGES CXX)

set(BLOCKSTITCH_DIR "" CACHE PATH "blockstitch checkout")
set(BLOCKSTITCH_FFI_LIB "" CACHE FILEPATH "libblockstitch_ffi.a for this target")

find_package(Qt6 6.10 REQUIRED COMPONENTS Core Gui Qml Quick)
qt_standard_project_setup(REQUIRES 6.10)

qt_add_executable(core-spike main.cpp core.cpp core.h)
qt_add_qml_module(core-spike
    URI com.blockworked.CoreSpike
    VERSION 1.0
    QML_FILES Main.qml
    NO_LINT)
target_include_directories(core-spike PRIVATE "${BLOCKSTITCH_DIR}/include")
target_link_libraries(core-spike PRIVATE Qt6::Gui Qt6::Qml Qt6::Quick "${BLOCKSTITCH_FFI_LIB}")

if(EMSCRIPTEN)
    target_link_options(core-spike PRIVATE
        "SHELL:-s INITIAL_MEMORY=64MB"
        "SHELL:-s ALLOW_MEMORY_GROWTH=1")
    qt_policy(SET QTP0001 NEW)
endif()

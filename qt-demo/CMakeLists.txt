# Builds Blockwork's editor for the browser (Qt for WebAssembly). The QML
# comes straight from the Blockwork, blockstitch and lucide-qt checkouts,
# so the page always shows the app's real editor; only the daemon is
# replaced (DemoBackend.qml) and a few desktop-only pieces are shimmed.
# Run through build.sh, which also copies the output into public/demo/.
cmake_minimum_required(VERSION 3.21)
project(blockwork_demo LANGUAGES CXX)

set(BLOCKWORK_DIR "" CACHE PATH "Blockwork checkout")
set(BLOCKSTITCH_DIR "" CACHE PATH "blockstitch checkout")
set(LUCIDE_QT_DIR "" CACHE PATH "lucide-qt checkout")
foreach(dir BLOCKWORK_DIR BLOCKSTITCH_DIR LUCIDE_QT_DIR)
    if(NOT EXISTS "${${dir}}")
        message(FATAL_ERROR "${dir} is not set to a checkout")
    endif()
endforeach()

find_package(Qt6 6.10 REQUIRED COMPONENTS Core Gui Qml Quick QuickControls2 QuickDialogs2 QuickShapes)
qt_standard_project_setup(REQUIRES 6.10)

# Both modules come from their repositories' own CMake entry points, which
# read the same manifests the apps' Cargo builds use, so this file lists none
# of their files.
include("${BLOCKSTITCH_DIR}/cmake/BlockstitchQml.cmake")
include("${BLOCKWORK_DIR}/blockwork-qt/cmake/BlockworkEditorQml.cmake")
blockstitch_add_qml_module(blockstitch)
# The desktop window chrome and the screen picker, replaced for the page.
blockwork_add_editor_qml_module(blockwork
    LUCIDE_QT_DIR "${LUCIDE_QT_DIR}"
    HOST_FILES
        "${CMAKE_CURRENT_SOURCE_DIR}/shims/TitleBarDrag.qml"
        "${CMAKE_CURRENT_SOURCE_DIR}/shims/WindowControls.qml"
        "${CMAKE_CURRENT_SOURCE_DIR}/shims/ScreenOverlay.qml")

# ---- the app ----
qt_add_executable(blockwork-demo main.cpp)
qt_add_qml_module(blockwork-demo
    URI com.blockworked.Demo
    VERSION 1.0
    QML_FILES DemoMain.qml DemoBackend.qml PreviewStage.qml
    NO_LINT)
target_link_libraries(blockwork-demo PRIVATE
    Qt6::Gui Qt6::Qml Qt6::Quick Qt6::QuickControls2 Qt6::QuickDialogs2 Qt6::QuickShapes
    blockstitchplugin blockworkplugin)

if(EMSCRIPTEN)
    # Grows on demand from a small start, so the page doesn't reserve a big
    # heap up front; modularized so the page starts it only when needed.
    target_link_options(blockwork-demo PRIVATE
        "SHELL:-s INITIAL_MEMORY=64MB"
        "SHELL:-s ALLOW_MEMORY_GROWTH=1")
    qt_policy(SET QTP0001 NEW)
endif()

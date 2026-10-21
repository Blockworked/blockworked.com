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

# Adds files from another checkout to a QML module under their own names.
function(add_aliased_qml_files out)
    set(files)
    foreach(path ${ARGN})
        get_filename_component(name "${path}" NAME)
        set_source_files_properties("${path}" PROPERTIES QT_RESOURCE_ALIAS "${name}")
        list(APPEND files "${path}")
    endforeach()
    set(${out} ${files} PARENT_SCOPE)
endfunction()

# ---- com.blockworked.Blockstitch: every file the crate's build.rs registers ----
set(bs "${BLOCKSTITCH_DIR}/qml/Blockstitch")
set_source_files_properties("${bs}/Theme.qml" "${bs}/BlockRegistry.qml" "${bs}/Icons.qml" "${bs}/Motion.qml"
    PROPERTIES QT_QML_SINGLETON_TYPE TRUE)
add_aliased_qml_files(blockstitch_qml
    "${bs}/Theme.qml" "${bs}/BlockRegistry.qml" "${bs}/Icons.qml" "${bs}/Motion.qml" "${bs}/LucideIcon.qml"
    "${bs}/BlockSurface.qml" "${bs}/BlockDragArea.qml" "${bs}/BwButton.qml" "${bs}/BwTextField.qml"
    "${bs}/BwComboBox.qml" "${bs}/BwCheckBox.qml" "${bs}/BwMenuItem.qml" "${bs}/BwMenu.qml"
    "${bs}/BwDialog.qml" "${bs}/BwSwitch.qml" "${bs}/BwSlider.qml" "${bs}/SmoothScroll.qml" "${bs}/ValueChip.qml" "${bs}/InstructionBlock.qml"
    "${bs}/InstructionList.qml" "${bs}/PaletteBlock.qml" "${bs}/PaletteValue.qml" "${bs}/CollectionPanel.qml"
    "${bs}/NameDialog.qml" "${bs}/PalettePanel.qml" "${bs}/BlockCanvas.qml")
qt_add_qml_module(blockstitch
    URI com.blockworked.Blockstitch
    VERSION 1.0
    STATIC
    OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/qml/com/blockworked/Blockstitch"
    QML_FILES ${blockstitch_qml}
    NO_LINT)
target_link_libraries(blockstitch PRIVATE Qt6::Quick Qt6::QuickControls2 Qt6::QuickShapes)

# ---- com.blockworked.Blockwork: what EditorPage uses, minus the desktop-only bits ----
set(bw "${BLOCKWORK_DIR}/blockwork-qt/qml")
set(lucide "${LUCIDE_QT_DIR}/qml/Lucide")
set_source_files_properties("${lucide}/Icons.qml" PROPERTIES QT_QML_SINGLETON_TYPE TRUE)
add_aliased_qml_files(blockwork_qml
    "${bw}/EditorPage.qml" "${bw}/SectionCard.qml" "${bw}/WheelPan.qml" "${bw}/MakeBlockDialog.qml"
    "${bw}/AppSelectorDialog.qml" "${bw}/ActivityPanel.qml" "${bw}/TemplateList.qml" "${bw}/LibraryPanel.qml"
    "${bw}/AppDialog.qml"
    "${lucide}/Icons.qml" "${lucide}/LucideIcon.qml"
    # Desktop window chrome and the screen picker, replaced for the page.
    "${CMAKE_CURRENT_SOURCE_DIR}/shims/TitleBarDrag.qml" "${CMAKE_CURRENT_SOURCE_DIR}/shims/WindowControls.qml"
    "${CMAKE_CURRENT_SOURCE_DIR}/shims/ScreenOverlay.qml")
qt_add_qml_module(blockwork
    URI com.blockworked.Blockwork
    VERSION 1.0
    STATIC
    OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/qml/com/blockworked/Blockwork"
    QML_FILES ${blockwork_qml}
    NO_LINT)
target_link_libraries(blockwork PRIVATE Qt6::Quick Qt6::QuickControls2 Qt6::QuickDialogs2)
# The toolbar's logo (":/icons/blockwork.png" in the app).
qt_add_resources(blockwork "blockwork_icons"
    PREFIX "/icons"
    BASE "${BLOCKWORK_DIR}/res/icons"
    FILES "${BLOCKWORK_DIR}/res/icons/blockwork.png")

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

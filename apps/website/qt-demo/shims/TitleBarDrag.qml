import QtQuick

// The page frames the editor itself; there's no window to drag on the web.
// The properties match the app's TitleBarDrag so pages can still set them.
Item {
    property var interactiveItems: []
    property var windowButtons: null
    property var nativeButtons: null
}

import QtQuick
import QtQuick.Controls
import com.blockworked.Blockstitch 1.0
import com.blockworked.Blockwork 1.0

// Every Qt window on the home page, one per screen: the page hands the Qt
// loader one container element per screen (see src/lib/qtDemo.ts), the
// editor first, then the feature-card illustrations in `previewKinds` order.
// A QtObject root rather than an Item: a Window inside an Item only shows
// along with that Item's own window, and this root has none.
QtObject {
    id: root

    readonly property var previewKinds: ["record", "snap", "logic", "custom-block", "battery"]
    // The one scale every illustration draws at: the smallest that fits them all.
    property real previewScale: 0.9
    function updatePreviewScale() {
        let scale = 0.9;
        for (let i = 0; i < previews.count; ++i) {
            const w = previews.objectAt(i);
            if (w && w.fit > 0) scale = Math.min(scale, w.fit);
        }
        previewScale = scale;
    }
    // Set by the page through main.cpp's setEditorScale: below 1, the editor
    // lays out at 1/scale its window's size and is drawn shrunk to fit.
    property real editorScale: 1

    readonly property DemoBackend backend: DemoBackend {
        id: backend
        onNotice: text => { notice.text = text; noticeTimer.restart(); }
    }

    readonly property ApplicationWindow editorWindow: ApplicationWindow {
        id: editorWindow
        screen: Qt.application.screens[0]
        flags: Qt.FramelessWindowHint
        // Fill the screen, i.e. the page element, and follow it as it resizes
        // (a FullScreen window keeps its first size on the web).
        x: Screen.virtualX; y: Screen.virtualY; width: Screen.width; height: Screen.height
        visible: true
        title: qsTr("Blockwork")
        color: "#202124"

        // Keep every control on the app theme instead of the system light/dark palette.
        palette {
            window: Theme.panel; windowText: Theme.text; base: Theme.field; text: Theme.text
            button: Theme.panelRaised; buttonText: Theme.text; highlight: Theme.accent; highlightedText: "white"
            placeholderText: Theme.textDim; toolTipBase: Theme.panelRaised; toolTipText: Theme.text
            mid: Theme.border; dark: Theme.borderSoft; light: Theme.panelRaised; shadow: "#000000"
        }

        function invoke(command, args) { backend.invoke(command, args); }

        // Key blocks capture the next combo pressed, like Main.qml's handler.
        function webCode(event) {
            if (event.key >= Qt.Key_A && event.key <= Qt.Key_Z) return "Key" + String.fromCharCode(65 + event.key - Qt.Key_A);
            if (event.key >= Qt.Key_0 && event.key <= Qt.Key_9) return "Digit" + String.fromCharCode(48 + event.key - Qt.Key_0);
            if (event.key >= Qt.Key_F1 && event.key <= Qt.Key_F24) return "F" + String(event.key - Qt.Key_F1 + 1);
            const codes = ({});
            codes[Qt.Key_Space] = "Space"; codes[Qt.Key_Return] = "Enter"; codes[Qt.Key_Enter] = "NumpadEnter";
            codes[Qt.Key_Escape] = "Escape"; codes[Qt.Key_Tab] = "Tab"; codes[Qt.Key_Backspace] = "Backspace";
            codes[Qt.Key_Delete] = "Delete"; codes[Qt.Key_Insert] = "Insert"; codes[Qt.Key_Home] = "Home"; codes[Qt.Key_End] = "End";
            codes[Qt.Key_PageUp] = "PageUp"; codes[Qt.Key_PageDown] = "PageDown"; codes[Qt.Key_Left] = "ArrowLeft";
            codes[Qt.Key_Right] = "ArrowRight"; codes[Qt.Key_Up] = "ArrowUp"; codes[Qt.Key_Down] = "ArrowDown";
            codes[Qt.Key_Control] = "Control"; codes[Qt.Key_Shift] = "Shift"; codes[Qt.Key_Alt] = "Alt"; codes[Qt.Key_Meta] = "Meta";
            return codes[event.key] || "";
        }
        // Ctrl turns event.text into a control character, so letters come from the key code.
        function captureChar(event) {
            if (event.key >= Qt.Key_A && event.key <= Qt.Key_Z) return String.fromCharCode(97 + event.key - Qt.Key_A);
            return event.text && event.text.length === 1 && event.text >= " " ? event.text : "";
        }
        property var heldCaptureKeys: []
        readonly property bool capturing: backend.appState.key_capture !== null && backend.appState.key_capture !== undefined
        onCapturingChanged: { if (capturing) contentRoot.forceActiveFocus(); else heldCaptureKeys = []; }

        Item {
            id: contentRoot
            anchors.fill: parent
            focus: true
            Keys.priority: Keys.BeforeItem
            Keys.onPressed: event => {
                if (!editorWindow.capturing) return;
                event.accepted = true;
                if (event.isAutoRepeat) return;
                const code = editorWindow.webCode(event), key = editorWindow.captureChar(event) || code;
                if (!code.length && !key.length) return;
                if (!editorWindow.heldCaptureKeys.some(k => k[0] === code && k[1] === key))
                    editorWindow.heldCaptureKeys = editorWindow.heldCaptureKeys.concat([[code, key]]);
            }
            Keys.onReleased: event => {
                if (event.isAutoRepeat || !editorWindow.capturing || !editorWindow.heldCaptureKeys.length) return;
                const keys = editorWindow.heldCaptureKeys;
                editorWindow.heldCaptureKeys = [];
                backend.invoke("key_capture_event", { keys: keys });
                event.accepted = true;
            }

            Item {
                id: scaled
                width: parent.width / root.editorScale; height: parent.height / root.editorScale
                scale: root.editorScale; transformOrigin: Item.TopLeft
                EditorPage {
                    anchors.fill: parent
                    appState: backend.appState
                    invoke: editorWindow.invoke
                    appBridge: backend.bridge
                    // The page frames the editor in a small window, so start with a narrower sidebar.
                    sidebarWidth: scaled.width < 760 ? 220 : 280
                }
            }

            Rectangle {
                id: noticeBar
                anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom
                height: 36; z: 110; color: "#26303d"; border.color: "#3a4a5e"
                opacity: noticeTimer.running ? 1 : 0
                visible: opacity > 0
                Behavior on opacity { NumberAnimation { duration: 160 } }
                Text {
                    id: notice
                    anchors.fill: parent; anchors.leftMargin: 14; anchors.rightMargin: 14
                    verticalAlignment: Text.AlignVCenter; elide: Text.ElideRight
                    color: Theme.text; font.pixelSize: 13
                }
                Timer { id: noticeTimer; interval: 3600 }
            }
        }
    }

    // The feature-card illustrations: one window per extra screen.
    readonly property Instantiator previews: Instantiator {
        model: Math.max(0, Qt.application.screens.length - 1)
        delegate: Window {
            id: previewWindow
            required property int index
            screen: Qt.application.screens[index + 1]
            // Never focused: a focused Qt window scrolls the page to itself.
            flags: Qt.FramelessWindowHint | Qt.WindowDoesNotAcceptFocus
            x: Screen.virtualX; y: Screen.virtualY; width: Screen.width; height: Screen.height
            visible: true
            color: "transparent"
            readonly property real fit: stageItem.fit
            onFitChanged: root.updatePreviewScale()
            PreviewStage {
                id: stageItem
                anchors.fill: parent
                kind: root.previewKinds[previewWindow.index] || ""
                sharedScale: root.previewScale
            }
        }
    }
}

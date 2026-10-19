import QtQuick
import com.blockworked.Blockstitch 1.0

// One feature illustration: a small stack drawn by blockstitch's real
// InstructionBlock, so it looks exactly like the editor. `kind` picks the
// stack; "snap" carries a block over and drops it onto the stack, and
// "record" adds its blocks one by one as if they were being recorded, on a loop.
Item {
    id: root
    property string kind: ""
    // Every illustration on the page draws at one scale (DemoMain takes the
    // smallest `fit`), so the blocks match from section to section.
    property real sharedScale: fit

    function num(n) { return { kind: "Number", value: n }; }
    function op(name, args) { return { kind: "Op", op: name, args: args, saved: num(0) }; }

    readonly property var blockDefs: [{
        id: "preview-log-in-as", shape: "Normal", color: "#BF5AF2", icon: "",
        pieces: [{ kind: "Label", id: "l", text: "log in as" }, { kind: "Input", id: "u", name: "user", value_type: "Any" }]
    }]
    function txt(t) { return { kind: "Text", value: t }; }
    readonly property var presets: ({
        // What the recorder produces (blockwork-core's recording/mod.rs): a
        // Press and a Release per key or button, with the real gap between
        // every two events as a Wait.
        "record": [{ id: "a", type: "Button", button: "Left", direction: "Press" },
                   { id: "b", type: "Wait", duration: num(84) },
                   { id: "c", type: "Button", button: "Left", direction: "Release" },
                   { id: "d", type: "Wait", duration: num(612) },
                   { id: "e", type: "Key", key: txt("Enter"), direction: "Press" },
                   { id: "f", type: "Wait", duration: num(97) },
                   { id: "g", type: "Key", key: txt("Enter"), direction: "Release" }],
        "logic": [{ id: "a", type: "SetVariable", name: "clicks", value: num(0) },
                  { id: "b", type: "Repeat", count: num(10), body: [
                      { id: "c", type: "Button", button: "Left", direction: "Click" },
                      { id: "d", type: "Wait", duration: op("Random", [num(80), num(120)]) },
                      { id: "e", type: "ChangeVariable", name: "clicks", value: num(1) }] }],
        "custom-block": [{ id: "a", type: "BlockHeader", block_id: "preview-log-in-as" },
                         { id: "b", type: "Text", text: { kind: "Param", name: "user" } },
                         { id: "c", type: "Key", key: { kind: "Text", value: "Enter" }, direction: "Click" }],
        "battery": [{ id: "a", type: "WhenBatteryChargedTo", threshold: num(100) },
                    { id: "b", type: "Command", command: "notify-send \"Fully charged\"" }],
        "snap": [{ id: "a", type: "Key", key: { kind: "Text", value: "Enter" }, direction: "Click" }]
    })
    // Lucide's hand and hand-grab (ISC), which the lean icon set leaves out.
    readonly property string handPaths: "<path d='M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2'/><path d='M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2'/><path d='M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8'/><path d='M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'/>"
    readonly property string grabPaths: "<path d='M18 11.5V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4'/><path d='M14 10V8a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2'/><path d='M10 9.9V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v5'/><path d='M6 14a2 2 0 0 0-2-2a2 2 0 0 0-2 2'/><path d='M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0'/>"
    readonly property var carried: ({ id: "c", type: "Button", button: "Left", direction: "Click" })
    readonly property var stack: kind === "snap" && snap.placed ? presets.snap.concat([carried]) : (presets[kind] || [])

    // The largest scale (up to the editor's own size) at which this stack fits.
    readonly property real fit: Math.min(1, (width - 40) / Math.max(1, stage.width), (height - 32) / Math.max(1, stage.height))

    Item {
        id: stage
        anchors.centerIn: parent
        // The snap stage keeps one size through its loop (room for the carried
        // block's starting point), so the stack doesn't jump as the block lands.
        width: root.kind === "snap" ? carriedBlock.implicitWidth + 84 : column.childrenRect.width
        height: root.kind === "snap" ? snap.landingY + carriedBlock.implicitHeight + 78 : column.childrenRect.height
        scale: root.sharedScale
        // Illustrations only: they look like real blocks but nothing grabs or types.
        enabled: false

        Column {
            id: column
            spacing: -8
            Repeater {
                id: stackBlocks
                model: root.stack
                delegate: InstructionBlock {
                    required property var modelData
                    required property int index
                    instruction: modelData; strandId: "preview-" + root.kind; path: [{ index: index }]
                    blockDefinitions: root.blockDefs; variables: ["clicks", "delay"]; locked: true
                    opacity: root.kind === "snap" && index === 1 && snap.phase === "fade" ? 0
                        : root.kind === "record" && index >= record.shown ? 0 : 1
                    Behavior on opacity { NumberAnimation { duration: 280 } }
                }
            }
        }

        // Close enough to snap: the canvas's attach preview, the carried
        // block's own silhouette in accent where it will land (BlockCanvas's
        // snapPreview).
        BlockSurface {
            visible: root.kind === "snap" && snap.phase === "near"
            x: 0; y: snap.landingY; width: carriedBlock.width; height: carriedBlock.height
            shape: "stack"; fill: Theme.accent; outline: Theme.accent; opacity: 0.55
        }
        InstructionBlock {
            id: carriedBlock
            visible: root.kind === "snap" && !snap.placed
            opacity: snap.phase === "idle" ? 1 : 0.92
            instruction: root.carried; strandId: "preview-carried"; path: [{ index: 0 }]; locked: true
            x: snap.carryX; y: snap.landingY + snap.carryY
            Behavior on x { enabled: snap.animate; NumberAnimation { duration: 900; easing.type: Easing.InOutCubic } }
            Behavior on y { enabled: snap.animate; NumberAnimation { duration: 900; easing.type: Easing.InOutCubic } }
            // The pointer: an open hand over the waiting block, closed while carrying it.
            Image {
                x: 16; y: 14; width: 22; height: 22
                sourceSize: Qt.size(66, 66)
                source: "data:image/svg+xml;utf8," + encodeURIComponent(
                    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#000' stroke='"
                    + Theme.text + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>"
                    + (snap.phase === "idle" ? root.handPaths : root.grabPaths) + "</svg>")
            }
        }
    }

    // Recording: the blocks come in as the recorder would add them, a pause on
    // the full stack, then again.
    QtObject { id: record; property int shown: 0 }
    Timer {
        running: root.kind === "record"; repeat: true
        interval: record.shown === root.stack.length ? 2600 : 550
        onTriggered: record.shown = record.shown >= root.stack.length ? 0 : record.shown + 1
    }
    // carry -> near (held within snapping range) -> placed -> fade, then again.
    QtObject {
        id: snap
        property string phase: "placed"
        readonly property bool placed: phase === "placed" || phase === "fade"
        property bool animate: false
        property real carryX: 80
        property real carryY: 78
        // Where the second row of the stack starts (rows overlap by their 8px tab).
        readonly property real landingY: stackBlocks.count ? stackBlocks.itemAt(0).height - 8 : 50
        function start() { animate = false; carryX = 80; carryY = 78; phase = "idle"; step.restart(); }
    }
    Timer {
        id: step
        property int tick: 0
        interval: 900
        onTriggered: {
            if (snap.phase === "idle") { snap.animate = true; snap.carryX = 34; snap.carryY = 38; snap.phase = "carry"; interval = 750; restart(); }
            else if (snap.phase === "carry") { snap.phase = "near"; interval = 950; restart(); }
            else if (snap.phase === "near") { snap.phase = "placed"; interval = 2400; restart(); }
            else if (snap.phase === "placed") { snap.phase = "fade"; interval = 300; restart(); }
            else { interval = 900; snap.start(); }
        }
    }
    Component.onCompleted: if (kind === "snap") snap.start()
}

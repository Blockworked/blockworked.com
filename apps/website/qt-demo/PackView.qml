import QtQuick
import com.blockworked.Blockstitch 1.0
import com.blockworked.Blockwork 1.0

// The community site's pack viewer (public/packview/): a pack's blocks on
// blockstitch's own canvas, read-only, with the editor's pan and zoom. It
// also draws each block the pack defines the way the palette does, as dark
// and light PNGs, for the site's cards and lists (PackHost.renderRequested).
QtObject {
    id: root

    readonly property DemoBackend backend: DemoBackend { example: false }
    readonly property var macro: backend.appState.current_macro || null
    // The pack's strands, moved so its top left corner starts near the
    // view's: the canvas opens centred on the workspace origin.
    property var strands: []
    property real viewWidth: 0
    property real viewHeight: 0

    function load() {
        if (!PackHost.pack.length) return;
        let pack;
        try { pack = JSON.parse(PackHost.pack); }
        catch (e) { PackHost.failed(qsTr("That isn't a pack file.")); return; }
        if (!pack || !pack.blocks) { PackHost.failed(qsTr("That isn't a pack file.")); return; }
        backend.loadMacro(pack.blocks);
        if (backend.failure.length) { PackHost.failed(backend.failure); return; }
        place();
        canvas.centerOnOrigin();
    }
    function place() {
        let list = macro ? macro.strands || [] : [];
        // Packs shared from the editor keep every definition at 0,0; stand
        // overlapping ones one under the other instead.
        const spots = list.map(s => s.x + "," + s.y);
        if (spots.some((spot, i) => spots.indexOf(spot) !== i)) {
            let y = 0;
            list = list.map(s => {
                const at = Object.assign({}, s, { x: 0, y: y });
                y += canvas.contentHeightFor(s.instructions) + 48;
                return at;
            });
        }
        let minX = Infinity, minY = Infinity;
        list.forEach(s => { minX = Math.min(minX, s.x); minY = Math.min(minY, s.y); });
        const dx = isFinite(minX) ? -viewWidth / 2 + 32 - minX : 0;
        const dy = isFinite(minY) ? -viewHeight / 2 + 32 - minY : 0;
        shift = Qt.point(dx, dy);
        strands = list.map(s => Object.assign({}, s, { x: s.x + dx, y: s.y + dy }));
    }
    property point shift: Qt.point(0, 0)
    function moved(list) {
        return (list || []).map(o => Object.assign({}, o, { x: o.x + shift.x, y: o.y + shift.y }));
    }

    readonly property Connections host: Connections {
        target: PackHost
        function onPackChanged() { root.load(); }
        function onThemeChanged() { Theme.mode = PackHost.theme; }
        function onRenderRequested() { renderer.start(); }
    }

    readonly property Window window: Window {
        id: window
        screen: Qt.application.screens[0]
        flags: Qt.FramelessWindowHint
        x: Screen.virtualX; y: Screen.virtualY; width: Screen.width; height: Screen.height
        visible: true
        color: Theme.canvas
        onWidthChanged: root.viewWidth = width
        onHeightChanged: root.viewHeight = height
        Component.onCompleted: {
            Theme.mode = PackHost.theme;
            root.viewWidth = width; root.viewHeight = height;
            PackHost.ready();
            root.load();
        }

        // EditorPage registers Blockwork's blocks with blockstitch as it's
        // made, which is all it's here for.
        EditorPage {
            width: 0; height: 0; visible: false
            appState: root.backend.appState
            invoke: (command, args) => root.backend.invoke(command, args)
            appBridge: root.backend.bridge
        }

        // What the renderer grabs. The canvas covers it; a grab draws the
        // item on its own, wherever it sits.
        Column {
            id: stage
            spacing: 8
            // Nothing hovers or presses these, so no grab catches a highlight.
            enabled: false
            Repeater {
                id: stageItems
                model: root.macro ? root.macro.block_defs.filter(def => !def.read_only) : []
                // The outline's stroke and the connector tab reach past a block's
                // own bounds, so each one is grabbed with a margin around it.
                delegate: Item {
                    id: entry
                    required property var modelData
                    readonly property int margin: 3
                    readonly property Item item: block.item
                    width: block.width + 2 * margin; height: block.height + 2 * margin
                    Loader {
                        id: block
                        x: entry.margin; y: entry.margin
                        sourceComponent: entry.modelData.shape === "ReturnsValue" || entry.modelData.shape === "ReturnsBool" ? reporter : call
                        Component {
                            id: call
                            PaletteBlock {
                                instruction: root.callInstruction(entry.modelData)
                                variables: root.macro.variables || []; lists: root.macro.lists || []
                                blockDefinitions: root.macro.block_defs; blockColor: entry.modelData.color || Theme.block
                            }
                        }
                        Component {
                            id: reporter
                            PaletteValue {
                                valueData: ({ kind: "Call", block_id: entry.modelData.id, args: BlockRegistry.freshCallArgs(entry.modelData), branches: [], saved: { kind: "Number", value: 0 } })
                                editable: false; forceBoolean: entry.modelData.shape === "ReturnsBool"
                                blockDefinitions: root.macro.block_defs
                            }
                        }
                    }
                }
            }
        }

        BlockCanvas {
            id: canvas
            anchors.fill: parent
            locked: true
            offerClear: false
            strands: root.strands
            comments: root.moved(root.macro ? root.macro.comments : [])
            floatingValues: root.moved(root.macro ? root.macro.floating_values : [])
            variables: root.macro ? root.macro.variables : []
            lists: root.macro && root.macro.lists ? root.macro.lists : []
            blockDefinitions: root.macro ? root.macro.block_defs : []
        }
    }

    // The palette's own call for a definition (PalettePanel.customInstruction).
    function callInstruction(definition) {
        const branches = (definition.pieces || []).filter(p => p.kind === "Branch").length;
        const ins = { id: "pack-call", type: branches ? "BranchCallBlock" : "CallBlock", block_id: definition.id, args: BlockRegistry.freshCallArgs(definition) };
        if (branches) ins.branches = Array.from({ length: branches }, () => []);
        return ins;
    }

    // Grabs every stage item in dark, then light, at twice the size, then
    // puts the page's theme back.
    readonly property QtObject renderer: QtObject {
        property var results: []
        property var themes: []
        property int index: 0
        function start() {
            results = [];
            for (let i = 0; i < stageItems.count; ++i) {
                const def = stageItems.itemAt(i).modelData;
                results.push({ id: def.id, width: 0, height: 0 });
            }
            themes = ["dark", "light"];
            next();
        }
        function next() {
            if (!themes.length) {
                Theme.mode = PackHost.theme;
                PackHost.rendered(JSON.stringify({ blocks: results }));
                return;
            }
            Theme.mode = themes[0];
            index = 0;
            settle.restart();
        }
        function grab() {
            if (index >= stageItems.count) { themes = themes.slice(1); next(); return; }
            const item = stageItems.itemAt(index);
            const theme = themes[0], at = index;
            const done = result => {
                results[at][theme] = PackHost.png(result.image);
                results[at].width = Math.ceil(item.width);
                results[at].height = Math.ceil(item.height);
                index++;
                grab();
            };
            if (!item || !item.item || item.width <= 0 || !item.grabToImage(done, Qt.size(Math.ceil(item.width) * 2, Math.ceil(item.height) * 2))) {
                index++;
                grab();
            }
        }
    }
    // A theme change restyles on the next frames; give it a moment.
    readonly property Timer settle: Timer {
        interval: 120
        property int waits: 0
        // Icons load on their own; wait (up to ~5 s) until none is still loading.
        onTriggered: {
            if (waits < 40 && root.loading(stage)) { waits++; restart(); return; }
            waits = 0;
            root.renderer.grab();
        }
    }
    function loading(item) {
        if (item.status === Image.Loading || (item.status === Image.Null && item.source && String(item.source).length)) return true;
        const kids = item.children || [];
        for (let i = 0; i < kids.length; ++i) if (loading(kids[i])) return true;
        return false;
    }
}

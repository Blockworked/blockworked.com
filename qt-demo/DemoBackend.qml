import QtQuick

// The website's stand-in for Blockwork's daemon. EditorPage talks to the app
// through `invoke(command, args)` and an AppBridge (state JSON, call replies,
// value previews). Editing goes to Blockwork's own editor core (Core, the
// blockwork-web library linked into the page): the same commands, document,
// undo and preview the app uses. What only the app can do (running,
// recording, saving) answers with a notice. Nothing persists: a reload
// restores the example macro.
QtObject {
    id: backend

    property var appState: ({})
    // Shown by DemoMain's notice bar, e.g. when a button needs the real app.
    signal notice(string text)
    // Why the editor has no document, shown by DemoMain over the editor
    // with a way to start over. Empty while all is well.
    property string failure: ""

    readonly property Core core: Core {}

    // ---- AppBridge surface (see blockwork-qt/src/app_bridge.rs) ----
    readonly property QtObject bridge: QtObject {
        property string replyKey: ""
        property string replyJson: ""
        property string replyError: ""
        property int replySerial: 0
        property string previewKey: ""
        property string previewText: ""
        property bool previewError: false
        property int previewSerial: 0
        property string activeBlocksJson: "[]"
        // A web page can't list the visitor's installed apps.
        property string installedAppsJson: "[]"
        property bool installedAppsLoading: false
        property string installedAppsError: qsTr("Choosing an installed app needs the Blockwork app.")
        property int installedAppsSerial: 0
        // AppBridge's error line; set when a command fails or isn't supported here.
        property string lastError: ""
        function invokeCommand(command, argumentsJson) { backend.invoke(command, JSON.parse(argumentsJson || "{}")); }
        // Reply calls the core answers (edits from a drop, copying blocks,
        // signals) get its answer; the rest (name pools, models, devices,
        // files) need the app.
        function callCommand(key, command, argumentsJson) {
            let json = "null", error = qsTr("That needs the Blockwork app.");
            if (backend.coreCommands.indexOf(command) >= 0) {
                const answer = backend.core.dispatch(command, JSON.parse(argumentsJson || "{}"));
                json = JSON.stringify(answer.result === undefined ? null : answer.result);
                error = answer.ok ? "" : String(answer.error);
                if (answer.ok) backend.publish();
            } else {
                console.warn("DemoBackend: reply call", command, "needs the app");
            }
            replyKey = key; replyJson = json; replyError = error;
            replySerial++;
        }
        function previewValue(key, valueJson) {
            const answer = backend.core.dispatch("preview_value", { value: JSON.parse(valueJson) });
            previewKey = key;
            previewText = answer.ok ? String(answer.result) : String(answer.error);
            previewError = !answer.ok;
            previewSerial++;
        }
        function refreshInstalledApps() { installedAppsSerial++; }
        function nativeAppIcon(command) { return ""; }
        function setWindowFrameMargin(margin) {}
    }

    // Every command the core answers, read from it once it starts.
    property var coreCommands: []

    // One command through the core: its result, or a thrown error.
    function run(command, args) {
        const answer = core.dispatch(command, args === undefined ? {} : args);
        if (!answer.ok) throw String(answer.error);
        return answer.result;
    }
    function publish() {
        try { backend.appState = run("state"); }
        catch (e) { fail(e); }
    }
    function fail(reason) {
        console.warn("DemoBackend:", reason);
        backend.failure = String(reason);
    }

    function invoke(command, args) {
        if (failure.length) return;
        if (needsApp[command]) { notice(needsApp[command]); return; }
        if (coreCommands.indexOf(command) < 0) {
            // Never drop a command silently.
            const text = qsTr("The website demo doesn't support \u201c%1\u201d.").arg(command);
            console.warn("DemoBackend: unsupported command", command);
            bridge.lastError = text;
            notice(text);
            return;
        }
        try {
            run(command, args || {});
        } catch (e) {
            bridge.lastError = String(e);
            notice(String(e));
        }
        publish();
    }

    readonly property var needsApp: ({
        run_macro: qsTr("Running macros needs the Blockwork app. Nothing runs on the website."),
        start_recording: qsTr("Recording needs the Blockwork app."),
        save_macro: qsTr("Edits here stay in this tab. Download Blockwork to keep your macros."),
        open_settings: qsTr("Settings live in the Blockwork app."),
        emergency_stop: qsTr("Nothing is running on the website."),
        set_macro_restricted: qsTr("Permissions live in the Blockwork app."),
        set_macro_permission: qsTr("Permissions live in the Blockwork app."),
        new_macro_from_template: qsTr("Templates live in the Blockwork app."),
        stop_recording: qsTr("Recording needs the Blockwork app."),
        set_recording_countdown: qsTr("Recording needs the Blockwork app."),
        toggle_record_mouse_movement: qsTr("Recording needs the Blockwork app."),
        toggle_record_mouse_relative: qsTr("Recording needs the Blockwork app."),
        toggle_breakpoint: qsTr("Breakpoints need the Blockwork app. Nothing runs on the website."),
        clear_breakpoints: qsTr("Breakpoints need the Blockwork app. Nothing runs on the website."),
        debug_action: qsTr("Nothing is running on the website."),
        resume_triggers: qsTr("Triggers need the Blockwork app. Nothing runs on the website."),
        clear_run_log: qsTr("Nothing runs on the website, so there's no run log.")
    })
    // What this backend answers, for check-contract.py (main.cpp --contract).
    // A reply call the core doesn't answer gets an error.
    function capabilities() {
        return JSON.stringify({ handled: coreCommands, needs_app: Object.keys(needsApp), unsupported: [],
                                calls: "error", calls_handled: coreCommands, failure: failure });
    }

    // ---- the example macro, built through the core's own commands ----
    function newId() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }
    function num(n) { return { kind: "Number", value: n }; }
    function txt(t) { return { kind: "Text", value: t }; }
    function op(name, args) { return { kind: "Op", op: name, args: args, saved: num(0) }; }
    function variable(name) { return { kind: "Var", name: name }; }
    function block(type, fields) { return Object.assign({ id: newId(), type: type }, fields || {}); }
    function buildExample() {
        run("new_macro");
        run("set_title", { title: qsTr("My macro") });
        run("create_variable", { name: "clicks" });
        run("create_variable", { name: "delay" });
        const main = run("add_strand", { x: 0, y: 0, instruction: block("WhenRan") });
        [
            block("Text", { text: txt(qsTr("Hello from Blockwork!")) }),
            block("Key", { key: txt("Enter"), direction: "Click" }),
            block("SetVariable", { name: "clicks", value: num(0) }),
            block("Repeat", { count: num(10), body: [
                block("Button", { button: "Left", direction: "Click" }),
                block("Wait", { duration: op("Random", [num(80), num(120)]) }),
                block("ChangeVariable", { name: "clicks", value: num(1) })
            ] }),
            block("If", { condition: op("Gt", [variable("clicks"), num(5)]), body: [
                block("Scroll", { amount: num(-4), axis: "Vertical" })
            ] })
        ].forEach((ins, i) => run("add_instruction", { strandId: main, path: [{ index: i + 1, slot: null }], instruction: ins }));
        run("add_strand", { x: 420, y: 250, instruction: block("MoveMouse", { x: num(640), y: num(360), coordinate: "Absolute" }) });
        run("create_floating_value", { x: 420, y: 170, value: op("Join", [txt("clicked "), variable("clicks")]), originBlockId: null });
        run("create_comment", { x: 420, y: 0,
            text: qsTr("Drag blocks from the sidebar, snap them into the stack, or drop them back on the sidebar to delete.") });
        // Reopening it starts the history empty, as a freshly opened macro.
        run("select_macro_by_id", { id: run("state").current_macro.id });
    }

    // Starts (or starts over) with the example macro open.
    function start() {
        backend.failure = core.failure;
        if (failure.length) return;
        try {
            core.reset();
            backend.coreCommands = run("commands");
            buildExample();
        } catch (e) {
            fail(qsTr("The editor couldn't set up its example: %1").arg(e));
            return;
        }
        publish();
    }
    Component.onCompleted: start()
}

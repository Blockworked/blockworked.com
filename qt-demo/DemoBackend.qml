import QtQuick
import com.blockworked.Blockstitch 1.0

// The website's stand-in for Blockwork's daemon. EditorPage talks to the app
// through `invoke(command, args)` and an AppBridge (state JSON, call replies,
// value previews); this answers the same calls by porting the matching
// commands from blockwork-app's commands.rs and blockstitch-core's editor
// ops onto in-memory macros. Nothing runs and nothing persists: a reload
// restores the example macro.
QtObject {
    id: backend

    property var appState: buildState()
    // Shown by DemoMain's notice bar, e.g. when a button needs the real app.
    signal notice(string text)

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
        function invokeCommand(command, argumentsJson) { backend.invoke(command, JSON.parse(argumentsJson || "{}")); }
        function callCommand(key, command, argumentsJson) {
            replyKey = key; replyJson = "null";
            replyError = qsTr("That needs the Blockwork app.");
            replySerial++;
        }
        function previewValue(key, valueJson) {
            let text = "", error = false;
            try { text = backend.previewText(JSON.parse(valueJson)); }
            catch (e) { text = String(e); error = true; }
            previewKey = key; previewText = text; previewError = error;
            previewSerial++;
        }
        function refreshInstalledApps() { installedAppsSerial++; }
        function nativeAppIcon(command) { return ""; }
        function setWindowFrameMargin(margin) {}
    }

    // ---- state ----
    property var macros: [starterMacro()]
    property int selected: 0
    property var history: []
    property var future: []
    property var keyCapture: null
    property var standaloneKey: null
    property string paletteLayout: "rail"
    property var invalidBuffers: []

    function current() { return selected >= 0 && selected < macros.length ? macros[selected] : null; }
    function mac() { const m = current(); if (!m) throw qsTr("No macro selected"); return m; }
    function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
    function newId() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }
    function num(n) { return { kind: "Number", value: n }; }
    function txt(t) { return { kind: "Text", value: t }; }
    function op(name, args) { return { kind: "Op", op: name, args: args, saved: num(0) }; }
    function variable(name) { return { kind: "Var", name: name }; }

    function defaultSettings() {
        return { always_listen: false, max_run_secs: 0, max_loop_iterations: 0, only_in_window: "", power: "Any",
                 active_from: "", active_until: "", active_days: 0, folder: "", catch_up_missed: false };
    }
    function emptyMacro(name) {
        return { id: newId(), name: name, description: "", strands: [], recording_target_strand_id: null, speed_multiplier: 1,
                 floating_values: [], comments: [], variables: [], lists: [], block_defs: [], settings: defaultSettings() };
    }
    function starterMacro() {
        const m = emptyMacro(qsTr("My macro"));
        m.variables = ["clicks", "delay"];
        m.strands = [
            { id: newId(), x: 0, y: 0, instructions: [
                { id: newId(), type: "WhenRan" },
                { id: newId(), type: "Text", text: txt("Hello from Blockwork!") },
                { id: newId(), type: "Key", key: txt("Enter"), direction: "Click" },
                { id: newId(), type: "SetVariable", name: "clicks", value: num(0) },
                { id: newId(), type: "Repeat", count: num(10), body: [
                    { id: newId(), type: "Button", button: "Left", direction: "Click" },
                    { id: newId(), type: "Wait", duration: op("Random", [num(80), num(120)]) },
                    { id: newId(), type: "ChangeVariable", name: "clicks", value: num(1) }
                ] },
                { id: newId(), type: "If", condition: op("Gt", [variable("clicks"), num(5)]), body: [
                    { id: newId(), type: "Scroll", amount: num(-4), axis: "Vertical" }
                ] }
            ] },
            { id: newId(), x: 420, y: 250, instructions: [
                { id: newId(), type: "MoveMouse", x: num(640), y: num(360), coordinate: "Absolute" }
            ] }
        ];
        m.floating_values = [{ id: newId(), x: 420, y: 170, value: op("Join", [txt("clicked "), variable("clicks")]), origin_block_id: null }];
        m.comments = [{ id: newId(), x: 420, y: 0, collapsed: false, attached_to: null,
                        text: qsTr("Drag blocks from the sidebar, snap them into the stack, or drop them back on the sidebar to delete.") }];
        return m;
    }

    function buildState() {
        const m = current();
        return {
            macro_names: macros.map(x => x.name), macro_selected: m ? selected : null, current_macro: m ? clone(m) : null,
            macros_data: [], global_speed_multiplier: 1, is_looping: false, page: "Main", onboarding_done: true,
            palette_layout: paletteLayout, confirm_clear_instructions: false, confirm_clear_instructions_remaining_secs: 0,
            key_capture: clone(keyCapture), standalone_key: standaloneKey, combo_capture: null,
            can_undo: history.length > 0, can_redo: future.length > 0,
            recording_phase: { phase: "Idle", countdown: null }, record_mouse_relative: true, record_mouse_movement: false,
            absolute_mouse_position_available: true, invalid_field_buffers: clone(invalidBuffers),
            triggers_paused: false, run_log: [], templates: [], secret_names: [], breakpoints: [], paused_macros: [], paused_strands: [],
            library: macros.map(x => ({ id: x.id, name: x.name, folder: x.settings.folder, always_listen: false, restricted: false,
                has_triggers: x.strands.some(st => st.instructions.length && BlockRegistry.isHeader(st.instructions[0].type)
                    && ["WhenRan", "BlockHeader", "WhenSignal"].indexOf(st.instructions[0].type) < 0) })),
            language: ""
        };
    }
    function publish() { backend.appState = buildState(); }

    // Commands that change the open macro snapshot it first, like push_undo.
    readonly property var readOnly: ["undo", "redo", "start_key_capture", "start_standalone_key_capture", "clear_standalone_key_capture",
        "set_palette_layout", "select_macro_by_id", "new_macro", "new_macro_from_template", "duplicate_macro", "delete_macro", "remove_macro"]
    function invoke(command, args) {
        args = args || {};
        const handler = commands[command];
        if (!handler) {
            if (needsApp[command]) notice(needsApp[command]);
            return;
        }
        const before = current() ? JSON.stringify(current()) : null;
        try {
            handler(args);
        } catch (e) {
            if (before !== null && current()) macros[selected] = JSON.parse(before);
            notice(String(e));
            publish();
            return;
        }
        if (readOnly.indexOf(command) < 0 && before !== null && current() && JSON.stringify(current()) !== before) {
            backend.history = history.concat([before]).slice(-100);
            backend.future = [];
        }
        publish();
    }

    readonly property var needsApp: ({
        run_macro: qsTr("Running macros needs the Blockwork app. Nothing runs on the website."),
        start_recording: qsTr("Recording needs the Blockwork app."),
        save_macro: qsTr("Edits here stay in this tab. Download Blockwork to keep your macros."),
        open_settings: qsTr("Settings live in the Blockwork app."),
        emergency_stop: qsTr("Nothing is running on the website."),
        set_macro_restricted: qsTr("Permissions live in the Blockwork app.")
    })

    // ---- instruction tree (InstructionKind::body / resolve_body_mut) ----
    function bodyRef(ins, slot) {
        if (!ins || slot === null || slot === undefined) return null;
        if (ins.type === "BranchCallBlock") return (ins.branches || [])[slot] || null;
        const key = BlockRegistry.mouthKeys(ins.type)[slot];
        if (!key) return null;
        if (!ins[key]) ins[key] = [];
        return ins[key];
    }
    function bodies(ins) {
        const out = [];
        const count = ins.type === "BranchCallBlock" ? (ins.branches || []).length : BlockRegistry.mouthKeys(ins.type).length;
        for (let s = 0; s < count; ++s) { const b = bodyRef(ins, s); if (b) out.push(b); }
        return out;
    }
    function resolveBody(list, path) {
        if (!path || !path.length) return null;
        let current = list;
        for (let i = 0; i < path.length - 1; ++i) {
            const next = bodyRef(current[path[i].index], path[i].slot);
            if (!next) return null;
            current = next;
        }
        return [current, path[path.length - 1].index];
    }
    function strandOf(m, id) { return m.strands.find(s => s.id === id) || null; }
    function instructionAt(m, strandId, path) {
        const strand = strandOf(m, strandId);
        const r = strand && resolveBody(strand.instructions, path);
        return r ? r[0][r[1]] || null : null;
    }
    function isHeader(ins) { return !!ins && BlockRegistry.isHeader(ins.type); }
    function walkInstructions(list, fn) { list.forEach(ins => { fn(ins); bodies(ins).forEach(b => walkInstructions(b, fn)); }); }
    function pruneOrphanedComments(m) {
        const live = {};
        m.strands.forEach(s => walkInstructions(s.instructions, ins => live[ins.id] = true));
        m.comments = m.comments.filter(c => !c.attached_to || live[c.attached_to]);
    }
    function checkHeaderPlacement(list, index, ins, topLevel) {
        if (index === 0 && isHeader(list[0])) throw qsTr("Can't attach a block above a When block");
        if (isHeader(ins) && (!topLevel || index !== 0)) throw qsTr("A When block can only be the first block in a strand");
    }
    function checkLoopControlPlacement(strand, path, ins) {
        if (ins.type !== "EscapeLoop" && ins.type !== "ContinueLoop") return;
        let list = strand.instructions;
        for (let i = 0; i < path.length; ++i) {
            const step = path[i];
            if (step.slot === null || step.slot === undefined) break;
            const ancestor = list[step.index];
            if (!ancestor) break;
            if (["Repeat", "Forever", "While"].indexOf(ancestor.type) >= 0) return;
            const next = bodyRef(ancestor, step.slot);
            if (!next) break;
            list = next;
        }
        throw qsTr("An Escape Loop/Continue Loop block can only be used inside a Repeat/Forever/While loop");
    }
    function checkReturnPlacement(m, strand, ins) {
        if (ins.type !== "Return") return;
        const head = strand.instructions[0];
        const def = head && head.type === "BlockHeader" ? m.block_defs.find(d => d.id === head.block_id) : null;
        if (!def || (def.shape !== "ReturnsValue" && def.shape !== "ReturnsBool"))
            throw qsTr("A Return block can only be used inside a custom block that returns a value");
    }

    // ---- value slots (FieldId / value_slot_mut) ----
    readonly property var builtinFields: ({
        WaitDuration: "duration", MoveMouseX: "x", MoveMouseY: "y", ScrollAmount: "amount", TextValue: "text", KeyValue: "key",
        SetVariableValue: "value", ChangeVariableValue: "value", SetClipboardValue: "value", AddToListValue: "value",
        InsertIntoListValue: "value", ReplaceItemOfListValue: "value", ReturnValue: "value",
        DeleteOfListIndex: "index", InsertIntoListIndex: "index", ReplaceItemOfListIndex: "index", ShiftListAmount: "amount",
        Condition: "condition", RepeatCount: "count", BatteryDischargeThreshold: "threshold", BatteryChargeThreshold: "threshold"
    })
    readonly property var integerFields: ["MoveMouseX", "MoveMouseY", "ScrollAmount", "BatteryDischargeThreshold", "BatteryChargeThreshold",
        "DeleteOfListIndex", "ShiftListAmount", "InsertIntoListIndex", "ReplaceItemOfListIndex", "RetryCount", "WindowX", "WindowY", "AimIndex"]
    // The registered row piece that draws `fieldId` on this instruction.
    function rowPiece(ins, fieldId) {
        const row = BlockRegistry.row(ins.type);
        if (!row || !row.head) return null;
        const pieces = typeof row.head === "function" ? row.head(ins) : row.head;
        return (pieces || []).find(p => p && p.kind === "value" && p.field === fieldId) || null;
    }
    function fieldSlot(ins, fieldId) {
        if (fieldId.indexOf("CallArg:") === 0) {
            const i = Number(fieldId.slice(8));
            if (!ins.args || i >= ins.args.length) return null;
            return { get: () => ins.args[i], set: v => { ins.args[i] = v; } };
        }
        const piece = rowPiece(ins, fieldId);
        if (piece) {
            if (piece.index !== undefined && piece.index !== null) {
                const arr = ins[piece.key];
                return arr ? { get: () => arr[piece.index], set: v => { arr[piece.index] = v; } } : null;
            }
            return { get: () => ins[piece.key], set: v => { ins[piece.key] = v; } };
        }
        const key = builtinFields[fieldId];
        return key && ins[key] !== undefined ? { get: () => ins[key], set: v => { ins[key] = v; } } : null;
    }
    function slotAt(m, loc) {
        let slot;
        if (loc.kind === "Floating") {
            const fv = m.floating_values.find(f => f.id === loc.floating_id);
            if (!fv) return null;
            slot = { get: () => fv.value, set: v => { fv.value = v; } };
        } else {
            const ins = instructionAt(m, loc.strand_id, loc.index);
            slot = ins ? fieldSlot(ins, loc.field_id) : null;
        }
        (loc.path || []).forEach(step => {
            const node = slot ? slot.get() : null;
            if (!node || (node.kind !== "Op" && node.kind !== "Call") || step >= node.args.length) { slot = null; return; }
            slot = { get: () => node.args[step], set: v => { node.args[step] = v; } };
        });
        return slot;
    }
    // blank_value_at: what a field falls back to once its value is dragged out.
    function blankAt(m, loc) {
        if (loc.kind !== "Field" || (loc.path && loc.path.length)) return num(0);
        if (loc.field_id === "Condition") return { kind: "Bool" };
        if (loc.field_id === "KeyValue") return txt("");
        const ins = instructionAt(m, loc.strand_id, loc.index);
        if (!ins) return num(0);
        if (loc.field_id.indexOf("CallArg:") === 0) {
            const def = m.block_defs.find(d => d.id === ins.block_id);
            const input = def ? def.pieces.filter(p => p.kind === "Input")[Number(loc.field_id.slice(8))] : null;
            return input && input.value_type === "Bool" ? { kind: "Bool" } : num(0);
        }
        const piece = rowPiece(ins, loc.field_id);
        return piece && piece.bool ? { kind: "Bool" } : num(0);
    }
    function sameRoot(a, b) {
        if (a.kind === "Floating" || b.kind === "Floating") return a.kind === b.kind && a.floating_id === b.floating_id;
        return a.strand_id === b.strand_id && a.field_id === b.field_id && JSON.stringify(a.index) === JSON.stringify(b.index);
    }
    function pruneBuffers(loc) {
        backend.invalidBuffers = invalidBuffers.filter(b => !(sameRoot(b.location, loc) && (loc.path || []).every((s, i) => b.location.path[i] === s)));
    }
    function walkValues(m, fn, onInstruction) {
        const walk = v => { if (!v || typeof v !== "object") return; fn(v); if (v.kind === "Op" || v.kind === "Call") { (v.args || []).forEach(walk); walk(v.saved); } };
        m.strands.forEach(s => walkInstructions(s.instructions, ins => {
            if (onInstruction) onInstruction(ins);
            Object.keys(ins).forEach(k => {
                const f = ins[k];
                if (f && typeof f === "object" && !Array.isArray(f) && f.kind) walk(f);
                else if (k === "args" && Array.isArray(f)) f.forEach(walk);
            });
        }));
        m.floating_values.forEach(f => walk(f.value));
    }

    // ---- key capture (key_capture_event) ----
    function keyName(code, key) {
        const named = { Enter: "Enter", NumpadEnter: "Enter", Space: "Space", Escape: "Escape", Tab: "Tab", Backspace: "Backspace",
            Delete: "Delete", Insert: "Insert", Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
            ArrowLeft: "LeftArrow", ArrowRight: "RightArrow", ArrowUp: "UpArrow", ArrowDown: "DownArrow",
            Control: "Control", Shift: "LeftShift", Alt: "Alt", Meta: "Meta", CapsLock: "CapsLock" };
        if (named[code]) return named[code];
        if (/^F\d+$/.test(code)) return code;
        if (key && key.length === 1) return key === " " ? "Space" : key.toLowerCase();
        if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
        if (/^Digit\d$/.test(code)) return code.slice(5);
        return "";
    }

    // ---- value preview (Value::resolve_vars + eval_text) ----
    function previewText(value) {
        const m = mac();
        const env = {};
        m.variables.forEach(n => env[n] = num(0));
        const asNumber = e => {
            if (e.kind === "Number") return e.value;
            if (e.kind === "Bool") return e.value ? 1 : 0;
            const t = String(e.value).trim();
            if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) throw qsTr("\"%1\" is not a number").arg(e.value);
            return Number(t);
        };
        const asText = e => e.kind === "Text" ? e.value : e.kind === "Bool" ? String(e.value) : (Number.isInteger(e.value) ? String(e.value) : String(e.value));
        const asBool = e => e.kind === "Bool" ? e.value : e.kind === "Number" ? e.value !== 0 : (e.value !== "" && e.value !== "false");
        const equal = (l, r) => { try { return asNumber(l) === asNumber(r); } catch (x) { return asText(l) === asText(r); } };
        const listOf = name => { const l = (m.lists || []).find(x => x.name === name); return l ? l.items : []; };
        const ev = v => {
            if (v.kind === "Number" || v.kind === "Text") return v;
            if (v.kind === "Bool") return { kind: "Bool", value: false };
            if (v.kind === "Var") return env[v.name] || num(0);
            if (v.kind === "Param") throw qsTr("Parameters only have a value while the block runs");
            if (v.kind === "Call") throw qsTr("Custom blocks only have a value while the macro runs");
            const a = v.args || [], n = i => asNumber(ev(a[i])), t = i => asText(ev(a[i])), b = i => asBool(ev(a[i]));
            const B = x => ({ kind: "Bool", value: x });
            switch (v.op) {
            case "Add": return num(n(0) + n(1));
            case "Sub": return num(n(0) - n(1));
            case "Mul": return num(n(0) * n(1));
            case "Div": if (n(1) === 0) throw qsTr("division by zero"); return num(n(0) / n(1));
            case "Mod": { const r = n(1); if (r === 0) throw qsTr("mod by zero"); const x = n(0) % r; return num(x < 0 ? x + Math.abs(r) : x); }
            case "Round": { const x = n(0); return num(Math.sign(x) * Math.round(Math.abs(x))); }
            case "Random": {
                const l = n(0), r = n(1), lo = Math.min(l, r), hi = Math.max(l, r);
                return num(Number.isInteger(l) && Number.isInteger(r) ? lo + Math.floor(Math.random() * (hi - lo + 1)) : lo + Math.random() * (hi - lo));
            }
            case "Math": {
                const rad = Math.PI / 180, deg = 180 / Math.PI;
                const f = { Abs: Math.abs, Floor: Math.floor, Ceiling: Math.ceil, Sign: Math.sign, Sqrt: Math.sqrt,
                    Sin: x => Math.sin(x * rad), Cos: x => Math.cos(x * rad), Tan: x => Math.tan(x * rad),
                    Asin: x => Math.asin(x) * deg, Acos: x => Math.acos(x) * deg, Atan: x => Math.atan(x) * deg,
                    Ln: Math.log, Log: Math.log10, Log2: Math.log2, EPower: Math.exp, TenPower: x => Math.pow(10, x) }[t(0)];
                if (!f) throw qsTr("unknown math function");
                return num(f(n(1)));
            }
            case "Join": return txt(a.map((x, i) => t(i)).join(""));
            case "NewLine": return txt("\n");
            case "Tab": return txt("\t");
            case "Length": return num(Array.from(t(0)).length);
            case "IndexOf": return num(t(1).indexOf(t(0)) + 1);
            case "LastIndexOf": return num(t(1).lastIndexOf(t(0)) + 1);
            case "LetterOf": {
                const i = Math.trunc(n(0)), chars = Array.from(t(1));
                if (i < 1 || i > chars.length) throw qsTr("letter %1 is out of range").arg(i);
                return txt(chars[i - 1]);
            }
            case "Case": return txt(t(1) === "Upper" ? t(0).toUpperCase() : t(0).toLowerCase());
            case "Trim": return txt(t(0).trim());
            case "Eq": return B(equal(ev(a[0]), ev(a[1])));
            case "Neq": return B(!equal(ev(a[0]), ev(a[1])));
            case "Gt": return B(n(0) > n(1));
            case "Lt": return B(n(0) < n(1));
            case "Gte": return B(n(0) >= n(1));
            case "Lte": return B(n(0) <= n(1));
            case "And": return B(b(0) && b(1));
            case "Or": return B(b(0) || b(1));
            case "Not": return B(!b(0));
            case "True": return B(true);
            case "False": return B(false);
            case "Timestamp": return num(Math.floor(Date.now() / 1000));
            case "CurrentTime": {
                const d = new Date();
                const parts = { Year: d.getFullYear(), Month: d.getMonth() + 1, Date: d.getDate(), DayOfWeek: d.getDay() + 1,
                    Hour: d.getHours(), Minute: d.getMinutes(), Second: d.getSeconds() };
                if (parts[t(0)] === undefined) throw qsTr("unknown time component");
                return num(parts[t(0)]);
            }
            case "ListLength": return num(listOf(t(0)).length);
            case "ListIsEmpty": return B(listOf(t(0)).length === 0);
            case "ListItem": {
                const items = listOf(t(1)), i = Math.trunc(n(0));
                if (i < 1 || i > items.length) throw qsTr("item %1 is out of range").arg(i);
                return items[i - 1];
            }
            case "ListContains": return B(listOf(t(0)).some(x => equal(x, ev(a[1]))));
            case "ListAsJson": return txt(JSON.stringify(listOf(t(0)).map(x => x.value)));
            }
            throw qsTr("This reporter needs the Blockwork app to show a value");
        };
        const result = ev(value);
        return result.kind === "Bool" ? String(result.value) : asText(result);
    }

    // ---- the commands ----
    readonly property var commands: ({
        undo: () => {
            if (!history.length) return;
            backend.future = future.concat([JSON.stringify(mac())]);
            macros[selected] = JSON.parse(history[history.length - 1]);
            backend.history = history.slice(0, -1);
        },
        redo: () => {
            if (!future.length) return;
            backend.history = history.concat([JSON.stringify(mac())]);
            macros[selected] = JSON.parse(future[future.length - 1]);
            backend.future = future.slice(0, -1);
        },
        set_palette_layout: a => { backend.paletteLayout = a.layout || "rail"; },
        set_title: a => { const t = String(a.title || "").trim(); if (!t) throw qsTr("Give the macro a name"); mac().name = t; },
        set_macro_speed_multiplier: a => { mac().speed_multiplier = Math.max(0.1, Math.min(10, Number(a.multiplier) || 1)); },
        set_macro_folder: a => { const m = macros.find(x => x.id === a.id); if (m) m.settings.folder = String(a.folder || "").trim(); },
        set_macro_always_listen: a => { mac().settings.always_listen = !!a.enabled; },
        set_macro_catch_up: a => { mac().settings.catch_up_missed = !!a.enabled; },
        set_macro_max_run_secs: a => { mac().settings.max_run_secs = Number(a.seconds) || 0; },
        set_macro_max_loop_iterations: a => { mac().settings.max_loop_iterations = Number(a.iterations) || 0; },
        set_macro_conditions: a => {
            const s = mac().settings;
            if (!!a.activeFrom !== !!a.activeUntil) throw qsTr("Set both a start and an end time, or neither");
            Object.assign(s, { only_in_window: a.onlyInWindow || "", power: a.power || "Any", active_from: a.activeFrom || "",
                               active_until: a.activeUntil || "", active_days: a.activeDays || 0 });
        },

        // Macros
        new_macro: () => { backend.macros = macros.concat([emptyMacro(qsTr("Macro %1").arg(macros.length + 1))]); backend.selected = macros.length - 1; backend.history = []; backend.future = []; },
        select_macro_by_id: a => { const i = macros.findIndex(x => x.id === a.id); if (i >= 0) { backend.selected = i; backend.history = []; backend.future = []; } },
        duplicate_macro: a => {
            const src = macros.find(x => x.id === a.id);
            if (!src) return;
            const copy = clone(src); copy.id = newId(); copy.name = qsTr("%1 copy").arg(src.name);
            backend.macros = macros.concat([copy]); backend.selected = macros.length - 1; backend.history = []; backend.future = [];
        },
        delete_macro: a => {
            backend.macros = macros.filter(x => x.id !== a.id);
            if (!macros.length) backend.macros = [starterMacro()];
            backend.selected = Math.min(selected, macros.length - 1); backend.history = []; backend.future = [];
        },
        remove_macro: () => { commands.delete_macro({ id: mac().id }); },

        // Strands
        add_strand: a => {
            const m = mac();
            m.strands.push({ id: newId(), x: Math.round(a.x), y: Math.round(a.y), instructions: a.instruction ? [clone(a.instruction)] : [] });
        },
        remove_strand: a => { const m = mac(); m.strands = m.strands.filter(s => s.id !== a.strandId); pruneOrphanedComments(m); },
        move_strand: a => { const s = strandOf(mac(), a.strandId); if (s) { s.x = Math.round(a.x); s.y = Math.round(a.y); } },
        split_strand: a => {
            const m = mac(), strand = strandOf(m, a.strandId);
            const r = strand && resolveBody(strand.instructions, a.path);
            if (!r || r[1] >= r[0].length) throw qsTr("Unknown instruction path");
            m.strands.push({ id: newId(), x: Math.round(a.x), y: Math.round(a.y), instructions: r[0].splice(r[1]) });
            backend.invalidBuffers = [];
        },
        merge_strand: a => {
            if (a.draggedId === a.targetId) throw qsTr("Can't merge a strand into itself");
            const m = mac(), dragged = strandOf(m, a.draggedId), target = strandOf(m, a.targetId);
            if (!dragged || !target) throw qsTr("Unknown strand");
            if (isHeader(dragged.instructions[0])) throw qsTr("A strand headed by a When block can't be merged into another strand");
            const r = resolveBody(target.instructions, a.path);
            if (!r) throw qsTr("Unknown target instruction path");
            if (a.path.length === 1 && r[1] === 0 && isHeader(r[0][0])) throw qsTr("Can't attach a strand above a When block");
            r[0].splice(Math.min(r[1], r[0].length), 0, ...dragged.instructions);
            m.strands = m.strands.filter(s => s.id !== a.draggedId);
        },
        merge_tail: a => {
            const m = mac(), source = strandOf(m, a.strandId), target = strandOf(m, a.targetId);
            if (!source || !target) throw qsTr("Unknown strand");
            const rs = resolveBody(source.instructions, a.path);
            if (!rs || rs[1] >= rs[0].length) throw qsTr("Unknown source instruction path");
            if (isHeader(rs[0][rs[1]])) throw qsTr("A When block can only be the first block in a strand");
            const rt = resolveBody(target.instructions, a.targetPath);
            if (!rt) throw qsTr("Unknown target instruction path");
            if (a.targetPath.length === 1 && rt[1] === 0 && isHeader(rt[0][0])) throw qsTr("Can't attach a block above a When block");
            if (a.strandId === a.targetId && JSON.stringify(a.targetPath.slice(0, a.path.length - 1)) === JSON.stringify(a.path.slice(0, -1))
                    && a.targetPath[a.path.length - 1].index >= a.path[a.path.length - 1].index
                    && !(a.targetPath.length === a.path.length && a.targetPath[a.path.length - 1].index === a.path[a.path.length - 1].index))
                throw qsTr("Can't attach a block inside itself");
            const tail = rs[0].splice(rs[1]);
            const again = resolveBody(target.instructions, a.targetPath);
            again[0].splice(Math.min(again[1], again[0].length), 0, ...tail);
            m.strands = m.strands.filter(s => s.instructions.length > 0);
        },
        clear_instructions: () => { const m = mac(); m.strands = []; m.floating_values = []; pruneOrphanedComments(m); },
        paste_instructions: a => {
            const list = (a.instructions || []).map(clone);
            if (!list.length) return;
            mac().strands.push({ id: newId(), x: Math.round(a.x), y: Math.round(a.y), instructions: list });
        },
        set_recording_target: a => { const m = mac(); m.recording_target_strand_id = m.recording_target_strand_id === a.strandId ? null : a.strandId; },

        // Instructions
        add_instruction: a => {
            const m = mac(), strand = strandOf(m, a.strandId);
            const r = strand && resolveBody(strand.instructions, a.path);
            if (!r) return;
            const index = Math.min(r[1], r[0].length);
            checkHeaderPlacement(r[0], index, a.instruction, a.path.length === 1);
            checkReturnPlacement(m, strand, a.instruction);
            checkLoopControlPlacement(strand, a.path, a.instruction);
            r[0].splice(index, 0, clone(a.instruction));
            backend.invalidBuffers = [];
        },
        edit_instruction: a => {
            const strand = strandOf(mac(), a.strandId);
            const r = strand && resolveBody(strand.instructions, a.path);
            if (r && r[1] < r[0].length) r[0][r[1]] = clone(a.instruction);
        },
        remove_instruction: a => {
            const m = mac(), strand = strandOf(m, a.strandId);
            const r = strand && resolveBody(strand.instructions, a.path);
            if (!r || r[1] >= r[0].length) return;
            r[0].splice(r[1], 1);
            if (!strand.instructions.length) m.strands = m.strands.filter(s => s.id !== a.strandId);
            pruneOrphanedComments(m);
            backend.invalidBuffers = [];
        },

        // Values
        edit_value_field: a => {
            const slot = slotAt(mac(), a.location);
            if (!slot) return;
            const node = slot.get();
            backend.invalidBuffers = invalidBuffers.filter(b => JSON.stringify(b.location) !== JSON.stringify(a.location));
            if (node && node.kind === "Text") { slot.set(txt(a.text)); return; }
            const t = String(a.text).trim();
            const integer = a.location.kind === "Field" && integerFields.indexOf(a.location.field_id) >= 0;
            const ok = integer ? /^[+-]?\d+$/.test(t) : /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t);
            if (ok) slot.set(num(Number(t)));
            else backend.invalidBuffers = invalidBuffers.concat([{ location: clone(a.location), text: a.text }]);
        },
        take_value: a => {
            const m = mac(), loc = a.location;
            if (loc.kind === "Floating" && !(loc.path && loc.path.length)) {
                m.floating_values = m.floating_values.filter(f => f.id !== loc.floating_id);
            } else {
                const slot = slotAt(m, loc);
                if (slot) {
                    const node = slot.get();
                    slot.set(node && (node.kind === "Op" || node.kind === "Call") && node.saved ? clone(node.saved) : blankAt(m, loc));
                }
            }
            pruneBuffers(loc);
        },
        put_value: a => {
            const slot = slotAt(mac(), a.location);
            if (slot) {
                const incoming = clone(a.value);
                if (incoming.kind === "Op" || incoming.kind === "Call") incoming.saved = clone(slot.get()) || num(0);
                slot.set(incoming);
            }
            pruneBuffers(a.location);
        },
        create_floating_value: a => {
            mac().floating_values.push({ id: newId(), x: Math.round(a.x), y: Math.round(a.y), value: clone(a.value), origin_block_id: a.originBlockId || null });
        },
        move_floating_value: a => { const f = mac().floating_values.find(v => v.id === a.floatingId); if (f) { f.x = Math.round(a.x); f.y = Math.round(a.y); } },
        remove_floating_value: a => { const m = mac(); m.floating_values = m.floating_values.filter(v => v.id !== a.floatingId); },

        // Comments
        create_comment: a => { mac().comments.push({ id: newId(), x: Math.round(a.x), y: Math.round(a.y), text: a.text || "", collapsed: false, attached_to: null }); },
        create_attached_comment: a => { mac().comments.push({ id: newId(), x: Math.round(a.dx), y: Math.round(a.dy), text: a.text || "", collapsed: false, attached_to: a.instructionId }); },
        move_comment: a => { const c = mac().comments.find(x => x.id === a.commentId); if (c) { c.x = Math.round(a.x); c.y = Math.round(a.y); } },
        edit_comment_text: a => { const c = mac().comments.find(x => x.id === a.commentId); if (c) c.text = a.text; },
        set_comment_collapsed: a => { const c = mac().comments.find(x => x.id === a.commentId); if (c) c.collapsed = !!a.collapsed; },
        remove_comment: a => { const m = mac(); m.comments = m.comments.filter(x => x.id !== a.commentId); },

        // Variables
        create_variable: a => {
            const m = mac(), name = String(a.name || "").trim();
            if (!name) throw qsTr("Variable name can't be empty");
            if (m.variables.indexOf(name) >= 0) throw qsTr("A variable named \"%1\" already exists").arg(name);
            m.variables.push(name);
        },
        rename_variable: a => {
            const m = mac(), name = String(a.newName || "").trim();
            if (!name) throw qsTr("Variable name can't be empty");
            if (name !== a.oldName && m.variables.indexOf(name) >= 0) throw qsTr("A variable named \"%1\" already exists").arg(name);
            m.variables = m.variables.map(v => v === a.oldName ? name : v);
            walkValues(m, v => { if (v.kind === "Var" && v.name === a.oldName) v.name = name; },
                       ins => { if ((ins.type === "SetVariable" || ins.type === "ChangeVariable") && ins.name === a.oldName) ins.name = name; });
        },
        delete_variable: a => { const m = mac(); m.variables = m.variables.filter(v => v !== a.name); },

        // Lists
        create_list: a => {
            const m = mac(), name = String(a.name || "").trim();
            if (!name) throw qsTr("List name can't be empty");
            if (m.lists.some(l => l.name === name)) throw qsTr("A list named \"%1\" already exists").arg(name);
            m.lists.push({ name: name, items: [], editor_visible: true, editor_x: 40, editor_y: 40 });
        },
        rename_list: a => {
            const m = mac(), name = String(a.newName || "").trim();
            if (!name) throw qsTr("List name can't be empty");
            if (name !== a.oldName && m.lists.some(l => l.name === name)) throw qsTr("A list named \"%1\" already exists").arg(name);
            m.lists.forEach(l => { if (l.name === a.oldName) l.name = name; });
            walkValues(m, v => { if (v.kind === "Op" && BlockRegistry.operator(v.op) && BlockRegistry.operator(v.op).enumArg
                                    && BlockRegistry.operator(v.op).enumArg.source === "lists") {
                                    const i = BlockRegistry.operator(v.op).enumArg.index;
                                    if (v.args[i] && v.args[i].kind === "Text" && v.args[i].value === a.oldName) v.args[i].value = name;
                                } },
                       ins => { ["name", "list", "results_list"].forEach(k => { if (ins[k] === a.oldName) ins[k] = name; }); });
        },
        delete_list: a => { const m = mac(); m.lists = m.lists.filter(l => l.name !== a.name); },
        set_list_items: a => { const l = mac().lists.find(x => x.name === a.name); if (l) l.items = clone(a.items) || []; },
        set_list_editor_state: a => {
            const l = mac().lists.find(x => x.name === a.name);
            if (l) { l.editor_visible = !!a.visible; l.editor_x = Math.round(a.x); l.editor_y = Math.round(a.y); }
        },

        // Custom blocks
        create_block: a => {
            const m = mac();
            const label = (a.pieces || []).filter(p => p.kind === "Label").map(p => p.text.trim()).join(" ");
            if (!label.trim()) throw qsTr("Give the block a name");
            const id = newId();
            m.block_defs.push({ id: id, pieces: clone(a.pieces), shape: a.shape, color: String(a.color || "#BF5AF2").toUpperCase(), icon: a.icon || "" });
            const maxX = m.strands.length ? Math.max.apply(null, m.strands.map(s => s.x)) : 0;
            m.strands.push({ id: newId(), x: maxX + 260, y: 0, instructions: [{ id: newId(), type: "BlockHeader", block_id: id }] });
        },
        edit_block: a => {
            const m = mac(), def = m.block_defs.find(d => d.id === a.blockId);
            if (!def) throw qsTr("Unknown block");
            const oldIds = def.pieces.filter(p => p.kind === "Input").map(p => p.id);
            const mapping = (a.pieces || []).filter(p => p.kind === "Input").map(p => ({ old: oldIds.indexOf(p.id), blank: p.value_type === "Bool" ? { kind: "Bool" } : num(0) }));
            const rebuild = args => mapping.map(x => x.old >= 0 && args[x.old] ? args[x.old] : clone(x.blank));
            walkValues(m, v => { if (v.kind === "Call" && v.block_id === a.blockId) v.args = rebuild(v.args || []); },
                       ins => { if ((ins.type === "CallBlock" || ins.type === "BranchCallBlock") && ins.block_id === a.blockId) ins.args = rebuild(ins.args || []); });
            Object.assign(def, { pieces: clone(a.pieces), shape: a.shape, color: String(a.color || def.color).toUpperCase(), icon: a.icon || "" });
        },
        delete_block: a => {
            const m = mac();
            m.block_defs = m.block_defs.filter(d => d.id !== a.blockId);
            m.strands = m.strands.filter(s => !(s.instructions[0] && s.instructions[0].type === "BlockHeader" && s.instructions[0].block_id === a.blockId));
            const strip = list => list.filter(ins => !((ins.type === "CallBlock" || ins.type === "BranchCallBlock") && ins.block_id === a.blockId))
                .map(ins => { bodies(ins).forEach((b, i) => { const kept = strip(b); b.length = 0; kept.forEach(x => b.push(x)); }); return ins; });
            m.strands.forEach(s => s.instructions = strip(s.instructions));
            m.strands = m.strands.filter(s => s.instructions.length);
            pruneOrphanedComments(m);
        },

        // Key capture
        start_key_capture: a => { backend.keyCapture = { kind: "Strand", strand_id: a.strandId, index: clone(a.path) }; },
        start_standalone_key_capture: () => { backend.keyCapture = { kind: "Standalone", strand_id: null, index: null }; },
        clear_standalone_key_capture: () => { backend.standaloneKey = null; },
        key_capture_event: a => {
            const target = keyCapture;
            backend.keyCapture = null;
            if (!target) return;
            const names = [];
            (a.keys || []).forEach(k => { const n = keyName(k[0], k[1]); if (n && names.indexOf(n) < 0) names.push(n); });
            if (!names.length) return;
            const combo = names.join("+");
            if (target.kind === "Strand") {
                const ins = instructionAt(mac(), target.strand_id, target.index);
                if (ins && (ins.type === "Key" || ins.type === "WhenKey")) ins.key = txt(combo);
            } else backend.standaloneKey = combo;
        }
    })
}

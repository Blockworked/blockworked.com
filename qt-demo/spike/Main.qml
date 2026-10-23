// Runs one graph edit through the Rust core and shows each answer, so a
// headless browser can read the result off the console or the page.
import QtQuick

Window {
    id: root
    width: 720
    height: 420
    visible: true
    title: "blockstitch-core in Qt for WebAssembly"

    Core { id: core }

    property var lines: []
    property bool passed: false

    function step(label, command, args) {
        const t0 = Date.now()
        const reply = core.dispatch(command, args)
        const ms = Date.now() - t0
        const line = label + " (" + ms + " ms): " + JSON.stringify(reply)
        console.log("spike: " + line)
        lines = lines.concat([line])
        return reply
    }

    Component.onCompleted: {
        console.log("spike: abi " + core.abiVersion)
        const added = step("add_strand", "add_strand", {
            x: 0, y: 0,
            instructions: ["Start", { Say: { message: { kind: "Number", value: 1 } } }]
        })
        const strand = added.result.strand_id
        const location = { kind: "Field", strand_id: strand, index: [{ index: 1 }], field_id: "message", path: [] }
        step("edit", "edit_value_field", { location: location, text: "42" })
        const after = step("snapshot", "snapshot").result.strands[0].instructions[1].kind.Say.message.value
        step("undo", "undo")
        const undone = step("snapshot", "snapshot").result.strands[0].instructions[1].kind.Say.message.value
        const joined = step("evaluate", "evaluate", { value: { kind: "Op", op: "Join", args: [
            { kind: "Text", value: "héllo " }, { kind: "Number", value: 3 }] } })
        // The browser stand-ins for the clock and randomness: emscripten's libc
        // reads Date and crypto.getRandomValues.
        const year = step("clock", "evaluate", { value: { kind: "Op", op: "CurrentTime", args: [{ kind: "Text", value: "Year" }] } })
        const roll = step("random", "evaluate", { value: { kind: "Op", op: "Random", args: [{ kind: "Number", value: 1 }, { kind: "Number", value: 6 }] } })
        const rejected = step("unknown", "fly")
        passed = after === 42 && undone === 1 && joined.ok && joined.result.value === "héllo 3" && !rejected.ok
            && year.ok && year.result.value >= 2026 && roll.ok && roll.result.value >= 1 && roll.result.value <= 6
        console.log("spike: " + (passed ? "PASS" : "FAIL"))
    }

    Column {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 6
        Text { text: "Rust core ABI " + core.abiVersion + ": " + (root.passed ? "PASS" : "FAIL"); font.bold: true }
        Repeater {
            model: root.lines
            Text { text: modelData; width: parent.width; wrapMode: Text.WrapAnywhere; font.pixelSize: 11 }
        }
    }
}

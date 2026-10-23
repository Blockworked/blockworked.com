#!/usr/bin/env python3
"""Checks that the demo backend answers every command the page's QML sends.

    check-contract.py --blockwork <checkout> --contract <file from blockwork-demo --contract>

The required commands come from a scan of the QML the page is built from:
Blockwork's editor group (its blockwork-qt/qml/module.json), this directory's
own QML and shims. What the backend answers comes from the built page itself
(DemoBackend.capabilities()), not from reading its source. A command name the
scan can't resolve to string literals fails the check, so a new dynamic call
site has to be taught here rather than slipping through; at run time the
backend still reports any command it doesn't know.
"""
import argparse
import json
import re
import sys
from pathlib import Path

CALLS = re.compile(r"\b(invoke|daemonCall|callCommand|invokeCommand)\(\s*")
LITERAL = re.compile(r'"([a-z_]+)"')
# Identifiers that only forward a caller's command (`function daemonCall(command, ...)`)
# or that hold names collected from `createCommand: "..."` properties.
FORWARDED = {"command"}
PROPERTY_NAMES = {"createCommand": re.compile(r'\bcreateCommand\s*:\s*"([a-z_]+)"')}


def first_argument(text, start):
    """The source of the call's first argument, up to its comma or closing paren."""
    depth, i = 0, start
    while i < len(text):
        c = text[i]
        if c in "([{":
            depth += 1
        elif c in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif c == "," and depth == 0:
            break
        elif c == '"':
            i = text.index('"', i + 1)
        i += 1
    return text[start:i].strip()


def literal_names(arg):
    """The commands a literal, or a ternary of two literals, can send."""
    if re.fullmatch(r'"[a-z_]+"', arg):
        return [arg[1:-1]]
    ternary = re.fullmatch(r'[^"?]+\?\s*"([a-z_]+)"\s*:\s*"([a-z_]+)"', arg)
    return list(ternary.groups()) if ternary else None


def scan(files):
    required, unresolved = {}, []

    def need(name, kind, where):
        entry = required.setdefault(name, {"via": set(), "at": []})
        entry["via"].add(kind)
        entry["at"].append(where)

    for path in files:
        code = re.sub(r"^\s*//.*$", "", path.read_text(), flags=re.M)
        line_of = lambda at: f"{path.name}:{code[:at].count(chr(10)) + 1}"
        for match in CALLS.finditer(code):
            kind = "invoke" if match.group(1) in ("invoke", "invokeCommand") else "call"
            arg = first_argument(code, match.end())
            if match.group(1) == "callCommand" and arg == "key":
                continue  # AppBridge.callCommand(key, command, json), inside a forwarding daemonCall
            names = literal_names(arg)
            if names:
                for name in names:
                    need(name, kind, line_of(match.start()))
            elif arg not in FORWARDED and arg not in PROPERTY_NAMES:
                unresolved.append(f"{line_of(match.start())}: {match.group(1)}({arg}, ...)")
        for pattern in PROPERTY_NAMES.values():
            for m in pattern.finditer(code):
                need(m.group(1), "call", line_of(m.start()))
    return required, unresolved


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--blockwork", required=True, type=Path)
    parser.add_argument("--contract", required=True, type=Path)
    args = parser.parse_args()

    here = Path(__file__).resolve().parent
    qml = args.blockwork / "blockwork-qt" / "qml"
    manifest = json.loads((qml / "module.json").read_text())
    files = [qml / name for name in manifest["editor"]]
    files += sorted(here.glob("*.qml")) + sorted((here / "shims").glob("*.qml"))
    files = [f for f in files if f.name != "DemoBackend.qml"]

    contract = json.loads(args.contract.read_text())
    problems = [f"page warned: {w}" for w in contract.get("warnings", [])]
    if not contract.get("loaded"):
        problems.append("the page did not load")
    handled = set(contract.get("handled", []))
    needs_app = set(contract.get("needs_app", []))
    unsupported = set(contract.get("unsupported", []))

    required, unresolved = scan(files)
    problems += [f"can't tell which command this sends: {u}" for u in unresolved]
    counts = {"handled": 0, "needs the app (notice)": 0, "unsupported (notice)": 0, "reply call (error)": 0}
    for name in sorted(required):
        entry = required[name]
        if "invoke" in entry["via"]:
            if name in handled:
                counts["handled"] += 1
            elif name in needs_app:
                counts["needs the app (notice)"] += 1
            elif name in unsupported:
                counts["unsupported (notice)"] += 1
            else:
                problems.append(f"{name} ({', '.join(entry['at'])}) is neither handled nor declared by DemoBackend")
        if "call" in entry["via"]:
            if contract.get("calls") != "error":
                problems.append(f"{name}: reply calls must answer with an error")
            counts["reply call (error)"] += 1

    print(f"{len(required)} commands from {len(files)} QML files: "
          + ", ".join(f"{n} {k}" for k, n in counts.items()))
    unused = sorted(handled - set(required))
    if unused:
        print("handled but not sent by the scanned QML (fine if the demo sends them itself):", ", ".join(unused))
    for p in problems:
        print("FAIL", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())

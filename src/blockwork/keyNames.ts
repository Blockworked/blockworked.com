// Key-name tables from blockwork-core: `input/key_names.rs` (`string_to_key`/
// `key_to_string`, between the editor's key names and the `MacroKey` enum)
// and `key_mapping.rs` (a browser KeyboardEvent → `MacroKey`). `MacroKey`
// is represented the way serde writes it into a macro file: a unit variant is
// its name, `Unicode(c)` is `{ "Unicode": c }`.
export type MacroKey = string | { Unicode: string };

// `string_to_key`'s explicit arms — editor/rdev name → MacroKey variant.
const STRING_TO_KEY: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`F${i + 1}`, `F${i + 1}`])),
  Escape: 'Escape', Space: 'Space', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'CapsLock',
  Shift: 'LShift', LeftShift: 'LShift', Control: 'Control', Alt: 'Alt', Meta: 'Meta', Super: 'Meta',
  LeftArrow: 'LeftArrow', RightArrow: 'RightArrow', UpArrow: 'UpArrow', DownArrow: 'DownArrow',
  Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  NumLock: 'NumLock', Numlock: 'NumLock', ScrollLock: 'ScrollLock', Pause: 'Pause', PrintScr: 'PrintScr',
  LMenu: 'LMenu', RightShift: 'RShift', LeftControl: 'LControl', RightControl: 'RControl',
  LeftAlt: 'Option', Option: 'Option', VolumeDown: 'VolumeDown', VolumeMute: 'VolumeMute', VolumeUp: 'VolumeUp',
  Select: 'Select',
};

// `key_to_string` — MacroKey variant → the name the editor shows.
const KEY_TO_STRING: Record<string, string> = {
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`F${i + 1}`, `F${i + 1}`])),
  Escape: 'Escape', Space: 'Space', Return: 'Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'CapsLock',
  Shift: 'LeftShift', LShift: 'LeftShift', RShift: 'RightShift', Control: 'Control', LControl: 'LeftControl',
  RControl: 'RightControl', Alt: 'Alt', AltGr: 'AltGr', Option: 'LeftAlt', Meta: 'Meta',
  LeftArrow: 'LeftArrow', RightArrow: 'RightArrow', UpArrow: 'UpArrow', DownArrow: 'DownArrow',
  Insert: 'Insert', Delete: 'Delete', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  NumLock: 'NumLock', ScrollLock: 'ScrollLock', Pause: 'Pause', PrintScr: 'PrintScr', LMenu: 'LMenu',
  VolumeDown: 'VolumeDown', VolumeMute: 'VolumeMute', VolumeUp: 'VolumeUp', Select: 'Select',
};

// `web_code_to_rdev_name`'s non-identity entries (identity ones like "KeyA"
// or "F1" fall through to `string_to_key` unchanged).
const WEB_CODE_TO_RDEV: Record<string, string> = {
  Digit0: 'Num0', Digit1: 'Num1', Digit2: 'Num2', Digit3: 'Num3', Digit4: 'Num4',
  Digit5: 'Num5', Digit6: 'Num6', Digit7: 'Num7', Digit8: 'Num8', Digit9: 'Num9',
  ArrowLeft: 'LeftArrow', ArrowRight: 'RightArrow', ArrowUp: 'UpArrow', ArrowDown: 'DownArrow',
  Enter: 'Return', PrintScreen: 'PrintScreen', Semicolon: 'SemiColon', Period: 'Dot', Backquote: 'BackQuote',
  BracketLeft: 'LeftBracket', BracketRight: 'RightBracket', Backslash: 'BackSlash',
  ShiftLeft: 'LeftShift', ShiftRight: 'RightShift', ControlLeft: 'LeftControl', ControlRight: 'RightControl',
  AltLeft: 'Alt', AltRight: 'AltGr', MetaLeft: 'MetaLeft', MetaRight: 'MetaLeft',
};

/** `string_to_key` — null where Rust returns `Err`. */
export function stringToKey(name: string): MacroKey | null {
  if (name in STRING_TO_KEY) return STRING_TO_KEY[name];
  const chars = Array.from(name);
  return chars.length === 1 && name.length > 0 ? { Unicode: chars[0] } : null;
}

/** `key_to_string` — null where Rust returns `Err`. */
export function keyToString(key: MacroKey): string | null {
  if (typeof key === 'object') return key.Unicode;
  return KEY_TO_STRING[key] ?? null;
}

/** `key_capture_event`'s lookup: `web_code_to_macro_key(code)`, falling back
 * to `web_key_to_macro_key(key)` for printable characters. */
export function webEventToKey(code: string, key: string): MacroKey | null {
  const direct = stringToKey(code);
  // string_to_key's single-character fallback never applies to a code
  // ("KeyA" etc. are multi-character), so a hit here is always a named key.
  if (direct !== null) return direct;
  const rdev = WEB_CODE_TO_RDEV[code] ?? code;
  const viaRdev = stringToKey(rdev);
  if (viaRdev !== null) return viaRdev;
  const chars = Array.from(key);
  return chars.length === 1 ? { Unicode: chars[0] } : null;
}

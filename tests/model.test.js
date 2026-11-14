const assert = require("assert")
const m = require("../TuckModel.js")
assert.strictEqual(m.seconds("abc"), 10)
assert.strictEqual(m.seconds(-5), 0)
assert.strictEqual(m.seconds(99999), 3600)
assert.strictEqual(m.seconds(7.6), 8)
// right section (end fixed): collapsed points left (opens left), open points right
assert.strictEqual(m.chevronGlyph(false, false), "")
assert.strictEqual(m.chevronGlyph(false, true), "")
assert.strictEqual(m.chevronGlyph(true, false), "")
assert.strictEqual(m.chevronGlyph(true, true), "")
assert.strictEqual(m.shownSpan(0, 0, 0, 100).length, 0)          // closed: zero-width span at edge
assert.deepStrictEqual(m.shownSpan(20, 0, -80, 100), { start: 20, length: 0 }) // start-fixed, closed: section ends at clip edge
assert.deepStrictEqual(m.shownSpan(0, 50, 0, 100), { start: 0, length: 50 })
assert.strictEqual(m.shownSpan(0, 10, 50, 10), null)
const s = { id: "tim.tuck", autoHideSeconds: 5, autoHide: true }
assert.deepStrictEqual(m.withSetting(s, "tim.tuck", "autoHide", false), { id: "tim.tuck", autoHideSeconds: 5, autoHide: false })
assert.strictEqual(s.autoHide, true) // input not mutated
const strings = { t: k => k, tn: (k, n) => ({ arg: x => `${k}(${n}):${x}` }) }
assert.strictEqual(m.tooltip(strings, 0, false, true, 10, "10"), "tooltip.empty\ntooltip.autoHideOn(10):10")
assert.strictEqual(m.tooltip(strings, 3, true, false, 10, "10"), "tooltip.hide\ntooltip.autoHideOff")
// markup-shaped settings never reach a rich-text sink: tooltip strings come only from i18n
console.log("model tests: ok")

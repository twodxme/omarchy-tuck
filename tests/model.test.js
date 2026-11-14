const assert = require("assert")
const m = require("../TuckModel.js")

// resolve: defaults
const d = m.resolve(undefined)
assert.deepStrictEqual(d, {
  openOn: "click", autoHide: true, autoHideSeconds: 10, startOpen: false, syncMonitors: true,
  iconStyle: "chevron", openToward: "auto", showCount: false, hideWhenEmpty: false,
  showTooltip: true, animate: true
})
// resolve: junk falls back, strings from `omarchy bar set` are understood
const j = m.resolve({ openOn: "<b>x</b>", autoHide: "false", autoHideSeconds: "abc", iconStyle: "nope", openToward: 7, showCount: "true", animate: 0 })
assert.strictEqual(j.openOn, "click")
assert.strictEqual(j.autoHide, false)
assert.strictEqual(j.autoHideSeconds, 10)
assert.strictEqual(j.iconStyle, "chevron")
assert.strictEqual(j.openToward, "auto")
assert.strictEqual(j.showCount, true)
assert.strictEqual(j.animate, true) // 0 is not a boolean; keep default
// resolve: clamping and legacy autoHideSeconds 0 = never
assert.strictEqual(m.resolve({ autoHideSeconds: 9999 }).autoHideSeconds, 300)
assert.strictEqual(m.resolve({ autoHideSeconds: -4 }).autoHideSeconds, 1)
assert.strictEqual(m.resolve({ autoHideSeconds: 0 }).autoHide, false)
assert.strictEqual(m.resolve({ autoHideSeconds: "0" }).autoHide, false)
assert.strictEqual(m.resolve({ autoHideSeconds: "" }).autoHide, true)

// direction
assert.strictEqual(m.opensTowardEnd("auto", "end"), false)
assert.strictEqual(m.opensTowardEnd("auto", "center"), false)
assert.strictEqual(m.opensTowardEnd("auto", "start"), true)
assert.strictEqual(m.opensTowardEnd("end", "end"), true)
assert.strictEqual(m.opensTowardEnd("start", "start"), false)

// glyphs: collapsed points where it opens, open points back
assert.strictEqual(m.glyph("chevron", false, false), "")
assert.strictEqual(m.glyph("chevron", false, true), "")
assert.strictEqual(m.glyph("caret", true, false), "")
assert.strictEqual(m.glyph("arrow", true, true), "")
assert.strictEqual(m.glyph("dots", true, true), "")
assert.strictEqual(m.glyph("bogus", false, false), "")
assert.strictEqual(m.chevronGlyph(true, false), "")

// shownSpan
assert.deepStrictEqual(m.shownSpan(0, 0, 0, 100), { start: 0, length: 0 })
assert.deepStrictEqual(m.shownSpan(20, 0, -80, 100), { start: 20, length: 0 })
assert.deepStrictEqual(m.shownSpan(0, 50, 0, 100), { start: 0, length: 50 })
assert.strictEqual(m.shownSpan(0, 10, 50, 10), null)

// withSetting keeps other keys, does not mutate
const s = { id: "tim.tuck", autoHideSeconds: 5, autoHide: true }
assert.deepStrictEqual(m.withSetting(s, "tim.tuck", "autoHide", false), { id: "tim.tuck", autoHideSeconds: 5, autoHide: false })
assert.strictEqual(s.autoHide, true)

// names
assert.strictEqual(m.prettyName("omarchy.keyboard-layout"), "Keyboard layout")
assert.strictEqual(m.prettyName("com.omastorm.radar"), "Radar")
assert.strictEqual(m.prettyName("vpn"), "Vpn")
assert.strictEqual(m.prettyName(""), "")

// tuckedIds / untuck
function layout() {
  return {
    right: [{ id: "tim.tuck", autoHide: false }, { id: "omarchy.clock", format: "HH:mm" }],
    tray: [{ id: "omarchy.bluetooth" }, "omarchy.weather", { id: "omarchy.audio", x: 1 }]
  }
}
assert.deepStrictEqual(m.tuckedIds(layout()), ["omarchy.bluetooth", "omarchy.weather", "omarchy.audio"])
const u = m.untuck(layout(), ["omarchy.audio", "omarchy.bluetooth"], "tim.tuck", false)
assert.deepStrictEqual(u.tray, ["omarchy.weather"])
assert.deepStrictEqual(u.right.map(m.entryId), ["tim.tuck", "omarchy.bluetooth", "omarchy.audio", "omarchy.clock"])
assert.strictEqual(u.right[2].x, 1) // entry settings travel with it
const ue = m.untuck(layout(), ["omarchy.weather"], "tim.tuck", true)
assert.deepStrictEqual(ue.right.map(m.entryId), ["omarchy.weather", "tim.tuck", "omarchy.clock"])
const nt = m.untuck({ right: [{ id: "omarchy.clock" }], tray: [{ id: "a.b" }] }, ["a.b"], "tim.tuck", false)
assert.deepStrictEqual(nt.right.map(m.entryId), ["omarchy.clock", "a.b"])
assert.deepStrictEqual(m.untuck({ right: [] }, ["x"], "tim.tuck", false), { right: [] })

// tooltip
const strings = { t: k => k, tn: (k, n) => ({ arg: x => `${k}(${n}):${x}` }) }
assert.strictEqual(m.tooltip(strings, 0, false, d, "10"), "tooltip.empty\ntooltip.autoHideOn(10):10\ntooltip.settings")
assert.strictEqual(m.tooltip(strings, 3, false, m.resolve({ openOn: "hover" }), "10"), "tooltip.show(3):3\ntooltip.hoverMode\ntooltip.settings")
assert.strictEqual(m.tooltip(strings, 3, true, m.resolve({ autoHide: false }), "10"), "tooltip.hide\ntooltip.autoHideOff\ntooltip.settings")

console.log("model tests: ok")

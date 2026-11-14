const assert = require("assert")
// TuckModel.js starts with QML's `.pragma library`, which node can't parse.
const src = require("fs").readFileSync(require("path").join(__dirname, "../TuckModel.js"), "utf8")
const mod = { exports: {} }
new Function("module", src.replace(/^\.pragma library\s*/, ""))(mod)
const m = mod.exports

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

// tuckedIds
function layout() {
  return {
    right: [{ id: "tim.tuck", autoHide: false }, { id: "omarchy.clock", format: "HH:mm" }],
    tray: [{ id: "omarchy.bluetooth" }, "omarchy.weather", { id: "omarchy.audio", x: 1 }]
  }
}
assert.deepStrictEqual(m.tuckedIds(layout()), ["omarchy.bluetooth", "omarchy.weather", "omarchy.audio"])
// untuckCommand: ids as arguments, landing on the visible side in tucked order
assert.strictEqual(m.untuckCommand([], "tim.tuck", false), null)
assert.strictEqual(m.untuckCommand(["", 5], "tim.tuck", false), null)
const cmd = m.untuckCommand(["a.one", "b.two"], "tim.tuck", false)
assert.deepStrictEqual(cmd.slice(0, 2), ["sh", "-c"])
assert.deepStrictEqual(cmd.slice(3), ["sh", "tim.tuck", "b.two", "a.one"])
assert.ok(cmd[2].includes("--after") && !cmd[2].includes("a.one"))
assert.ok(m.untuckCommand(["x.y"], "tim.tuck", true)[2].includes("--before"))
// Run it for real against a stand-in `omarchy`, ids with shell metacharacters included.
{
  const fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process")
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tuck-test-"))
  const log = path.join(dir, "log")
  fs.writeFileSync(path.join(dir, "omarchy"), `#!/bin/sh\nprintf '%s|' "$@" >> "${log}"; echo >> "${log}"\n`, { mode: 0o755 })
  const run = (ids, towardEnd) => {
    fs.writeFileSync(log, "")
    const c = m.untuckCommand(ids, "tim.tuck", towardEnd)
    cp.execFileSync(c[0], c.slice(1), { env: { ...process.env, PATH: dir + ":" + process.env.PATH } })
    return fs.readFileSync(log, "utf8").trim().split("\n")
  }
  assert.deepStrictEqual(run(["a.one", "b.two"], false), ["bar|move|b.two|--after|tim.tuck|", "bar|move|a.one|--after|tim.tuck|"])
  assert.deepStrictEqual(run(["a.one", "b.two"], true), ["bar|move|a.one|--before|tim.tuck|", "bar|move|b.two|--before|tim.tuck|"])
  assert.deepStrictEqual(run(["x; touch pwned", "$(id)"], true), ["bar|move|x; touch pwned|--before|tim.tuck|", "bar|move|$(id)|--before|tim.tuck|"])
  assert.ok(!fs.existsSync("pwned"))
  fs.rmSync(dir, { recursive: true })
}

// hasStockTray: only outside the tray section counts
assert.strictEqual(m.hasStockTray(null), false)
assert.strictEqual(m.hasStockTray({ right: [{ id: "tim.tuck" }], tray: ["omarchy.tray"] }), false)
assert.strictEqual(m.hasStockTray({ left: ["omarchy.menu"], right: [{ id: "omarchy.tray" }, "tim.tuck"] }), true)
assert.strictEqual(m.hasStockTray({ center: "omarchy.tray" }), false)

// tooltip
const strings = { t: k => k, tn: (k, n) => ({ arg: x => `${k}(${n}):${x}` }) }
assert.strictEqual(m.tooltip(strings, 0, false, d, "10"), "tooltip.empty\ntooltip.autoHideOn(10):10\ntooltip.settings")
assert.strictEqual(m.tooltip(strings, 3, false, m.resolve({ openOn: "hover" }), "10"), "tooltip.show(3):3\ntooltip.hoverMode\ntooltip.settings")
assert.strictEqual(m.tooltip(strings, 3, true, m.resolve({ autoHide: false }), "10"), "tooltip.hide\ntooltip.autoHideOff\ntooltip.settings")

console.log("model tests: ok")

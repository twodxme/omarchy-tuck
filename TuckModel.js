// Pure helpers for Tuck.qml, kept free of QML so tests can run them in node.

var ICON_STYLES = ["chevron", "arrow", "caret", "double", "dots"]
var OPEN_ON = ["click", "hover"]
var OPEN_TOWARD = ["auto", "start", "end"]

// Nerd Font glyphs per style: [points toward bar start, points toward bar end].
// Vertical bars rotate the glyph 90 degrees, so start/end read as up/down.
var GLYPHS = {
  chevron: ["", ""],
  arrow: ["", ""],
  caret: ["", ""],
  double: ["", ""],
  dots: ["", ""]
}

function oneOf(value, allowed, fallback) {
  return allowed.indexOf(value) !== -1 ? value : fallback
}

// `omarchy bar set` stores strings unless given --json, so accept both.
function flag(value, fallback) {
  if (value === true || value === "true") return true
  if (value === false || value === "false") return false
  return fallback
}

function wholeNumber(value, min, max, fallback) {
  var n = Number(value)
  if (value === null || value === undefined || value === "" || !isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

// Every setting, validated, with its default. Anything a user could type in
// shell.json lands on a sane value rather than breaking the widget.
function resolve(settings) {
  var s = settings && typeof settings === "object" ? settings : {}
  // Before settings existed, autoHideSeconds 0 meant "never auto-hide".
  var legacyNever = Number(s.autoHideSeconds) === 0 && s.autoHideSeconds !== "" && s.autoHideSeconds !== null && s.autoHideSeconds !== undefined
  return {
    openOn: oneOf(s.openOn, OPEN_ON, "click"),
    autoHide: legacyNever ? false : flag(s.autoHide, true),
    autoHideSeconds: wholeNumber(s.autoHideSeconds, 1, 300, 10),
    startOpen: flag(s.startOpen, false),
    syncMonitors: flag(s.syncMonitors, true),
    iconStyle: oneOf(s.iconStyle, ICON_STYLES, "chevron"),
    openToward: oneOf(s.openToward, OPEN_TOWARD, "auto"),
    showCount: flag(s.showCount, false),
    hideWhenEmpty: flag(s.hideWhenEmpty, false),
    showTooltip: flag(s.showTooltip, true),
    animate: flag(s.animate, true)
  }
}

// Whether the tucked widgets open past the divider (toward the bar's end:
// right, or down on a vertical bar). Auto opens away from the slot's fixed
// edge, so the divider stays put and the bar grows on the free side.
function opensTowardEnd(openToward, fixedEdge) {
  if (openToward === "end") return true
  if (openToward === "start") return false
  return fixedEdge === "start"
}

// Collapsed, the glyph points to where the widgets will open; open, back
// toward the divider.
function glyph(style, towardEnd, open) {
  var pair = GLYPHS[style] || GLYPHS.chevron
  var pointsEnd = open ? !towardEnd : towardEnd
  return pointsEnd ? pair[1] : pair[0]
}

// Back-compat with 1.0.0's helper name.
function chevronGlyph(fixedAtStart, open) {
  return glyph("chevron", fixedAtStart, open)
}

// The stretch of the section, `start` and `length` along the bar, that the
// clip (`clipStart`, `clipLength`) shows: { start, length }, or null while
// none of it shows. Same rule as the stock tray's shownSpan.
function shownSpan(clipStart, clipLength, start, length) {
  var from = Math.max(start, clipStart)
  var to = Math.min(start + length, clipStart + clipLength)
  if (to < from) {
    if (from - to > 1) return null
    from = to
  }
  return { start: from, length: to - from }
}

// A copy of the widget's inline settings with one key changed, keeping the
// rest: updateEntryInline replaces the whole entry.
function withSetting(settings, id, key, value) {
  var next = { id: id }
  if (settings && typeof settings === "object") {
    for (var k in settings) if (k !== "id") next[k] = settings[k]
  }
  next[key] = value
  return next
}

function entryId(entry) {
  if (typeof entry === "string") return entry
  return entry && entry.id !== undefined && entry.id !== null ? String(entry.id) : ""
}

// "omarchy.keyboard-layout" -> "Keyboard layout", "com.omastorm.radar" -> "Radar".
// Plugins can't read the registry's display names, so derive one from the id.
function prettyName(id) {
  var s = String(id || "")
  var last = s.slice(s.lastIndexOf(".") + 1).replace(/[-_]+/g, " ").trim()
  if (!last) return s
  return last.charAt(0).toUpperCase() + last.slice(1)
}

// The ids in the tray section, in order.
function tuckedIds(layout) {
  var tray = layout && Array.isArray(layout.tray) ? layout.tray : []
  var ids = []
  for (var i = 0; i < tray.length; i++) {
    var id = entryId(tray[i])
    if (id) ids.push(id)
  }
  return ids
}

// Moves the entries for `ids` out of the tray section and onto the bar just
// past the divider, keeping each entry's own settings. Mutates and returns
// `layout`. Without the divider on the bar, they go to the end of `right`.
function untuck(layout, ids, tuckId, towardEnd) {
  if (!layout || !Array.isArray(layout.tray)) return layout
  var moving = [], staying = []
  for (var i = 0; i < layout.tray.length; i++) {
    var e = layout.tray[i]
    if (ids.indexOf(entryId(e)) !== -1) moving.push(e)
    else staying.push(e)
  }
  if (!moving.length) return layout
  layout.tray = staying

  var sections = ["left", "centerBegin", "center", "centerEnd", "right"]
  for (var s = 0; s < sections.length; s++) {
    var arr = layout[sections[s]]
    if (!Array.isArray(arr)) continue
    for (var j = 0; j < arr.length; j++) {
      if (entryId(arr[j]) === tuckId) {
        // The visible side of the divider: before it when the widgets open
        // past it, after it otherwise.
        var at = towardEnd ? j : j + 1
        Array.prototype.splice.apply(arr, [at, 0].concat(moving))
        return layout
      }
    }
  }
  if (!Array.isArray(layout.right)) layout.right = []
  layout.right = layout.right.concat(moving)
  return layout
}

function tooltip(strings, count, open, cfg, secsText) {
  var first = count === 0
    ? strings.t("tooltip.empty")
    : (open ? strings.t("tooltip.hide") : strings.tn("tooltip.show", count).arg(String(count)))
  var second
  if (cfg.openOn === "hover") second = strings.t("tooltip.hoverMode")
  else if (cfg.autoHide) second = strings.tn("tooltip.autoHideOn", cfg.autoHideSeconds).arg(secsText)
  else second = strings.t("tooltip.autoHideOff")
  return first + "\n" + second + "\n" + strings.t("tooltip.settings")
}

if (typeof module !== "undefined") {
  module.exports = {
    ICON_STYLES: ICON_STYLES, OPEN_ON: OPEN_ON, OPEN_TOWARD: OPEN_TOWARD,
    resolve: resolve, opensTowardEnd: opensTowardEnd, glyph: glyph, chevronGlyph: chevronGlyph,
    shownSpan: shownSpan, withSetting: withSetting, entryId: entryId, prettyName: prettyName,
    tuckedIds: tuckedIds, untuck: untuck, tooltip: tooltip, flag: flag, wholeNumber: wholeNumber
  }
}

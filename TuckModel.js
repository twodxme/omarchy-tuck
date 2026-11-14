// Pure helpers for Tuck.qml, kept free of QML so tests can run them in node.

// A settings value as whole seconds, clamped to [0, 3600]; junk becomes 10.
function seconds(value) {
  var n = Number(value)
  if (!isFinite(n)) return 10
  return Math.max(0, Math.min(3600, Math.round(n)))
}

// Nerd Font chevrons: f053 points left, f054 points right. Collapsed, the
// arrow points to where the hidden widgets will open; open, back toward the
// divider. Vertical bars rotate the glyph 90 degrees.
function chevronGlyph(fixedAtStart, open) {
  var towardStart = "", towardEnd = ""
  var opensTowardEnd = fixedAtStart
  if (open) return opensTowardEnd ? towardStart : towardEnd
  return opensTowardEnd ? towardEnd : towardStart
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

function tooltip(strings, count, open, autoHide, secs, secsText) {
  var first = count === 0
    ? strings.t("tooltip.empty")
    : strings.t(open ? "tooltip.hide" : "tooltip.show")
  var second = autoHide
    ? strings.tn("tooltip.autoHideOn", secs).arg(secsText)
    : strings.t("tooltip.autoHideOff")
  return first + "\n" + second
}

if (typeof module !== "undefined") {
  module.exports = { seconds: seconds, chevronGlyph: chevronGlyph, shownSpan: shownSpan, withSetting: withSetting, tooltip: tooltip }
}

import QtQuick
import Quickshell
import Quickshell.Hyprland
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import "TuckModel.js" as Model

// Tuck: a divider that collapses the widgets behind it.
//
// The widgets it hides are the bar's `tray` layout section. The bar draws that
// section into whichever widget exposes `sectionHost` (the same contract the
// stock tray uses), so dragging a widget onto the divider while it is open puts
// it behind the divider, and dragging it back out returns it to the bar.
// Because the stock tray hosts the same section, use one or the other.
BarWidget {
  id: root
  moduleName: "tim.tuck"

  Commons.Translations { id: strings; directory: Qt.resolvedUrl("i18n") }
  readonly property alias strings: strings
  readonly property alias chevronItem: chevron

  // ---------------------------------------------------------------- settings

  // Every setting, validated, with defaults (TuckModel.resolve).
  readonly property var cfg: Model.resolve(settings)

  function setSetting(key, value) {
    if (!bar || !bar.shell || typeof bar.shell.updateEntryInline !== "function") return
    bar.shell.updateEntryInline(moduleName, Model.withSetting(settings, moduleName, key, value))
  }

  // ------------------------------------------------------------------- state

  property bool expanded: false
  property bool pointerInside: false
  property bool settingsOpen: false
  // The popup exists only from opening until its fade-out finishes.
  onSettingsOpenChanged: {
    if (settingsOpen && settingsLoader.status === Loader.Null)
      settingsLoader.setSource("TuckSettings.qml", { tuck: root })
  }
  function unloadSettings() { if (!settingsOpen) settingsLoader.source = "" }
  // The bar opens the section while a widget is dragged (to show where it can
  // go) and while a panel from a tucked widget is open (so its widget stays on
  // screen under the panel).
  readonly property bool barDragging: !!bar && bar.traySectionDragActive === true
  readonly property bool holdOpen: barDragging || (!!bar && bar.traySectionPopoutOpen === true)
  readonly property bool open: expanded || holdOpen

  readonly property var tuckedIds: Model.tuckedIds(bar ? bar.layoutConfig : null)
  readonly property bool trayConflict: Model.hasStockTray(bar ? bar.layoutConfig : null)

  // Settings arrive after the widget is built; apply "start open" once, the
  // first time they do.
  property bool startApplied: false
  onSettingsChanged: {
    if (startApplied || !settings || !settings.id) return
    startApplied = true
    if (cfg.startOpen) expanded = true
  }

  // ------------------------------------------- tray-section host contract

  property Item sectionHost: null
  readonly property int sectionCount: tuckedIds.length
  readonly property real sectionExtent: sectionHost ? (vertical ? sectionHost.implicitHeight : sectionHost.implicitWidth) : 0
  readonly property bool towardEnd: Model.opensTowardEnd(cfg.openToward, fixedEdge)
  // The section's widgets anchor to the edge nearest the divider.
  readonly property string sectionEdge: towardEnd ? "start" : "end"
  property real revealProgress: open ? 1 : 0
  readonly property real revealExtent: sectionExtent * revealProgress
  readonly property var sectionShown: content.sectionShown

  Behavior on revealProgress {
    NumberAnimation {
      duration: root.cfg.animate ? Style.duration(root.open ? 180 : 120) : 0
      easing.type: Easing.OutCubic
    }
  }

  // ------------------------------------------------------------------ actions

  function toggleExpanded() { expanded = !expanded }
  function expand() { expanded = true }
  function collapse() { expanded = false }
  function showSettings() { settingsOpen = true }
  // For IPC: only the bar on the monitor you're looking at opens it.
  function showSettingsIfFocused() {
    var window = root.QsWindow.window
    var focused = Hyprland.focusedMonitor
    if (!focused || !window || !window.screen || Hyprland.monitorFor(window.screen) === focused) showSettings()
  }
  function hideSettings() { settingsOpen = false }

  function clickToggle() {
    if (cfg.syncMonitors) broadcast("toggleExpanded")
    else toggleExpanded()
  }



  // Click mode: close again after a while, but never under the pointer or
  // while something is holding the section open.
  Timer {
    interval: root.cfg.autoHideSeconds * 1000
    running: root.cfg.openOn === "click" && root.cfg.autoHide && root.expanded
      && !root.pointerInside && !root.holdOpen && !root.settingsOpen
    onTriggered: root.expanded = false
  }

  // Hover mode: a short delay either way so passing the pointer over the bar
  // doesn't flap it open and shut.
  Timer {
    interval: 150
    running: root.cfg.openOn === "hover" && root.pointerInside && !root.expanded
    onTriggered: root.expanded = true
  }
  Timer {
    interval: 450
    running: root.cfg.openOn === "hover" && root.expanded && !root.pointerInside
      && !root.holdOpen && !root.settingsOpen
    onTriggered: root.expanded = false
  }

  ShellIpc {
    target: "tim.tuck"
    // One handler answers for every monitor's bar; relay to all of them.
    function toggle(): void { root.broadcast("toggleExpanded") }
    function expand(): void { root.broadcast("expand") }
    function collapse(): void { root.broadcast("collapse") }
    function openSettings(): void { root.broadcast("showSettingsIfFocused") }
    function closeSettings(): void { root.broadcast("hideSettings") }
  }

  HoverHandler {
    onHoveredChanged: root.pointerInside = hovered
  }

  visible: !(cfg.hideWhenEmpty && sectionCount === 0 && !barDragging && !open)
  clip: false
  implicitWidth: vertical ? barSize : content.implicitWidth
  implicitHeight: vertical ? content.implicitHeight : barSize

  // One layout for both orientations: "along" is the bar's axis.
  Item {
    id: content
    anchors.fill: parent

    readonly property real chevronAlong: root.vertical ? chevron.implicitHeight : chevron.implicitWidth
    readonly property real chevronAt: root.towardEnd ? 0 : root.revealExtent
    readonly property real clipAt: root.towardEnd ? chevronAlong : 0
    // Opening past the divider, the section slides out of it; opening before
    // it, the widget grows toward the section, which carries it.
    readonly property real sectionAt: root.towardEnd ? root.revealExtent - root.sectionExtent : 0
    readonly property var sectionShown: {
      var span = Model.shownSpan(clipAt, root.revealExtent, clipAt + sectionAt, root.sectionExtent)
      if (!span) return null
      return root.vertical
        ? { x: 0, y: span.start, width: root.barSize, height: span.length }
        : { x: span.start, y: 0, width: span.length, height: root.barSize }
    }

    implicitWidth: root.vertical ? root.barSize : chevronAlong + root.revealExtent
    implicitHeight: root.vertical ? chevronAlong + root.revealExtent : root.barSize

    Item {
      id: sectionClip
      x: root.vertical ? 0 : content.clipAt
      y: root.vertical ? content.clipAt : 0
      width: root.vertical ? root.barSize : root.revealExtent
      height: root.vertical ? root.revealExtent : root.barSize
      clip: true

      // The bar parents the tray section's widget list in here.
      Item {
        id: sectionArea
        x: root.vertical ? (root.barSize - width) / 2 : content.sectionAt
        y: root.vertical ? content.sectionAt : (root.barSize - height) / 2
        implicitWidth: childrenRect.width
        implicitHeight: childrenRect.height
        width: implicitWidth
        height: implicitHeight

        Component.onCompleted: root.sectionHost = sectionArea
        // A plugin rescan can tear this down after the widget is gone.
        Component.onDestruction: if (root && root.sectionHost === sectionArea) root.sectionHost = null
      }
    }

    BarIconButton {
      id: chevron
      bar: root.bar
      x: root.vertical ? 0 : content.chevronAt
      y: root.vertical ? content.chevronAt : 0
      width: implicitWidth
      height: implicitHeight
      text: Model.glyph(root.cfg.iconStyle, root.towardEnd, root.open)
      textRotation: root.vertical ? 90 : 0
      labelText: root.cfg.showCount && !root.open && root.sectionCount > 0 && !root.vertical
        ? Commons.I18n.formatNumber(root.sectionCount, 0) : ""
      dimmed: root.sectionCount === 0 && !root.open
      // The conflict warning shows even with tooltips off: it's the one
      // thing a user has to act on.
      tooltipText: (root.trayConflict ? strings.t("tooltip.trayConflict") + (root.cfg.showTooltip ? "\n" : "") : "")
        + (root.cfg.showTooltip
          ? Model.tooltip(strings, root.sectionCount, root.open, root.cfg, Commons.I18n.formatNumber(root.cfg.autoHideSeconds, 0))
          : "")
      onPressed: function(button) {
        if (button === Qt.RightButton) root.settingsOpen = !root.settingsOpen
        else root.clickToggle()
      }
    }
  }

  Loader { id: settingsLoader }
}

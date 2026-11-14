import QtQuick
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

  // ---------------------------------------------------------------- settings

  // Seconds open before collapsing again; 0 keeps it open until toggled.
  readonly property int autoHideSeconds: Model.seconds(setting("autoHideSeconds", 10))
  readonly property bool autoHide: setting("autoHide", true) === true && autoHideSeconds > 0

  // ------------------------------------------------------------------- state

  property bool expanded: false
  property bool pointerInside: false
  // The bar opens the section while a widget is dragged (to show where it can
  // go) and while a panel from a hidden widget is open (so its widget stays on
  // screen under the panel).
  readonly property bool barDragging: !!bar && bar.traySectionDragActive === true
  readonly property bool holdOpen: barDragging || (!!bar && bar.traySectionPopoutOpen === true)
  readonly property bool open: expanded || holdOpen

  // ------------------------------------------- tray-section host contract

  property Item sectionHost: null
  readonly property int sectionCount: bar && bar.layoutConfig && Array.isArray(bar.layoutConfig.tray) ? bar.layoutConfig.tray.length : 0
  readonly property real sectionExtent: sectionHost ? (vertical ? sectionHost.implicitHeight : sectionHost.implicitWidth) : 0
  // Divider at the end of the widget (right/bottom) unless the slot keeps its
  // start edge fixed, as in the left section; the hidden widgets open on the
  // side away from the fixed edge.
  readonly property bool fixedAtStart: fixedEdge === "start"
  readonly property string sectionEdge: fixedAtStart ? "start" : "end"
  property real revealProgress: open ? 1 : 0
  readonly property real revealExtent: sectionExtent * revealProgress
  readonly property var sectionShown: content.sectionShown

  Behavior on revealProgress {
    NumberAnimation { duration: Style.duration(root.open ? 180 : 120); easing.type: Easing.OutCubic }
  }

  // ------------------------------------------------------------------ actions

  function toggleExpanded() { expanded = !expanded }
  function expand() { expanded = true }
  function collapse() { expanded = false }

  function setAutoHide(on) {
    if (!bar || !bar.shell || typeof bar.shell.updateEntryInline !== "function") return
    var next = Model.withSetting(settings, moduleName, "autoHide", on)
    bar.shell.updateEntryInline(moduleName, next)
  }

  // Leaving the pointer over the bar, or a drag or panel holding it open,
  // restarts the countdown rather than collapsing under the user.
  Timer {
    id: autoHideTimer
    interval: root.autoHideSeconds * 1000
    running: root.expanded && root.autoHide && !root.pointerInside && !root.holdOpen
    onTriggered: root.expanded = false
  }

  ShellIpc {
    target: "tim.tuck"
    // One handler answers for every monitor's bar; relay to all of them.
    function toggle(): void { root.broadcast("toggleExpanded") }
    function expand(): void { root.broadcast("expand") }
    function collapse(): void { root.broadcast("collapse") }
  }

  HoverHandler {
    onHoveredChanged: root.pointerInside = hovered
  }

  clip: false
  implicitWidth: vertical ? barSize : content.implicitWidth
  implicitHeight: vertical ? content.implicitHeight : barSize

  // One layout for both orientations: "along" is the bar's axis.
  Item {
    id: content
    anchors.fill: parent

    readonly property real chevronAlong: root.vertical ? chevron.implicitHeight : chevron.implicitWidth
    readonly property real chevronAt: root.fixedAtStart ? 0 : root.revealExtent
    readonly property real clipAt: root.fixedAtStart ? chevronAlong : 0
    // Opening from the start edge, the section slides out of the divider;
    // from the end edge the widget grows toward the section, which carries it.
    readonly property real sectionAt: root.fixedAtStart ? root.revealExtent - root.sectionExtent : 0
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
      text: Model.chevronGlyph(root.fixedAtStart, root.open)
      textRotation: root.vertical ? 90 : 0
      dimmed: root.sectionCount === 0 && !root.open
      tooltipText: Model.tooltip(strings, root.sectionCount, root.open, root.autoHide, root.autoHideSeconds, Commons.I18n.formatNumber(root.autoHideSeconds, 0))
      onPressed: function(button) {
        if (button === Qt.RightButton) root.setAutoHide(!root.autoHide)
        else root.toggleExpanded()
      }
    }
  }
}

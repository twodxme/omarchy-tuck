import QtQuick
import qs.Commons
import qs.Commons as Commons
import qs.Ui
import Quickshell.Io
import "TuckModel.js" as Model

// Tuck's settings popup. Tuck.qml loads this file only while the popup is
// open (and for its fade-out), so the bar never holds these controls, and
// the shell doesn't compile them until someone right-clicks the divider.
PopupCard {
  id: settingsPopup
  required property Item tuck
  anchorItem: tuck.chevronItem
  owner: settingsOwner
  bar: tuck.bar
  open: tuck.settingsOpen && ready
  contentWidth: settingsPopup.fittedContentWidth(Style.space(340))
  contentHeight: settingsPopup.fittedContentHeight(settingsColumn.implicitHeight)

  // Open one frame after creation so the card fades in instead of popping.
  property bool ready: false
  Component.onCompleted: Qt.callLater(function() { settingsPopup.ready = true })
  // Faded out after closing: hand the memory back.
  // Deferred: unloading inside our own handler would destroy us mid-signal.
  onVisibleChanged: if (ready && !visible && !tuck.settingsOpen) Qt.callLater(tuck.unloadSettings)

  // PopupCard closes on an outside click through owner.close(). The owner is
  // this object rather than the widget: a close() on the widget would make
  // the bar treat Tuck as a panel for shell summon/toggle routing.
  // Untuck through Omarchy's own CLI; the bar reloads the layout itself.
  function untuck(ids) {
    var command = Model.untuckCommand(ids, tuck.moduleName, tuck.towardEnd)
    if (!command || settingsPopup.untucker.running) return
    settingsPopup.untucker.command = command
    settingsPopup.untucker.running = true
  }
  // Held in a property: PopupCard's children must be visual items.
  readonly property Process untucker: Process {
    stderr: StdioCollector { id: untuckErrors }
    onExited: function(code) { if (code !== 0) console.warn("tim.tuck: untuck failed:", untuckErrors.text) }
  }

  readonly property QtObject settingsOwner: QtObject {
    function close() { settingsPopup.tuck.settingsOpen = false }
  }

  component PlainText: Text {
    textFormat: Text.PlainText
    color: Commons.Color.popups.text
    font.family: settingsPopup.tuck.bar && settingsPopup.tuck.bar.fontFamily ? settingsPopup.tuck.bar.fontFamily : Style.font.family
    font.pixelSize: Style.font.body
    wrapMode: Text.WordWrap
  }

  component LabeledRow: Item {
    property alias label: rowLabel.text
    default property alias control: controlHolder.data
    width: parent ? parent.width : 0
    implicitHeight: Math.max(rowLabel.implicitHeight, controlHolder.childrenRect.height)
    PlainText {
      id: rowLabel
      anchors.left: parent.left
      anchors.right: controlHolder.left
      anchors.rightMargin: Style.space(8)
      anchors.verticalCenter: parent.verticalCenter
      wrapMode: Text.NoWrap
      elide: Text.ElideRight
    }
    Item {
      id: controlHolder
      anchors.right: parent.right
      anchors.verticalCenter: parent.verticalCenter
      width: childrenRect.width
      height: childrenRect.height
    }
  }

  Flickable {
    anchors.fill: parent
    contentHeight: settingsColumn.implicitHeight
    clip: true
    boundsBehavior: Flickable.StopAtBounds

    Column {
      id: settingsColumn
      width: parent.width
      spacing: Style.space(10)

      PlainText {
        text: tuck.strings.t("settings.title")
        font.pixelSize: Style.font.subtitle
        font.bold: true
      }

      PlainText {
        visible: tuck.trayConflict
        width: parent.width
        text: tuck.strings.t("settings.trayConflict")
        color: Commons.Color.urgent
      }

      // ------------------------------------------------------- behavior
      PanelSectionHeader { text: tuck.strings.t("settings.behavior") }

      LabeledRow {
        label: tuck.strings.t("settings.openOn")
        ButtonGroup {
          options: [
            { value: "click", label: tuck.strings.t("settings.openOn.click") },
            { value: "hover", label: tuck.strings.t("settings.openOn.hover") }
          ]
          value: tuck.cfg.openOn
          onChanged: function(v) { tuck.setSetting("openOn", v) }
        }
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.autoHide")
        description: tuck.cfg.openOn === "hover" ? tuck.strings.t("settings.autoHide.hoverDesc") : tuck.strings.t("settings.autoHide.desc")
        checked: tuck.cfg.autoHide
        enabled: tuck.cfg.openOn === "click"
        opacity: enabled ? 1 : 0.5
        onClicked: tuck.setSetting("autoHide", !tuck.cfg.autoHide)
      }

      NumberField {
        visible: tuck.cfg.openOn === "click" && tuck.cfg.autoHide
        label: tuck.strings.t("settings.autoHideSeconds")
        from: 1
        to: 300
        value: tuck.cfg.autoHideSeconds
        onModified: function(v) { tuck.setSetting("autoHideSeconds", v) }
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.startOpen")
        description: tuck.strings.t("settings.startOpen.desc")
        checked: tuck.cfg.startOpen
        onClicked: tuck.setSetting("startOpen", !tuck.cfg.startOpen)
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.syncMonitors")
        description: tuck.strings.t("settings.syncMonitors.desc")
        checked: tuck.cfg.syncMonitors
        onClicked: tuck.setSetting("syncMonitors", !tuck.cfg.syncMonitors)
      }

      // ----------------------------------------------------------- look
      PanelSectionHeader { text: tuck.strings.t("settings.look") }

      Dropdown {
        width: parent.width
        label: tuck.strings.t("settings.iconStyle")
        value: tuck.cfg.iconStyle
        options: Model.ICON_STYLES.map(function(s) { return { value: s, label: tuck.strings.t("settings.iconStyle." + s) } })
        onChanged: function(v) { tuck.setSetting("iconStyle", v) }
      }

      LabeledRow {
        label: tuck.strings.t("settings.openToward")
        ButtonGroup {
          options: [
            { value: "auto", label: tuck.strings.t("settings.openToward.auto") },
            { value: "start", label: tuck.strings.t(tuck.vertical ? "settings.openToward.startV" : "settings.openToward.startH") },
            { value: "end", label: tuck.strings.t(tuck.vertical ? "settings.openToward.endV" : "settings.openToward.endH") }
          ]
          value: tuck.cfg.openToward
          onChanged: function(v) { tuck.setSetting("openToward", v) }
        }
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.showCount")
        description: tuck.strings.t("settings.showCount.desc")
        checked: tuck.cfg.showCount
        onClicked: tuck.setSetting("showCount", !tuck.cfg.showCount)
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.hideWhenEmpty")
        description: tuck.strings.t("settings.hideWhenEmpty.desc")
        checked: tuck.cfg.hideWhenEmpty
        onClicked: tuck.setSetting("hideWhenEmpty", !tuck.cfg.hideWhenEmpty)
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.showTooltip")
        checked: tuck.cfg.showTooltip
        onClicked: tuck.setSetting("showTooltip", !tuck.cfg.showTooltip)
      }

      Toggle {
        width: parent.width
        label: tuck.strings.t("settings.animate")
        description: tuck.strings.t("settings.animate.desc")
        checked: tuck.cfg.animate
        onClicked: tuck.setSetting("animate", !tuck.cfg.animate)
      }

      // ------------------------------------------------- tucked widgets
      PanelSectionHeader { text: tuck.strings.t("settings.tucked") }

      PlainText {
        visible: tuck.tuckedIds.length === 0
        width: parent.width
        text: tuck.strings.t("settings.noneTucked")
        opacity: 0.7
      }

      Repeater {
        model: tuck.tuckedIds
        LabeledRow {
          required property string modelData
          label: Model.prettyName(modelData)
          Button {
            text: tuck.strings.t("settings.untuck")
            tooltipText: modelData
            onClicked: settingsPopup.untuck([modelData])
          }
        }
      }

      Button {
        visible: tuck.tuckedIds.length > 1
        text: tuck.strings.t("settings.untuckAll")
        bordered: true
        onClicked: settingsPopup.untuck(tuck.tuckedIds.slice())
      }

      PlainText {
        width: parent.width
        text: tuck.strings.t("settings.hotkey")
        font.pixelSize: Style.font.caption
        opacity: 0.6
      }
    }
  }
}

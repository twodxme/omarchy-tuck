# Tuck

Tuck the bar widgets you rarely need behind a divider on the [Omarchy](https://omarchy.org) bar. Click the arrow, press a hotkey, or let it fold itself away again after a few seconds.

```
collapsed   ‹  13%  61%   …   Saturday 1:13 PM
expanded      ›  13%  61%   …   Saturday 1:13 PM
```

## Install

```bash
omarchy plugin add https://github.com/twodxme/omarchy-tuck.git --enable
```

Tuck lands on the bar as `tim.tuck`. Move it where you want the divider, for example the start of the right section:

```bash
omarchy bar move tim.tuck --section right --index 0
```

## Use

- **Click** the arrow to show or hide the tucked widgets.
- **Drag** a widget along the bar and the divider opens: drop it inside to tuck it, drag one out to bring it back. Tucked widgets keep working exactly as they do on the bar, panels included.
- **Right-click** the arrow to switch auto-hide on or off.
- **Auto-hide** folds the divider again 10 seconds after it opens. The countdown pauses while the pointer is over it, while you drag, and while a tucked widget's panel is open.

Or tuck widgets from the command line; they live in the bar's `tray` section:

```bash
omarchy bar move omarchy.bluetooth --section tray
```

## Hotkey

Tuck answers over the shell's IPC, on every monitor at once:

```bash
omarchy-shell tim.tuck toggle     # or expand / collapse
```

Bind it in `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + BACKSLASH", "Tuck", "omarchy-shell tim.tuck toggle")
```

## Settings

```bash
omarchy bar set tim.tuck autoHideSeconds 30   # 0 keeps it open until toggled
omarchy bar set tim.tuck autoHide false
```

## Notes

- Tuck hosts the bar's `tray` section, the same one Omarchy's stock tray (`omarchy.tray`) opens in its drawer. Use one or the other.
- Works on top, bottom, left and right bars. On a vertical bar the divider opens downward or upward.
- English strings ship in `i18n/en.json`; other Omarchy languages fall back to them. Translations welcome.

## Develop

```bash
node tests/model.test.js
omarchy plugin validate .
```

Saving any file under `~/.config/omarchy/plugins/tim.tuck/` reloads the plugin.

## License

MIT

# Shell assets

`icon.png` and `splash.png` are the source images for the Android launcher icon and
splash screen. `scripts/add-android.js` regenerates every density from them on each
build, because `android/` is a working directory and would otherwise fall back to the
stock Capacitor icon.

`icon.png` is the same artwork `ui/mobile` ships (`ui/mobile/assets/icon.png`), copied
here rather than referenced so the shell does not depend on a package that is meant to
go away. The brand file in `public/brand/everfreenote-app-icon.png` is the same mark but
with far more padding, which Android's adaptive-icon mask would shrink to almost nothing.

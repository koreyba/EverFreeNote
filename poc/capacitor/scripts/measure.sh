#!/usr/bin/env bash
# Measure the Capacitor POC on a connected device or emulator.
#
#   ./scripts/measure.sh <path-to.apk> <label> [runs]
#
# Reports:
#   - cold start (am start -W TotalTime; process killed between runs)
#   - in-page timings read from window.__perf over the DevTools protocol
#   - scroll jank from dumpsys gfxinfo while adb drives real swipes
set -euo pipefail

APK="${1:?usage: measure.sh <apk> <label> [runs]}"
LABEL="${2:?}"
RUNS="${3:-5}"
PKG="com.everfreenote.poc"
ACTIVITY="$PKG/.MainActivity"
ADB="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}/platform-tools/adb"
HERE="$(cd "$(dirname "$0")" && pwd)"

settle() { $ADB shell sleep "$1"; }

echo "=== $LABEL ==="
$ADB uninstall "$PKG" >/dev/null 2>&1 || true
$ADB install -r "$APK" >/dev/null
echo "apk_size_mb=$(echo "scale=2; $(stat -f%z "$APK" 2>/dev/null || stat -c%s "$APK")/1048576" | bc)"

read -r SW SH <<<"$($ADB shell wm size | sed 's/.*: //' | tr 'x' ' ')"
MID_X=$((SW / 2)); FROM_Y=$((SH * 78 / 100)); TO_Y=$((SH * 22 / 100))
echo "screen=${SW}x${SH}"

echo "--- cold start (native first frame) ---"
for i in $(seq 1 "$RUNS"); do
  $ADB shell am force-stop "$PKG"; settle 1
  echo "run_$i total_ms=$($ADB shell am start -W -S -n "$ACTIVITY" 2>/dev/null | awk -F': ' '/^TotalTime/{print $2}')"
  settle 3
done

echo "--- in-page timings ---"
$ADB shell am force-stop "$PKG"; settle 1
$ADB shell am start -n "$ACTIVITY" >/dev/null
settle 8
PID=$($ADB shell pidof "$PKG" | tr -d '\r')
$ADB forward --remove tcp:9222 >/dev/null 2>&1 || true
$ADB forward tcp:9222 "localabstract:webview_devtools_remote_$PID" >/dev/null
node "$HERE/cdp.js" "JSON.stringify(window.__perf || {error:'no __perf'})" 2>/dev/null | grep '"value"'

echo "--- scroll: 12 swipes ---"
$ADB shell dumpsys gfxinfo "$PKG" reset >/dev/null
for _ in $(seq 1 12); do $ADB shell input swipe "$MID_X" "$FROM_Y" "$MID_X" "$TO_Y" 250; done
settle 2
$ADB shell dumpsys gfxinfo "$PKG" | grep -E "Total frames rendered|^Janky frames:|50th percentile|90th percentile|95th percentile|99th percentile|Number Missed Vsync|Number Slow UI thread|Number Slow draw"
node "$HERE/cdp.js" "JSON.stringify((window.__perf&&window.__perf.frames)||[])" 2>/dev/null | grep '"value"'

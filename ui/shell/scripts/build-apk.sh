#!/usr/bin/env bash
# Build an installable APK, end to end.
#
#   APP_VARIANT=stage ./scripts/build-apk.sh [debug|release]
#
# Runs the web build, regenerates the native project (idempotent), syncs and calls
# Gradle. Supabase credentials come from the environment or the repo-root .env.local;
# without them the build still succeeds but sign-in will not work.
set -euo pipefail

BUILD_TYPE="${1:-release}"
VARIANT="${APP_VARIANT:-dev}"
SHELL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "$BUILD_TYPE" in
  debug|release) ;;
  *) echo "usage: build-apk.sh [debug|release]" >&2; exit 1 ;;
esac

if [ -z "${JAVA_HOME:-}" ]; then
  echo "JAVA_HOME is not set. Capacitor 8 needs JDK 21 (17 fails with 'invalid source release: 21')." >&2
  exit 1
fi

if [ "$BUILD_TYPE" = "release" ] && [ -z "${SHELL_KEYSTORE:-}" ]; then
  echo "SHELL_KEYSTORE is not set; a release APK would be signed with a non-existent key." >&2
  echo "Either point it at a keystore, or build a debug APK: ./scripts/build-apk.sh debug" >&2
  exit 1
fi

cd "$SHELL_DIR"

node scripts/build-web.js
node scripts/add-android.js
npx cap sync android

cd android
chmod +x gradlew
if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew assembleRelease
  APK="app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  APK="app/build/outputs/apk/debug/app-debug.apk"
fi

echo
echo "✅ ${VARIANT} ${BUILD_TYPE} APK: ${SHELL_DIR}/android/${APK}"
echo "   install with: adb install -r ${SHELL_DIR}/android/${APK}"

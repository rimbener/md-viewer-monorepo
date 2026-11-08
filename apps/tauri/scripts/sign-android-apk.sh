#!/bin/sh
set -eu

fail() {
  echo "sign-android-apk: $*" >&2
  exit 1
}

outputs="$(dirname "$0")/../src-tauri/gen/android/app/build/outputs/apk/universal/release"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
keystore="$HOME/.android/debug.keystore"

[ -d "$sdk/build-tools" ] || fail "no build-tools in $sdk; set ANDROID_HOME"
build_tools="$(ls -d "$sdk"/build-tools/* 2>/dev/null | sort -V | tail -n 1)"
[ -n "$build_tools" ] || fail "no build-tools in $sdk; install them with Android Studio"
# zipalign -P (16 KB pages) came in build-tools 35.
major="$(basename "$build_tools" | cut -d. -f1)"
[ "$major" -ge 35 ] 2>/dev/null || fail "build-tools $(basename "$build_tools") is too old; install 35 or later"

if [ ! -f "$keystore" ]; then
  # /usr/bin/keytool on macOS is a stub that fails without a Java runtime.
  keytool=""
  for candidate in \
    "${JAVA_HOME:+$JAVA_HOME/bin/keytool}" \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
    keytool; do
    if [ -n "$candidate" ] && "$candidate" -help >/dev/null 2>&1; then
      keytool="$candidate"
      break
    fi
  done
  [ -n "$keytool" ] || fail "no keytool to make $keystore; set JAVA_HOME"
  mkdir -p "$(dirname "$keystore")"
  "$keytool" -genkeypair -v -keystore "$keystore" -storepass android \
    -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
    -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
fi

trap 'rm -f "$outputs/aligned.apk"' EXIT
"$build_tools/zipalign" -f -P 16 4 "$outputs/app-universal-release-unsigned.apk" "$outputs/aligned.apk"
"$build_tools/apksigner" sign \
  --ks "$keystore" \
  --ks-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$outputs/md-viewer.apk" \
  "$outputs/aligned.apk"
"$build_tools/apksigner" verify "$outputs/md-viewer.apk"
echo "$outputs/md-viewer.apk"

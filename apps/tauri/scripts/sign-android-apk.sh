#!/bin/sh
set -eu

outputs="$(dirname "$0")/../src-tauri/gen/android/app/build/outputs/apk/universal/release"
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
build_tools="$(ls -d "$sdk"/build-tools/* | sort -V | tail -n 1)"

"$build_tools/zipalign" -f -P 16 4 "$outputs/app-universal-release-unsigned.apk" "$outputs/aligned.apk"
"$build_tools/apksigner" sign \
  --ks "$HOME/.android/debug.keystore" \
  --ks-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$outputs/md-viewer.apk" \
  "$outputs/aligned.apk"
rm "$outputs/aligned.apk"
"$build_tools/apksigner" verify "$outputs/md-viewer.apk"
echo "$outputs/md-viewer.apk"

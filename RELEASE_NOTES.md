# Shettar Business release notes

## 0.1.47

### Highlights

- Android CI installs NDK (r27) and sets `NDK_HOME` / `ANDROID_NDK_HOME` for Tauri APK builds
- Android APK is **tablet-only** (landscape + `requiresSmallestWidthDp="600"`); re-apply if regenerating `gen/android`

## 0.1.46

### Highlights

- Fix thermal receipt printing that squashed the main UI (print runs in an isolated iframe)
- Android APK builds in the release pipeline, with optional keystore signing
- Android CI installs NDK (r27) and sets `NDK_HOME` / `ANDROID_NDK_HOME` for Tauri
- Android APK is **tablet-only** (landscape + `requiresSmallestWidthDp="600"`); re-apply if regenerating `gen/android`
- iOS IPA job soft-skips when Apple signing secrets are missing so desktop/Android registration still succeeds
- Mobile download links for Business Android APK and iOS store URL on the public download page
- Desktop release registration now includes `android_apk_url` and `ios_store_url`

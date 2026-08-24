# Shettar Business release notes

## 0.1.56

### Highlights

- Fix Windows desktop build: declare the `windows` crate so USB/system printer printing can compile

## 0.1.55

### Highlights

- Thermal receipts print the Shettar ticket design in black and white (logo, header, perforation), including USB and saved network printers
- Reception, kitchen, and restaurant can set up a printer from the sound/bell toolbar icon
- macOS title bar uses the light theme so “Shettar Business” stays readable

## 0.1.54

### Highlights

- Android CI: free disk space before NDK setup (no longer wipes hostedtoolcache / NDK)
- Gradle Rust plugin defaults to arm64-only so multi-ABI compile cannot refill the runner

## 0.1.53

### Highlights

- Android CI builds arm64 only (fixes runner disk-full failures from building i686/x86 ABIs)

## 0.1.52

### Highlights

- Staging Android builds can use a debug-signed APK when release keystore secrets are missing (still installable). Production still requires ANDROID_KEYSTORE_* secrets.

## 0.1.51

### Highlights

- Fix Android download APK: require release signing and publish the universal/arm64 release build (unsigned/wrong-ABI APKs installed as "package appears to be invalid")

## 0.1.50

### Highlights

- Desktop no longer gets Android safe-area padding (native-edge only on mobile)
- Update checks are skipped in local `tauri dev` / Next dev so failed production updater calls don’t cover the UI
- Update banner only appears when an update is actually available

## 0.1.49

### Highlights

- Android/iOS in-app update card: checks `/desktop_releases/latest` and opens Google Play (when configured) or the APK download — desktop still uses the Tauri updater
- Edge-to-edge safe areas on Android (transparent system bars + WindowInsets CSS injection) so content no longer sits under the nav/status bars
- Update banner moved to the top-right

## 0.1.48

### Highlights

- Receipt printing on desktop works again — the system print dialog opens from Bookings, the dashboard no longer shrinks after print, and the preview shows only the receipt (not the bookings table or reservation window)
- “View changelog” from the update banner opens the correct Shettar changelog page for your environment

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

fn main() {
  // Google Play / Android 15+ 16 KB page-size devices require ELF LOAD
  // segments aligned to 16384. Cargo does not inherit NDK defaults for
  // Rust cdylibs, so set the linker flags explicitly for Android targets.
  // Use rustc-cdylib-link-arg — this crate ships as libapp_lib.so (cdylib).
  let target = std::env::var("TARGET").unwrap_or_default();
  if target.contains("android") {
    println!("cargo:rustc-cdylib-link-arg=-Wl,-z,max-page-size=16384");
    println!("cargo:rustc-cdylib-link-arg=-Wl,-z,common-page-size=16384");
  }

  tauri_build::build()
}

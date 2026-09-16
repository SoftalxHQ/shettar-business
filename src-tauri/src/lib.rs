#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod printer;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod desktop_location;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Android/iOS Tauri builds use reqwest with rustls-no-provider. Without a
  // process-level CryptoProvider, Client::new() panics with "No provider set"
  // and the activity crash-loops (open → close).
  let _ = rustls::crypto::ring::default_provider().install_default();

  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_geolocation::init());

  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  let builder = builder
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      printer::commands::get_printers,
      printer::commands::print_ops,
      printer::commands::print_image,
      printer::commands::fetch_url_data_url,
      printer::commands::test_print,
      printer::commands::open_cash_drawer,
      desktop_location::get_desktop_location,
    ]);

  builder
    .setup(|app| {
      #[cfg(any(target_os = "android", target_os = "ios"))]
      {
        app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
        app.handle().plugin(tauri_plugin_biometric::init())?;
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

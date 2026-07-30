#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod printer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_geolocation::init());

  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  {
    builder = builder
      .plugin(tauri_plugin_process::init())
      .plugin(tauri_plugin_updater::Builder::new().build())
      .invoke_handler(tauri::generate_handler![
        printer::commands::get_printers,
        printer::commands::print_ops,
        printer::commands::test_print,
        printer::commands::open_cash_drawer,
      ]);
  }

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

//! One-shot desktop location via OS location services (not WebView geolocation).

use std::cell::RefCell;
use std::sync::mpsc;
use std::sync::Mutex;
use std::time::Duration;

use robius_location::{
  Access, Accuracy, Error as LocError, Handler, Location, Manager,
};
use serde::Serialize;
use tauri::AppHandle;

/// Long enough for the user to answer the macOS permission dialog.
const LOCATION_TIMEOUT: Duration = Duration::from_secs(60);

// Core Location's manager is main-thread-only (`!Send` / `!Sync`). Keep it in
// TLS so it stays alive until the fix arrives, without putting it in Tauri State.
thread_local! {
  static ACTIVE_MANAGER: RefCell<Option<Manager>> = const { RefCell::new(None) };
}

#[derive(Debug, Clone, Serialize)]
pub struct DesktopLocation {
  pub latitude: f64,
  pub longitude: f64,
}

struct OnceHandler {
  tx: Mutex<Option<mpsc::Sender<Result<DesktopLocation, String>>>>,
}

impl Handler for OnceHandler {
  fn handle(&self, location: Location<'_>) {
    let result = match location.coordinates() {
      Ok(coords) => Ok(DesktopLocation {
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      Err(_) => Err("unavailable".to_string()),
    };
    if let Ok(mut guard) = self.tx.lock() {
      if let Some(tx) = guard.take() {
        let _ = tx.send(result);
      }
    }
  }

  fn error(&self, error: LocError) {
    // Ignore transient "location unknown" while Core Location is still acquiring
    // (common on macOS Wi‑Fi / IP location). Keep waiting until timeout.
    if matches!(error, LocError::TemporarilyUnavailable) {
      return;
    }
    if let Ok(mut guard) = self.tx.lock() {
      if let Some(tx) = guard.take() {
        let _ = tx.send(Err(map_loc_error(error)));
      }
    }
  }
}

fn map_loc_error(error: LocError) -> String {
  match error {
    LocError::AuthorizationDenied => "denied".to_string(),
    LocError::TemporarilyUnavailable | LocError::Network => "unavailable".to_string(),
    LocError::PermanentlyUnavailable => "unsupported".to_string(),
    LocError::NotMainThread
    | LocError::AndroidEnvironment
    | LocError::Unknown => "unknown".to_string(),
  }
}

fn clear_active_manager() {
  ACTIVE_MANAGER.with(|slot| {
    if let Some(mut manager) = slot.borrow_mut().take() {
      let _ = manager.stop_updates();
    }
  });
}

/// Whether the running process can show a Core Location permission prompt.
/// Unpackaged `tauri dev` binaries have no Info.plist keys — prompting is impossible.
#[cfg(target_os = "macos")]
fn macos_can_prompt_for_location() -> bool {
  use objc2_foundation::{NSBundle, NSString};

  let bundle = NSBundle::mainBundle();
  [
    "NSLocationWhenInUseUsageDescription",
    "NSLocationAlwaysAndWhenInUseUsageDescription",
    "NSLocationAlwaysUsageDescription",
  ]
  .iter()
  .any(|key| {
    bundle
      .objectForInfoDictionaryKey(&NSString::from_str(key))
      .is_some()
  })
}

/// Request a single location fix from the OS. Authorization / updates run on the
/// main thread (required by macOS Core Location).
#[tauri::command]
pub async fn get_desktop_location(app: AppHandle) -> Result<DesktopLocation, String> {
  #[cfg(target_os = "macos")]
  if !macos_can_prompt_for_location() {
    // Typical for `tauri dev` (raw binary, no .app Info.plist). Caller should fall back.
    return Err("unsupported".to_string());
  }

  let (tx, rx) = mpsc::channel::<Result<DesktopLocation, String>>();
  let tx_err = tx.clone();

  app
    .run_on_main_thread(move || {
      clear_active_manager();

      let handler = OnceHandler {
        tx: Mutex::new(Some(tx)),
      };

      let mut manager = match Manager::new(handler) {
        Ok(manager) => manager,
        Err(error) => {
          let _ = tx_err.send(Err(map_loc_error(error)));
          return;
        }
      };

      if let Err(error) =
        manager.request_authorization(Access::Foreground, Accuracy::Precise)
      {
        let _ = tx_err.send(Err(map_loc_error(error)));
        return;
      }

      // `start_updates` is more reliable than `requestLocation` for macOS Wi‑Fi location.
      if let Err(error) = manager.start_updates() {
        let _ = tx_err.send(Err(map_loc_error(error)));
        return;
      }

      ACTIVE_MANAGER.with(|slot| {
        *slot.borrow_mut() = Some(manager);
      });
    })
    .map_err(|e| e.to_string())?;

  let result = tauri::async_runtime::spawn_blocking(move || {
    rx.recv_timeout(LOCATION_TIMEOUT)
      .map_err(|_| "timeout".to_string())
      .and_then(|inner| inner)
  })
  .await
  .map_err(|e| e.to_string())?;

  let _ = app.run_on_main_thread(clear_active_manager);

  result
}

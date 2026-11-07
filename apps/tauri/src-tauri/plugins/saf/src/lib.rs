//! The commands are Kotlin only: Tauri sends a call it finds no Rust
//! handler for to the Android plugin registered here.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("saf")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            _api.register_android_plugin("com.rimbener.mdviewer.saf", "SafPlugin")?;
            Ok(())
        })
        .build()
}

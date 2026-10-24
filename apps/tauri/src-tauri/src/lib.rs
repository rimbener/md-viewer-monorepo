use std::sync::Mutex;

/// A file handed to the app from outside, held until the page asks for it.
#[derive(Default)]
struct OpenedFile(Mutex<Option<String>>);

#[tauri::command]
fn take_opened_file(state: tauri::State<OpenedFile>) -> Option<String> {
    state.0.lock().ok()?.take()
}

/// Windows and Linux pass an opened file as an argument; macOS sends an event.
fn file_argument() -> Option<String> {
    std::env::args().skip(1).find(|arg| !arg.starts_with('-'))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(OpenedFile(Mutex::new(file_argument())))
        .invoke_handler(tauri::generate_handler![take_opened_file])
        .build(tauri::generate_context!())
        .expect("error while building the app")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                use tauri::{Emitter, Manager};
                let opened = urls.into_iter().find_map(|url| url.to_file_path().ok());
                if let Some(path) = opened {
                    let path = path.to_string_lossy().into_owned();
                    if let Ok(mut held) = app.state::<OpenedFile>().0.lock() {
                        *held = Some(path.clone());
                    }
                    let _ = app.emit("opened-file", path);
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}

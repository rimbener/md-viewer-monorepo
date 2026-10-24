use std::collections::HashMap;
use std::sync::Mutex;

const MAIN: &str = "main";

/// Files handed to the app from outside, each held for its window until the
/// page in that window asks for it.
#[derive(Default)]
struct Opened {
    files: HashMap<String, String>,
    /// The main window has asked, so a later file needs a window of its own.
    is_main_taken: bool,
    windows: u32,
}

impl Opened {
    /// Assigns `path` to a window. Returns the label of a window to create.
    fn route(&mut self, path: String) -> Option<String> {
        if !self.is_main_taken && !self.files.contains_key(MAIN) {
            self.files.insert(MAIN.to_string(), path);
            return None;
        }
        self.windows += 1;
        let label = format!("document-{}", self.windows);
        self.files.insert(label.clone(), path);
        Some(label)
    }

    fn take(&mut self, label: &str) -> Option<String> {
        if label == MAIN {
            self.is_main_taken = true;
        }
        self.files.remove(label)
    }
}

struct OpenedFiles(Mutex<Opened>);

#[tauri::command]
fn take_opened_file(window: tauri::Window, state: tauri::State<OpenedFiles>) -> Option<String> {
    state.0.lock().ok()?.take(window.label())
}

/// Windows and Linux pass an opened file as an argument; macOS sends an event.
fn file_argument() -> Option<String> {
    std::env::args().skip(1).find(|arg| !arg.starts_with('-'))
}

pub fn run() {
    let mut opened = Opened::default();
    if let Some(path) = file_argument() {
        opened.route(path);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(OpenedFiles(Mutex::new(opened)))
        .invoke_handler(tauri::generate_handler![take_opened_file])
        .build(tauri::generate_context!())
        .expect("error while building the app")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = event {
                for path in urls.into_iter().filter_map(|url| url.to_file_path().ok()) {
                    open_in_window(app, path);
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}

/// How far a new window sits from the window it opens over.
#[cfg(target_os = "macos")]
const CASCADE: f64 = 28.0;

/// macOS keeps one process, so a file opened while it runs gets a new window.
#[cfg(target_os = "macos")]
fn open_in_window(app: &tauri::AppHandle, path: std::path::PathBuf) {
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    let title = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "MD Viewer".to_string());
    let label = match app.state::<OpenedFiles>().0.lock() {
        Ok(mut opened) => opened.route(path.to_string_lossy().into_owned()),
        Err(_) => return,
    };
    let Some(label) = label else {
        return;
    };
    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(title)
        .inner_size(1200.0, 800.0)
        .min_inner_size(640.0, 400.0);
    // A new window at the default spot would cover the one under it exactly.
    if let Some((x, y)) = cascade_origin(app) {
        builder = builder.position(x + CASCADE, y + CASCADE);
    }
    let _ = builder.build();
}

/// Top-left corner, in logical pixels, of the focused window, else of any.
#[cfg(target_os = "macos")]
fn cascade_origin(app: &tauri::AppHandle) -> Option<(f64, f64)> {
    use tauri::Manager;

    let windows = app.webview_windows();
    let window = windows
        .values()
        .find(|window| window.is_focused().unwrap_or(false))
        .or_else(|| windows.values().next())?;
    let position = window
        .outer_position()
        .ok()?
        .to_logical::<f64>(window.scale_factor().ok()?);
    Some((position.x, position.y))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gives_the_first_file_to_the_main_window() {
        let mut opened = Opened::default();
        assert_eq!(opened.route("/a.md".into()), None);
        assert_eq!(opened.take(MAIN), Some("/a.md".into()));
    }

    #[test]
    fn opens_a_new_window_once_the_main_window_has_asked() {
        let mut opened = Opened::default();
        assert_eq!(opened.take(MAIN), None);
        assert_eq!(opened.route("/a.md".into()), Some("document-1".into()));
        assert_eq!(opened.route("/b.md".into()), Some("document-2".into()));
        assert_eq!(opened.take("document-2"), Some("/b.md".into()));
        assert_eq!(opened.take("document-1"), Some("/a.md".into()));
    }

    #[test]
    fn opens_a_new_window_for_a_second_file_at_launch() {
        let mut opened = Opened::default();
        assert_eq!(opened.route("/a.md".into()), None);
        assert_eq!(opened.route("/b.md".into()), Some("document-1".into()));
        assert_eq!(opened.take(MAIN), Some("/a.md".into()));
    }
}

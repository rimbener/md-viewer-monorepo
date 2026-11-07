const COMMANDS: &[&str] = &[
    "pick_folder",
    "open_tree",
    "list_children",
    "stat",
    "read_text",
    "read_base64",
    "write_text",
    "create_file",
    "safe_area",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}

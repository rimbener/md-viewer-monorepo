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
    "take_shared",
    "register_listener",
    "remove_listener",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}

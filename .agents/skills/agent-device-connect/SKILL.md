---
name: agent-device-connect
description: >-
  Preflight check before any agent-device automation in this repo: checks the CLI version
  against the docs bundle (`.agents/docs/agent-device-llms-fulll.txt`, v0.21.12) and confirms a
  target is reachable — an iOS simulator via `agent-device open <app> --platform ios --foreground`, a
  physical iOS device via the known-good flow in `.secrets/agent-device-ios-setup.md`,
  an Android emulator/device via `agent-device devices --platform android`, or the managed
  web browser via `agent-device web doctor`. Use before running agent-device commands for the first
  time this session, or when a connection attempt fails unexpectedly. If iOS setup is
  missing or the connect attempt fails, tells the user to run `agent-device-ios-setup`
  first instead of guessing fixes; if no Android target is reachable, or the web backend
  is not set up, tells the user how to boot/authorize/set one up instead of guessing fixes.
---

# agent-device connect check

Minimal preflight: confirm the CLI version, confirm the device is reachable, defer to setup
on failure. Not a full manual — see the `agent-device` skill (and `ios-simulator` /
`android-emulator`) for interaction commands once connected.

## Step 1 — check the CLI and the docs

This preflight runs `--version` and `devices` on purpose. The vendored skills say "do not probe first";
that rule is for app-driving tasks, not for this connection check.

Run `agent-device --version`. `.agents/docs/agent-device-llms-fulll.txt` and the vendored
skills match **v0.21.12**. If the installed version differs, trust `agent-device help <topic>`
(always version-matched) over the bundle and tell the user the bundle is stale. Don't guess
flags or subcommands: look them up with `agent-device help <command>` or in the bundle.

## Step 2 — pick the platform

Infer the target from what the user asked: a physical iPhone/iPad, an iOS simulator, an
Android emulator/device, or a browser (or an explicit `--platform` in their request). Ask
if it's genuinely ambiguous. Then follow the matching flow below. Asked for several
platforms, run one flow per platform — each is reachable or it is not, and a pass on one
says nothing about another.

## iOS simulator flow

A simulator needs no signing setup and no `.secrets/` file.

1. `agent-device open <APP_BUNDLE_ID> --platform ios --foreground` — boots the simulator when
   needed and returns the first snapshot. Add `--device "<name>"` or `--udid <udid>` when
   several simulators exist.
2. Unknown bundle id: `agent-device devices --platform ios`, then `agent-device apps --platform ios`.
   Never invent ids.
3. On failure, follow the error's hint; don't guess flags. Then continue with the
   `ios-simulator` skill.

## iOS physical-device flow

### Step 3i — require setup

Read `.secrets/agent-device-ios-setup.md`.

- **Missing:** tell the user setup hasn't run yet and ask them to run the
  `agent-device-ios-setup` skill first. Stop here — don't invent a team id, bundle id, or
  UDID.
- **Present:** continue to Step 4i.

### Step 4i — try connecting

Run that file's "Known-good flow" block verbatim (exports `AGENT_DEVICE_IOS_TEAM_ID` /
`AGENT_DEVICE_IOS_BUNDLE_ID`, then `agent-device open ... --udid ...` followed by
`agent-device snapshot -i ... --udid ...`).

- **Succeeds:** report connected and proceed with whatever agent-device task was
  requested, using the `agent-device` skill for the interaction commands.
- **Fails:** don't troubleshoot flags or retry variations. Report the error and tell the
  user to re-run the `agent-device-ios-setup` skill — the cert, device, or daemon state
  likely changed since that file was written.

## Android flow

Android has no signing dance and no `.secrets/agent-device-android-setup.md` file to
maintain — reachability is the only thing to check.

### Step 3a — check for a reachable target

Run:

```bash
agent-device devices --platform android
```

- **One or more devices listed with `booted=true` (emulator) or a connected serial
  (physical device):** continue to Step 4a.
- **Empty list, or a physical device shown as `unauthorized`:** go to Step 5a instead —
  don't retry the same command hoping it changes.

### Step 4a — open a session and verify

```bash
agent-device open --platform android --device "<name from Step 3a>"
```

If a task-specific app/package is already known, open that instead:
`agent-device open <package> --platform android --foreground` (see the `android-emulator`
skill). Confirm with `agent-device snapshot -i --platform android` or `screenshot`.

- **Succeeds:** report connected and proceed with whatever agent-device task was
  requested, using the `agent-device` skill for the interaction commands.
- **Fails unexpectedly:** report the error rather than guessing flags; re-run Step 3a to
  confirm the target didn't drop.

### Step 5a — no target reachable

Tell the user, don't guess or auto-remediate silently:

- **No emulator running:** either boot one from Android Studio's Device Manager, or run
  `agent-device boot --platform android --device <avd-name>` (add `--headless` for no
  GUI). Then re-run Step 3a.
- **Physical device not listed:** connect via USB, enable Developer Options > USB
  debugging, and accept the "Allow USB debugging" prompt on the device itself. Verify
  with `adb devices` — it must show `device`, not `unauthorized` or `offline`. Then
  re-run Step 3a.
- **Multiple targets and the right one is ambiguous:** ask the user which one, or pin it
  with `--serial <serial>` (see `agent-device help commands`, "Device Selection").

## Web flow

The managed browser backend has no device to boot and no signing dance, but it does have a
one-off setup step, it is CLI-only, and it needs Node 24+.

### Step 3w — check the backend

```bash
agent-device web doctor
```

- **Healthy:** continue to Step 4w.
- **Unhealthy, or the command reports the backend is not set up:** run
  `agent-device web setup` — it is the documented setup path, not a guessed fix — then
  re-run `web doctor`. Still unhealthy: report what it said and stop. Don't fall back to
  another browser tool; the caller asked for an agent-device session.

### Step 4w — open a page and verify

The app has to be served before it can be opened, and the dev server outlives the call
that starts it, so start it in the background first. Then:

```bash
agent-device open "<url>" --platform web
agent-device snapshot -i --platform web
```

- **Succeeds:** report connected and proceed with the requested task.
- **Fails on the URL:** check the server is actually serving that address before
  suspecting the backend — a page that never loaded is not an unreachable target.

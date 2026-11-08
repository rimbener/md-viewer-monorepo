---
name: agent-device-ios-setup
description: >-
  Set up or refresh the local, machine-specific `.secrets/agent-device-ios-setup.md`
  cheat sheet for running agent-device against a physical iOS device. Use when the user
  wants to configure/hook up agent-device for a physical iPhone/iPad, or when agent-device
  iOS commands fail with signing/team errors ("No Account for Team ...", "No signing
  certificate", stale daemon env vars). Also use to regenerate the file after a device
  swap, cert change, or when it's missing/stale. Never invents team id, bundle id, or UDID
  values — always derives or asks.
---

# Agent-device iOS physical-device setup

Objective: produce a personal `.secrets/agent-device-ios-setup.md` — same shape as the
one described below — filled with **this machine's / this user's** real values, never
with values copied from another developer's setup.

`.secrets/` is machine-specific and must never be committed. Do not put real team
ids/bundle ids/UDIDs anywhere except inside that file.

## Step 0 — read the docs bundle first

If `.agents/docs/agent-device-llms-fulll.txt` hasn't been read yet this session, read it
before running any agent-device command. It matches CLI **v0.21.12**; if
`agent-device --version` differs, trust `agent-device help <command>` over it. Don't guess
flags or subcommands (e.g. the exact iOS device-listing command); look them up.

## Step 1 — check for an existing file

Read `.secrets/agent-device-ios-setup.md` if present.

- **Exists:** show the user the current Team ID / bundle id / device name+UDID / app
  bundle id, and ask what changed (new machine, new cert, device swap, new target app,
  or "just verify it still works"). Only re-derive the fields that changed; keep the
  rest. Preserve any extra sections the user added below the templated content.
- **Missing:** run the full interview below.

## Step 2 — signing identity (team id)

1. `security find-identity -v -p codesigning` — list the user's "Apple Development"
   identities and ask which one to use (skip the question if there's exactly one).
2. Resolve the team id from the cert, not from `find-identity`'s output:
   ```bash
   security find-certificate -c "<chosen common name>" -p | openssl x509 -noout -subject
   # subject=UID=..., CN=<name> (<apple-id-user-id>), OU=<TEAM_ID>, O=<TEAM_NAME>, C=US
   ```
   - `OU=` is the team id.
   - The parenthetical after `CN=` is the Apple ID user id, **not** the team id — using
     it as team id fails with `No Account for Team "<that id>"`.
3. Confirm the matching Apple ID is signed in under Xcode > Settings > Accounts. If not,
   tell the user to sign in there before continuing (this skill doesn't drive Xcode UI).

## Step 3 — runner bundle id

Propose a default built from the local username (via `whoami`): `com.<username>.agentdevice.runner`; ask the
user to confirm or supply their own. Must be a unique reverse-DNS string — any value
works for a personal/free team, and for an org team too.

## Step 4 — one-time machine prereqs

```bash
DevToolsSecurity -status
```

If it doesn't report "Developer mode is currently enabled.", tell the user to run the
following themselves in a real Terminal/iTerm window — **not** the agent shell, since a
`sudo` password prompt can't be answered from here:

```bash
sudo DevToolsSecurity -enable
```

Then re-check status before moving on.

## Step 5 — device identity

1. Ask the user to connect and unlock/trust the physical device.
2. List connected iOS devices using the current `agent-device` command for that (check
   `agent-device help` output from Step 0 — don't guess the flag) to get the device's
   name and UDID.
3. If the device name contains non-ASCII punctuation (curly quotes, etc.), it may not
   match what gets typed in a shell — always reference the device by `--udid` in
   commands and in the generated file to avoid that mismatch, and note the exact name
   as-is for reference only.

## Step 6 — app under test

Ask the user for the name and bundle id of the app they actually want to test (distinct
from the throwaway XCTest runner bundle id from Step 3). If they're testing this
monorepo's flagship app and don't already know it, `apps/oe-app` is `Open English`,
bundle id `com.openenglish.learningplatform` — offer that as the likely default, but
confirm rather than assuming (this monorepo has ~28 apps).

## Step 7 — write the file

Fill this template with the values gathered above and write it to
`.secrets/agent-device-ios-setup.md` (create the `.secrets/` directory if missing):

````markdown
# agent-device on physical iOS device

Local-only, machine-specific setup. Don't commit (`.secrets/` is gitignored).

Read `.agents/docs/agent-device-llms-fulll.txt` (note: triple "l" in "fulll") before planning any
agent-device work — it's the full docs bundle and takes precedence over guessing flags/behavior.

## Working env vars

```bash
export AGENT_DEVICE_IOS_TEAM_ID=<TEAM_ID>
export AGENT_DEVICE_IOS_BUNDLE_ID=<RUNNER_BUNDLE_ID>
```

- Team ID `<TEAM_ID>` = <TEAM_NAME>. Pulled from cert's `OU` field, NOT the parenthetical in
  `security find-identity` output (that parenthetical is the Apple ID user id, e.g. `<APPLE_ID_USER_ID>` —
  using it as team id fails with `No Account for Team "<APPLE_ID_USER_ID>"`).
  Verify anytime with:
  ```bash
  security find-certificate -c "<CERT_COMMON_NAME>" -p | openssl x509 -noout -subject
  # subject=UID=..., CN=<CERT_COMMON_NAME> (<APPLE_ID_USER_ID>), OU=<TEAM_ID>, O=<TEAM_NAME>, C=US
  #                                                                     ^^^^^^^^^^ this is the team id
  ```
- Bundle id is arbitrary but must be unique reverse-DNS (personal/free-team requirement; also fine for org team).
- Xcode must have this Apple ID signed in under Xcode > Settings > Accounts.

## One-time machine prereqs (keep for reinstall/reset)

```bash
sudo DevToolsSecurity -enable      # requires real terminal (Terminal.app/iTerm), not agent shell
DevToolsSecurity -status           # verify: "Developer mode is currently enabled."
```

## Device identity

- Physical device: "<DEVICE_NAME>". If the name has non-ASCII punctuation (curly apostrophe, etc.),
  it may not match what's typed in a shell — always target by UDID to avoid the mismatch:
  `--udid <UDID>`
- App under test: <APP_NAME>, bundle id `<APP_BUNDLE_ID>`

## Gotchas

- The daemon is a long-lived background process. It only reads
  `AGENT_DEVICE_IOS_TEAM_ID`/`AGENT_DEVICE_IOS_BUNDLE_ID` from the env at the time it's spawned by a client
  command. If you already ran a command before exporting these vars, the daemon is stale — stop it
  and retry so the next client invocation spawns a fresh one with the vars set (don't `pkill` by an
  internal build path, and don't delete its state files: a live daemon keeps its device claims):
  ```bash
  agent-device daemon stop --clean   # verifies the daemon's identity; --clean removes its runner processes and leases
  ```
  Add `--state-dir <path>` when the daemon uses a non-default state dir (`agent-device session state-dir`
  prints the resolved one).
- First XCTest build-for-testing run against the physical device is slow, flagged by the tool itself as
  slow. Subsequent runs are faster once derived data is cached.

## Known-good flow

```bash
export AGENT_DEVICE_IOS_TEAM_ID=<TEAM_ID>
export AGENT_DEVICE_IOS_BUNDLE_ID=<RUNNER_BUNDLE_ID>
agent-device open <APP_BUNDLE_ID> --platform ios --udid <UDID>
agent-device snapshot -i --platform ios --udid <UDID>
```
````

## Step 8 — guard the secrets dir

Check root `.gitignore` for a `.secrets/` (or `.secrets`) entry. If absent, add
`.secrets/` to it and tell the user why (this file holds device/team identifiers that
must never be committed). Never `git add`/commit `.secrets/agent-device-ios-setup.md`
in this or any other task.

## Step 9 — confirm

Print the filled-in "Known-good flow" block back to the user so they can copy/paste it,
or offer to run it directly (`agent-device open ... && agent-device snapshot -i ...`) as
a smoke test using the `agent-device` skill.

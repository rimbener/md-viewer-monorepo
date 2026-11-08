---
name: dogfood
description: Systematically explore and test an app on iOS/Android or in a browser with agent-device to find bugs, UX issues, and other problems. Use when asked to dogfood, QA, exploratory test, find issues, bug hunt, or test this app on mobile or on web.
allowed-tools: Bash(agent-device:*), Bash(npx agent-device:*)
---

# Dogfood

Router for exploratory QA. Private setup before using this skill:

```bash
agent-device --version
```

If that fails, stop and tell the user to expose a trusted `agent-device` binary on PATH or approve an exact-version npm command. This skill intentionally keeps allowed tools restricted to `agent-device` and `npx agent-device`.

Require `agent-device >= 0.14.0`; older CLIs lack these help topics. If older, stop and tell the user to upgrade the trusted install or approve an exact-version npm command. Do not run `npm install -g agent-device@latest` or `npx -y agent-device@latest` autonomously, and do not include version/upgrade commands in final plans.

Read current CLI guidance:

```bash
agent-device help dogfood
```

Loop: open app -> snapshot -i + screenshot -> explore flows -> capture evidence per issue -> close.

Target app is required; infer platform or ask. Findings must come from runtime behavior, not source reads. Let `help dogfood` provide exact report shape, evidence commands, and current workflow guidance.

## Web

A web app is the same loop on `--platform web`, which `agent-device` drives through its managed browser backend. That backend is set up from a terminal, once per state directory, and needs Node 24+:

```bash
agent-device web setup
agent-device web doctor
```

Read `agent-device help web` for the current command shapes before driving a browser; the commands below are the loop, not the manual.

```bash
agent-device open "<url>" --platform web
agent-device snapshot -i --platform web
agent-device click @e12 --platform web
```

The app has to be served before it is opened: start the dev server first, in the background, and open the URL it prints — query parameters included. `web doctor` unhealthy, or setup never run, is a stop, not a workaround: report it and let the caller fix the backend.

Web differs from a device in what evidence it can give you — the backend exposes headers but no request or response bodies, and audio probes sample HTML media elements only. Everything else — explore the changed flows first, the screens beside them next, one evidence file per issue — is unchanged.

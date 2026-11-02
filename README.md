# ⚡ VibeCord

> **A production-grade, local-first MCP server and command-line engine that gives AI coding harnesses (Antigravity, Claude Code, Codex, Hermes, OpenClaw, Cursor, Windsurf) comprehensive Discord control capabilities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-blue.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%20Stdio-lime.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-31%2F31%20Passing-brightgreen.svg)](https://vitest.dev/)

---

## Product Vision

AI coding harnesses excel at writing code, but modern development workflows and communities live in Discord. **VibeCord (`vibecord`)** bridges this gap: a single, local-first engine providing both an interactive terminal CLI and a standard Model Context Protocol (MCP) server.

One installation. One interactive setup. Zero hosted SaaS dependencies.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AI CODING HARNESSES                                   │
│  [Antigravity]  [Claude Code]  [Codex CLI]  [Hermes]  [OpenClaw]  [Cursor] ... │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ JSON-RPC (stdio) / CLI
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL DISCORD BRIDGE ENGINE                              │
│                                                                                 │
│   ┌──────────────────────────┐                  ┌───────────────────────────┐   │
│   │   Terminal UX & CLI      │                  │   MCP Stdio Protocol      │   │
│   │  (setup, doctor, status) │                  │  (45 Universal Tools)     │   │
│   └────────────┬─────────────┘                  └─────────────┬─────────────┘   │
│                │                                              │                 │
│                ▼                                              ▼                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                      Core Engine & Safety Guard                         │   │
│   │  • Permission Verification      • Secret Redaction & 0600 Storage       │   │
│   │  • Rate-Limit Exponential Backoff • Read-Only Mode Switch               │   │
│   │  • Declarative Server Blueprints • Destructive Action Confirmations     │   │
│   └────────────────────────────────────┬────────────────────────────────────┘   │
│                                        │                                        │
│                                        ▼                                        │
│                        Discord API v10 (REST & Gateway)                         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS / WSS
                                         ▼
                                   DISCORD CLOUD
```

---

## Key Features

- **⚡ Universal Harness Compatibility**: Direct adapters for Google DeepMind **Antigravity**, Anthropic **Claude Code**, OpenAI **Codex**, **Hermes**, **OpenClaw**, **Cursor**, and **Claude Desktop**.
- **🛡️ 100% Local-First & Secure**: Zero telemetry, zero external servers. Tokens stored exclusively in local config files with POSIX mode `0600` (directory `0700`). Automatic masking for all token diagnostics (`MTE4...3XYZ`).
- **🎛️ 45 Production Tools**: Complete coverage across Servers, Channels, Categories, Roles, Permission Overwrites, Messages, Rich Embeds, Link Buttons, Threads, Forum Posts, Webhooks, Moderation (Timeout, Kick, Ban), and Audit Logs.
- **🏗️ Declarative Server Operations**: Built-in architecture blueprints (`developer_community`, `saas_support`, `gaming_guild`, `minimal`). Audit servers for security misconfigurations, preview diffs before mutation, apply with topological dependency ordering, and verify compliance against drift.
- **🎨 Elite Terminal UX**: Aesthetic near-black surfaces with restrained lime-green accents (`#a3e635`), Unicode tables, real-time diagnostic doctor, and full `--json` non-interactive headless support.
- **🛡️ Rate-Limit & Failure Resilience**: Automatic retry handling for HTTP 429 rate limit buckets with jitter and exponential backoff.

---

## Quick Start (60 Seconds)

### 1. Installation

Install globally via npm:

```bash
npm install -g vibecord
```

Or run directly from source:

```bash
git clone https://github.com/ItzPhantomm/VibeCord.git
cd vibecord
npm install
npm run build
npm link
```

### 2. Setup Bot & Credentials

Launch the interactive configuration wizard:

```bash
vibecord setup
```

The wizard will:
1. Guide you through creating a bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Validate your bot token against the live Discord API.
3. Generate minimal or administrative OAuth2 invite URLs for your server.
4. Auto-detect installed AI coding harnesses and register the MCP server.

**Non-Interactive / Headless Setup:**
```bash
vibecord setup --non-interactive --token "YOUR_DISCORD_BOT_TOKEN" --guild-id "123456789012345678" --harness antigravity
```

### 3. Verify Health with Doctor

Run diagnostics to verify runtime, token validity, permissions, network latency, and harness readiness:

```bash
vibecord doctor
```

Output:
```
 ⚡ DISCORD BRIDGE v1.0.0
 Universal Discord control layer for AI coding harnesses
 ────────────────────────────────────────────────────────────

 System Health Diagnostics & Verification

┌────────────┬──────────────────────────┬────────┬──────────────────────────────────────────────────────────────────────┐
│ Category   │ Check                    │ Status │ Details                                                              │
├────────────┼──────────────────────────┼────────┼──────────────────────────────────────────────────────────────────────┤
│ Runtime    │ Node.js Version          │ ✔ PASS │ v22.23.1 (Supported, >= v18)                                         │
│ Config     │ Config File              │ ✔ PASS │ /root/.config/vibecord/config.json                              │
│ Config     │ File Permissions         │ ✔ PASS │ 0600 (Owner-only read/write)                                         │
│ Discord API│ Authentication           │ ✔ PASS │ Authenticated as MyBot#0001 (ID: 1234567890)                         │
│ Discord API│ REST Latency             │ ✔ PASS │ 64ms roundtrip                                                       │
│ Discord API│ Guild Access             │ ✔ PASS │ Member of 2 server(s)                                                │
│ AI Harness │ Antigravity / Gemini CLI │ ✔ PASS │ Detected and registered in /root/.gemini/antigravity-cli/mcp/discord │
│ AI Harness │ Claude Code              │ ✔ PASS │ Detected and registered in /root/.claude.json                        │
└────────────┴──────────────────────────┴────────┴──────────────────────────────────────────────────────────────────────┘

   ALL CHECKS PASSED   Discord Bridge is healthy and fully operational.
```

---

## AI Harness Integration

VibeCord automatically detects and integrates with your AI coding agents:

### 1. Antigravity / Gemini CLI
Automatically generates tool JSON schemas and guidance into `~/.gemini/antigravity-cli/mcp/discord/`:
```bash
vibecord connect --harness antigravity
```

### 2. Claude Code
Automatically updates `~/.claude.json`:
```bash
vibecord connect --harness claude-code
```

### 3. Codex CLI
Automatically updates `~/.codex/config.json`:
```bash
vibecord connect --harness codex
```

### 4. Cursor / Windsurf / Claude Desktop
View copy-paste JSON configurations for manual setup:
```bash
vibecord connect --manual
```

---

## Declarative Server Blueprints & Operations

Manage entire Discord server configurations using declarative JSON templates.

### 1. Design a Server Blueprint
Generate production-ready architectures (`developer_community`, `saas_support`, `gaming_guild`, `minimal`):
```bash
vibecord plan design --template developer_community --out blueprint.json
```

### 2. Audit Security Posture
Scan for dangerous `@everyone` permissions, excessive administrator roles, and missing verification:
```bash
vibecord plan audit --guild-id <SERVER_ID>
```

### 3. Preview Proposed Changes
Compare your desired blueprint against live server state before applying:
```bash
vibecord plan preview blueprint.json --guild-id <SERVER_ID>
```

### 4. Apply Blueprint Safely
Executes mutations in topological order (Roles → Categories → Channels → Permissions) with rate-limit protection:
```bash
vibecord plan apply blueprint.json --guild-id <SERVER_ID> --yes
```

### 5. Verify & Detect Drift
Confirm 100% compliance between live server state and your version-controlled blueprint:
```bash
vibecord plan verify blueprint.json --guild-id <SERVER_ID>
```

### 6. Export Live Server Backup
Export current live server architecture into reusable JSON:
```bash
vibecord plan backup --guild-id <SERVER_ID> --out server-backup.json
```

---

## Tool Reference Catalog (45 Tools)

| Tool Name | Category | Safe / Destructive | Required Permissions | Purpose |
|---|---|---|---|---|
| `discord_list_servers` | `server` | ✔ Safe | None | List all servers the bot has access to |
| `discord_get_server` | `server` | ✔ Safe | None | Get server settings, verification level, counts |
| `discord_modify_server` | `server` | ✔ Safe | `MANAGE_GUILD` | Modify server name, description, AFK settings |
| `discord_list_channels` | `channels` | ✔ Safe | `VIEW_CHANNEL` | List channels grouped by category |
| `discord_get_channel` | `channels` | ✔ Safe | `VIEW_CHANNEL` | Retrieve channel details, slowmode, topic |
| `discord_create_channel` | `channels` | ✔ Safe | `MANAGE_CHANNELS` | Create text, voice, announcement, or forum channel |
| `discord_modify_channel` | `channels` | ✔ Safe | `MANAGE_CHANNELS` | Update channel name, topic, slowmode, category |
| `discord_delete_channel` | `channels` | ✖ Destructive | `MANAGE_CHANNELS` | Permanently delete channel (`confirm: true` required) |
| `discord_list_roles` | `roles` | ✔ Safe | `MANAGE_ROLES` | List roles ordered by hierarchy |
| `discord_get_role` | `roles` | ✔ Safe | `MANAGE_ROLES` | Detailed role info with human-readable permissions |
| `discord_create_role` | `roles` | ✔ Safe | `MANAGE_ROLES` | Create role with color, hoist, and permissions |
| `discord_modify_role` | `roles` | ✔ Safe | `MANAGE_ROLES` | Edit role properties and permissions |
| `discord_delete_role` | `roles` | ✖ Destructive | `MANAGE_ROLES` | Permanently delete role (`confirm: true` required) |
| `discord_set_channel_permission` | `roles` | ✔ Safe | `MANAGE_ROLES`, `MANAGE_CHANNELS` | Set role/member permission overwrite on channel |
| `discord_remove_channel_permission`| `roles` | ✔ Safe | `MANAGE_ROLES`, `MANAGE_CHANNELS` | Delete channel permission overwrite |
| `discord_assign_role` | `roles` | ✔ Safe | `MANAGE_ROLES` | Assign role to server member |
| `discord_remove_role` | `roles` | ✔ Safe | `MANAGE_ROLES` | Remove role from server member |
| `discord_send_message` | `messages` | ✔ Safe | `SEND_MESSAGES` | Send message with text, rich embeds, or buttons |
| `discord_get_message` | `messages` | ✔ Safe | `READ_MESSAGE_HISTORY` | Fetch message by ID |
| `discord_list_messages` | `messages` | ✔ Safe | `READ_MESSAGE_HISTORY` | Paginate channel message history |
| `discord_edit_message` | `messages` | ✔ Safe | `SEND_MESSAGES` | Edit bot's message content or embed |
| `discord_delete_message` | `messages` | ✖ Destructive | `MANAGE_MESSAGES` | Delete a message |
| `discord_pin_message` | `messages` | ✔ Safe | `MANAGE_MESSAGES` | Pin message to channel |
| `discord_unpin_message` | `messages` | ✔ Safe | `MANAGE_MESSAGES` | Unpin message from channel |
| `discord_add_reaction` | `messages` | ✔ Safe | `ADD_REACTIONS` | Add emoji reaction |
| `discord_remove_reaction` | `messages` | ✔ Safe | `MANAGE_MESSAGES` | Remove emoji reaction |
| `discord_create_thread` | `threads` | ✔ Safe | `CREATE_PUBLIC_THREADS` | Create public or private thread |
| `discord_list_threads` | `threads` | ✔ Safe | `READ_MESSAGE_HISTORY` | List active threads in server |
| `discord_create_forum_post` | `threads` | ✔ Safe | `CREATE_PUBLIC_THREADS` | Create forum post with starter message |
| `discord_list_webhooks` | `webhooks` | ✔ Safe | `MANAGE_WEBHOOKS` | List webhooks in channel or server |
| `discord_create_webhook` | `webhooks` | ✔ Safe | `MANAGE_WEBHOOKS` | Create incoming webhook |
| `discord_execute_webhook` | `webhooks` | ✔ Safe | None | Post via webhook URL or token |
| `discord_delete_webhook` | `webhooks` | ✖ Destructive | `MANAGE_WEBHOOKS` | Delete webhook |
| `discord_timeout_member` | `moderation` | ✔ Safe | `MODERATE_MEMBERS` | Temporary mute member |
| `discord_kick_member` | `moderation` | ✖ Destructive | `KICK_MEMBERS` | Kick member (`confirm: true` required) |
| `discord_ban_member` | `moderation` | ✖ Destructive | `BAN_MEMBERS` | Ban member (`confirm: true` required) |
| `discord_unban_member` | `moderation` | ✔ Safe | `BAN_MEMBERS` | Remove ban |
| `discord_get_audit_logs` | `moderation` | ✔ Safe | `VIEW_AUDIT_LOG` | Fetch audit logs with action filters |
| `discord_list_members` | `moderation` | ✔ Safe | None | List members with roles and joined dates |
| `discord_design_server` | `operations` | ✔ Safe | None | Generate declarative server blueprint |
| `discord_audit_server` | `operations` | ✔ Safe | `VIEW_AUDIT_LOG`, `MANAGE_ROLES` | Security audit and recommendations |
| `discord_preview_server_plan` | `operations` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Diff desired blueprint against live state |
| `discord_apply_server_plan` | `operations` | ✔ Safe | `MANAGE_CHANNELS`, `MANAGE_ROLES` | Apply blueprint with rate-limit safety |
| `discord_backup_server` | `operations` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Export live server architecture to JSON |
| `discord_verify_changes` | `operations` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Detect configuration drift against blueprint |

---

## Security Model & Guidelines

1. **Local-First Secret Storage**:
   Credentials reside strictly in `~/.config/vibecord/config.json`. The configuration engine enforces POSIX mode `0600` on the file and `0700` on the parent directory.
2. **Zero Log Leakage**:
   All diagnostic outputs, CLI errors, and log entries mask bot tokens (`MTE4...3XYZ`).
3. **Read-Only Safety Switch**:
   Want to let AI agents inspect servers without risking mutations? Set `"readOnly": true` in `config.json` or pass `--read-only` during setup. All write endpoints immediately reject with `OPERATION_ABORTED`.
4. **Explicit Confirmations**:
   Destructive operations (`delete_channel`, `delete_role`, `kick_member`, `ban_member`, `apply_server_plan`) enforce explicit confirmation parameters (`confirm: true`) to prevent accidental AI agent catastrophes.

---

## Testing & Quality Assurance

VibeCord includes a comprehensive Vitest test suite with realistic mocks. No live credentials or network access are required for test runs:

```bash
npm test
```

Test coverage includes:
- Security permissions & 0600 file protection
- Token redaction and deep object masking
- Discord permission bitfield calculation & preset resolution
- REST rate-limiting retries with exponential backoff
- Tool registry parameter validation & destructive confirmation guards
- Declarative blueprint generation, diffing, and drift detection
- AI harness adapter configurations and schema generation

---

## License

MIT License. VibeCord is free and open-source software.

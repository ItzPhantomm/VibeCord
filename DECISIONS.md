# DECISIONS.md — VibeCord Architecture & Record

## Product Overview
VibeCord (`vibecord`) is a production-quality, local-first bridge that provides AI coding harnesses (Antigravity, Claude Code, Codex, Hermes, OpenClaw, Cursor, Windsurf, and any standard MCP client) with rich, typed, reliable Discord inspection, automation, and server management capabilities.

---

## 1. Architectural Decisions (ADRs)

### ADR-001: Runtime & Language Selection
- **Decision**: Node.js 22+ with TypeScript (strict mode, target ES2022, ESM).
- **Alternatives Considered**:
  - *Python / FastAPI / discord.py*: Good bot ecosystem, but requires Python virtualenv setup for MCP servers which complicates zero-friction global installation for developer harnesses (`npm install -g vibecord`).
  - *Rust / serenity*: Fast and lightweight, but slower iteration for rapid tool composition, larger binary footprint, and less direct parity with the official TypeScript MCP reference SDK.
- **Rationale**: Node.js is universally installed in developer environments running AI coding agents. `discord.js` v14 provides the gold-standard TypeScript definitions, REST rate limiting queues, Gateway intent handling, and permission calculation. `@modelcontextprotocol/sdk` is the official reference implementation.

### ADR-002: Dual Interface Pattern (MCP Server + Rich CLI)
- **Decision**: Architect the core as a pure decoupled engine (`DiscordClientWrapper` + `ToolRegistry`). Expose it through two distinct presentation layers:
  1. **MCP Interface (`vibecord serve` / `mcp`)**: Standard Model Context Protocol server communicating via stdio JSON-RPC. Completely isolates stdout for protocol frames; all diagnostics, operational logs, and rate limit notices are redirected to stderr or rotating file logs.
  2. **CLI Interface (`vibecord setup|doctor|connect|status|tools|plan|exec`)**: Human-first CLI with interactive setup wizards, system health diagnostics, harness auto-detection and configuration, plan generation, and direct tool execution.
- **Rationale**: Agents need standardized MCP tool calling; human operators need verification, troubleshooting (`doctor`), credential setup, and inspection without launching a harness.

### ADR-003: Terminal UX & Styling Specification
- **Decision**: Tailored high-end terminal theme featuring near-black surfaces, restrained lime-green accents (`#a3e635` / ANSI lime), crisp typography, clean Unicode box-drawing tables, and accessible non-interactive fallbacks.
- **Details**:
  - Primary Accent: Lime Green (`chalk.hex('#a3e635')` / `pc.green` / ANSI green/bold).
  - Dim/Surface: Slate gray (`pc.dim` / `#64748b`).
  - Alerts: Amber for warnings, Coral/Crimson for errors, Cyan for IDs and links.
  - Zero-color support: Respects `NO_COLOR`, `TERM=dumb`, and non-TTY environments.
  - Headless/Scriptable: Full `--non-interactive`, `--json`, and environment variable support (`DISCORD_TOKEN`, `DISCORD_GUILD_ID`).

### ADR-004: Security & Local-First Principles
- **Decision**: Absolute zero cloud dependency, zero telemetry, local secret storage with restricted POSIX permissions.
- **Details**:
  - Configuration path: `$XDG_CONFIG_HOME/vibecord/config.json` (fallback `~/.config/vibecord/config.json`).
  - File permissions: Explicitly enforced `0600` (read/write only by file owner); directory permissions `0700`.
  - Token Redaction: All logging, error reporting, `doctor` outputs, and CLI diagnostics mask tokens (showing only first 6 and last 4 characters, e.g. `MTE4...3XYZ`).
  - Separation of Concerns: Read-only operations vs Destructive operations. High-impact operations (channel deletion, role deletion, bans, bulk updates) require explicit confirmation (`confirm: true` or `-y/--yes`).
  - Least-privilege guidance: Built-in OAuth2 URL generator calculates minimal necessary permissions bitfields.

### ADR-005: Resilient Server Operations & Discord Limits
- **Decision**: Declarative plan engine (`design_server`, `preview_changes`, `apply_server_plan`, `verify_changes`, `backup_server`) with dependency-ordered execution and built-in rate limit handling.
- **Details**:
  - Discord enforces strict rate limits (typically 50 requests/sec globally, with tight per-route buckets such as channel modifications).
  - The plan engine orders operations topologically:
    1. Roles creation/update (lowest to highest hierarchy)
    2. Category channels
    3. Channels (assigned to parent categories)
    4. Permission overwrites (referencing established role IDs and channel IDs)
    5. Initial messages / announcements
  - Dry-run / preview capability generates diffs before mutations.
  - Verification pass queries live Discord API post-execution to confirm actual state matches target intent.

### ADR-006: Multi-Harness Configuration Adapters
- **Decision**: Modular configuration adapters with automatic detection and safe writing for:
  - Antigravity / Gemini CLI (`~/.gemini/antigravity-cli/mcp/discord/`)
  - Claude Code (`~/.claude.json`)
  - Codex (`~/.codex/config.json`)
  - Hermes (`~/.hermes/config.json`)
  - OpenClaw (`~/.openclaw/config.json`)
  - Cursor (`~/.cursor/mcp.json`)
  - Claude Desktop (`claude_desktop_config.json`)
- **Fallback**: Interactive display of copy-paste JSON configuration when automatic writing is not supported or declined (`vibecord connect --manual`).

---

## 2. Implemented Features & Tool Catalog (45 Tools)

| Category | Tool Name | Mode | Required Permissions | Description |
|---|---|---|---|---|
| **Server** | `discord_list_servers` | ✔ Safe | None | List all Discord servers the bot has access to |
| **Server** | `discord_get_server` | ✔ Safe | None | Retrieve detailed configuration and statistics |
| **Server** | `discord_modify_server` | ✔ Safe | `MANAGE_GUILD` | Modify server name, description, verification level |
| **Channels** | `discord_list_channels` | ✔ Safe | `VIEW_CHANNEL` | List all channels organized by parent category |
| **Channels** | `discord_get_channel` | ✔ Safe | `VIEW_CHANNEL` | Retrieve detailed properties, topic, slowmode |
| **Channels** | `discord_create_channel` | ✔ Safe | `MANAGE_CHANNELS` | Create text, voice, category, announcement, forum channel |
| **Channels** | `discord_modify_channel` | ✔ Safe | `MANAGE_CHANNELS` | Update channel name, topic, slowmode, category |
| **Channels** | `discord_delete_channel` | ✖ Destructive | `MANAGE_CHANNELS` | Permanently delete channel (`confirm: true` required) |
| **Roles** | `discord_list_roles` | ✔ Safe | `MANAGE_ROLES` | List all roles ordered by position hierarchy |
| **Roles** | `discord_get_role` | ✔ Safe | `MANAGE_ROLES` | Get role permissions breakdown |
| **Roles** | `discord_create_role` | ✔ Safe | `MANAGE_ROLES` | Create role with color, hoist, mentionable |
| **Roles** | `discord_modify_role` | ✔ Safe | `MANAGE_ROLES` | Edit role properties and permissions |
| **Roles** | `discord_delete_role` | ✖ Destructive | `MANAGE_ROLES` | Delete role (`confirm: true` required) |
| **Roles** | `discord_set_channel_permission` | ✔ Safe | `MANAGE_ROLES`, `MANAGE_CHANNELS` | Set explicit permission overwrite for role/member |
| **Roles** | `discord_remove_channel_permission` | ✔ Safe | `MANAGE_ROLES`, `MANAGE_CHANNELS` | Remove permission overwrite |
| **Roles** | `discord_assign_role` | ✔ Safe | `MANAGE_ROLES` | Assign role to server member |
| **Roles** | `discord_remove_role` | ✔ Safe | `MANAGE_ROLES` | Remove role from server member |
| **Messages** | `discord_send_message` | ✔ Safe | `SEND_MESSAGES` | Send message with text, rich embed, or link buttons |
| **Messages** | `discord_get_message` | ✔ Safe | `READ_MESSAGE_HISTORY` | Fetch message by ID |
| **Messages** | `discord_list_messages` | ✔ Safe | `READ_MESSAGE_HISTORY` | Read channel messages with pagination |
| **Messages** | `discord_edit_message` | ✔ Safe | `SEND_MESSAGES` | Edit bot's message content or embed |
| **Messages** | `discord_delete_message` | ✖ Destructive | `MANAGE_MESSAGES` | Delete a message |
| **Messages** | `discord_pin_message` | ✔ Safe | `MANAGE_MESSAGES` | Pin message to channel |
| **Messages** | `discord_unpin_message` | ✔ Safe | `MANAGE_MESSAGES` | Unpin message from channel |
| **Messages** | `discord_add_reaction` | ✔ Safe | `ADD_REACTIONS` | Add emoji reaction |
| **Messages** | `discord_remove_reaction` | ✔ Safe | `MANAGE_MESSAGES` | Remove emoji reaction |
| **Threads** | `discord_create_thread` | ✔ Safe | `CREATE_PUBLIC_THREADS` | Create public/private thread |
| **Threads** | `discord_list_threads` | ✔ Safe | `READ_MESSAGE_HISTORY` | List active server threads |
| **Threads** | `discord_create_forum_post` | ✔ Safe | `CREATE_PUBLIC_THREADS` | Create forum post with title & starter content |
| **Webhooks** | `discord_list_webhooks` | ✔ Safe | `MANAGE_WEBHOOKS` | List webhooks in channel or server |
| **Webhooks** | `discord_create_webhook` | ✔ Safe | `MANAGE_WEBHOOKS` | Create new incoming webhook |
| **Webhooks** | `discord_execute_webhook` | ✔ Safe | None | Post message/embed via webhook |
| **Webhooks** | `discord_delete_webhook` | ✖ Destructive | `MANAGE_WEBHOOKS` | Delete webhook |
| **Moderation**| `discord_timeout_member` | ✔ Safe | `MODERATE_MEMBERS` | Temporary mute member |
| **Moderation**| `discord_kick_member` | ✖ Destructive | `KICK_MEMBERS` | Kick member (`confirm: true` required) |
| **Moderation**| `discord_ban_member` | ✖ Destructive | `BAN_MEMBERS` | Ban member (`confirm: true` required) |
| **Moderation**| `discord_unban_member` | ✔ Safe | `BAN_MEMBERS` | Unban member |
| **Moderation**| `discord_get_audit_logs` | ✔ Safe | `VIEW_AUDIT_LOG` | Fetch audit logs with action filters |
| **Moderation**| `discord_list_members` | ✔ Safe | None | List members with roles and joined date |
| **Operations**| `discord_design_server` | ✔ Safe | None | Generate declarative server blueprint |
| **Operations**| `discord_audit_server` | ✔ Safe | `VIEW_AUDIT_LOG`, `MANAGE_ROLES` | Security audit and scoring (0-100) |
| **Operations**| `discord_preview_server_plan` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Diff desired blueprint against live state |
| **Operations**| `discord_apply_server_plan` | ✔ Safe | `MANAGE_CHANNELS`, `MANAGE_ROLES` | Apply blueprint with rate-limit safety |
| **Operations**| `discord_backup_server` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Export live server architecture to JSON |
| **Operations**| `discord_verify_changes` | ✔ Safe | `VIEW_CHANNEL`, `MANAGE_ROLES` | Detect configuration drift against blueprint |

---

## 3. Harness Compatibility Status

| Harness | Auto-Detection | Auto-Config Path | Status |
|---|---|---|---|
| **Antigravity / Gemini CLI** | `~/.gemini/antigravity-cli/` | `~/.gemini/antigravity-cli/mcp/discord/` | Verified & Live |
| **Claude Code** | `~/.claude.json` / `~/.claude` | `~/.claude.json` | Verified |
| **Codex CLI** | `~/.codex/` | `~/.codex/config.json` | Verified |
| **Hermes Agent** | `~/.hermes/` | `~/.hermes/config.json` | Verified |
| **OpenClaw** | `~/.openclaw/` | `~/.openclaw/config.json` | Verified |
| **Cursor IDE** | `~/.cursor/` | `~/.cursor/mcp.json` | Verified |
| **Claude Desktop** | `Claude/claude_desktop_config.json` | Platform-specific appdata | Verified |

---

## 4. Test Verification Results

All 31 automated tests passed successfully with zero network dependencies:

```
 Test Files  7 passed (7)
      Tests  31 passed (31)
   Duration  12.98s
```

Detailed test breakdown:
- `tests/permissions.test.ts`: 5 tests passing (combining bitfields, hasPermission, admin overrides, explainPermissions, OAuth2 URLs).
- `tests/config.test.ts`: 4 tests passing (token redaction, deep object masking, 0600 file permissions, env var overrides).
- `tests/harnesses.test.ts`: 4 tests passing (all 7 adapters, Claude Code write/uninstall, Antigravity tool schema generation, manual snippets).
- `tests/operations-plan.test.ts`: 4 tests passing (designServer templates, auditServer security rules & scoring, previewServerPlan diffing, verifyChanges drift detection).
- `tests/mcp-server.test.ts`: 2 tests passing (McpServer instantiation, tool enumeration, resource templates).
- `tests/tools.test.ts`: 8 tests passing (45 tool enumeration, unknown tool NOT_FOUND, Zod parameter validation, destructive confirmation guard, listServers, createChannel, sendMessage, timeoutMember).
- `tests/discord-client.test.ts`: 4 tests passing (read-only mode mutation guard, HTTP 429 retry backoff, 401 AUTH_ERROR translation, 403 MISSING_PERMISSIONS translation).

---

## 5. Known Limitations & Next Priorities

### Limitations
1. **Discord API Constraints**:
   - A Discord bot cannot modify the server owner or assign roles higher than the bot's own highest role in the role hierarchy.
   - Channel creation in Discord is subject to per-guild limits (max 500 channels total).
   - Discord enforces rate limits on audit logs and bulk channel deletions.

### Next Priorities
- [ ] Add slash command (`/command`) definition synchronization tool.
- [ ] Add automatic voice channel activity recording / transcribing hooks.
- [ ] Provide webhooks ingest gateway for receiving incoming Discord interactions without opening inbound public ports.

---

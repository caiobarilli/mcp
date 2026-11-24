# caio-mcp

> **Language:** English | [Português (pt-BR)](./README.pt-BR.md)

Public, stateless, read-only **Model Context Protocol (MCP)** server for [Caio Barilli's portfolio](https://caiobarilli.github.io/en/), running on **Cloudflare Workers**.

Built with **TypeScript (strict)**, the official **MCP Server SDK v2 (`@modelcontextprotocol/server`)**, and the **Cloudflare Agents SDK (`agents/mcp/server`)** over **Streamable HTTP**.

---

## Why TypeScript + Cloudflare Workers for a Senior PHP/Laravel Engineer?

Caio Barilli's primary stack is **PHP / Laravel**, **DevOps / IaC (Docker, Terraform, AWS)**, and **agentic engineering workflows** (10+ years of experience). This repository uses **Cloudflare Workers + TypeScript** intentionally: a public, zero-cost, stateless edge endpoint with official MCP Streamable HTTP SDK support, zero database, zero external fetches, and strict compile-time + runtime validation.

---

## Quick Connect (< 60 seconds)

Replace `<ENDPOINT_URL>` with your deployed Worker URL (e.g. `https://caio-mcp.<subdomain>.workers.dev/mcp`).

### Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "caio-barilli": {
      "url": "<ENDPOINT_URL>"
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add --transport http caio-barilli <ENDPOINT_URL>
```

### Claude Desktop / Hermes

Add a remote **Streamable HTTP** MCP server pointing to `<ENDPOINT_URL>` (no authentication required, `POST` JSON-RPC).

### Independent Smoke Test (`curl`)

```bash
curl -sS -X POST "<ENDPOINT_URL>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Tools & Prompts

All 6 tools are **read-only** (`readOnlyHint: true`, `openWorldHint: false`), accept `lang?: "en" | "pt-br"` (default `"en"`), validate inputs with **Zod `.strict()`** and closed enums, and return `{ meta, data }` within a 16 KB response budget.

| Tool             | Parameters                                                               | Purpose                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_profile`    | `lang?`, `include_story?`                                                | Identity, 30s summary, timezone (`UTC-3`), focus, availability, public links (portfolio, contact page, GitHub, LinkedIn, Medium).               |
| `get_experience` | `lang?`, `section?` (`all\|primary\|earlier\|education\|certifications`) | Career history (KeepCloud `2024–2026`, AgroNegociar `2022–2025`, 9 earlier roles incl. 3 Tech Lead positions), FIAP MBA, Senac, certifications. |
| `list_projects`  | `lang?`, `category?`, `status?`, `tier?`, `tech?`                        | Lists all 10 portfolio projects with `tier` (`flagship` vs `archive`) and `status` (`active`, `paused`, `completed`).                           |
| `get_project`    | `slug` (closed enum of 10 slugs), `lang?`                                | Structured case study: problem, solution, ownership scope, metrics, highlights, ADRs, stack and links.                                          |
| `get_stack`      | `lang?`, `domain?`, `focus?` (`primary\|secondary`)                      | Technology matrix separating primary production stack from earlier/study stack, linked to `project_slugs`.                                      |
| `get_articles`   | `lang?`, `limit?` (`1..3`)                                               | Selected Medium articles with `published_at` ISO date and explicit `original_language: "pt-br"`.                                                |

### Native MCP Prompts

- **`recruiter_brief`** (`lang?`, `role_focus?`): 30-second recruiting brief grounded strictly in tool outputs.
- **`architecture_deep_dive`** (`project_slug`, `lang?`): senior interview deep dive covering ADRs, ownership boundaries, and trade-offs.

### Example Prompts to Try

1. _"Give me a 30-second summary of Caio Barilli's profile for a Senior PHP/Laravel + DevOps role and share his public links."_
2. _"Where has Caio acted as a Tech Lead, and what did he build at KeepCloud?"_
3. _"List Caio's flagship projects using Laravel or Terraform and tell me which ones are active vs. paused."_
4. _"Walk me through the architecture decisions (ADRs) and ownership scope on Keeptask and PHParrot."_
5. _"What is Caio's primary production stack today versus technologies from earlier JS/TS projects?"_

---

## Security & Privacy Boundary

- **Stateless & zero external fetch:** all portfolio data is bundled from versioned `data/*.json` files; `globalThis.fetch` is never called (enforced by tests).
- **HTTP hardening:** `POST` only (`405` + `Allow: POST`), rejects `Origin: null` and unauthorized cross-site origins (`403`), requires `application/json` (`415`), enforces a 16 KB request body limit (`413`), rejects JSON-RPC batches (`400`), and never leaks stack traces.
- **Minimal structured logging:** logs only `{ tool, status, durationMs, errorCode }` — never headers, cookies, IPs, or raw request bodies.
- **Privacy boundary ("NUNCA ENTRA"):** automated security tests block personal email, CV PDFs, phone numbers, residential address, salary, credentials, unpublished roles, `A CONFIRMAR` markers, and prompt injection patterns across both `data/*.json` and all tool outputs.

---

## Local Development & Testing

```bash
npm ci
npm run types:check
npm run typecheck
npm run lint
npm run format:check
npm test          # Runs unit, integration & security suites inside Cloudflare workerd
npm run dry-run   # Validates Worker bundle without deploying
npm run dev       # Local dev server via Wrangler
```

### Syncing Data with `caiobarilli.github.io`

1. Update the source of truth at `https://caiobarilli.github.io` first.
2. Mirror approved public changes into `data/*.json` (keeping `en` and `pt-br` in sync) and update `data/meta.json` (`data_version`, `last_verified_at`).
3. Run `npm test` to verify Zod schemas, bilingual parity, 16 KB response budgets, and the blocklist.

---

## Licensing

- **Source code:** [MIT License](./LICENSE).
- **Biographical & portfolio data (`data/`):** **All Rights Reserved** — see [`data/LICENSE`](./data/LICENSE).

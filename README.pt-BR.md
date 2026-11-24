# mcp

> **Idioma:** [English](./README.md) | Português (pt-BR)

Servidor **Model Context Protocol (MCP)** público, stateless e somente leitura para o [portfólio de Caio Barilli](https://caiobarilli.github.io/pt-br/), rodando em **Cloudflare Workers**.

Construído com **TypeScript (strict)**, o **SDK oficial MCP v2 (`@modelcontextprotocol/server`)** e o **Cloudflare Agents SDK (`agents/mcp/server`)** via **Streamable HTTP**.

---

## Por que TypeScript + Cloudflare Workers para um dev PHP/Laravel sênior?

O foco principal do Caio Barilli é **PHP / Laravel**, **DevOps / IaC (Docker, Terraform, AWS)** e **fluxos de engenharia com agentes** (10+ anos de experiência). A escolha de **Cloudflare Workers + TypeScript** aqui é intencional: um endpoint público de borda, stateless e gratuito, usando o SDK oficial MCP Streamable HTTP, sem banco de dados, sem `fetch` externo e com validação estrita em compilação e runtime.

---

## Conexão Rápida (< 60 segundos)

Substitua `<ENDPOINT_URL>` pela URL do Worker publicado (destino planejado: `https://mcp.caiobarilli.workers.dev/mcp`).

### Cursor (`~/.cursor/mcp.json` ou `.cursor/mcp.json`)

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

Adicione um servidor MCP remoto **Streamable HTTP** apontando para `<ENDPOINT_URL>` (sem autenticação, `POST` JSON-RPC).

### Smoke Test Independente (`curl`)

```bash
curl -sS -X POST "<ENDPOINT_URL>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Ferramentas e Prompts

Todas as 6 ferramentas são **somente leitura** (`readOnlyHint: true`, `openWorldHint: false`), aceitam `lang?: "en" | "pt-br"` (padrão `"en"`), validam entradas com **Zod `.strict()`** e enums fechados, e devolvem `{ meta, data }` respeitando o teto de 16 KB por resposta.

| Tool             | Parâmetros                                                               | O que entrega                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_profile`    | `lang?`, `include_story?`                                                | Identidade, resumo executivo de 30s, fuso horário (`UTC-3`), foco atual, disponibilidade e links públicos (portfólio, página de contato, GitHub, LinkedIn, Medium). |
| `get_experience` | `lang?`, `section?` (`all\|primary\|earlier\|education\|certifications`) | Trajetória (KeepCloud `2024–2026`, AgroNegociar `2022–2025`, 9 experiências anteriores com 3 cargos de Tech Lead), MBA FIAP, Senac e certificados.                  |
| `list_projects`  | `lang?`, `category?`, `status?`, `tier?`, `tech?`                        | Lista os 10 projetos do portfólio com `tier` (`flagship` vs `archive`) e `status` (`active`, `paused`, `completed`).                                                |
| `get_project`    | `slug` (enum fechado dos 10 slugs), `lang?`                              | Estudo de caso estruturado: problema, solução, escopo de ownership, métricas públicas, destaques, ADRs, stack e links.                                              |
| `get_stack`      | `lang?`, `domain?`, `focus?` (`primary\|secondary`)                      | Matriz de tecnologias separando stack principal em produção do histórico, vinculada aos `project_slugs`.                                                            |
| `get_articles`   | `lang?`, `limit?` (`1..3`)                                               | Artigos selecionados no Medium com data ISO e campo explícito `original_language: "pt-br"`.                                                                         |

### MCP Prompts nativos

- **`recruiter_brief`** (`lang?`, `role_focus?`): resumo objetivo de triagem em 30s baseado apenas nos dados retornados pelas tools.
- **`architecture_deep_dive`** (`project_slug`, `lang?`): análise técnica de nível sênior cobrindo ADRs, fronteira de ownership e trade-offs.

### Exemplos de perguntas para testar

1. _"Resuma em 30 segundos o perfil do Caio Barilli para uma vaga Sênior PHP/Laravel + DevOps e informe os links públicos de contato."_
2. _"Onde o Caio já atuou como Tech Lead e o que ele construiu na KeepCloud?"_
3. _"Liste os projetos flagship do Caio com Laravel ou Terraform e informe quais estão ativos ou pausados."_
4. _"Explique as decisões de arquitetura (ADRs) e o escopo de responsabilidade no Keeptask e no PHParrot."_
5. _"Qual é a stack principal do Caio em produção hoje comparada aos projetos anteriores em JS/TS?"_

---

## Segurança e Fronteira de Privacidade

- **Stateless e zero `fetch` externo:** todos os dados vêm dos JSONs versionados em `data/`; `globalThis.fetch` nunca é chamado (garantido por teste automatizado).
- **Hardening HTTP:** aceita apenas `POST` (`405` + `Allow: POST`), rejeita `Origin: null` e origens cross-site não autorizadas (`403`), exige `application/json` (`415`), limita o body a 16 KB (`413`), rejeita batch JSON-RPC (`400`) e nunca expõe stack traces.
- **Logs mínimos:** emite apenas `{ tool, status, durationMs, errorCode }` — nunca headers, cookies, IP ou body bruto.
- **Fronteira `"NUNCA ENTRA"`:** suíte de segurança bloqueia e-mail pessoal, PDFs de CV, telefone, endereço, salário, credenciais, vínculos não divulgados, marcadores `A CONFIRMAR` e padrões de prompt injection tanto em `data/*.json` quanto nas saídas das 6 tools.

---

## Desenvolvimento Local e Testes

```bash
npm ci
npm run types:check
npm run typecheck
npm run lint
npm run format:check
npm test          # Roda unit, integração e segurança no runtime real Cloudflare workerd
npm run dry-run   # Valida o bundle do Worker sem fazer deploy
npm run dev       # Servidor local via Wrangler
```

### Sincronização com `caiobarilli.github.io`

1. Atualize primeiro a fonte da verdade em `https://caiobarilli.github.io`.
2. Espelhe apenas os dados públicos aprovados em `data/*.json` (mantendo `en` e `pt-br` alinhados) e atualize `data/meta.json` (`data_version`, `last_verified_at`).
3. Execute `npm test` para validar schemas Zod, paridade bilíngue, teto de 16 KB e blocklist.

---

## Licenças

- **Código-fonte:** [Licença MIT](./LICENSE).
- **Dados biográficos e de portfólio (`data/`):** **Todos os direitos reservados** — veja [`data/LICENSE`](./data/LICENSE).

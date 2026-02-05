# claude-code-mcp Project


## [0.1.7] - 2026-02-05

### Security Update
- Update @modelcontextprotocol/sdk version.
- Add zod dependency to satisfy peer dependency requirements.

## Overview

The claude-code-mcp project is an MCP server for Claude Code.

It calls the locally installed Claude Code command and provides the following tools: `explain_code`, `review_code`, `fix_code`, `edit_code`, `test_code`, `simulate_command`, and `your_own_query`. The server is implemented using Node.js and the MCP SDK, receiving JSON format requests from clients via stdio. Internally, it adopts Base64 encoding to smoothly process special characters (newlines, quotation marks, etc.) in natural language text, resulting in improved stability and flexibility. Its main roles are receiving requests, encoding input, generating and executing commands, and returning execution results in JSON format.
This project has been confirmed to work in Claude Code CLI environments (Ubuntu/WSL2, etc.).

<a href="https://glama.ai/mcp/servers/@KunihiroS/claude-code-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@KunihiroS/claude-code-mcp/badge" alt="claude-code-mcp MCP server" />
</a>

💡
MCP Host with less capable LLM, can tame and make use of Claude power💪!
With claude-code-mcp, you can also call Claude Code from Claude Desktop!! 😇😜😎 (unconfirmed)

## Functions

The main roles of the server are:

-   **Request Reception:** Receive JSON format tool requests from clients (e.g. `code`, `context`, `focus_areas`, etc.).
-   **Input Processing:** Internally Base64 encode the received natural language text.
-   **Tool Selection and Command Generation:** Based on the tool name in the request, assemble a command string for the query using a fixed template or free format (`your_own_query`).
-   **Command Execution:** Use Node.js's `child_process.spawn` to execute the assembled command and get the result from standard output.
-   **Result Return:** Return the execution result to the client in JSON format.

## Getting Started

### Prerequisites

-   Node.js (>= v18 recommended, tested with v22.14.0)
-   npm (or yarn)
-   Claude Code command installed and auth completed.
    https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview

### Installation & Usage

There are several ways to use `claude-code-mcp`:

**1. Using npx (Recommended for quick use)**

You can run the server directly without installation using `npx`:

```bash
npx @kunihiros/claude-code-mcp
```

**2. Global Installation**

Install the package globally:

```bash
npm install -g claude-code-mcp
```

Then, you can run it as a command:

```bash
claude-code-mcp
```

**3. Local Installation (For development)**

Clone the repository and install dependencies:

```bash
git clone https://github.com/KunihiroS/claude-code-mcp.git
cd claude-code-mcp/claude-code-server
npm install
npm run build
```
You can then run the built script directly:
```bash
node build/index.js
```

### Configuration

**Environment Variables:**

Regardless of the installation method, you need to configure the environment variables. Create **one** of the following files:

1.  **Using MCP Host Settings (Recommended for `npx`):** Configure environment variables directly within your MCP Host's settings (see "MCP Host Configuration" below). This is the easiest way when using `npx`.
2.  **Using a `.env` file:** Create a `.env` file in the directory where you run the `npx @kunihiros/claude-code-mcp` command.
3.  **Using a global config file:** Create a `.claude-code-mcp.env` file in your home directory (`~/.claude-code-mcp.env`).

If using a file (`.env` or `~/.claude-code-mcp.env`), add the following content, adjusting the `CLAUDE_BIN` path:

```dotenv
# .env or ~/.claude-code-mcp.env
CLAUDE_BIN=/path/to/your/claude/executable  # REQUIRED: Set the full path to your Claude CLI
LOG_LEVEL=info                             # Optional: Set log level (e.g., debug, info, warn, error)
```

**MCP Host Configuration (Recommended for `npx`):**

Add the following to your MCP Host application settings (e.g., Claude Desktop settings). This method allows you to set environment variables directly.

```json
    "claude-code-server": {
      "command": "npx",
      "args": [
        "-y",
        "@kunihiros/claude-code-mcp"
      ],
      "env": {
        "CLAUDE_BIN": "/path/to/your/claude/executable", // REQUIRED: Set the absolute path
        "LOG_LEVEL": "info"                             // Optional: Set log level
      },
      "disabled": false
    }
```
*(Restarting the host application might be required.)*

**Alternative MCP Host Configuration (Global Install / Local Dev):**

If you installed the package globally or are running it locally from the cloned repository, and the `claude-code-mcp` command is in your system's PATH, you can use:

```json
    "claude-code-server": {
      "command": "claude-code-mcp",
      "disabled": false
    }
```
In this case, you **must** configure environment variables using a `.env` file or the global `~/.claude-code-mcp.env` file as described above.

## Environment Variables Details

This server uses the following environment variables (set via MCP Host `env` settings, `.env`, or `~/.claude-code-mcp.env`):

-   `CLAUDE_BIN`: Specifies the path to the Claude CLI executable. **(Required)**
    Example: `/home/linuxbrew/.linuxbrew/bin/claude` or `C:\Users\YourUser\AppData\Local\bin\claude.exe`
-   `LOG_LEVEL`: Specifies the log level. (Optional, defaults to `info`). Possible values: `debug`, `info`, `warn`, `error`.

## Available Tools

The `claude-code-mcp` server provides the following tools:

- `explain_code`: Provides a detailed explanation of the given code.
- `review_code`: Reviews the given code.
- `fix_code`: Fixes bugs or issues in the given code.
- `edit_code`: Edits the given code based on instructions.
- `test_code`: Generates tests for the given code.
- `simulate_command`: Simulates the execution of a given command.
- `your_own_query`: Sends a custom query with context.

## Note

- Log file (`claude-code-mcp.log`) location:
    - Attempts to create in the project root first.
    - Falls back to the user's home directory (`~/.claude-code-mcp.log`).
    - Finally falls back to `/tmp/claude-code-mcp.log`.
- Log rotation is not implemented yet (be careful with log file size).
- Primarily tested with Claude CLI on Ubuntu/WSL2.

## License

This project is licensed under the MIT License - see below for details.

```
MIT License

Copyright (c) 2024 KunihiroS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Disclaimer

This software is provided for educational and research purposes only. This project is not officially associated with or endorsed by Anthropic. Claude is a trademark of Anthropic.

The project uses the Claude CLI as a dependency, but is an independent, community-driven effort. Users should ensure they comply with Anthropic's terms of service when using this project.

The maintainers of this project are not responsible for any misuse of the software or violations of the terms of service of any third-party APIs or services.
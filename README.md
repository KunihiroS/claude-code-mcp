# claude-code-mcp Project

[![smithery badge](https://smithery.ai/badge/@KunihiroS/claude-code-mcp-server)](https://smithery.ai/server/@KunihiroS/claude-code-mcp-server)

## Overview

The claude-code-mcp project is an MCP server for Claude Code.

It calls the locally installed Claude Code command and provides the following tools: explain_code, review_code, fix_code, edit_code, test_code, simulate_command, and your_own_query.  The server is implemented using Node.js and the MCP SDK, receiving JSON format requests from clients via stdio. Internally, it adopts Base64 encoding to smoothly process special characters (newlines, quotation marks, etc.) in natural language text, resulting in improved stability and flexibility. Its main roles are receiving requests, encoding input, generating and executing commands, and returning execution results in JSON format.
This project has been confirmed to work in Claude Code CLI environments (Ubuntu/WSL2, etc.).

💡  
MCP Host with less capable LLM, can tame and make use of Claude power💪!  
With claude-code-mcp, you can also call Claude Code from Claude Desktop!! 😇😜😎 (unconfirmed)

## Functions
The main roles of the server are:

-   **Request Reception:** Receive JSON format tool requests from clients (e.g. `code`, `context`, `focus_areas`, etc.).
-   **Input Processing:** Internally Base64 encode the received natural language text.
-   **Tool Selection and Command Generation:** Based on the tool name in the request, assemble a command string for the query using a fixed template or free format (`your_own_query`).
-   **Command Execution:** Use Node.js's `child_process.exec` to execute the assembled command and get the result from standard output.
-   **Result Return:** Return the execution result to the client in JSON format.

## Getting Started

### Prerequisites

-   Node.js (tested with v22.14.0)
-   npm (or yarn)
-   Claude Code command installed and auth completed.
    https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview

### Installation

#### Installing via Smithery

To install claude-code-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@KunihiroS/claude-code-mcp-server):

```bash
npx -y @smithery/cli install @KunihiroS/claude-code-mcp-server --client claude
```

#### Installing Manually
1.  Clone the repository:

    ```bash
    git clone https://github.com/KunihiroS/claude-code-mcp.git
    cd claude-code-mcp
    ```
2.  Install dependencies:

    ```bash
    cd claude-code-server
    npm install
    ```

3.  Create a `.env` file in the `claude-code-server` directory based on `.env.example` and set the environment variables.  You must set `CLAUDE_BIN` to the path of your Claude CLI executable.

4.  Build the server:

    ```bash
    npm run build
    ```
### Usage

Add the following to your MCP Host application settings :

```json
    "claude-code-server": {
      "command": "node",
      "args": [
        "FULL PATH-TO-YOUR-DIRECTORY/claude-code-mcp/claude-code-server/build/index.js"
      ],
      "disabled": false,
    }
```
(may required restart host application.)

## Environment Variables

This server uses the following environment variables:

-   `CLAUDE_BIN`: Specifies the path to the Claude CLI executable. (Required)  
    Example: /home/linuxbrew/.linuxbrew/bin/claude
-   `LOG_LEVEL`: Specifies the log level. (Optional, defaults to `info`)

To set these variables, you need to create a `.env` file in the `claude-code-server` directory. Use `.env.example` as a template.

## Available Tools
The `claude-code-server` provides the following tools:

- `explain_code`: Provides a detailed explanation of the given code.
- `review_code`: Reviews the given code.
- `fix_code`: Fixes bugs or issues in the given code.
- `edit_code`: Edits the given code based on instructions.
- `test_code`: Generates tests for the given code.
- `simulate_command`: Simulates the execution of a given command.
- `your_own_query`: Sends a custom query with context.

## Note

- Log file (.log) creation timing:
  1. Initially no log file is created when running commands through the claude-code-mcp Server
  2. Log file is created only after changing workspace location and then returning to the claude-code-mcp workspace
  3. Once created, the log file is properly updated with server operations and command executions

- Log file behavior pattern:
  1. First file creation: Only contains process termination timestamp
  2. Subsequent workspace open: Initializes with server startup logs and CLI verification
  3. Command execution: Appends detailed operation logs including CLI execution details
  4. Workspace change: Appends process termination message

    **The above is because of MCP Server spec (assumption).**

- Log file location:
  - Created in the project root as 'claude-code-server.log'
  - Follows fallback path logic (project root → home directory → /tmp) but primarily uses project root

- Log rotation is not implemented yet (be careful on the log file size)
- Only tested with Claude CLI / Ubuntu / WSL2

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

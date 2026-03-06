#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import child_process from 'child_process';
import * as dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs';
import os from 'os'; // Import the os module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ロガーのフォーマット設定を共通化
const createLoggerFormat = () => {
    return winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level}] ${message}`;
    }));
};
// 初期ロガーの設定（.envの読み込み前に最小限のロガーを設定）
const initialLogger = winston.createLogger({
    level: 'info',
    format: createLoggerFormat(),
    transports: [
        new winston.transports.Console()
    ]
});
// MCP Hostからの環境変数を優先し、.envファイルはフォールバックとして扱う
if (!process.env.CLAUDE_BIN) {
    const envPaths = [
        path.resolve(__dirname, '../.env'), // 開発環境
        path.resolve(__dirname, '../../.env'), // ビルド後の環境
        path.resolve(process.cwd(), '.env'), // カレントディレクトリの .env
        path.resolve(process.cwd(), 'claude-code-server/.env'), // プロジェクトサブディレクトリの .env (後方互換性)
        path.resolve(os.homedir(), '.claude-code-mcp.env') // ホームディレクトリの .claude-code-mcp.env
    ];
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            const result = dotenv.config({ path: envPath });
            if (result.error) {
                initialLogger.error(`Failed to load .env file from ${envPath}: ${result.error.message}`);
            }
            else {
                initialLogger.info(`Successfully loaded .env file from ${envPath}`);
                initialLogger.debug(`Loaded environment variables: LOG_LEVEL=${process.env.LOG_LEVEL}, CLAUDE_BIN=${process.env.CLAUDE_BIN}`);
                break;
            }
        }
        else {
            initialLogger.debug(`CLAUDE_BIN fallback search: environment file at ${envPath} does not exist [MCP Host settings: not found]`);
        }
    }
}
// ログレベルの明示的な確認（デバッグ用）
console.log(`Environment variable LOG_LEVEL: ${process.env.LOG_LEVEL}`);
initialLogger.debug(`Current initial logger level: ${initialLogger.level}`);
// ログファイルパスを決定するシンプルな方法
let logFilePath = null;
// 1. まずプロジェクトルートに書き込みを試みる
try {
    const projectLogPath = path.resolve(__dirname, '../../claude-code-server.log');
    initialLogger.debug(`Attempting to write to project root log: ${projectLogPath}`);
    fs.writeFileSync(projectLogPath, `# Log file initialization at ${new Date().toISOString()}\n`, { flag: 'a' });
    logFilePath = projectLogPath;
    console.log(`Created log file in project root: ${logFilePath}`);
    initialLogger.debug(`Successfully created/accessed log file at: ${logFilePath}`);
}
catch (err) {
    console.error(`Error writing to project root: ${err instanceof Error ? err.message : String(err)}`);
    initialLogger.debug(`Failed to write to project root log with error: ${err instanceof Error ? err.stack : String(err)}`);
    // 2. 次にホームディレクトリに試みる
    try {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (homeDir) {
            const homeLogPath = path.resolve(homeDir, '.claude-code-server.log');
            initialLogger.debug(`Attempting to write to home directory log: ${homeLogPath}`);
            fs.writeFileSync(homeLogPath, `# Log file initialization at ${new Date().toISOString()}\n`, { flag: 'a' });
            console.log(`Created log file in home directory: ${homeLogPath}`);
            logFilePath = homeLogPath;
            initialLogger.debug(`Successfully created/accessed log file at: ${logFilePath}`);
        }
    }
    catch (err2) {
        console.error(`Error writing to home directory: ${err2 instanceof Error ? err2.message : String(err2)}`);
        initialLogger.debug(`Failed to write to home directory log with error: ${err2 instanceof Error ? err2.stack : String(err2)}`);
        // 3. 最後に/tmpに試す
        try {
            const tmpPath = '/tmp/claude-code-server.log';
            initialLogger.debug(`Attempting to write to temp directory log: ${tmpPath}`);
            fs.writeFileSync(tmpPath, `# Log file initialization at ${new Date().toISOString()}\n`, { flag: 'a' });
            logFilePath = tmpPath;
            console.log(`Created log file in temp directory: ${logFilePath}`);
            initialLogger.debug(`Successfully created/accessed log file at: ${logFilePath}`);
        }
        catch (err3) {
            console.error('All log file paths failed. Logs will be console-only.');
            initialLogger.debug(`Failed to write to temp directory log with error: ${err3 instanceof Error ? err3.stack : String(err3)}`);
            logFilePath = null;
        }
    }
}
// 環境変数からログレベルを確実に取得
const logLevel = process.env.LOG_LEVEL || 'info';
console.log(`Setting log level to: ${logLevel}`);
initialLogger.debug(`Configured log level from environment: ${logLevel}`);
// Winstonロガーの設定
const logger = winston.createLogger({
    // 環境変数からログレベルを設定
    level: logLevel,
    format: winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level}] ${message}`;
    })),
    transports: [
        // コンソールトランスポートもログレベル設定を継承
        new winston.transports.Console({ level: logLevel })
    ]
});
logger.debug('Winston logger created with console transport');
// ファイルトランスポートの追加
if (logFilePath) {
    try {
        // ファイルトランスポートを作成
        const fileTransport = new winston.transports.File({
            filename: logFilePath,
            // 明示的にログレベルを設定
            level: logLevel,
            options: { flags: 'a' }
        });
        // ファイルトランスポート追加
        logger.add(fileTransport);
        console.log(`Added log file: ${logFilePath}`);
        logger.debug(`File transport added to logger with level: ${logLevel}`);
        // 同期書き込みテスト - シンプルな起動メッセージのみに置き換え
        fs.appendFileSync(logFilePath, `# System startup - ${new Date().toISOString()}\n`);
        logger.debug(`Wrote startup marker to log file`);
    }
    catch (err) {
        console.error('File transport setup error:', err);
        logger.debug(`Failed to setup file transport: ${err instanceof Error ? err.stack : String(err)}`);
    }
}
// 起動時にシンプルなログを書き込み
logger.info('=== Claude Code Server started ===');
logger.debug('Server initialization sequence started');
// ファイル情報の診断 - デバッグモードでのみ詳細表示
if (logFilePath && logLevel === 'debug') {
    try {
        const stats = fs.statSync(logFilePath);
        logger.debug(`Log file information (${logFilePath}): size=${stats.size} bytes, mode=${stats.mode.toString(8)}, uid=${stats.uid}, gid=${stats.gid}`);
    }
    catch (err) {
        logger.error('Failed to get file information:', err);
    }
}
// ログフラッシュ関数をシンプル化
const flushLog = () => {
    logger.debug('Flushing logs to disk');
    if (logFilePath) {
        try {
            // 同期的に書き込み
            fs.appendFileSync(logFilePath, `\n# Process terminated: ${new Date().toISOString()}\n`);
            logger.debug('Wrote termination marker to log file');
        }
        catch (appendErr) {
            console.error('Error writing log on termination:', appendErr);
            logger.debug(`Failed to write termination marker: ${appendErr instanceof Error ? appendErr.stack : String(appendErr)}`);
        }
    }
    try {
        // Winstonのクローズを試みる（エラーを無視）
        logger.debug('Closing Winston logger');
        logger.close();
    }
    catch (err) {
        // 無視
        logger.debug(`Error while closing logger: ${err instanceof Error ? err.message : String(err)}`);
    }
};
// プロセス終了時にログを確実にフラッシュ
process.on('exit', () => {
    logger.debug('Process exit event detected');
    flushLog();
});
// SIGINT (Ctrl+C) 処理
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down.');
    logger.debug('SIGINT handler triggered');
    flushLog();
    process.exit(0);
});
// 未処理の例外をキャッチ
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`);
    logger.error(err.stack);
    logger.debug('Uncaught exception handler triggered');
    flushLog();
    process.exit(1);
});
// CLAUDE_BIN Validation
let validatedClaudePath = null;
const EXPECTED_EXECUTABLE_BASENAME = 'claude';
const IS_WINDOWS = process.platform === 'win32';
const claudeBinFromEnv = process.env.CLAUDE_BIN;
if (!claudeBinFromEnv) {
    logger.error("CRITICAL: CLAUDE_BIN environment variable is not set. This is a required setting. Server exiting.");
    process.exit(1);
}
const resolvedPath = path.resolve(claudeBinFromEnv);
const basename = path.basename(resolvedPath);
let isValidBasename = false;
if (IS_WINDOWS) {
    isValidBasename = (basename.toLowerCase() === EXPECTED_EXECUTABLE_BASENAME || basename.toLowerCase() === `${EXPECTED_EXECUTABLE_BASENAME}.exe`);
}
else {
    isValidBasename = (basename === EXPECTED_EXECUTABLE_BASENAME);
}
if (!isValidBasename) {
    logger.error(`CRITICAL: CLAUDE_BIN ("${claudeBinFromEnv}") resolved to "${resolvedPath}", which does not have the expected basename "${EXPECTED_EXECUTABLE_BASENAME}". Basename found: "${basename}". Server exiting.`);
    process.exit(1);
}
try {
    fs.accessSync(resolvedPath, fs.constants.X_OK); // Check for existence and execute permission
    validatedClaudePath = resolvedPath; // Set the validated path
    logger.info(`CLAUDE_BIN validated. Using executable: ${validatedClaudePath}`);
    // Now, perform the version check using the validated path
    try {
        logger.debug(`Checking Claude CLI version at path: ${validatedClaudePath}`);
        // Quote the path in case it contains spaces, for reliability with execSync
        const versionOutput = child_process.execSync(`"${validatedClaudePath}" --version`, { encoding: 'utf8' });
        logger.info(`Claude CLI Version: ${versionOutput.trim()}`);
    }
    catch (err) {
        logger.warn(`Could not get Claude CLI version from validated path "${validatedClaudePath}". It might not be a valid Claude executable or is not working correctly. Error: ${err instanceof Error ? err.message : String(err)}`);
        logger.debug(`Failed to execute Claude CLI for version check: ${err instanceof Error ? err.stack : String(err)}`);
        // Original code continued even if version check failed, so this does too.
        // The main validation (name, existence, executability) has already passed.
    }
}
catch (err) {
    logger.error(`CRITICAL: CLAUDE_BIN ("${claudeBinFromEnv}") resolved to "${resolvedPath}", but it is not executable or does not exist. Error: ${err instanceof Error ? err.message : String(err)}. Server exiting.`);
    process.exit(1);
}
// Base64 エンコード／デコード ヘルパー関数
function encodeText(text) {
    return Buffer.from(text, 'utf8').toString('base64');
}
function decodeText(encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8');
}
class ClaudeCodeServer {
    constructor() {
        logger.debug('Initializing Claude Code Server');
        this.server = new Server({
            name: 'claude-code-server',
            version: '0.1.0',
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        logger.debug('Setting up tool handlers');
        this.setupToolHandlers();
        this.server.onerror = (error) => {
            logger.error('[MCP Error]', error);
            logger.debug(`MCP server error details: ${error instanceof Error ? error.stack : JSON.stringify(error)}`);
        };
        process.on('SIGINT', async () => {
            logger.debug('SIGINT received in server handler');
            await this.server.close();
            process.exit(0);
        });
        logger.debug('Claude Code Server initialization completed');
    }
    setupToolHandlers() {
        // ツールリストの設定
        logger.debug('Registering ListTools request handler');
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            logger.debug('ListTools handler called');
            return {
                tools: [
                    {
                        name: 'explain_code',
                        description: 'Provides detailed explanation of the given code.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Target code' },
                                context: { type: 'string', description: 'Additional context', default: '' }
                            },
                            required: ['code']
                        }
                    },
                    {
                        name: 'review_code',
                        description: 'Reviews the given code.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to review' },
                                focus_areas: { type: 'string', description: 'Areas to focus on', default: '' }
                            },
                            required: ['code']
                        }
                    },
                    {
                        name: 'fix_code',
                        description: 'Fixes bugs or issues in the given code.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to fix' },
                                issue_description: { type: 'string', description: 'Description of the issue' }
                            },
                            required: ['code', 'issue_description']
                        }
                    },
                    {
                        name: 'edit_code',
                        description: 'Edits the given code based on instructions.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to edit' },
                                instructions: { type: 'string', description: 'Editing instructions' }
                            },
                            required: ['code', 'instructions']
                        }
                    },
                    {
                        name: 'test_code',
                        description: 'Generates tests for the given code.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', description: 'Code to test' },
                                test_framework: { type: 'string', description: 'Test framework to use', default: '' }
                            },
                            required: ['code']
                        }
                    },
                    {
                        name: 'simulate_command',
                        description: 'Simulates the execution of a given command.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                command: { type: 'string', description: 'Command to execute' },
                                input: { type: 'string', description: 'Input data', default: '' }
                            },
                            required: ['command']
                        }
                    },
                    {
                        name: 'your_own_query',
                        description: 'Sends a custom query with context.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'Query text' },
                                context: { type: 'string', description: 'Additional context', default: '' }
                            },
                            required: ['query']
                        }
                    }
                ]
            };
        });
        // ツール実行リクエスト処理
        logger.debug('Registering CallTool request handler');
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            logger.debug(`CallTool handler called for tool: ${name} with args: ${JSON.stringify(args, null, 2)}`);
            const runClaudeCommand = (claudeArgs, stdinInput) => {
                return new Promise((resolve, reject) => {
                    // タイムアウト設定 (5分)
                    const timeoutMs = 5 * 60 * 1000;
                    let timeoutId;
                    try {
                        // より詳細なデバッグ情報
                        logger.debug(`Executing Claude CLI at path: ${validatedClaudePath}`);
                        logger.debug(`Claude CLI arguments: ${JSON.stringify(claudeArgs)}`);
                        if (stdinInput)
                            logger.debug(`Input length: ${stdinInput.length} characters`);
                        // 環境変数をログに出力
                        logger.debug(`Environment PATH: ${process.env.PATH}`);
                        if (validatedClaudePath === null) {
                            logger.error('validatedClaudePath is null. Claude CLI cannot be executed.');
                            // エラーをクライアントに返すなど、より丁寧なエラー処理を検討してください。
                            throw new Error('Validated Claude CLI path is not available. Please check CLAUDE_BIN environment variable or server configuration.');
                        }
                        const proc = child_process.spawn(validatedClaudePath, claudeArgs, {
                            env: { ...process.env },
                            stdio: ['pipe', 'pipe', 'pipe']
                        });
                        // 標準入力がある場合は書き込みと終了
                        if (stdinInput) {
                            proc.stdin.write(stdinInput);
                            proc.stdin.end();
                            logger.debug('Wrote input to Claude CLI stdin');
                        }
                        let stdout = '';
                        let stderr = '';
                        proc.stdout.on('data', (data) => {
                            const chunk = data.toString();
                            stdout += chunk;
                            logger.debug(`Received stdout chunk: ${chunk.length} bytes`);
                        });
                        proc.stderr.on('data', (data) => {
                            const chunk = data.toString();
                            stderr += chunk;
                            logger.error(`Claude stderr: ${chunk}`);
                            logger.debug(`Claude stderr output: ${chunk}`);
                        });
                        // タイムアウト設定
                        timeoutId = setTimeout(() => {
                            logger.error(`Command timed out after ${timeoutMs / 1000} seconds`);
                            logger.debug('Killing process due to timeout');
                            proc.kill();
                            reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds`));
                        }, timeoutMs);
                        proc.on('close', (code) => {
                            clearTimeout(timeoutId);
                            logger.debug(`Claude process closed with code: ${code}`);
                            if (code === 0) {
                                logger.debug(`Claude command completed successfully, output length: ${stdout.length} bytes`);
                                resolve(stdout.trim());
                            }
                            else {
                                logger.error(`Command failed with code ${code}`);
                                logger.debug(`stderr: ${stderr}`);
                                reject(new Error(`Command failed with code ${code}: ${stderr}`));
                            }
                        });
                        proc.on('error', (err) => {
                            clearTimeout(timeoutId);
                            logger.error("Process spawn error:", err);
                            logger.debug(`Process error details: ${err.stack}`);
                            reject(err);
                        });
                    }
                    catch (err) {
                        logger.error("Failed to spawn process:", err);
                        logger.debug(`Spawn failure details: ${err instanceof Error ? err.stack : String(err)}`);
                        reject(err);
                    }
                });
            };
            try {
                // 文字列の最大長さを制限する関数
                const truncateIfNeeded = (str, maxLength = 10000) => {
                    if (str.length > maxLength) {
                        logger.warn(`Warning: Input too long, truncating (${str.length} -> ${maxLength})`);
                        return str.substring(0, maxLength) + "... [truncated]";
                    }
                    return str;
                };
                // エラーを適切に処理するために各ケースを try-catch で囲む
                switch (name) {
                    case 'explain_code': {
                        const { code, context } = args;
                        try {
                            logger.debug(`Processing explain_code request, code length: ${code.length}`);
                            const encodedCode = encodeText(truncateIfNeeded(code));
                            logger.debug(`Code encoded to base64, length: ${encodedCode.length}`);
                            // ファイルを使用して大きな入力を渡す場合の代替方法
                            const prompt = `You are super professional engineer. Please kindly provide a detailed explanation of the following Base64 encoded code:\n\n${encodedCode}\n\nAdditional context (if provided):\n${context || 'No additional context provided.'}`;
                            logger.debug('Calling Claude CLI with prompt');
                            const output = await runClaudeCommand(['--print'], prompt);
                            logger.debug(`Received response from Claude, length: ${output.length}`);
                            return { content: [{ type: 'text', text: output }] };
                        }
                        catch (err) {
                            logger.error("Error in explain_code:", err);
                            logger.debug(`explain_code error details: ${err instanceof Error ? err.stack : String(err)}`);
                            throw err;
                        }
                    }
                    case 'review_code': {
                        const { code, focus_areas } = args;
                        try {
                            logger.debug(`Processing review_code request, code length: ${code.length}`);
                            const encodedCode = encodeText(truncateIfNeeded(code));
                            logger.debug(`Code encoded to base64, length: ${encodedCode.length}`);
                            const prompt = `You are super professional engineer. Please review the following Base64 encoded code. Consider code readability, efficiency, potential bugs, and security vulnerabilities.\n\nCode:\n${encodedCode}\n\nFocus areas (if provided):\n${focus_areas || 'No specific focus areas provided.'}`;
                            logger.debug('Calling Claude CLI with prompt');
                            const output = await runClaudeCommand(['--print'], prompt);
                            logger.debug(`Received response from Claude, length: ${output.length}`);
                            return { content: [{ type: 'text', text: output }] };
                        }
                        catch (err) {
                            logger.error("Error in review_code:", err);
                            logger.debug(`review_code error details: ${err instanceof Error ? err.stack : String(err)}`);
                            throw err;
                        }
                    }
                    case 'fix_code': {
                        const { code, issue_description } = args;
                        logger.debug(`Processing fix_code request, code length: ${code.length}`);
                        const encodedCode = encodeText(truncateIfNeeded(code));
                        logger.debug(`Code encoded to base64, length: ${encodedCode.length}`);
                        const prompt = `You are super professional engineer. Please fix the following Base64 encoded code, addressing the issue described below:\n\nCode:\n${encodedCode}\n\nIssue description:\n${issue_description ?? 'No specific issue described.'}`;
                        logger.debug('Calling Claude CLI with prompt');
                        const output = await runClaudeCommand(['--print'], prompt);
                        logger.debug(`Received response from Claude, length: ${output.length}`);
                        return { content: [{ type: 'text', text: output }] };
                    }
                    case 'edit_code': {
                        const { code, instructions } = args;
                        logger.debug(`Processing edit_code request, code length: ${code.length}`);
                        const encodedCode = encodeText(truncateIfNeeded(code));
                        logger.debug(`Code encoded to base64, length: ${encodedCode.length}`);
                        const prompt = `You are super professional engineer. Please edit the following Base64 encoded code according to the instructions provided:\n\nCode:\n${encodedCode}\n\nInstructions:\n${instructions ?? 'No specific instructions provided.'}`;
                        logger.debug('Calling Claude CLI with prompt');
                        const output = await runClaudeCommand(['--print'], prompt);
                        logger.debug(`Received response from Claude, length: ${output.length}`);
                        return { content: [{ type: 'text', text: output }] };
                    }
                    case 'test_code': {
                        const { code, test_framework } = args;
                        logger.debug(`Processing test_code request, code length: ${code.length}`);
                        const encodedCode = encodeText(truncateIfNeeded(code));
                        logger.debug(`Code encoded to base64, length: ${encodedCode.length}`);
                        const framework = test_framework || 'default';
                        const prompt = `You are super professional engineer. Please generate tests for the following Base64 encoded code.\n\nCode:\n${encodedCode}\n\nTest framework (if specified):\n${framework || 'No specific framework provided. Please use a suitable default framework.'}`;
                        logger.debug('Calling Claude CLI with prompt');
                        const output = await runClaudeCommand(['--print'], prompt);
                        logger.debug(`Received response from Claude, length: ${output.length}`);
                        return { content: [{ type: 'text', text: output }] };
                    }
                    case 'simulate_command': {
                        const { command, input } = args;
                        logger.debug(`Processing simulate_command request, command: ${command}`);
                        const prompt = `You are super professional engineer. Simulate the execution of the following command:\n\nCommand: ${command}\n\nInput: ${input || 'No input provided.'}\n\nDescribe the expected behavior and output, without actually executing the command.`;
                        logger.debug('Calling Claude CLI with prompt');
                        const output = await runClaudeCommand(['--print'], prompt);
                        logger.debug(`Received response from Claude, length: ${output.length}`);
                        return { content: [{ type: 'text', text: output }] };
                    }
                    case 'your_own_query': {
                        const { query, context } = args;
                        logger.debug(`Processing your_own_query request, query length: ${query.length}`);
                        const prompt = `Query: ${query} ${context || ''}`;
                        logger.debug('Calling Claude CLI with prompt');
                        const output = await runClaudeCommand(['--print'], prompt);
                        logger.debug(`Received response from Claude, length: ${output.length}`);
                        return { content: [{ type: 'text', text: output }] };
                    }
                    default:
                        throw new McpError(404, "Unknown tool: " + name);
                }
            }
            catch (err) {
                logger.error("Error executing tool:", err);
                logger.debug(`Tool execution error details: ${err instanceof Error ? err.stack : String(err)}`);
                throw new McpError(500, err instanceof Error ? err.message : String(err));
            }
        });
    }
    async run() {
        logger.debug('Starting Claude Code MCP server');
        const transport = new StdioServerTransport();
        logger.debug('Created StdioServerTransport');
        await this.server.connect(transport);
        logger.info("Claude Code MCP server running on stdio");
        logger.debug('Server connected to transport and ready to process requests');
    }
}
const server = new ClaudeCodeServer();
server.run().catch((err) => {
    logger.error('Failed to start server:', err);
    logger.debug(`Server start failure details: ${err instanceof Error ? err.stack : String(err)}`);
    console.error(err);
});

# Dockerfile for claude-code-mcp
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install required OS packages (git may be needed by optional deps)
RUN apk add --no-cache git

# Use pnpm with Corepack (falls back to npm-global if corepack path changes)
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate || npm i -g pnpm

# Copy only lockfiles first to maximize layer cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies using the exact locked versions
RUN pnpm install --frozen-lockfile

# Copy the rest of the source
COPY . .

# Build the project (generates claude-code-server/build/index.js)
RUN pnpm run build

# Environment
ENV NODE_ENV=production

# NOTE: You must provide CLAUDE_BIN at runtime, e.g.
#   docker run --rm -e CLAUDE_BIN=/path/in/container/claude image
# or mount the host CLI binary into the container and point CLAUDE_BIN to it.

# Run the MCP server over stdio
CMD ["node", "claude-code-server/build/index.js"]
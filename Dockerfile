# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy the claude-code-server directory into the container
COPY claude-code-server ./claude-code-server

# Set working directory to claude-code-server
WORKDIR /app/claude-code-server

# Install dependencies without running scripts
RUN npm install --ignore-scripts

# Build the project
RUN npm run build

# Expose any necessary port (MCP uses stdio, so none by default)

# Start the MCP server
CMD ["node", "build/index.js"]

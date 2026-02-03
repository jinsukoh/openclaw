#!/bin/bash
set -e

# Default values
CONFIG_DIR="$HOME/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"
BIND_MODE="lan"
MODEL_PROVIDER="ollama"

# Determine local IP (best effort)
if [[ "$OSTYPE" == "darwin"* ]]; then
  LOCAL_IP=$(ipconfig getifaddr en0 || echo "127.0.0.1")
else
  LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "127.0.0.1")
fi

echo "🦞 OpenClaw Internal Network Setup"
echo "=================================="
echo ""
echo "This script will configure OpenClaw for internal usage:"
echo "  - Bind to LAN ($LOCAL_IP by default)"
echo "  - Use local Ollama instance"
echo "  - Disable external message channels"
echo ""

read -p "Proceed? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

mkdir -p "$CONFIG_DIR"

# Generate openclaw.json
cat > "$CONFIG_FILE" <<EOF
{
  "$schema": "https://raw.githubusercontent.com/openclaw/openclaw/main/dist/config.schema.json",
  "gateway": {
    "bind": "$BIND_MODE",
    "port": 18789,
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "internal-secret-token"
    },
    "tailscale": {
      "mode": "off"
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "api": "openai-completions",
        "models": [
          {
            "id": "llama3",
            "name": "Llama 3 (Local)",
            "contextWindow": 8192,
            "maxTokens": 4096,
            "input": ["text"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            }
          }
        ]
      }
    }
  },
  "agent": {
    "model": "llama3",
    "thinking": "off"
  },
  "channels": {
    "whatsapp": { "enabled": false },
    "telegram": { "enabled": false },
    "slack": { "enabled": false },
    "discord": { "enabled": false },
    "googlechat": { "enabled": false },
    "signal": { "enabled": false },
    "imessage": { "enabled": false },
    "msteams": { "enabled": false },
    "matrix": { "enabled": false },
    "zalo": { "enabled": false }
  },
  "browser": {
    "enabled": false
  }
}
EOF

echo ""
echo "✅ Configuration written to $CONFIG_FILE"
echo ""
echo "To start OpenClaw, run:"
echo "  npm start"
echo ""
echo "Access the UI at: http://$LOCAL_IP:18789"
echo "Gateway Token: internal-secret-token"

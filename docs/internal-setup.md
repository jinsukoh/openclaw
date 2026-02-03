# Internal OpenClaw Setup Guide

This guide describes how to deploy and configure OpenClaw for use within an internal network (intranet), completely isolated from the public internet.

## Prerequisites

1.  **Node.js**: Version 22 or higher.
2.  **Ollama**: A running instance of [Ollama](https://ollama.com) reachable from the OpenClaw server (default: `localhost:11434`).
3.  **Llama 3 Model**: Ensure you have pulled the model: `ollama pull llama3` (or adjust `openclaw.json` for your preferred model).

## Automated Setup

Run the included setup script to generate a secure, internal-only configuration:

```bash
./scripts/setup-internal.sh
```

This script will:
-   Create/Overwrite `~/.openclaw/openclaw.json`.
-   Configure the Gateway to bind to all interfaces (`lan`) so it's accessible on your internal network.
-   Set up **Ollama** as the sole model provider.
-   Disable all external messaging channels (WhatsApp, Telegram, etc.) to prevent data leakage.
-   Disable the built-in browser tool to prevent external web access.

## Manual Configuration

If you prefer to configure manually, ensure your `~/.openclaw/openclaw.json` includes:

```json
{
  "gateway": {
    "bind": "lan"
  },
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "api": "openai-completions",
        "models": [ ... ]
      }
    }
  },
  "agent": {
    "model": "llama3"
  }
}
```

## UI Access

Once started (`npm start`), OpenClaw is available at:

*   **Control UI**: `http://<YOUR_SERVER_IP>:18789`
*   **WebChat**: `http://<YOUR_SERVER_IP>:18789/chat`

Since OpenClaw hosts its own UI assets, these pages will work fully offline without internet access.

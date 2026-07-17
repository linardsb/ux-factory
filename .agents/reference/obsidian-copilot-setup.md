# Obsidian Copilot Setup Guide for Paddy Agent

This guide walks you through configuring Obsidian Copilot to use the Paddy AI agent as a custom model provider.

## Prerequisites

Before starting, ensure you have:

1. **Obsidian** installed with the **Copilot plugin**
2. **Paddy agent** running locally on port `8123`
3. **Anthropic API key** configured in Paddy's `.env` file

## Starting Paddy Server

1. Navigate to the Paddy project directory:
   ```bash
   cd path/to/obsidian-ai-agent
   ```

2. Start the development server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8123
   ```

3. Verify the server is running:
   ```bash
   curl http://localhost:8123/health
   ```

   Expected response:
   ```json
   {"status": "healthy"}
   ```

## Configuring Obsidian Copilot

### Step 1: Open Copilot Settings

1. Open **Obsidian Settings** (gear icon or `Ctrl/Cmd + ,`)
2. Navigate to **Community Plugins** → **Copilot**
3. Click on **Model Provider Settings**

### Step 2: Add Custom Model

1. In the Copilot settings, find the **Custom Models** section
2. Click **Add Custom Model**
3. Configure the following fields:

   | Field | Value | Notes |
   |-------|-------|-------|
   | **Name** | `Paddy Agent` | Display name (any string) |
   | **Provider** | `OpenAI` | Select from dropdown |
   | **Base URL** | `http://localhost:8123/v1` | **Important:** Do NOT include `/chat/completions` |
   | **API Key** | `any-non-empty-string` | Not validated currently; required by UI |
   | **Model Name** | `claude-sonnet-4-0` | Can be any string; informational only |

   **Critical: Base URL Format**

   The OpenAI SDK automatically appends `/chat/completions` to the base URL. You MUST configure:
   - ✅ Correct: `http://localhost:8123/v1`
   - ❌ Wrong: `http://localhost:8123/v1/chat/completions` (will result in double path)

### Step 3: Enable CORS (if needed)

If you encounter CORS errors:

1. Check that `app/core/config.py` includes Obsidian origins:
   ```python
   allowed_origins: list[str] = [
       "http://localhost:3000",
       "http://localhost:8123",
       "app://obsidian.md",
       "capacitor://localhost",
   ]
   ```

2. Restart the Paddy server to apply changes

### Step 4: Select Paddy as Active Model

1. In Copilot settings, locate the **Active Model** dropdown
2. Select **Paddy Agent** from the list
3. Close settings

## Verification

### Test the Connection

1. Open any note in Obsidian
2. Activate Copilot (default: `Ctrl/Cmd + P` → "Copilot: Chat")
3. Send a test message: `Hello, who are you?`

Expected response:
```
Hello! I'm Paddy, an AI assistant for Obsidian vaults. How can I help you today?
```

### Verify Streaming

1. Ask Paddy a question that requires a longer response:
   ```
   Explain the benefits of using Obsidian for note-taking
   ```

2. You should see the response stream in real-time (text appears progressively)

## Troubleshooting

### Connection Refused

**Symptom:** Error message "Failed to connect to server"

**Solutions:**
1. Verify Paddy server is running:
   ```bash
   curl http://localhost:8123/health
   ```

2. Check the server logs for errors
3. Ensure no firewall is blocking port 8123

### CORS Errors

**Symptom:** Browser console shows CORS policy errors

**Solutions:**
1. Verify `allowed_origins` in `app/core/config.py` includes:
   - `app://obsidian.md`
   - `capacitor://localhost`

2. Restart Paddy server after config changes

3. Test CORS with curl:
   ```bash
   curl -X OPTIONS http://localhost:8123/v1/chat/completions \
     -H "Origin: app://obsidian.md" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

   Expected: `Access-Control-Allow-Origin: app://obsidian.md` in response headers

### Invalid Response Format

**Symptom:** Copilot shows "Invalid response from server"

**Solutions:**
1. Check Paddy server logs for errors:
   ```bash
   # Logs are output to console where server is running
   ```

2. Test the endpoint directly with curl:
   ```bash
   curl -X POST http://localhost:8123/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "claude-sonnet-4-0",
       "messages": [{"role": "user", "content": "Hello"}],
       "stream": false
     }'
   ```

   Expected: Valid JSON response with `choices` and `usage` fields

3. Verify Anthropic API key is set in `.env`:
   ```bash
   # .env file should contain:
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Slow Responses

**Symptom:** Paddy takes a long time to respond

**Solutions:**
1. Check your Anthropic API quota/rate limits
2. Monitor server logs for performance issues
3. Consider switching to `claude-haiku-4-5` for faster responses:
   - Update `LLM_MODEL` in `.env`
   - Restart Paddy server

## Example Queries

Try these queries to test Paddy's capabilities:

### Basic Interaction
```
Hello! Can you introduce yourself?
```

### Note Management (Future Feature)
```
List all notes in my vault
```

### Vault Queries (Future Feature)
```
Find notes about project management
```

### General Knowledge
```
Explain the Zettelkasten method in 3 sentences
```

## Configuration Reference

### Complete Custom Model Configuration

```
Name: Paddy Agent
Provider: OpenAI
Base URL: http://localhost:8123/v1
API Key: dummy-key-for-ui
Model Name: claude-sonnet-4-0
Temperature: 1.0 (default)
Max Tokens: (leave empty for model default)
```

### Paddy .env Configuration

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/obsidian_agent

# LLM
ANTHROPIC_API_KEY=sk-ant-your-key-here
LLM_MODEL=claude-sonnet-4-0  # or claude-haiku-4-5 for faster responses

# CORS (already configured)
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8123","app://obsidian.md","capacitor://localhost"]
```

## Advanced Configuration

### Using Different Model

To use a different Anthropic model:

1. Update `.env`:
   ```bash
   LLM_MODEL=claude-opus-4-0  # For highest quality
   # or
   LLM_MODEL=claude-haiku-4-5  # For fastest responses
   ```

2. Restart Paddy server
3. No changes needed in Obsidian Copilot settings

### Remote Server Setup

To run Paddy on a remote server:

1. Update Copilot Base URL to server IP:
   ```
   http://192.168.1.100:8123/v1
   ```

2. Update Paddy's `allowed_origins` to include your machine's origin

3. Ensure firewall allows connections on port 8123

## Support

For issues or questions:

1. Check Paddy server logs for errors
2. Review this troubleshooting guide
3. Consult the main project README
4. Open an issue on the project repository

## Version Compatibility

- **Paddy:** v0.1.0+
- **Obsidian Copilot:** v1.0.0+ (any version with custom model support)
- **Obsidian:** v1.4.0+

---

**Last Updated:** 2025-11-05
**Status:** Production Ready

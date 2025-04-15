# LLM Provider Setup Guide for Obsidian Importer

This guide provides detailed instructions for configuring different LLM (Large Language Model) providers with the Obsidian Importer plugin.

## Requesty Setup (Default Provider)

[Requesty](https://requesty.io) is the default LLM provider for Obsidian Importer, offering a simplified API gateway to access various AI models.

### Step 1: Create a Requesty Account
1. Visit [https://requesty.io](https://requesty.io) and sign up for an account
2. Verify your email address

### Step 2: Generate API Key
1. Log in to your Requesty dashboard
2. Navigate to the API Keys section
3. Click "Create New API Key"
4. Give your key a name (e.g., "Obsidian Importer")
5. Copy the generated API key

### Step 3: Configure the Plugin
1. Open Obsidian and go to Settings → Obsidian Importer
2. Paste your API key in the "API Key" field
3. The default LLM endpoint should already be set to: `https://router.requesty.io/v1/chat/completions`
4. Set your preferred model (e.g., `google/gemini-2.0-flash-exp`)
5. Click "Save"

## OpenRouter Setup

[OpenRouter](https://openrouter.ai) is an alternative provider that gives access to various open and closed-source models.

### Step 1: Create an OpenRouter Account
1. Visit [https://openrouter.ai](https://openrouter.ai) and sign up
2. Verify your email if required

### Step 2: Get Your API Key
1. Log in to your OpenRouter account
2. Navigate to the API Keys section
3. Copy your API key

### Step 3: Configure the Plugin
1. Open Obsidian and go to Settings → Obsidian Importer
2. Paste your OpenRouter API key in the "API Key" field
3. Change the LLM Endpoint to: `https://openrouter.ai/api/v1/chat/completions`
4. Select a compatible model from OpenRouter's offerings (e.g., `anthropic/claude-3-opus:beta`)
5. Click "Save"

## Using a Local LLM via Ollama

For increased privacy or offline use, you can run models locally using [Ollama](https://ollama.ai).

### Step 1: Install Ollama
1. Download and install Ollama from [https://ollama.ai](https://ollama.ai)
2. Follow the installation instructions for your operating system

### Step 2: Pull a Model
1. Open a terminal/command prompt
2. Run: `ollama pull llama2` (or another model of your choice)
3. Wait for the model to download

### Step 3: Start the Ollama Server
1. Run: `ollama serve` in your terminal
2. Keep this terminal window open

### Step 4: Configure the Plugin
1. Open Obsidian and go to Settings → Obsidian Importer
2. Leave the API Key field blank
3. Set the LLM Endpoint to: `http://localhost:11434/v1/chat/completions`
4. Set the Model to match your Ollama model (e.g., `llama2`)
5. Click "Save"

## Troubleshooting

### API Key Issues
- Ensure there are no extra spaces before or after your API key
- Check if your API key has expired or has usage limits
- Verify you have billing information set up if required by the provider

### Connection Problems
- Check your internet connection
- Verify the API endpoint URL is correct
- For local LLMs, ensure the Ollama server is running
- Try disabling VPNs or proxies that might interfere with API connections

### Model Compatibility
- Not all models support the same features or formatting
- If you experience poor quality summaries, try switching to a more capable model
- Models with at least 7B parameters are recommended for best results

## Security Considerations

- Your API key is stored locally in your Obsidian config
- The plugin does not share your key with any third parties
- When using Debug mode, sensitive information is redacted from logs
- Consider using a separate API key specifically for this plugin
- For maximum privacy, use a local LLM setup with Ollama
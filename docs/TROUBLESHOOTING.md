# Obsidian Importer Troubleshooting Guide

This guide addresses common issues that users might encounter when using the Obsidian Importer plugin and provides solutions for each problem.

## Installation Issues

### Plugin Not Appearing in Community Plugins List

**Issue:** You can't find Obsidian Importer in the Community Plugins browser.

**Solutions:**
1. Make sure you're connected to the internet
2. Refresh the Community Plugins list by closing and reopening the settings
3. If the plugin has just been released, it might take 24-48 hours to appear in the list
4. Try manual installation instead

### Manual Installation Errors

**Issue:** The plugin doesn't appear in your plugins list after manual installation.

**Solutions:**
1. Verify you placed the files in the correct folder: `.obsidian/plugins/obsidian-importer/`
2. Check that you've included all required files: `main.js`, `manifest.json`, and `styles.css`
3. Restart Obsidian completely (not just reloading)
4. Check the console for error messages (Ctrl/Cmd + Shift + I)

## Configuration Issues

### API Key Not Working

**Issue:** You receive "Authentication failed" or similar errors when trying to import content.

**Solutions:**
1. Double-check the API key for typos or extra spaces
2. Verify the API key is active in your provider's dashboard
3. Check if your account has sufficient credits/quota
4. Try generating a new API key
5. Ensure you're using the correct endpoint for your provider

### Note Creation Fails

**Issue:** The LLM processes correctly but the note isn't created.

**Solutions:**
1. Check if the folder path in settings exists in your vault
2. Verify you have write permissions for your vault
3. Try a different folder location
4. Check for illegal characters in the video title that might affect file naming

## Content Issues

### YouTube Transcript Not Available

**Issue:** You get an error saying "Transcript not available for this video."

**Solutions:**
1. Verify the video has captions (look for the "CC" button in YouTube's player)
2. Try a different YouTube video
3. Some videos have only manual captions which might not be accessible to the plugin
4. Videos in certain languages may not have accessible transcripts
5. Some channels disable automatic caption access

### LLM Processing Timeout

**Issue:** The import gets stuck or times out during the "Processing with LLM" stage.

**Solutions:**
1. Try a shorter video with less transcript content
2. Check your internet connection
3. The LLM provider might be experiencing high traffic; try again later
4. Switch to a faster (though potentially less accurate) model in settings
5. Increase the timeout value if you're using a local LLM setup

### Poor Quality Summaries

**Issue:** The generated notes contain irrelevant or low-quality summaries.

**Solutions:**
1. Try a different, more capable LLM model
2. Check if the video transcript is coherent and in a language that the LLM understands
3. Videos with heavy technical jargon may produce poorer results
4. Very long videos may result in truncated transcripts and incomplete analysis

## Technical Issues

### Plugin Crashes on Start

**Issue:** Obsidian shows an error when loading the plugin or it doesn't activate.

**Solutions:**
1. Check the console for specific error messages (Ctrl/Cmd + Shift + I)
2. Verify your Obsidian version meets the minimum requirements
3. Try reinstalling the plugin
4. Temporarily disable other plugins to check for conflicts

### Debug Mode Not Working

**Issue:** You enabled Debug Mode but don't see any logs.

**Solutions:**
1. Make sure you're looking in the correct console tab
2. Try performing an import operation to generate logs
3. Close and reopen the developer tools
4. Restart Obsidian after enabling Debug Mode

## Connection Issues

### Firewall or Network Restrictions

**Issue:** The plugin can't connect to LLM providers.

**Solutions:**
1. Check if your network allows connections to external APIs
2. Try using the plugin on a different network
3. If using a corporate network, check with IT about API access restrictions
4. Consider using a local LLM setup with Ollama if external API access is restricted

### Local LLM Not Working

**Issue:** The plugin can't connect to your local Ollama instance.

**Solutions:**
1. Verify Ollama is running (`ollama serve` should be active)
2. Check the URL is set correctly to `http://localhost:11434/v1/chat/completions`
3. Ensure no firewall is blocking local connections
4. Verify you've pulled the model you're trying to use

## Getting More Help

If you're still experiencing issues not covered in this guide:

1. Enable Debug Mode in settings
2. Reproduce the issue to generate detailed logs
3. Open an issue on the [GitHub repository](https://github.com/username/obsidian-importer/issues) with:
   - A clear description of the problem
   - Steps to reproduce
   - The error message or unexpected behavior
   - Your logs (with sensitive information redacted)
   - Your Obsidian version and platform (Windows, macOS, Linux, iOS, Android)

The development team will respond to issues as soon as possible.
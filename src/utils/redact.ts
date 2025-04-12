/**
 * Utility to redact API keys from strings for secure logging and error handling.
 * Replaces all occurrences of the API key with "[REDACTED]".
 * If apiKey is empty or not a string, returns the input unchanged.
 */
export function redactApiKey(str: string, apiKey: string): string {
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 4) return str;
  // Escape special regex characters in the API key
  const escapedKey = apiKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(escapedKey, "g");
  return str.replace(regex, "[REDACTED]");
}

/*
Example usage:
const apiKey = "sk-1234567890abcdef";
const msg = "Error: Invalid key sk-1234567890abcdef in request";
console.log(redactApiKey(msg, apiKey)); // "Error: Invalid key [REDACTED] in request"
*/
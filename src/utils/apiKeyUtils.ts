/**
 * Utilities for safely handling API keys in logs and outputs
 */

/**
 * Safely masks an API key for displaying in logs
 * Shows first few characters followed by asterisks
 * 
 * @param apiKey The API key to mask
 * @param visibleChars Number of characters to leave visible (default: 4)
 * @returns Masked API key string or "Not set" if empty
 */
export function maskApiKey(apiKey: string | undefined | null, visibleChars = 4): string {
  if (!apiKey) return "Not set";
  
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length === 0) return "Not set";
  
  if (trimmedKey.length <= visibleChars) {
    return trimmedKey.substring(0, 2) + "*".repeat(trimmedKey.length - 2);
  }
  
  return trimmedKey.substring(0, visibleChars) + "*".repeat(Math.min(10, trimmedKey.length - visibleChars));
}

/**
 * Wrapper class for API keys that protects against accidental logging
 */
export class SecureApiKey {
  private value: string;
  
  constructor(apiKey: string) {
    this.value = apiKey;
  }
  
  /**
   * Get the raw API key value
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Returns a masked version of the API key when the object is converted to JSON
   */
  toJSON(): string {
    return maskApiKey(this.value);
  }
  
  /**
   * Returns a masked version of the API key when the object is converted to string
   */
  toString(): string {
    return maskApiKey(this.value);
  }
}
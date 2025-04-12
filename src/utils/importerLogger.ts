// Logging utility for ObsidianImporter plugin.
// Prefixes all logs with [ObsidianImporter].
// Supports debug mode toggle (set via constructor or setter).
// Provides info, warn, error, debug methods.
// Do NOT log sensitive data (e.g., API keys).

import { DEFAULT_SETTINGS } from "./settings";

export type ImporterLoggerOptions = {
  debug: boolean;
  pluginName?: string; // Defaults to "ObsidianImporter"
};

/**
 * Singleton/factory for ImporterLogger.
 * Use getLogger() to access the shared logger instance.
 * The debug flag is initialized from settings and can be updated at runtime.
 */
export class ImporterLogger {
  private debug: boolean;
  private readonly prefix: string;

  constructor(options: ImporterLoggerOptions) {
    this.debug = options.debug;
    this.prefix = `[${options.pluginName || "ObsidianImporter"}]`;
  }

  setDebugMode(enabled: boolean) {
    this.debug = enabled;
  }

  info(...args: unknown[]) {
    // Avoid logging sensitive data!
    // eslint-disable-next-line no-console
    console.info(this.prefix, ...this.redactSensitive(args));
  }

  warn(...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.warn(this.prefix, ...this.redactSensitive(args));
  }

  error(...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.error(this.prefix, ...this.redactSensitive(args));
  }

  debugLog(...args: unknown[]) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug(this.prefix, ...this.redactSensitive(args));
    }
  }

  // Redact known sensitive fields from objects/strings
  private redactSensitive(args: unknown[]): unknown[] {
    return args.map(arg => {
      if (typeof arg === "object" && arg !== null) {
        // Shallow redact for known keys
        const redacted = { ...arg } as Record<string, unknown>;
        if ("apiKey" in redacted) redacted.apiKey = "[REDACTED]";
        return redacted;
      }
      if (typeof arg === "string" && arg.toLowerCase().includes("apikey")) {
        return arg.replace(/(apiKey\s*[:=]\s*)["']?[^"'\s]+["']?/gi, "$1[REDACTED]");
      }
      return arg;
    });
  }
}

// Singleton instance
let loggerInstance: ImporterLogger | null = null;

/**
 * Returns the shared ImporterLogger instance.
 * The debug flag is initialized from DEFAULT_SETTINGS.debug.
 * To update the debug flag at runtime (e.g., when settings change), call getLogger().setDebugMode(newDebugValue).
 */
export function getLogger(): ImporterLogger {
  if (!loggerInstance) {
    loggerInstance = new ImporterLogger({ debug: DEFAULT_SETTINGS.debug });
  }
  return loggerInstance;
}
// Example usage:
// import { getLogger } from "./importerLogger";
// const logger = getLogger();
// logger.info("Import started");
// logger.warn("Potential issue");
// logger.error("An error occurred", err);
// logger.debugLog("Detailed debug info", data);
// // To update debug mode at runtime:
// logger.setDebugMode(newDebugValue);
// logger.debugLog("Detailed debug info", data);
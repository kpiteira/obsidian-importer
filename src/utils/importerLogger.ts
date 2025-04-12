// Logging utility for ObsidianImporter plugin.
// Prefixes all logs with [ObsidianImporter].
// Supports debug mode toggle (set via constructor or setter).
// Provides info, warn, error, debug methods.
// Do NOT log sensitive data (e.g., API keys).

export type ImporterLoggerOptions = {
  debug: boolean;
  pluginName?: string; // Defaults to "ObsidianImporter"
};

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

// Example usage:
// import { ImporterLogger } from "./importerLogger";
// const logger = new ImporterLogger({ debug: settings.debug });
// logger.info("Import started");
// logger.warn("Potential issue");
// logger.error("An error occurred", err);
// logger.debugLog("Detailed debug info", data);
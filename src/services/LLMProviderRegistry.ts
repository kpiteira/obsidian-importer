import { LLMProvider, ProviderType } from "./LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Registry for managing multiple LLM providers
 */
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  private logger = getLogger();
  
  // Map between ProviderType enum values and expected provider names
  private providerTypeToName: Map<string, string> = new Map([
    [ProviderType.REQUESTY, 'requesty'],
    [ProviderType.OPENAI, 'openai'],
    [ProviderType.OPENROUTER, 'openrouter'],
    [ProviderType.LOCAL, 'ollama']
  ]);
  
  /**
   * Register a provider in the registry
   * @param provider The provider to register
   */
  register(provider: LLMProvider): void {
    const providerName = provider.getName().toLowerCase();
    this.logger.debugLog(`Registering provider: ${providerName}`);
    
    // Register by lowercase name
    this.providers.set(providerName, provider);
    
    // Find the corresponding enum value and register by enum value as well
    for (const [enumValue, mappedName] of this.providerTypeToName.entries()) {
      if (mappedName === providerName) {
        this.providers.set(enumValue, provider);
        this.logger.debugLog(`Also registered as enum value: ${enumValue}`);
      }
    }
  }
  
  /**
   * Get a provider by name or enum value
   * @param name The name or enum value of the provider to retrieve
   * @returns The provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): LLMProvider {
    // If name is empty or undefined, use default
    if (!name) {
      this.logger.debugLog(`No provider name specified, using requesty as default`);
      name = ProviderType.REQUESTY;
    }
    
    this.logger.debugLog(`Attempting to get provider: ${name}`);
    
    // Try direct lookup with the provided name
    let provider = this.providers.get(name);
    
    // Try lowercase name if not found
    if (!provider) {
      this.logger.debugLog(`Provider not found with exact name, trying lowercase`);
      provider = this.providers.get(name.toLowerCase());
    }
    
    // Try using the provider name mapping if it's an enum value
    if (!provider && this.providerTypeToName.has(name)) {
      const mappedName = this.providerTypeToName.get(name);
      this.logger.debugLog(`Mapped enum ${name} to provider name: ${mappedName}`);
      provider = this.providers.get(mappedName!);
    }
    
    // Log available providers if not found
    if (!provider) {
      const availableProviders = Array.from(this.providers.keys()).join(', ');
      this.logger.error(`Provider ${name} not found in registry. Available providers: ${availableProviders}`);
      throw new Error(`Provider ${name} not found in registry`);
    }
    
    return provider;
  }
  
  /**
   * Get all registered provider names
   * @returns Array of provider names
   */
  getProviderNames(): string[] {
    // Return only unique provider names (not enum values)
    return [...new Set(
      Array.from(this.providers.entries())
        .filter(([key]) => !Object.values(ProviderType).includes(key as ProviderType))
        .map(([key]) => key)
    )];
  }
  
  /**
   * Get all registered providers
   * @returns Array of provider instances
   */
  getAllProviders(): LLMProvider[] {
    // Use Set to deduplicate providers
    return Array.from(new Set(this.providers.values()));
  }
  
  /**
   * Check if a provider with the given name exists
   * @param name The name of the provider to check
   * @returns True if provider exists, false otherwise
   */
  hasProvider(name: string): boolean {
    // First try direct lookup
    if (this.providers.has(name)) {
      return true;
    }
    
    // Try lowercase
    if (this.providers.has(name.toLowerCase())) {
      return true;
    }
    
    // Try using the provider name mapping
    return this.providerTypeToName.has(name) && 
           this.providers.has(this.providerTypeToName.get(name)!);
  }
  
  /**
   * Clear all registered providers
   */
  clear(): void {
    this.providers.clear();
  }
}
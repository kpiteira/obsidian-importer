import { LLMProvider } from "./LLMProvider";

/**
 * Registry for managing multiple LLM providers
 */
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  
  /**
   * Register a provider in the registry
   * @param provider The provider to register
   */
  register(provider: LLMProvider): void {
    this.providers.set(provider.getName().toLowerCase(), provider);
  }
  
  /**
   * Get a provider by name
   * @param name The name of the provider to retrieve
   * @returns The provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }
  
  /**
   * Get all registered provider names
   * @returns Array of provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Get all registered providers
   * @returns Array of provider instances
   */
  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Check if a provider with the given name exists
   * @param name The name of the provider to check
   * @returns True if provider exists, false otherwise
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }
  
  /**
   * Clear all registered providers
   */
  clear(): void {
    this.providers.clear();
  }
}
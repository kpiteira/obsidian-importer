import { describe, it, expect, beforeEach } from 'vitest';
import { LLMProvider } from '../../src/services/LLMProvider';
import { LLMProviderRegistry } from '../../src/services/LLMProviderRegistry';

// Mock implementation of LLMProvider for testing
class MockProvider implements LLMProvider {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
  
  getDefaultEndpoint(): string {
    return 'https://mock-api.example.com';
  }
  
  async getAvailableModels() {
    return [{ id: 'mock-model', name: 'Mock Model' }];
  }
  
  async callLLM(prompt: string) {
    return `Response from ${this.name}: ${prompt}`;
  }
  
  async validateConnection() {
    return true;
  }
  
  requiresApiKey(): boolean {
    return true;
  }
  
  requiresEndpoint(): boolean {
    return true;
  }
}

describe('LLMProviderRegistry', () => {
  let registry: LLMProviderRegistry;
  let provider1: LLMProvider;
  let provider2: LLMProvider;
  
  beforeEach(() => {
    registry = new LLMProviderRegistry();
    provider1 = new MockProvider('provider1');
    provider2 = new MockProvider('provider2');
  });
  
  it('should register providers', () => {
    registry.register(provider1);
    registry.register(provider2);
    
    expect(registry.getProviderNames()).toHaveLength(2);
    expect(registry.getProviderNames()).toContain('provider1');
    expect(registry.getProviderNames()).toContain('provider2');
  });
  
  it('should get provider by name', () => {
    registry.register(provider1);
    
    const retrievedProvider = registry.getProvider('provider1');
    expect(retrievedProvider).toBe(provider1);
  });
  
  it('should throw error when getting non-existent provider', () => {
    expect(() => registry.getProvider('non-existent')).toThrow();
  });
  
  it('should get all providers', () => {
    registry.register(provider1);
    registry.register(provider2);
    
    const providers = registry.getAllProviders();
    expect(providers).toHaveLength(2);
    expect(providers).toContain(provider1);
    expect(providers).toContain(provider2);
  });
  
  it('should check if provider exists', () => {
    registry.register(provider1);
    
    expect(registry.hasProvider('provider1')).toBe(true);
    expect(registry.hasProvider('non-existent')).toBe(false);
  });
  
  it('should clear all providers', () => {
    registry.register(provider1);
    registry.register(provider2);
    
    registry.clear();
    
    expect(registry.getProviderNames()).toHaveLength(0);
  });
  
  it('should be case-insensitive for provider names', () => {
    const providerA = new MockProvider('ProviderA');
    registry.register(providerA);
    
    expect(registry.hasProvider('providera')).toBe(true);
    expect(registry.getProvider('PROVIDERA')).toBe(providerA);
  });
});
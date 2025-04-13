import { vi } from 'vitest';
// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect } from 'vitest';

describe('typeDetector', () => {
  it('should be a placeholder test', () => {
    expect(true).toBe(true);
  });
});
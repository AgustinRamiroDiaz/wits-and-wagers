import { describe, it, expect } from 'vitest';

describe('Vitest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript', () => {
    const testArray: number[] = [1, 2, 3];
    expect(testArray.length).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import { formatBytes } from './file';

describe('formatBytes', () => {
  it('小于 1KB 显示字节', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('KB 量级保留一位小数', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('MB 量级保留一位小数', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

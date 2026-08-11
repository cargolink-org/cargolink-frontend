import {
  validateFile,
  isAllowedMimeType,
  formatFileSize,
  MAX_FILE_SIZE_BYTES,
} from '../../src/utils/fileValidation';

describe('isAllowedMimeType', () => {
  it('accepts pdf and common image types', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(true);
    expect(isAllowedMimeType('image/png')).toBe(true);
    expect(isAllowedMimeType('image/jpeg')).toBe(true);
  });

  it('rejects unsupported or missing types', () => {
    expect(isAllowedMimeType('video/mp4')).toBe(false);
    expect(isAllowedMimeType(undefined)).toBe(false);
    expect(isAllowedMimeType(null)).toBe(false);
  });
});

describe('validateFile', () => {
  const baseFile = {
    uri: 'file://doc.pdf',
    name: 'doc.pdf',
    size: 1024,
    mimeType: 'application/pdf',
  };

  it('accepts a valid pdf under the size limit', () => {
    expect(validateFile(baseFile)).toEqual({ valid: true });
  });

  it('rejects when no file is selected', () => {
    expect(validateFile({ uri: '', name: '' }).valid).toBe(false);
  });

  it('rejects unsupported mime types', () => {
    const result = validateFile({ ...baseFile, mimeType: 'video/mp4' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/PDF or an image/);
  });

  it('rejects files over the size limit', () => {
    const result = validateFile({ ...baseFile, size: MAX_FILE_SIZE_BYTES + 1 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/);
  });

  it('rejects empty files', () => {
    const result = validateFile({ ...baseFile, size: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/empty/);
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kb, and mb', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('returns an empty string for missing sizes', () => {
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(null)).toBe('');
  });
});

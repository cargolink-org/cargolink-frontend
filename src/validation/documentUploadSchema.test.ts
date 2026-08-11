import { documentUploadSchema, DOCUMENT_TYPES } from '../../src/validation/documentUploadSchema';

const validFile = {
  uri: 'file://license.jpg',
  name: 'license.jpg',
  size: 2048,
  mimeType: 'image/jpeg',
};

describe('documentUploadSchema', () => {
  it('accepts every declared document type with a valid file', () => {
    DOCUMENT_TYPES.forEach((docType) => {
      const result = documentUploadSchema.safeParse({ docType, file: validFile });
      expect(result.success).toBe(true);
    });
  });

  it('rejects an unsupported file type', () => {
    const result = documentUploadSchema.safeParse({
      docType: 'rc',
      file: { ...validFile, mimeType: 'application/zip' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a file over the size limit', () => {
    const result = documentUploadSchema.safeParse({
      docType: 'insurance',
      file: { ...validFile, size: 999_999_999 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty (0-byte) file', () => {
    const result = documentUploadSchema.safeParse({
      docType: 'permit',
      file: { ...validFile, size: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown document type', () => {
    const result = documentUploadSchema.safeParse({ docType: 'passport', file: validFile });
    expect(result.success).toBe(false);
  });
});

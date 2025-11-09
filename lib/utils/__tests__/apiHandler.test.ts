import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  validateBody,
  validateAddresses,
  createErrorResponse,
  createSuccessResponse,
} from '../apiHandler';

describe('API Handler Utilities', () => {
  describe('validateBody', () => {
    it('should validate body with all required fields', () => {
      const body = { field1: 'value1', field2: 'value2' };
      const result = validateBody(body, ['field1', 'field2']);
      expect(result.valid).toBe(true);
      expect(result.missing).toBeUndefined();
    });

    it('should detect missing fields', () => {
      const body = { field1: 'value1' };
      const result = validateBody(body, ['field1', 'field2']);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['field2']);
    });

    it('should reject null, undefined, or empty string values', () => {
      expect(validateBody({ field: null }, ['field']).valid).toBe(false);
      expect(validateBody({ field: undefined }, ['field']).valid).toBe(false);
      expect(validateBody({ field: '' }, ['field']).valid).toBe(false);
    });
  });

  describe('validateAddresses', () => {
    it('should validate all addresses', () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ];
      const result = validateAddresses(addresses);
      expect(result.valid).toBe(true);
      expect(result.invalid).toBeUndefined();
    });

    it('should detect invalid addresses', () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        'invalid-address',
      ];
      const result = validateAddresses(addresses);
      expect(result.valid).toBe(false);
      expect(result.invalid).toEqual(['invalid-address']);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with default values', () => {
      const response = createErrorResponse('Error message');
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it('should create error response with custom code and status', () => {
      const response = createErrorResponse('Error message', 'CUSTOM_ERROR', 500);
      expect(response).toBeDefined();
      expect(response.status).toBe(500);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const response = createSuccessResponse({ key: 'value' }, 200);
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });
  });
});


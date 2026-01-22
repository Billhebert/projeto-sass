/**
 * Integration Tests - Storage Utils
 * Tests the storageUtils IIFE module loaded in jsdom
 */

describe('Storage Utils (Integration Tests)', () => {
  let storageUtils;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.resetModules();
    
    // Load the storage-utils script
    const fs = require('fs');
    const path = require('path');
    const scriptContent = fs.readFileSync(
      path.join(__dirname, '../storage-utils.js'),
      'utf8'
    );
    
    // Execute in Node context with window/global  
    eval(scriptContent);
    
    // Get the storageUtils from global context
    storageUtils = global.storageUtils;
  });

  test('should exist and be accessible', () => {
    expect(typeof storageUtils).toBe('object');
  });

  describe('getItem()', () => {
    test('should retrieve item from localStorage', () => {
      localStorage.setItem('test-key', 'test-value');
      
      const result = storageUtils.getItem('test-key');
      
      expect(result).toBe('test-value');
    });

    test('should return null when item does not exist', () => {
      const result = storageUtils.getItem('non-existent');
      
      expect(result).toBeNull();
    });

    test('should return fallback value when provided', () => {
      const result = storageUtils.getItem('non-existent', 'fallback');
      
      expect(result).toBe('fallback');
    });
  });

  describe('setItem()', () => {
    test('should set item in localStorage', () => {
      const result = storageUtils.setItem('test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe('test-value');
    });

    test('should return true on success', () => {
      const result = storageUtils.setItem('key', 'value');
      
      expect(result).toBe(true);
    });
  });

  describe('removeItem()', () => {
    test('should remove item from localStorage', () => {
      localStorage.setItem('test-key', 'value');
      
      storageUtils.removeItem('test-key');
      
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('clear()', () => {
    test('should clear all localStorage', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      
      storageUtils.clear();
      
      expect(localStorage.length).toBe(0);
    });
  });

  describe('getJSON()', () => {
    test('should parse and return JSON object', () => {
      const obj = { key: 'value', number: 42 };
      localStorage.setItem('json-key', JSON.stringify(obj));
      
      const result = storageUtils.getJSON('json-key');
      
      expect(result).toEqual(obj);
    });

    test('should return default on parse error', () => {
      localStorage.setItem('bad-json', 'invalid json {]');
      
      const result = storageUtils.getJSON('bad-json', { default: true });
      
      expect(result).toEqual({ default: true });
    });
  });

  describe('setJSON()', () => {
    test('should stringify and set JSON', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      
      storageUtils.setJSON('json-key', obj);
      
      const stored = JSON.parse(localStorage.getItem('json-key'));
      expect(stored).toEqual(obj);
    });

    test('should return true on success', () => {
      const result = storageUtils.setJSON('key', { data: 'value' });
      
      expect(result).toBe(true);
    });
  });

  describe('getArray()', () => {
    test('should retrieve and validate array', () => {
      const arr = [1, 2, 3, 4, 5];
      localStorage.setItem('array-key', JSON.stringify(arr));
      
      const result = storageUtils.getArray('array-key');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(arr);
    });

    test('should return default array when null', () => {
      const result = storageUtils.getArray('non-existent', []);
      
      expect(result).toEqual([]);
    });
  });

  describe('setArray()', () => {
    test('should validate and set array', () => {
      const arr = ['a', 'b', 'c'];
      
      const result = storageUtils.setArray('array-key', arr);
      
      expect(result).toBe(true);
      expect(JSON.parse(localStorage.getItem('array-key'))).toEqual(arr);
    });

    test('should reject non-array values', () => {
      const result = storageUtils.setArray('key', { not: 'array' });
      
      expect(result).toBe(false);
    });
  });

  describe('getObject()', () => {
    test('should retrieve and validate object', () => {
      const obj = { id: 1, name: 'test' };
      localStorage.setItem('obj-key', JSON.stringify(obj));
      
      const result = storageUtils.getObject('obj-key');
      
      expect(result).toEqual(obj);
    });

    test('should return default when null', () => {
      const result = storageUtils.getObject('non-existent', { default: true });
      
      expect(result).toEqual({ default: true });
    });
  });

  describe('setObject()', () => {
    test('should validate and set object', () => {
      const obj = { id: 1, name: 'test', active: true };
      
      const result = storageUtils.setObject('obj-key', obj);
      
      expect(result).toBe(true);
      expect(JSON.parse(localStorage.getItem('obj-key'))).toEqual(obj);
    });

    test('should reject non-object values', () => {
      const result = storageUtils.setObject('key', [1, 2, 3]);
      
      expect(result).toBe(false);
    });
  });

  describe('hasKey()', () => {
    test('should return true when key exists', () => {
      localStorage.setItem('exists', 'value');
      
      const result = storageUtils.hasKey('exists');
      
      expect(result).toBe(true);
    });

    test('should return false when key does not exist', () => {
      const result = storageUtils.hasKey('does-not-exist');
      
      expect(result).toBe(false);
    });
  });
});

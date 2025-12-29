/**
 * Tests for the logger utility
 */

import { createLogger, isDebugEnabled } from '../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with the specified module name', () => {
      const log = createLogger('TestModule');

      expect(log).toBeDefined();
      expect(typeof log.debug).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should include module name in log output', () => {
      const log = createLogger('TestModule');

      log.info('Test message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('[TestModule]');
      expect(logCall).toContain('Test message');
    });
  });

  describe('log.debug', () => {
    it('should log debug messages in development mode', () => {
      const log = createLogger('Debug');

      log.debug('Debug message', { key: 'value' });

      // In test environment with __DEV__ = true, debug should log
      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('[DEBUG]');
      expect(logCall).toContain('Debug message');
    });

    it('should include data object in debug output', () => {
      const log = createLogger('Debug');

      log.debug('With data', { count: 5, active: true });

      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('count');
      expect(logCall).toContain('5');
    });
  });

  describe('log.info', () => {
    it('should log info messages', () => {
      const log = createLogger('Info');

      log.info('Info message');

      expect(consoleSpy.info).toHaveBeenCalled();
      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('[INFO]');
      expect(logCall).toContain('Info message');
    });

    it('should include structured data', () => {
      const log = createLogger('Info');

      log.info('User logged in', { userId: 'abc123' });

      const logCall = consoleSpy.info.mock.calls[0][0];
      expect(logCall).toContain('userId');
      expect(logCall).toContain('abc123');
    });
  });

  describe('log.warn', () => {
    it('should log warning messages', () => {
      const log = createLogger('Warn');

      log.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logCall = consoleSpy.warn.mock.calls[0][0];
      expect(logCall).toContain('[WARN]');
      expect(logCall).toContain('Warning message');
    });
  });

  describe('log.error', () => {
    it('should log error messages', () => {
      const log = createLogger('Error');

      log.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('[ERROR]');
      expect(logCall).toContain('Error message');
    });

    it('should include error object in output', () => {
      const log = createLogger('Error');
      const error = new Error('Test error');

      log.error('Something failed', error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('Test error');
    });

    it('should include both error and data', () => {
      const log = createLogger('Error');
      const error = new Error('Test error');

      log.error('API call failed', error, { endpoint: '/users' });

      expect(consoleSpy.error).toHaveBeenCalled();
      const logCall = consoleSpy.error.mock.calls[0][0];
      expect(logCall).toContain('Test error');
      expect(logCall).toContain('endpoint');
      expect(logCall).toContain('/users');
    });

    it('should handle non-Error objects', () => {
      const log = createLogger('Error');

      log.error('Something failed', { code: 500, message: 'Server error' });

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('isDebugEnabled', () => {
    it('should return true in development mode', () => {
      // __DEV__ is set to true in jest.config.js
      expect(isDebugEnabled()).toBe(true);
    });
  });

  describe('timestamp formatting', () => {
    it('should include ISO timestamp in logs', () => {
      const log = createLogger('Timestamp');

      log.info('Test message');

      const logCall = consoleSpy.info.mock.calls[0][0];
      // Check for ISO date format (YYYY-MM-DDTHH:mm:ss)
      expect(logCall).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

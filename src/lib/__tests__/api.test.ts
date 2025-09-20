import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { authenticateWorker } from '../api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock fetch
declare const global: typeof globalThis & {
  fetch: jest.Mock;
};
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateWorker', () => {
    it('should make login request with correct parameters', async () => {
      const mockResponse = {
        data: {
          worker: {
            id: '1',
            email: 'test@example.com',
            name: 'Test Worker',
            role: 'worker',
            is_active: true,
            created_at: '2023-01-01',
            updated_at: '2023-01-01',
          },
          token: 'mock-token',
          message: 'Login successful',
        },
        error: null,
        status: 200,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse.data,
      });

      const result = await authenticateWorker('test@example.com', 'password');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
          }),
        })
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(result.error).toBeNull();
    });

    it('should handle login error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      const result = await authenticateWorker(
        'test@example.com',
        'wrong-password'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe('Invalid credentials');
      expect(result.status).toBe(401);
    });

    it('should handle network error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await authenticateWorker('test@example.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
      expect(result.status).toBe(0);
    });
  });

  describe('authenticated requests', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mock-auth-token');
      await AsyncStorage.setItem('token', 'mock-auth-token');
    });

    it('should include auth token in requests', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '1', name: 'Test Worker' }),
      });

      await apiClient.getWorkerProfile();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/worker/profile'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );
    });
  });
});

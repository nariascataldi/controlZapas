import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { API_URL, fetchAPI } from '../js/api.js';

global.fetch = jest.fn();

describe('API Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    describe('API_URL', () => {
        it('should have correct API URL', () => {
            expect(API_URL).toBe('/api');
        });
    });

    describe('fetchAPI', () => {
        it('should make a GET request by default', async () => {
            const mockResponse = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await fetchAPI('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.any(Object)
            );
            expect(result).toEqual(mockResponse);
        });

        it('should include Authorization header when token exists', async () => {
            localStorage.setItem('cz_token', 'test-token-123');
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await fetchAPI('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token-123'
                    })
                })
            );
        });

        it('should not include Authorization header when no token', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await fetchAPI('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        'Authorization': expect.anything()
                    })
                })
            );
        });

        it('should make a POST request with body when specified', async () => {
            const payload = { name: 'Test' };
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await fetchAPI('/test', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(payload)
                })
            );
        });

        it('should throw error on non-OK response', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Bad request' })
            });

            await expect(fetchAPI('/test')).rejects.toThrow('Bad request');
            consoleSpy.mockRestore();
        });

        it('should handle network errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchAPI('/test')).rejects.toThrow('Network error');
            consoleSpy.mockRestore();
        });

        it('should merge custom headers with default headers', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({})
            });

            await fetchAPI('/test', {
                headers: { 'X-Custom': 'value' }
            });

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/test`,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Custom': 'value'
                    })
                })
            );
        });
    });
});

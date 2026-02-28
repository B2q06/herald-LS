import { describe, expect, it } from 'vitest';
import { createApp } from './index.ts';

describe('error middleware', () => {
  it('returns 500 with error message for unhandled errors', async () => {
    const app = createApp();

    // Add a route that throws an error after the app is created
    app.get('/test-error', () => {
      throw new Error('Something went wrong');
    });

    const res = await app.request('/test-error');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('does not leak stack traces in error responses', async () => {
    const app = createApp();

    app.get('/test-error-leak', () => {
      throw new Error('Secret internal details');
    });

    const res = await app.request('/test-error-leak');
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('Secret internal details');
    expect(JSON.stringify(body)).not.toContain('stack');
  });
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST as logInteraction } from '@/app/api/analytics/interaction/route';
import type { NextRequest } from 'next/server';

const enableMockMode = () => {
  const keys = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key] ?? undefined]),
  ) as Record<(typeof keys)[number], string | undefined>;

  for (const key of keys) {
    delete process.env[key];
  }

  return () => {
    for (const key of keys) {
      const value = previous[key];
      if (typeof value === 'string') {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  };
};

const createRequest = (body: unknown): NextRequest =>
  new Request('https://example.com/api/analytics/interaction', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

test('interaction logging succeeds in mock mode with minimal payload', async () => {
  const restoreEnv = enableMockMode();

  try {
    const request = createRequest({
      pagePath: '/dashboard',
      buttonId: 'start-journey',
      buttonText: 'Start Journey',
    });

    const response = await logInteraction(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, {
      success: true,
      clickCount: 1,
      mockUsed: true,
    });
  } finally {
    restoreEnv();
  }
});

test('interaction logging validates required fields', async () => {
  const restoreEnv = enableMockMode();

  try {
    const request = createRequest({
      pagePath: '',
      buttonId: '',
    });

    const response = await logInteraction(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'pagePath and buttonId are required');
  } finally {
    restoreEnv();
  }
});



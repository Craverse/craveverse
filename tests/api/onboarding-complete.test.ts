import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST as completeOnboarding } from '@/app/api/onboarding/complete/route';
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
  new Request('https://example.com/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

test('onboarding completion succeeds in mock mode and returns user payload', async () => {
  const restoreEnv = enableMockMode();

  try {
    const request = createRequest({
      craving: 'sugar cravings',
      quizAnswers: { q1: 'daily', q2: 'moderate' },
      personalization: { introMessage: 'Welcome back!' },
      quizVersion: 'v2',
    });

    const response = await completeOnboarding(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.mockUsed, true);
    assert.equal(payload.user.primary_craving, 'sugar cravings');
    assert.equal(payload.user.is_newbie, false);
    assert.ok(
      typeof payload.user.onboarding_completed_at === 'string',
      'should include completion timestamp',
    );
  } finally {
    restoreEnv();
  }
});

test('onboarding completion validates craving selection', async () => {
  const restoreEnv = enableMockMode();

  try {
    const request = createRequest({
      craving: '',
      quizAnswers: {},
    });

    const response = await completeOnboarding(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'Craving selection is required');
  } finally {
    restoreEnv();
  }
});



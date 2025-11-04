# Supabase Edge Functions for CraveVerse

This document describes the Supabase Edge Functions required for the CraveVerse application. Edge Functions are serverless TypeScript functions that run in Supabase's infrastructure.

## Setup Instructions

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`
4. Deploy functions: `supabase functions deploy function-name`

## Required Edge Functions

### 1. `daily-token-reset`

**Purpose**: Reset daily AI token usage counters for all users at midnight UTC.

**Trigger**: Scheduled (Cron: `0 0 * * *` - daily at midnight UTC)

**Code Location**: `supabase/functions/daily-token-reset/index.ts`

**Functionality**:
- Queries `ai_usage_metrics` table for all users
- Groups by `user_id` and `DATE(created_at)`
- Resets daily token counts in a tracking table (if you create one) or clears old metrics
- Ensures 25k token limit is enforced per user per day

**SQL Setup**:
```sql
-- Create scheduled job (Supabase Dashboard > Database > Cron Jobs)
SELECT cron.schedule(
  'daily-token-reset',
  '0 0 * * *', -- Daily at midnight UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-token-reset',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 2. `batch-ai-processor`

**Purpose**: Process batched AI personalization jobs for multiple users.

**Trigger**: API call from Vercel Cron or scheduled job

**Code Location**: `supabase/functions/batch-ai-processor/index.ts`

**Functionality**:
- Reads from `queue_jobs` table where `status = 'pending'`
- Processes jobs in batches (e.g., 10 users at a time)
- Calls OpenAI API for personalization
- Updates user profiles with AI-generated content
- Marks jobs as completed or failed

**Manual Trigger**:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/batch-ai-processor' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### 3. `streak-updater`

**Purpose**: Update user streaks daily and award XP for consecutive days.

**Trigger**: Scheduled (Cron: `0 1 * * *` - daily at 1 AM UTC)

**Functionality**:
- Checks `users` table for users with `streak_count > 0`
- Verifies last activity from `user_progress` table
- Increments streak if activity found in last 24 hours
- Resets streak to 0 if no activity
- Awards bonus XP for milestone streaks (7, 14, 30 days)

**SQL Setup**:
```sql
SELECT cron.schedule(
  'streak-updater',
  '0 1 * * *', -- Daily at 1 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/streak-updater',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 4. `cleanup-expired-tokens`

**Purpose**: Clean up expired `shareable_progress` tokens and old data.

**Trigger**: Scheduled (Cron: `0 2 * * *` - daily at 2 AM UTC)

**Functionality**:
- Deletes rows from `shareable_progress` where `expires_at < NOW()`
- Cleans up old `ai_usage_metrics` older than 90 days
- Removes cancelled battles older than 7 days

**SQL Setup**:
```sql
SELECT cron.schedule(
  'cleanup-expired-tokens',
  '0 2 * * *', -- Daily at 2 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-expired-tokens',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

## Environment Variables

Set these in Supabase Dashboard > Project Settings > Edge Functions:

- `OPENAI_API_KEY`: Your OpenAI API key for GPT-5-mini
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for elevated permissions

## Testing Edge Functions

```bash
# Test locally
supabase functions serve function-name

# Test deployed function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/function-name' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Notes

- All edge functions should use the service role key for database operations
- Implement rate limiting and error handling in each function
- Log all operations for debugging
- Use Supabase client library for database access
- Functions run in Node.js 18 environment


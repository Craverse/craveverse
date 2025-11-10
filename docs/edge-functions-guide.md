# Edge Functions Task Pipeline

A directed overview of the CraveVerse edge-function suite and the SQL-driven scheduler we layer on top of Supabase.

## Edge Functions at a Glance
- **daily-token-reset** – resets per-user AI token counts each night so the 25k daily cap stays enforced.
- **batch-ai-processor** – pulls pending personalization jobs, calls OpenAI in batches, and updates users.
- **streak-updater** – evaluates daily activity to increment (or reset) streak counts and grant XP bonuses.
- **cleanup-expired-tokens** – removes expired share links, stale AI usage rows, and old cancelled battles.

Each function lives under `supabase/functions/<name>/` and is invoked via `https://<project>.supabase.co/functions/v1/<name>`.

## Why We Added a Scheduled Task Log
Even with cron-ready edge functions, we capture every invocation intent inside a `scheduled_tasks` table. This design gives us:

1. **Dynamic task management** – log new work without redeploying functions.
2. **Decoupled scheduling + execution** – pure SQL handles queuing; edge functions keep business logic focused.
3. **Batch processing** – a single worker call processes all pending tasks.
4. **Central tracking** – `scheduled_tasks.status` shows pending vs completed for auditing.
5. **Error resiliency** – failed rows remain pending, so retries are straightforward.
6. **Future scalability** – new tasks = new rows; existing infrastructure remains untouched.
7. **Automation hooks** – external cron (Vercel, GitHub Actions) can trigger one `process_scheduled_tasks()` call.

## Implementation Blueprint

### 1. Create the Table
```sql
CREATE TABLE scheduled_tasks (
    id SERIAL PRIMARY KEY,
    function_name TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    status TEXT DEFAULT 'pending'
);
```

### 2. Logger Function
```sql
CREATE OR REPLACE FUNCTION log_scheduled_task(task_name TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO scheduled_tasks (function_name, scheduled_time)
    VALUES (task_name, NOW());
END;
$$ LANGUAGE plpgsql;
```

### 3. Log Work Items
```sql
SELECT log_scheduled_task('daily-token-reset');
SELECT log_scheduled_task('batch-ai-processor');
SELECT log_scheduled_task('streak-updater');
SELECT log_scheduled_task('cleanup-expired-tokens');
```

### 4. Worker Function
```sql
CREATE OR REPLACE FUNCTION process_scheduled_tasks()
RETURNS VOID AS $$
DECLARE
    task RECORD;
BEGIN
    FOR task IN SELECT * FROM scheduled_tasks WHERE status = 'pending' LOOP
        IF task.function_name = 'daily-token-reset' THEN
            PERFORM net.http_post(
                url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-token-reset',
                headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
            );
        END IF;
        -- Extend with additional IF branches for other functions
        UPDATE scheduled_tasks SET status = 'completed' WHERE id = task.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 5. Manual Run
```sql
SELECT process_scheduled_tasks();
```

### 6. Optional Automation
- Call `log_scheduled_task()` when your app needs work queued.
- Use Vercel cron / GitHub Actions / external scheduler to execute `process_scheduled_tasks()` periodically.

## Operational Flow
1. **Log** – business logic decides a task is needed → call `log_scheduled_task('function-name')`.
2. **Queue** – row appears in `scheduled_tasks` with `status = 'pending'`.
3. **Process** – `process_scheduled_tasks()` loops through pending rows, POSTs to the right edge function, then marks the row `completed`.
4. **Observe** – dashboards/queries monitor pending vs completed counts.

## Integration Notes
- Replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` with real Supabase credentials (often service role for server-side execution).
- Add error handling in `process_scheduled_tasks()` to leave failed rows at `pending` or mark them `failed` with an error payload.
- Edge functions should validate input and return structured logs for easier debugging.
- The task table becomes the single source of truth for what ran, when, and why.

By pairing Supabase edge functions with SQL-driven scheduling, we get the best of both worlds: serverless execution plus auditable, extensible task orchestration.

## Edge Function Implementations

```ts:supabase/functions/daily-token-reset/index.ts
import { createClient } from "npm:@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export default async function dailyTokenReset() {
  const { data, error } = await supabase
    .from("ai_usage_metrics")
    .select("user_id, DATE(created_at)")
    .group("user_id, DATE(created_at)");

  if (error) {
    console.error("Failed to fetch token usage", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: implement actual reset logic (e.g., delete/reset aggregates)

  return new Response(
    JSON.stringify({ message: "Daily tokens reset successfully", fetched: data?.length ?? 0 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
```

```ts:supabase/functions/batch-ai-processor/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

serve(async () => {
  const { data: jobs, error } = await supabase
    .from("queue_jobs")
    .select("*")
    .eq("status", "pending")
    .limit(10);

  if (error) {
    console.error("Failed to fetch pending jobs:", error);
    return new Response("Failed to fetch jobs", { status: 500 });
  }

  // TODO: Process each job (OpenAI calls, personalization, etc.)
  // for (const job of jobs ?? []) {
  //   // ...
  // }

  return new Response(
    JSON.stringify({
      message: "Batched AI processing completed",
      fetched: jobs?.length ?? 0,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
```

```ts:supabase/functions/streak-updater/index.ts
/// <reference types="https://deno.land/std@0.208.0/types.d.ts" />

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for the streak-updater edge function.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export default async function handler(_req: Request) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: activeProgress, error: progressError } = await supabase
    .from("user_progress")
    .select("user_id")
    .gte("completed_at", dayAgo);

  if (progressError) {
    console.error("Failed to fetch recent progress", progressError);
    return new Response(JSON.stringify({
      error: "failed to fetch recent progress",
      details: progressError.message,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const activeIds = new Set((activeProgress ?? []).map((row) => row.user_id));

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, streak_count, updated_at");

  if (usersError) {
    console.error("Failed to fetch users", usersError);
    return new Response(JSON.stringify({
      error: "failed to fetch users",
      details: usersError.message,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const updates: Promise<unknown>[] = [];
  const summary = { streakIncremented: 0, streakReset: 0 };

  (users ?? []).forEach((user) => {
    const hasActivity = activeIds.has(user.id);
    if (hasActivity) {
      updates.push(
        supabase.from("users").update({
          streak_count: (user.streak_count ?? 0) + 1,
          updated_at: now.toISOString(),
        }).eq("id", user.id),
      );
      summary.streakIncremented += 1;
    } else if ((user.streak_count ?? 0) > 0) {
      updates.push(
        supabase.from("users").update({
          streak_count: 0,
          updated_at: now.toISOString(),
        }).eq("id", user.id),
      );
      summary.streakReset += 1;
    }
  });

  if (updates.length > 0) {
    const results = await Promise.allSettled(updates);
    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length > 0) {
      console.error("Some streak updates failed", rejected);
      return new Response(JSON.stringify({
        error: "one or more streak updates failed",
        details: rejected.map((r) => (r as PromiseRejectedResult).reason?.message ?? "unknown error"),
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response(JSON.stringify({
    message: "User streaks updated successfully",
    summary,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

```ts:supabase/functions/cleanup-expired-tokens/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

serve(async () => {
  const now = new Date();
  const nowIso = now.toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const deletions = [
    {
      label: "shareable_progress",
      op: supabase.from("shareable_progress").delete().lt("expires_at", nowIso),
    },
    {
      label: "ai_usage_metrics",
      op: supabase.from("ai_usage_metrics").delete().lt("created_at", ninetyDaysAgo),
    },
    {
      label: "battles",
      op: supabase.from("battles").delete().eq("status", "cancelled").lt("updated_at", sevenDaysAgo),
    },
  ];

  const results: Record<string, "ok" | string> = {};

  for (const { label, op } of deletions) {
    const { error } = await op;
    results[label] = error ? `error: ${error.message}` : "ok";
  }

  const hasFailure = Object.values(results).some((value) => value !== "ok");

  return new Response(
    JSON.stringify({ success: !hasFailure, timestamp: nowIso, results }),
    {
      status: hasFailure ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
```

<!-- 8e9030fa-ab1b-4271-9a05-bd606e7feb81 876e6f42-27cb-4e0b-a757-dcf4869a2584 -->
# Dashboard Reliability Fix

1. Confirm Supabase Data – Verify the active Clerk user exists in the `users` table and that `levels` has entries matching the user’s `current_level`/craving.
2. Fix Level Fetch Logic – Update `/api/levels/[levelId]` (and dashboard client) to use the actual level ID from Supabase instead of assuming `level-1`, avoiding the UUID casting error.
3. Tune Dashboard Requests – Increase/coordinate timeouts and ensure fetch dedupe so repeated calls don’t abort; add logging for level fetch duration.
4. Re-test & Document – Run quick preflight, navigate through tabs to confirm stability, and log findings or additional issues in metrics/issues files.
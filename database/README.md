# Database Setup

Execute the SQL scripts below in Supabase SQL Editor to bootstrap CraveVerse from scratch.

## Main Schema File

**File**: `database/craveverse-complete-schema.sql`

This is the **single, comprehensive schema file** that creates the entire database from scratch. It includes:
- Extensions (uuid-ossp)
- Custom types (craving_type, subscription_tier, battle_status, etc.)
- All tables (users, levels, battles, forum, shop, settings, etc.)
- Indexes for performance
- Triggers for auto-updating timestamps
- Row Level Security (RLS) policies
- Helper functions (get_user_progress_stats, award_xp_and_coins, etc.)
- Views (user_dashboard, level_details, etc.)
- Seed data (cravings, shop items)

**To execute**: Copy the entire contents of `craveverse-complete-schema.sql` into Supabase SQL Editor and run it.

## Rollback Script

**File**: `database/craveverse-rollback-schema.sql`

This script completely removes all objects created by the main schema file. It drops:
- Views
- Functions
- Triggers
- RLS Policies
- Tables (in reverse dependency order)
- Custom Types
- Extensions (optional, commented out)

**WARNING**: This will DELETE ALL DATA! Use only when you need to completely reset the database.

**To execute**: Copy the entire contents of `craveverse-rollback-schema.sql` into Supabase SQL Editor and run it.

## Optional Level Templates

**File**: `database/import-levels.sql` (if present)

If this file exists, it contains level templates. Run it after the main schema to populate level data.

## Execution Order

1. **First time setup**: Run `craveverse-complete-schema.sql` → Run `import-levels.sql` (if exists)
2. **Complete reset**: Run `craveverse-rollback-schema.sql` → Run `craveverse-complete-schema.sql` → Run `import-levels.sql` (if exists)

> **Tip**: Always keep a backup before running rollback or schema changes in production environments.


-- ============================================
-- CRAVEVERSE DATABASE ROLLBACK SCRIPT
-- ============================================
-- Execute this file in Supabase SQL Editor to completely remove all schema objects
-- File: database/craveverse-rollback-schema.sql
-- Last Updated: 2025-01-25
--
-- This script drops ALL objects created by craveverse-complete-schema.sql:
-- - Views
-- - Functions
-- - Triggers
-- - RLS Policies
-- - Tables (in reverse dependency order)
-- - Custom Types
-- - Extensions
--
-- WARNING: This will DELETE ALL DATA! Use with caution.
-- ============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS forum_post_details CASCADE;
DROP VIEW IF EXISTS battle_details CASCADE;
DROP VIEW IF EXISTS level_details CASCADE;
DROP VIEW IF EXISTS user_dashboard CASCADE;

-- Drop functions (they may depend on tables and types)
DROP FUNCTION IF EXISTS log_ai_usage(UUID, ai_model_type, INTEGER, DECIMAL, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS update_streak(UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS award_xp_and_coins(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS can_access_level(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_progress_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop triggers (they depend on functions and tables)
DROP TRIGGER IF EXISTS update_level_map_data_updated_at ON level_map_data CASCADE;
DROP TRIGGER IF EXISTS update_shop_items_updated_at ON shop_items CASCADE;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings CASCADE;
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences CASCADE;
DROP TRIGGER IF EXISTS update_pause_tokens_updated_at ON pause_tokens CASCADE;
DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts CASCADE;
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;

-- Drop RLS policies (they depend on tables)
-- Note: CASCADE is implicit when dropping tables, but we drop policies explicitly for clarity

-- Drop policies for level_map_data
DROP POLICY IF EXISTS "Allow public read access to level_map_data" ON level_map_data CASCADE;

-- Drop policies for user_settings
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings CASCADE;
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings CASCADE;

-- Drop policies for notification_preferences
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences CASCADE;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences CASCADE;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences CASCADE;

-- Drop policies for user_purchases
DROP POLICY IF EXISTS "Users can insert their own purchases" ON user_purchases CASCADE;
DROP POLICY IF EXISTS "Users can view their own purchases" ON user_purchases CASCADE;

-- Drop policies for shop_items
DROP POLICY IF EXISTS "Allow public read access to shop_items" ON shop_items CASCADE;

-- Drop policies for payment_transactions
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON payment_transactions CASCADE;

-- Drop policies for shareable_progress
DROP POLICY IF EXISTS "Anyone can view public progress shares by token" ON shareable_progress CASCADE;
DROP POLICY IF EXISTS "Users can insert their own shareable progress" ON shareable_progress CASCADE;
DROP POLICY IF EXISTS "Users can view their own shareable progress" ON shareable_progress CASCADE;

-- Drop policies for ai_usage_metrics
DROP POLICY IF EXISTS "Users can view their own AI usage" ON ai_usage_metrics CASCADE;

-- Drop policies for pause_tokens
DROP POLICY IF EXISTS "Users can update their own pause tokens" ON pause_tokens CASCADE;
DROP POLICY IF EXISTS "Users can view their own pause tokens" ON pause_tokens CASCADE;

-- Drop policies for forum_replies
DROP POLICY IF EXISTS "Users can update their own forum replies" ON forum_replies CASCADE;
DROP POLICY IF EXISTS "Users can insert their own forum replies" ON forum_replies CASCADE;
DROP POLICY IF EXISTS "Users can view all forum replies" ON forum_replies CASCADE;

-- Drop policies for forum_posts
DROP POLICY IF EXISTS "Users can update their own forum posts" ON forum_posts CASCADE;
DROP POLICY IF EXISTS "Users can insert their own forum posts" ON forum_posts CASCADE;
DROP POLICY IF EXISTS "Users can view all forum posts" ON forum_posts CASCADE;

-- Drop policies for battles
DROP POLICY IF EXISTS "Users can update their own battles" ON battles CASCADE;
DROP POLICY IF EXISTS "Users can insert their own battles" ON battles CASCADE;
DROP POLICY IF EXISTS "Users can view their own battles" ON battles CASCADE;

-- Drop policies for user_progress
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress CASCADE;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress CASCADE;
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress CASCADE;

-- Drop policies for users
DROP POLICY IF EXISTS "Users can update their own profile" ON users CASCADE;
DROP POLICY IF EXISTS "Users can view their own profile" ON users CASCADE;

-- Drop tables in reverse dependency order (child tables first, parent tables last)
-- Tables with no foreign keys or only referencing already-dropped tables
DROP TABLE IF EXISTS level_map_data CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS queue_jobs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS user_purchases CASCADE;
DROP TABLE IF EXISTS shop_items CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS shareable_progress CASCADE;
DROP TABLE IF EXISTS ai_usage_metrics CASCADE;
DROP TABLE IF EXISTS pause_tokens CASCADE;
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS battle_tasks CASCADE;
DROP TABLE IF EXISTS battles CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS levels CASCADE;
DROP TABLE IF EXISTS cravings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types (they may be referenced by tables, but CASCADE handles it)
DROP TYPE IF EXISTS ai_model_type CASCADE;
DROP TYPE IF EXISTS post_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS battle_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS craving_type CASCADE;

-- Drop extensions (optional - comment out if other databases use them)
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- ============================================
-- Rollback complete!
-- ============================================
-- All tables, types, functions, views, triggers, and policies have been removed.
-- The database is now in a clean state.
-- ============================================


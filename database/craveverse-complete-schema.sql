-- ============================================
-- CRAVEVERSE COMPLETE DATABASE SCHEMA
-- ============================================
-- Execute this file in Supabase SQL Editor to create the entire database from scratch
-- File: database/craveverse-complete-schema.sql
-- Last Updated: 2025-01-25
--
-- This schema includes:
-- - Extensions and custom types
-- - All tables (users, levels, battles, forum, shop, etc.)
-- - Indexes for performance
-- - Triggers for auto-updating timestamps
-- - Row Level Security (RLS) policies
-- - Helper functions and views
-- - Seed data (cravings, shop items)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE craving_type AS ENUM ('nofap', 'sugar', 'shopping', 'smoking_vaping', 'social_media');
CREATE TYPE subscription_tier AS ENUM ('free', 'plus', 'plus_trial', 'ultra');
CREATE TYPE battle_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'skipped');
CREATE TYPE post_status AS ENUM ('active', 'hidden', 'deleted');
CREATE TYPE ai_model_type AS ENUM ('gpt-5-nano', 'gpt-5-mini');

-- Users table - Extended profile with craving data
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  primary_craving craving_type,
  current_level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  cravecoins INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  subscription_tier subscription_tier DEFAULT 'free',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT, -- Max 200 tokens for AI context
  preferences JSONB DEFAULT '{}',
  plan_id TEXT DEFAULT 'free',
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  is_newbie BOOLEAN DEFAULT TRUE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cravings reference table
CREATE TABLE cravings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type craving_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Levels table - 30 pre-authored templates per craving (150 total)
CREATE TABLE levels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  craving_type craving_type NOT NULL,
  level_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_text TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  coin_reward INTEGER NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(craving_type, level_number)
);

-- User progress tracking
CREATE TABLE user_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_feedback TEXT,
  user_response TEXT,
  relapse_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, level_id)
);

-- Battles table - 1v1 matchmaking
CREATE TABLE battles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  craving_type craving_type NOT NULL,
  status battle_status DEFAULT 'waiting',
  tasks JSONB, -- Array of 3 task objects
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  winner_id UUID REFERENCES users(id),
  user1_tasks_completed INTEGER DEFAULT 0,
  user2_tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Battle tasks - AI-generated extra challenges, cached for reuse
CREATE TABLE battle_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  craving_type craving_type NOT NULL,
  task_text TEXT NOT NULL,
  reuse_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum posts
CREATE TABLE forum_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  craving_type craving_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_reply_suggested TEXT,
  upvotes INTEGER DEFAULT 0,
  status post_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum replies
CREATE TABLE forum_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES forum_replies(id),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pause tokens - User inventory and usage log
CREATE TABLE pause_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tokens_available INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI usage metrics - Per-user daily token tracking (25k tokens/user/day limit)
CREATE TABLE ai_usage_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model_type ai_model_type NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  prompt_hash TEXT NOT NULL,
  cached_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shareable progress - Public token-based progress snapshots
CREATE TABLE shareable_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  progress_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions - Stripe integration logs (disabled but schema preserved)
CREATE TABLE payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  product_type TEXT NOT NULL, -- 'subscription', 'coins', 'pause_tokens'
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions - tracks active plans and trials
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'incomplete')),
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trial history - prevents repeated free trials
CREATE TABLE trial_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop items catalog
CREATE TABLE shop_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consumable','utility','cosmetic')),
  price_coins INTEGER NOT NULL CHECK (price_coins >= 0),
  description TEXT,
  icon TEXT,
  effects JSONB DEFAULT '{}', -- e.g. {"pause_days":1} or {"level_skip":1}
  tier_required subscription_tier DEFAULT 'free',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type) -- Allow same name with different type, but not duplicate name+type combinations
);

-- User purchases
CREATE TABLE user_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_coins INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User inventory - Store consumable/utility items (pause tokens, level skips)
CREATE TABLE user_inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES shop_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Nullable for items that don't expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id) -- One inventory entry per user per item type
);

-- User themes - Store unlocked cosmetic themes per user
CREATE TABLE user_themes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL, -- e.g., 'premium', 'dark_premium', etc.
  theme_data JSONB DEFAULT '{}', -- Personalization data (colors, quotes, badges)
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, theme_id) -- One unlock per user per theme
);

-- Streak pauses - Track active pause periods to prevent streak loss
CREATE TABLE streak_pauses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pause_token_id UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  daily_reminder_time TIME,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Queue jobs for batched AI processing
CREATE TABLE queue_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users for moderation
CREATE TABLE admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings - Additional user preferences
CREATE TABLE user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  daily_reminder_time TIME WITH TIME ZONE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  theme_preference TEXT DEFAULT 'system', -- e.g., 'light', 'dark', 'system'
  active_theme_id TEXT, -- References theme_id from user_themes
  theme_personalization JSONB DEFAULT '{}', -- User-specific theme customization
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User onboarding quiz responses (one row per user per quiz version)
CREATE TABLE user_quiz_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_version TEXT DEFAULT 'v1',
  responses JSONB NOT NULL,
  derived_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, quiz_version)
);

-- Aggregated button/page interaction counts
CREATE TABLE button_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  button_id TEXT NOT NULL,
  button_text TEXT,
  click_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, page_path, button_id)
);

-- Journey telemetry events
CREATE TABLE journey_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  phase TEXT,
  duration_ms INTEGER,
  success BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log - unified user action feed
CREATE TABLE activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  feature TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Level map data - For storing visual layout of levels on the map
CREATE TABLE level_map_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE UNIQUE,
  x_coord INTEGER NOT NULL,
  y_coord INTEGER NOT NULL,
  connections JSONB DEFAULT '[]', -- Array of level_id's this level connects to
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_primary_craving ON users(primary_craving);
CREATE INDEX idx_users_streak_count ON users(streak_count);
CREATE INDEX idx_users_is_newbie ON users(is_newbie);
CREATE INDEX idx_users_plan_id ON users(plan_id);
CREATE INDEX idx_users_last_sign_in_at ON users(last_sign_in_at);

CREATE INDEX idx_levels_craving_type ON levels(craving_type);
CREATE INDEX idx_levels_level_number ON levels(level_number);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_level_id ON user_progress(level_id);
CREATE INDEX idx_user_progress_completed_at ON user_progress(completed_at);

CREATE INDEX idx_battles_user1_id ON battles(user1_id);
CREATE INDEX idx_battles_user2_id ON battles(user2_id);
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_battles_craving_type ON battles(craving_type);

CREATE INDEX idx_battle_tasks_craving_type ON battle_tasks(craving_type);

CREATE INDEX idx_forum_posts_craving_type ON forum_posts(craving_type);
CREATE INDEX idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at);

CREATE INDEX idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX idx_forum_replies_user_id ON forum_replies(user_id);

CREATE INDEX idx_ai_usage_metrics_user_id ON ai_usage_metrics(user_id);
CREATE INDEX idx_ai_usage_metrics_created_at ON ai_usage_metrics(created_at);

CREATE INDEX idx_queue_jobs_status ON queue_jobs(status);
CREATE INDEX idx_queue_jobs_scheduled_at ON queue_jobs(scheduled_at);

CREATE INDEX idx_shop_items_active ON shop_items(active);
CREATE INDEX idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_item_id ON user_purchases(item_id);
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_item_id ON user_inventory(item_id);
CREATE INDEX idx_user_inventory_expires_at ON user_inventory(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_themes_user_id ON user_themes(user_id);
CREATE INDEX idx_user_themes_theme_id ON user_themes(theme_id);
CREATE INDEX idx_streak_pauses_user_id ON streak_pauses(user_id);
CREATE INDEX idx_streak_pauses_is_active ON streak_pauses(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_streak_pauses_dates ON streak_pauses(start_date, end_date);
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_quiz_responses_user_id ON user_quiz_responses(user_id);
CREATE INDEX idx_button_interactions_user_id ON button_interactions(user_id);
CREATE INDEX idx_button_interactions_page_path ON button_interactions(page_path);
CREATE INDEX idx_button_interactions_button_id ON button_interactions(button_id);
CREATE INDEX idx_journey_events_user_id ON journey_events(user_id);
CREATE INDEX idx_journey_events_event ON journey_events(event);
CREATE INDEX idx_journey_events_created_at ON journey_events(created_at);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end);
CREATE INDEX idx_trial_history_user_id ON trial_history(user_id);
CREATE INDEX idx_trial_history_plan_id ON trial_history(plan_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_level_map_data_level_id ON level_map_data(level_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pause_tokens_updated_at BEFORE UPDATE ON pause_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shop_items_updated_at BEFORE UPDATE ON shop_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_level_map_data_updated_at BEFORE UPDATE ON level_map_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_inventory_updated_at BEFORE UPDATE ON user_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streak_pauses_updated_at BEFORE UPDATE ON streak_pauses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quiz_responses_updated_at BEFORE UPDATE ON user_quiz_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_button_interactions_updated_at BEFORE UPDATE ON button_interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_events_updated_at BEFORE UPDATE ON journey_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trial_history_updated_at BEFORE UPDATE ON trial_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_log_updated_at BEFORE UPDATE ON activity_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pause_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareable_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE button_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_map_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid()::text = clerk_user_id);

-- Create RLS policies for user_progress
CREATE POLICY "Users can view their own progress" ON user_progress
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own progress" ON user_progress
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own progress" ON user_progress
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for battles
CREATE POLICY "Users can view their own battles" ON battles
    FOR SELECT USING (user1_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) 
                      OR user2_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own battles" ON battles
    FOR INSERT WITH CHECK (user1_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own battles" ON battles
    FOR UPDATE USING (user1_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text) 
                      OR user2_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for forum_posts
CREATE POLICY "Users can view all forum posts" ON forum_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own forum posts" ON forum_posts
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own forum posts" ON forum_posts
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for forum_replies
CREATE POLICY "Users can view all forum replies" ON forum_replies
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own forum replies" ON forum_replies
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own forum replies" ON forum_replies
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for pause_tokens
CREATE POLICY "Users can view their own pause tokens" ON pause_tokens
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own pause tokens" ON pause_tokens
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for ai_usage_metrics
CREATE POLICY "Users can view their own AI usage" ON ai_usage_metrics
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Create RLS policies for shareable_progress
CREATE POLICY "Users can view their own shareable progress" ON shareable_progress
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own shareable progress" ON shareable_progress
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Anyone can view public progress shares by token" ON shareable_progress
    FOR SELECT USING (true); -- Publicly viewable by token

-- Create RLS policies for payment_transactions
CREATE POLICY "Users can view their own payment transactions" ON payment_transactions
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for shop_items (read-only public)
CREATE POLICY "Allow public read access to shop_items" ON shop_items
    FOR SELECT USING (true);

-- RLS for user_purchases
CREATE POLICY "Users can view their own purchases" ON user_purchases
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own purchases" ON user_purchases
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for notification_preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for user_quiz_responses
CREATE POLICY "Users can view their own quiz responses" ON user_quiz_responses
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can upsert their own quiz responses" ON user_quiz_responses
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own quiz responses" ON user_quiz_responses
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for button_interactions
CREATE POLICY "Users can view their own button interactions" ON button_interactions
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own button interactions" ON button_interactions
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own button interactions" ON button_interactions
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for journey_events
CREATE POLICY "Users can view their own journey events" ON journey_events
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own journey events" ON journey_events
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own journey events" ON journey_events
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for level_map_data (read-only public)
CREATE POLICY "Allow public read access to level_map_data" ON level_map_data
    FOR SELECT USING (true);

-- RLS for user_inventory
CREATE POLICY "Users can view their own inventory" ON user_inventory
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own inventory" ON user_inventory
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own inventory" ON user_inventory
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for user_themes
CREATE POLICY "Users can view their own themes" ON user_themes
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own themes" ON user_themes
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for streak_pauses
CREATE POLICY "Users can view their own streak pauses" ON streak_pauses
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own streak pauses" ON streak_pauses
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can update their own streak pauses" ON streak_pauses
    FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can manage their own subscriptions" ON subscriptions
    FOR ALL USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text))
    WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for trial_history
CREATE POLICY "Users can view their own trial history" ON trial_history
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own trial history" ON trial_history
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- RLS for activity_log
CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can insert their own activity logs" ON activity_log
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::text));

-- Insert craving types (seed data)
INSERT INTO cravings (type, name, description, icon, color) VALUES
('nofap', 'NoFap', 'Overcome pornography addiction and build self-control', '🚫', '#FF6B6B'),
('sugar', 'Sugar Free', 'Break free from sugar addiction and improve health', '🍭', '#FFD93D'),
('shopping', 'Shopping Control', 'Stop impulse buying and save money', '🛍️', '#6BCF7F'),
('smoking_vaping', 'Smoke Free', 'Quit smoking and vaping for better health', '🚭', '#4ECDC4'),
('social_media', 'Social Media Detox', 'Reduce social media usage and reclaim time', '📱', '#A8E6CF')
ON CONFLICT (type) DO NOTHING;

-- Insert shop items (seed data)
INSERT INTO shop_items (name, type, price_coins, description, icon, effects, tier_required) VALUES
('Pause Token (1 day)', 'consumable', 50, 'Pause your streak without penalty for 1 day', '⏸️', '{"pause_days":1}', 'free'),
('Pause Token (3 days)', 'consumable', 120, 'Pause your streak without penalty for 3 days', '⏸️', '{"pause_days":3}', 'free'),
('Level Skip', 'utility', 100, 'Skip a particularly tough level once', '⏭️', '{"level_skip":1}', 'plus'),
('Cosmetic Theme', 'cosmetic', 75, 'Unlock a premium dashboard theme', '🎨', '{"theme":"premium"}', 'free')
ON CONFLICT (name, type) DO NOTHING;

-- Create functions for common operations

-- Function to get user's progress statistics
CREATE OR REPLACE FUNCTION get_user_progress_stats(user_id_param UUID)
RETURNS TABLE (
    total_levels_completed BIGINT,
    current_streak BIGINT,
    total_xp BIGINT,
    total_coins BIGINT,
    current_level_number BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(up.id) as total_levels_completed,
        u.streak_count as current_streak,
        u.xp as total_xp,
        u.cravecoins as total_coins,
        u.current_level as current_level_number
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id AND up.completed_at IS NOT NULL
    WHERE u.id = user_id_param
    GROUP BY u.id, u.streak_count, u.xp, u.cravecoins, u.current_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access level
CREATE OR REPLACE FUNCTION can_access_level(user_id_param UUID, level_number_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier subscription_tier;
    max_levels INTEGER;
BEGIN
    SELECT subscription_tier INTO user_tier FROM users WHERE id = user_id_param;
    
    CASE user_tier
        WHEN 'free' THEN max_levels := 10;
        WHEN 'plus', 'plus_trial', 'ultra' THEN max_levels := 30;
        ELSE max_levels := 0;
    END CASE;
    
    RETURN level_number_param <= max_levels;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award XP and coins
CREATE OR REPLACE FUNCTION award_xp_and_coins(
    user_id_param UUID,
    xp_amount INTEGER,
    coin_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET xp = xp + xp_amount,
        cravecoins = cravecoins + coin_amount,
        updated_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak (with pause period protection)
CREATE OR REPLACE FUNCTION update_streak(user_id_param UUID, increment BOOLEAN DEFAULT TRUE)
RETURNS VOID AS $$
DECLARE
    is_paused BOOLEAN;
    today_date DATE := CURRENT_DATE;
BEGIN
    IF increment THEN
        -- Always allow incrementing (completing levels)
        UPDATE users 
        SET streak_count = streak_count + 1,
            updated_at = NOW()
        WHERE id = user_id_param;
    ELSE
        -- Check for active pause period before resetting
        SELECT EXISTS (
            SELECT 1 FROM streak_pauses
            WHERE user_id = user_id_param
            AND is_active = TRUE
            AND start_date <= today_date
            AND end_date >= today_date
        ) INTO is_paused;
        
        -- Only reset if NOT paused
        IF NOT is_paused THEN
            UPDATE users 
            SET streak_count = 0,
                updated_at = NOW()
            WHERE id = user_id_param;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
    user_id_param UUID,
    model_type_param ai_model_type,
    tokens_used_param INTEGER,
    cost_usd_param DECIMAL(10, 6),
    prompt_hash_param TEXT,
    cached_response_param BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    INSERT INTO ai_usage_metrics (user_id, model_type, tokens_used, cost_usd, prompt_hash, cached_response)
    VALUES (user_id_param, model_type_param, tokens_used_param, cost_usd_param, prompt_hash_param, cached_response_param)
    RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for common queries

-- View aligning legacy metrics queries with payment transactions
CREATE VIEW transactions AS
SELECT 
    id,
    user_id,
    (amount_cents::numeric / 100) AS amount,
    status,
    product_type AS type,
    created_at
FROM payment_transactions;

-- View aligning legacy AI usage metrics
CREATE VIEW ai_usage_log AS
SELECT 
    id,
    user_id,
    model_type,
    tokens_used,
    cost_usd,
    created_at,
    ('model_' || model_type::text) AS feature
FROM ai_usage_metrics;

-- View for user dashboard data
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.clerk_user_id,
    u.name,
    u.email,
    u.primary_craving,
    u.current_level,
    u.xp,
    u.cravecoins,
    u.streak_count,
    u.subscription_tier,
    c.name as craving_name,
    c.icon as craving_icon,
    c.color as craving_color
FROM users u
LEFT JOIN cravings c ON u.primary_craving = c.type;

-- View for level details with user progress
CREATE VIEW level_details AS
SELECT 
    l.*,
    up.completed_at,
    up.ai_feedback,
    up.user_response,
    up.relapse_count
FROM levels l
LEFT JOIN user_progress up ON l.id = up.level_id;

-- View for battle details
CREATE VIEW battle_details AS
SELECT 
    b.*,
    u1.name as user1_name,
    u2.name as user2_name,
    c.name as craving_name
FROM battles b
LEFT JOIN users u1 ON b.user1_id = u1.id
LEFT JOIN users u2 ON b.user2_id = u2.id
LEFT JOIN cravings c ON b.craving_type = c.type;

-- View for forum post details
CREATE VIEW forum_post_details AS
SELECT 
    fp.*,
    u.name as author_name,
    u.avatar_url as author_avatar,
    u.subscription_tier as author_tier,
    COUNT(fr.id) as reply_count
FROM forum_posts fp
LEFT JOIN users u ON fp.user_id = u.id
LEFT JOIN forum_replies fr ON fp.id = fr.post_id
GROUP BY fp.id, u.name, u.avatar_url, u.subscription_tier;

-- ============================================
-- ROLLBACK SCRIPT (For reference - DO NOT RUN unless you need to drop everything)
-- ============================================
/*
-- WARNING: This will delete ALL data and schema. Use with extreme caution!

-- Drop views
DROP VIEW IF EXISTS transactions CASCADE;
DROP VIEW IF EXISTS ai_usage_log CASCADE;
DROP VIEW IF EXISTS forum_post_details CASCADE;
DROP VIEW IF EXISTS battle_details CASCADE;
DROP VIEW IF EXISTS level_details CASCADE;
DROP VIEW IF EXISTS user_dashboard CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS log_ai_usage(UUID, ai_model_type, INTEGER, DECIMAL, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS update_streak(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS award_xp_and_coins(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS can_access_level(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_progress_stats(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop triggers
DROP TRIGGER IF EXISTS update_level_map_data_updated_at ON level_map_data;
DROP TRIGGER IF EXISTS update_shop_items_updated_at ON shop_items;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
DROP TRIGGER IF EXISTS update_user_inventory_updated_at ON user_inventory;
DROP TRIGGER IF EXISTS update_streak_pauses_updated_at ON streak_pauses;
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS update_pause_tokens_updated_at ON pause_tokens;
DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_journey_events_updated_at ON journey_events;
DROP TRIGGER IF EXISTS update_user_quiz_responses_updated_at ON user_quiz_responses;
DROP TRIGGER IF EXISTS update_button_interactions_updated_at ON button_interactions;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_trial_history_updated_at ON trial_history;
DROP TRIGGER IF EXISTS update_activity_log_updated_at ON activity_log;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS level_map_data CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS journey_events CASCADE;
DROP TABLE IF EXISTS user_quiz_responses CASCADE;
DROP TABLE IF EXISTS button_interactions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS queue_jobs CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS streak_pauses CASCADE;
DROP TABLE IF EXISTS user_themes CASCADE;
DROP TABLE IF EXISTS user_inventory CASCADE;
DROP TABLE IF EXISTS user_purchases CASCADE;
DROP TABLE IF EXISTS shop_items CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS trial_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
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

-- Drop types
DROP TYPE IF EXISTS ai_model_type;
DROP TYPE IF EXISTS post_status;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS battle_status;
DROP TYPE IF EXISTS subscription_tier;
DROP TYPE IF EXISTS craving_type;

-- Drop extensions
DROP EXTENSION IF EXISTS "uuid-ossp";
*/


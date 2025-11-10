-- SQL queries to verify rewards system database state
-- Run these in Supabase SQL Editor after testing purchases and activations

-- 1. Check user_inventory table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_inventory'
ORDER BY ordinal_position;

-- 2. Check user_themes table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_themes'
ORDER BY ordinal_position;

-- 3. Check streak_pauses table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'streak_pauses'
ORDER BY ordinal_position;

-- 4. Verify user inventory (replace USER_ID with actual user UUID)
SELECT 
    ui.id,
    ui.quantity,
    si.name as item_name,
    si.type as item_type,
    si.effects,
    ui.purchased_at
FROM user_inventory ui
JOIN shop_items si ON ui.item_id = si.id
WHERE ui.user_id = 'USER_ID_HERE'
ORDER BY ui.purchased_at DESC;

-- 5. Verify user purchases
SELECT 
    up.id,
    up.quantity,
    up.amount_coins,
    up.purchased_at,
    si.name as item_name,
    si.type as item_type
FROM user_purchases up
JOIN shop_items si ON up.item_id = si.id
WHERE up.user_id = 'USER_ID_HERE'
ORDER BY up.purchased_at DESC
LIMIT 10;

-- 6. Verify active pause periods
SELECT 
    sp.id,
    sp.start_date,
    sp.end_date,
    sp.is_active,
    CASE 
        WHEN sp.end_date >= CURRENT_DATE THEN 'Active'
        ELSE 'Expired'
    END as status
FROM streak_pauses sp
WHERE sp.user_id = 'USER_ID_HERE'
ORDER BY sp.created_at DESC;

-- 7. Verify unlocked themes
SELECT 
    ut.id,
    ut.theme_id,
    ut.theme_data,
    ut.unlocked_at
FROM user_themes ut
WHERE ut.user_id = 'USER_ID_HERE'
ORDER BY ut.unlocked_at DESC;

-- 8. Verify active theme in user settings
SELECT 
    us.active_theme_id,
    us.theme_personalization,
    ut.theme_id,
    ut.theme_data
FROM user_settings us
LEFT JOIN user_themes ut ON us.active_theme_id = ut.theme_id AND us.user_id = ut.user_id
WHERE us.user_id = 'USER_ID_HERE';

-- 9. Check RLS policies for new tables
SELECT 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('user_inventory', 'user_themes', 'streak_pauses')
ORDER BY tablename, policyname;

-- 10. Verify update_streak function includes pause check
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_streak'
AND routine_schema = 'public';

-- 11. Test data integrity: Check for orphaned inventory items
SELECT 
    ui.id,
    ui.user_id,
    ui.item_id,
    si.name
FROM user_inventory ui
LEFT JOIN shop_items si ON ui.item_id = si.id
WHERE si.id IS NULL;

-- 12. Test data integrity: Check for orphaned pause records
SELECT 
    sp.id,
    sp.user_id,
    sp.pause_token_id,
    ui.id as inventory_exists
FROM streak_pauses sp
LEFT JOIN user_inventory ui ON sp.pause_token_id = ui.id
WHERE sp.pause_token_id IS NOT NULL AND ui.id IS NULL;


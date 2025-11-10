# Rewards System Testing Checklist

## ✅ Pre-Testing Verification

- [x] Database schema updated with new tables
- [x] All APIs implemented and type-checked
- [x] UI components created
- [x] Streak logic integrated
- [x] No TypeScript errors
- [x] No linter errors

## 🧪 Testing Steps

### 1. Database Setup
```sql
-- Run in Supabase SQL Editor:
-- Execute: database/craveverse-complete-schema.sql
-- Verify tables exist: user_inventory, user_themes, streak_pauses
```

### 2. Purchase Flow Testing

#### Test Pause Token Purchase
1. Navigate to `/shop`
2. Purchase "Pause Token (1 day)" (50 coins)
3. **Verify:**
   - Coins deducted from balance
   - Purchase recorded in `user_purchases`
   - Item added to `user_inventory` (quantity = 1)
   - NO entry in `streak_pauses` (not activated yet)

#### Test Level Skip Purchase
1. Purchase "Level Skip" (100 coins, requires Plus tier)
2. **Verify:**
   - Coins deducted
   - Purchase recorded
   - Item added to `user_inventory`

#### Test Theme Purchase
1. Purchase "Cosmetic Theme" (75 coins)
2. **Verify:**
   - Coins deducted
   - Purchase recorded
   - Theme unlocked in `user_themes` with personalized `theme_data`
   - `active_theme_id` NOT set yet (user must apply)

### 3. Pause Token Activation Testing

#### Test Activation
1. Go to dashboard (should see PauseTokenWidget)
2. Click "Use" on 1-day token
3. **Verify:**
   - Modal opens with pause period details
4. Click "Activate Pause"
5. **Verify:**
   - `streak_pauses` record created with:
     - `start_date` = today
     - `end_date` = today + 1 day
     - `is_active` = true
   - Inventory quantity decremented (or deleted if was 1)
   - Widget shows "Active Pause" status

#### Test Streak Protection
1. With active pause period:
   - Complete a level → streak should increment ✅
   - Miss a day → streak should NOT reset (protected) ✅
2. After pause expires:
   - Miss a day → streak should reset ✅

### 4. Level Skip Testing

#### Test Skip Usage
1. Navigate to a level (not completed)
2. **Verify:** "Skip Level" button appears (if token in inventory)
3. Click "Skip Level"
4. Confirm in dialog
5. **Verify:**
   - Level marked as completed in `user_progress`
   - `metadata.skipped` = true
   - User `current_level` incremented
   - NO XP or coins awarded
   - Inventory quantity decremented

### 5. Theme Testing

#### Test Theme Application
1. Navigate to settings (or create settings page with ThemeSelector)
2. **Verify:** Unlocked themes displayed
3. Click "Apply Theme" on a theme
4. **Verify:**
   - `user_settings.active_theme_id` updated
   - Theme applied (may need page reload)

#### Test Personalization
1. Check `user_themes.theme_data` for purchased theme
2. **Verify:**
   - `colorScheme.primary` matches user's craving color
   - `motivationalQuotes` array populated
   - `badges` array populated based on progress

### 6. Tier Locking Testing

#### Test Locked Item
1. As free tier user, view "Level Skip" in shop
2. **Verify:**
   - Button shows "Upgrade to Plus"
   - Purchase button disabled
3. Click "Upgrade to Plus"
4. **Verify:**
   - Navigates to `/pricing?highlight=plus`
   - Pricing page scrolls to Plus tier
   - Plus tier highlighted

### 7. API Endpoint Testing

Run `scripts/test-rewards-api.ps1`:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-rewards-api.ps1
```

**Verify:**
- All endpoints return 401 (unauthorized) without auth
- Shop items endpoint returns items list

### 8. Database Verification

Run queries from `scripts/verify-rewards.sql`:
```sql
-- Check inventory
SELECT * FROM user_inventory WHERE user_id = 'YOUR_USER_ID';

-- Check active pauses
SELECT * FROM streak_pauses WHERE user_id = 'YOUR_USER_ID' AND is_active = true;

-- Check unlocked themes
SELECT * FROM user_themes WHERE user_id = 'YOUR_USER_ID';

-- Check active theme
SELECT active_theme_id, theme_personalization FROM user_settings WHERE user_id = 'YOUR_USER_ID';
```

## 🐛 Common Issues to Check

1. **Pause period not working:**
   - Check `update_streak()` function includes pause check
   - Verify `streak_pauses` record dates are correct
   - Check timezone handling

2. **Inventory not updating:**
   - Verify purchase API adds to inventory
   - Check item type detection logic

3. **Theme not applying:**
   - Verify `user_settings` record exists
   - Check `active_theme_id` is set correctly

4. **Tier locking not working:**
   - Verify tier comparison logic
   - Check button state in ShopItemCard

## 📊 Success Criteria

✅ All purchases create correct database records
✅ Pause tokens protect streaks during active period
✅ Level skips mark levels complete without rewards
✅ Themes unlock with personalization
✅ Tier restrictions work correctly
✅ All APIs return correct responses
✅ UI components display correctly
✅ No errors in browser console
✅ No errors in server logs

## 🚀 Production Readiness

- [ ] Database schema deployed to production
- [ ] All APIs tested in production environment
- [ ] UI components tested on real devices
- [ ] Performance testing completed
- [ ] Error monitoring configured
- [ ] Documentation updated


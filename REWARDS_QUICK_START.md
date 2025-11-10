# Rewards System Quick Start Guide

## 🚀 Setup (One-Time)

### 1. Database Migration
Execute the complete schema in Supabase SQL Editor:
```sql
-- Run: database/craveverse-complete-schema.sql
-- This creates: user_inventory, user_themes, streak_pauses tables
-- Updates: update_streak() function with pause protection
```

### 2. Verify Schema
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user_inventory', 'user_themes', 'streak_pauses');

-- Check function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'update_streak';
```

## ✅ Features Ready to Use

### Pause Tokens
- **Purchase**: Shop → Buy pause token → Added to inventory
- **Activate**: Dashboard widget → Click "Use" → Select days → Activate
- **Protection**: Streak protected during active pause period

### Level Skips
- **Purchase**: Shop → Buy level skip → Added to inventory  
- **Use**: Level card → Click "Skip Level" → Confirm → Level marked complete
- **Result**: Level completed, advanced to next level, no XP/coins

### Themes
- **Purchase**: Shop → Buy theme → Unlocked with personalization
- **Apply**: Settings → Theme selector → Click "Apply Theme"
- **Personalization**: Based on craving color, quiz answers, progress badges

## 🧪 Quick Test

1. **Purchase a pause token:**
   ```
   POST /api/shop/purchase
   { "itemId": "pause-token-1-day-id", "quantity": 1 }
   ```

2. **Check inventory:**
   ```
   GET /api/rewards/inventory
   ```

3. **Activate pause token:**
   ```
   POST /api/rewards/pause-token/activate
   { "tokenId": "inventory-item-id", "days": 1 }
   ```

4. **Verify in database:**
   ```sql
   SELECT * FROM streak_pauses WHERE is_active = true;
   ```

## 📋 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shop/purchase` | POST | Purchase items (adds to inventory) |
| `/api/rewards/inventory` | GET | Get user's inventory |
| `/api/rewards/pause-token/activate` | POST | Activate pause token |
| `/api/rewards/level-skip/use` | POST | Use level skip |
| `/api/rewards/themes` | GET | Get unlocked themes |
| `/api/rewards/theme/apply` | POST | Apply theme |
| `/api/user/settings` | GET | Get user settings (active theme) |

## 🎯 UI Components

- **PauseTokenWidget**: Visible on dashboard sidebar
- **LevelCard**: Shows "Skip Level" button if token available
- **ShopItemCard**: Shows upgrade button for tier-locked items
- **ThemeSelector**: Ready for settings page integration

## 🔧 Troubleshooting

**Pause not working?**
- Check `streak_pauses` table has active record
- Verify `update_streak()` function includes pause check
- Check date ranges are correct (start_date <= today <= end_date)

**Inventory not updating?**
- Verify purchase API adds to `user_inventory`
- Check item type detection (consumable/utility vs cosmetic)

**Theme not applying?**
- Check `user_themes` has unlocked theme
- Verify `user_settings.active_theme_id` is set
- May need page reload to apply CSS

## 📊 Monitoring

Check database state with:
```bash
# Run SQL verification script
scripts/verify-rewards.sql
```

Test API endpoints with:
```powershell
scripts/test-rewards-api.ps1
```


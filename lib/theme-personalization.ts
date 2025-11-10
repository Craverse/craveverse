// Theme personalization engine based on user data
import { createLogger } from './logger';

const logger = createLogger('theme-personalization');

interface UserData {
  primary_craving?: string;
  current_level?: number;
  streak_count?: number;
  preferences?: {
    quizAnswers?: Record<string, any>;
    personalization?: Record<string, any>;
  };
  xp?: number;
}

interface ThemeData {
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  motivationalQuotes: string[];
  badges: string[];
  specialEffects?: Record<string, any>;
}

/**
 * Get craving color from user's primary craving
 */
function getCravingColor(cravingType?: string): string {
  const colorMap: Record<string, string> = {
    nofap: '#FF6B6B',
    sugar: '#FFD93D',
    shopping: '#6BCF7F',
    smoking_vaping: '#4ECDC4',
    social_media: '#A8E6CF',
  };
  return colorMap[cravingType || ''] || '#FF8C42'; // Default to crave-orange
}

/**
 * Generate motivational quotes based on user personality from quiz
 */
function generateQuotes(userData: UserData): string[] {
  const quotes: string[] = [];
  const preferences = userData.preferences?.personalization || {};
  const quizAnswers = userData.preferences?.quizAnswers || {};

  // Base quotes
  const baseQuotes = [
    "Every day is a new chance to grow stronger.",
    "You're building the life you want, one day at a time.",
    "Your future self will thank you for today's effort.",
  ];

  // Personality-based quotes
  if (quizAnswers.severity === 'severe') {
    quotes.push("You've faced harder challenges. This is nothing.",
      "Your strength in difficult times shows your true character.",
      "Progress isn't always linear, but you're moving forward.");
  } else if (quizAnswers.severity === 'mild') {
    quotes.push("Small steps lead to big changes.",
      "Consistency is your superpower.",
      "You're creating lasting change.");
  }

  // Motivation-based quotes
  if (preferences.motivation === 'health') {
    quotes.push("Your health is your greatest wealth.",
      "Every choice you make is an investment in your future.",
      "Your body thanks you for every positive decision.");
  } else if (preferences.motivation === 'relationships') {
    quotes.push("The people you love deserve the best version of you.",
      "Your relationships improve when you improve yourself.",
      "You're becoming the partner/friend/family member you want to be.");
  }

  // Streak-based quotes
  if ((userData.streak_count || 0) >= 30) {
    quotes.push("30 days of consistency! You're unstoppable!",
      "You've proven you can do anything you set your mind to.",
      "This is just the beginning of your transformation.");
  } else if ((userData.streak_count || 0) >= 7) {
    quotes.push("A week of progress! Keep the momentum going!",
      "You're building powerful habits.",
      "One week down, many more to go!");
  }

  // Combine and return unique quotes
  const uniqueQuotes = Array.from(new Set([...baseQuotes, ...quotes]));
  return uniqueQuotes.slice(0, 5);
}

/**
 * Generate achievement badges based on user progress
 */
function generateBadges(userData: UserData): string[] {
  const badges: string[] = [];
  
  if ((userData.streak_count || 0) >= 7) badges.push('7-Day Warrior');
  if ((userData.streak_count || 0) >= 30) badges.push('30-Day Champion');
  if ((userData.streak_count || 0) >= 90) badges.push('90-Day Legend');
  
  if ((userData.current_level || 0) >= 10) badges.push('Level 10 Master');
  if ((userData.current_level || 0) >= 20) badges.push('Level 20 Expert');
  if ((userData.current_level || 0) >= 30) badges.push('Level 30 Hero');
  
  if ((userData.xp || 0) >= 1000) badges.push('XP Master');
  if ((userData.xp || 0) >= 5000) badges.push('XP Legend');

  return badges;
}

/**
 * Generate personalized theme data based on user profile
 */
export function generateThemePersonalization(userData: UserData, themeId: string = 'premium'): ThemeData {
  try {
    const cravingColor = getCravingColor(userData.primary_craving);
    
    // Create color scheme based on craving
    const colorScheme = {
      primary: cravingColor,
      secondary: adjustColorBrightness(cravingColor, 0.2),
      accent: adjustColorBrightness(cravingColor, -0.1),
      background: adjustColorBrightness(cravingColor, 0.9),
    };

    const quotes = generateQuotes(userData);
    const badges = generateBadges(userData);

    // Special effects for high achievers
    const specialEffects: Record<string, any> = {};
    if ((userData.streak_count || 0) >= 30) {
      specialEffects.glow = true;
      specialEffects.animation = 'subtle';
    }

    return {
      colorScheme,
      motivationalQuotes: quotes,
      badges,
      specialEffects: Object.keys(specialEffects).length > 0 ? specialEffects : undefined,
    };
  } catch (error) {
    logger.error('Error generating theme personalization', {
      error: error instanceof Error ? error.message : 'Unknown',
      themeId,
    });
    
    // Return default theme
    return {
      colorScheme: {
        primary: '#FF8C42',
        secondary: '#FFA66B',
        accent: '#E6732F',
        background: '#FFF5ED',
      },
      motivationalQuotes: ['Keep going! You\'ve got this!'],
      badges: [],
    };
  }
}

/**
 * Adjust color brightness (helper function)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}


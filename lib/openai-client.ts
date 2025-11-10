// OpenAI Client with automatic token counting and budget enforcement
import OpenAI from 'openai';
import { CONFIG, AIModelType } from './config';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder')) {
      console.warn('OpenAI API key not configured, AI features will be disabled');
      return null;
    }
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

// Token counting utility (simplified - in production, use tiktoken)
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

// Calculate cost based on model and tokens
function calculateCost(model: AIModelType, inputTokens: number, outputTokens: number): number {
  // These are example rates - replace with actual gpt-5-nano/mini rates
  const rates = {
    'gpt-5-nano': { input: 0.0001, output: 0.0002 }, // $0.10/1M input, $0.20/1M output
    'gpt-5-mini': { input: 0.0005, output: 0.0015 }, // $0.50/1M input, $1.50/1M output
  };
  
  const rate = rates[model];
  return (inputTokens * rate.input + outputTokens * rate.output) / 1000000;
}

// Generate prompt hash for caching
function generatePromptHash(prompt: string, model: string, maxCompletionTokens: number): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256')
    .update(`${prompt}:${model}:${maxCompletionTokens}`)
    .digest('hex');
}

// Check user's daily token limit (25k tokens/user/day for GPT-5-mini)
// Parameters intentionally unused - will be used when database integration is complete
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkDailyTokenLimit(_userId: string, _model: AIModelType): Promise<{ canProceed: boolean; used: number; limit: number }> {
  // Get token limit from config (25k for all tiers)
  const dailyLimit = CONFIG.AI.RATE_LIMITS.FREE.TOKENS_PER_DAY; // 25000 tokens/day
  
  // This would query the database for user's daily token usage
  // For now, return a mock response (in production, query ai_usage_log table)
  const dailyUsage = 0; // Mock: 0 tokens used today
  const canProceed = dailyUsage + 100 < dailyLimit; // Reserve 100 tokens for this request
  
  return {
    canProceed,
    used: dailyUsage,
    limit: dailyLimit,
  };
}

// Derive persona from user preferences based on quiz answers
export function derivePersonaFromPreferences(preferences: any): string {
  if (!preferences || !preferences.quizAnswers || !preferences.personalization) {
    return 'encouraging'; // Default persona
  }

  const { quizAnswers, personalization } = preferences;
  const severity = quizAnswers.severity || 'moderate';
  const supportLevel = personalization.support_level || 'neutral';

  // Strict/disciplined persona: severe addiction OR low support level
  if (severity === 'severe' || supportLevel === 'low' || supportLevel === 'unsupportive') {
    return 'strict/disciplined';
  }

  // Delicate/encouraging persona: mild addiction OR high support level
  if (severity === 'mild' || supportLevel === 'high' || supportLevel === 'very') {
    return 'delicate/encouraging';
  }

  // Default: balanced/encouraging for moderate cases
  return 'encouraging';
}

// Check user's AI budget
// Parameter intentionally unused - will be used when database integration is complete
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkUserBudget(_userId: string): Promise<{ canProceed: boolean; remainingBudget: number }> {
  // This would query the database for user's monthly AI usage
  // For now, return a mock response
  const monthlyUsage = 0.002; // Mock: $0.002 used this month
  const budget = CONFIG.AI.BUDGETS.MONTHLY_PER_USER;
  const remaining = budget - monthlyUsage;
  
  return {
    canProceed: remaining > 0,
    remainingBudget: remaining,
  };
}

// Log AI usage to database
async function logAIUsage(
  userId: string,
  model: AIModelType,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  promptHash: string,
  cached: boolean = false
): Promise<void> {
  // This would insert into ai_usage_metrics table
  console.log(`AI Usage Log: User ${userId}, Model ${model}, Tokens ${inputTokens}+${outputTokens}, Cost $${cost}, Cached: ${cached}`);
}

// Cache interface
interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

// Simple in-memory cache (replace with Vercel KV in production)
class MemoryCache implements CacheInterface {
  private cache = new Map<string, { value: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }
}

const cache: CacheInterface = new MemoryCache();

// Main OpenAI client class
export class OpenAIClient {
  private userId: string;
  private userTier: 'free' | 'plus' | 'ultra';
  private openai: OpenAI | null;

  constructor(userId: string, userTier: 'free' | 'plus' | 'ultra') {
    this.userId = userId;
    this.userTier = userTier;
    this.openai = getOpenAIClient(); // Get once during construction
  }

  // Ensure OpenAI client is available
  private ensureClient(): OpenAI {
    if (!this.openai) {
      throw new Error('OpenAI client not available');
    }
    return this.openai;
  }

  // Generate AI response with caching and budget enforcement
  async generateResponse(
    prompt: string,
    model: AIModelType,
    maxCompletionTokens: number,
    temperature: number = 0.7
  ): Promise<{ response: string; cached: boolean; cost: number }> {
    // Check daily token limit first (25k tokens/user/day for GPT-5-mini)
    const tokenLimitCheck = await checkDailyTokenLimit(this.userId, model);
    if (!tokenLimitCheck.canProceed) {
      throw new Error(`Daily token limit exceeded (${tokenLimitCheck.used}/${tokenLimitCheck.limit}). Please try again tomorrow.`);
    }

    // Check budget first
    const budgetCheck = await checkUserBudget(this.userId);
    if (!budgetCheck.canProceed) {
      throw new Error('AI budget exceeded. Please upgrade your plan or wait for next month.');
    }

    // Generate cache key
    const promptHash = generatePromptHash(prompt, model, maxCompletionTokens);
    const cacheKey = `ai_response:${promptHash}`;

    // Check cache first
    const cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      await logAIUsage(this.userId, model, 0, 0, 0, promptHash, true);
      return {
        response: cachedResponse,
        cached: true,
        cost: 0,
      };
    }

    // Calculate tokens and cost
    const inputTokens = estimateTokens(prompt);
    const estimatedOutputTokens = Math.min(maxCompletionTokens, 50); // Estimate output tokens
    const cost = calculateCost(model, inputTokens, estimatedOutputTokens);

    // Check if cost would exceed budget
    if (cost > budgetCheck.remainingBudget) {
      throw new Error('This request would exceed your AI budget. Please try a shorter prompt or upgrade your plan.');
    }

    try {
      // Make API call
      const openai = this.ensureClient();
      
      const completion = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: maxCompletionTokens,
        temperature,
      });

      const response = completion.choices[0]?.message?.content || '';
      const actualOutputTokens = estimateTokens(response);
      const actualCost = calculateCost(model, inputTokens, actualOutputTokens);

      // Cache the response
      const ttl = model === CONFIG.AI.MODELS.NANO 
        ? CONFIG.AI.CACHE_TTL.NANO_RESPONSES 
        : CONFIG.AI.CACHE_TTL.MINI_RESPONSES;
      
      await cache.set(cacheKey, response, ttl);

      // Log usage (including token count for daily limit tracking)
      await logAIUsage(this.userId, model, inputTokens, actualOutputTokens, actualCost, promptHash, false);
      
      // Update daily token usage tracking (in production, update ai_usage_log table)
      // const totalTokens = inputTokens + actualOutputTokens;
      // TODO: Update database with totalTokens for daily limit enforcement

      return {
        response,
        cached: false,
        cost: actualCost,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('AI service temporarily unavailable. Please try again later.');
    }
  }

  // Generate level feedback (optimized for gpt-5-nano)
  async generateLevelFeedback(
    levelNumber: number,
    craving: string,
    userResponse: string,
    userPreferences?: any
  ): Promise<string> {
    // Derive persona from user preferences
    const persona = userPreferences ? derivePersonaFromPreferences(userPreferences) : 'encouraging';
    const prompt = CONFIG.PROMPTS.LEVEL_FEEDBACK.template
      .replace('{N}', levelNumber.toString())
      .replace('{craving}', craving)
      .replace('{input}', userResponse)
      .replace('{persona}', persona);

    try {
      const result = await this.generateResponse(
        prompt,
        CONFIG.AI.MODELS.NANO,
        CONFIG.PROMPTS.LEVEL_FEEDBACK.maxTokens,
        0.8
      );
      return result.response;
    } catch {
      // Fallback to template if AI fails
      return CONFIG.FALLBACK_TEMPLATES.LEVEL_FEEDBACK[
        Math.floor(Math.random() * CONFIG.FALLBACK_TEMPLATES.LEVEL_FEEDBACK.length)
      ];
    }
  }

  // Generate forum reply suggestion
  async generateForumReply(
    threadTitle: string,
    craving: string,
    userPreferences?: any,
    // Top reply parameter for future use in context-aware suggestions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _topReply?: string
  ): Promise<string> {
    // Derive persona from user preferences
    const persona = userPreferences ? derivePersonaFromPreferences(userPreferences) : 'encouraging';
    
    // Build prompt with persona - template now includes {persona} placeholder
    const prompt = CONFIG.PROMPTS.FORUM_REPLY.template
      .replace('{title}', threadTitle)
      .replace('{craving}', craving)
      .replace('{persona}', persona);

    try {
      const result = await this.generateResponse(
        prompt,
        CONFIG.AI.MODELS.NANO,
        CONFIG.PROMPTS.FORUM_REPLY.maxTokens,
        0.7
      );
      return result.response;
    } catch {
      // Fallback to template if AI fails
      return CONFIG.FALLBACK_TEMPLATES.FORUM_REPLY[
        Math.floor(Math.random() * CONFIG.FALLBACK_TEMPLATES.FORUM_REPLY.length)
      ];
    }
  }

  // Generate battle tasks (batched, cached)
  async generateBattleTasks(craving: string, userPreferences?: any): Promise<string[]> {
    // Derive persona from user preferences for task tone
    const persona = userPreferences ? derivePersonaFromPreferences(userPreferences) : 'encouraging';
    
    // Build prompt with persona - template now includes {persona} placeholder
    const prompt = CONFIG.PROMPTS.BATTLE_TASKS.template
      .replace('{craving}', craving)
      .replace('{persona}', persona);

    try {
      const result = await this.generateResponse(
        prompt,
        CONFIG.AI.MODELS.MINI,
        CONFIG.PROMPTS.BATTLE_TASKS.maxTokens,
        0.8
      );
      
      // Parse the response into individual tasks
      const tasks = result.response
        .split('\n')
        .map(task => task.trim())
        .filter(task => task.length > 0)
        .slice(0, 5); // Take first 5 tasks
      
      return tasks;
    } catch {
      // Fallback to predefined tasks
      return this.getFallbackBattleTasks(craving);
    }
  }

  // Generate onboarding personalization
  async generateOnboardingPersonalization(
    quizAnswers: Record<string, any>,
    craving: string
  ): Promise<{ introMessage: string; customHints: string[] }> {
    const prompt = CONFIG.PROMPTS.ONBOARDING_PERSONALIZATION.template
      .replace('{answers}', JSON.stringify(quizAnswers))
      .replace('{craving}', craving);

    try {
      const result = await this.generateResponse(
        prompt,
        CONFIG.AI.MODELS.MINI,
        CONFIG.PROMPTS.ONBOARDING_PERSONALIZATION.maxTokens,
        0.7
      );
      
      // Parse response (this would need more sophisticated parsing in production)
      const lines = result.response.split('\n').filter(line => line.trim());
      const introMessage = lines[0] || 'Welcome to your journey!';
      const customHints = lines.slice(1, 4) || [
        'Start each day with intention',
        'Track your triggers carefully',
        'Celebrate small wins'
      ];
      
      return { introMessage, customHints };
    } catch {
      // Fallback to generic personalization
      return {
        introMessage: `Welcome to your ${craving} journey! You've got this!`,
        customHints: [
          'Start each day with intention',
          'Track your triggers carefully', 
          'Celebrate small wins'
        ],
      };
    }
  }

  // Get fallback battle tasks
  private getFallbackBattleTasks(craving: string): string[] {
    const fallbackTasks = {
      nofap: [
        'Do 20 pushups when craving hits',
        'Take a cold shower for 2 minutes',
        'Read 10 pages of a book',
        'Go for a 15-minute walk',
        'Practice deep breathing for 5 minutes'
      ],
      sugar: [
        'Drink a full glass of water',
        'Eat a piece of fruit instead',
        'Take a 10-minute walk outside',
        'Brush your teeth',
        'Call a friend for support'
      ],
      shopping: [
        'Wait 24 hours before buying',
        'Calculate the real cost (including interest)',
        'Find 3 free alternatives',
        'Delete shopping apps for the day',
        'Put the money in savings instead'
      ],
      smoking_vaping: [
        'Chew gum for 5 minutes',
        'Do 10 jumping jacks',
        'Call your support person',
        'Practice the 4-7-8 breathing technique',
        'Go to a smoke-free environment'
      ],
      social_media: [
        'Put phone in another room for 1 hour',
        'Read a book for 30 minutes',
        'Go for a walk without your phone',
        'Call a friend instead of texting',
        'Do a creative activity offline'
      ]
    };

    return fallbackTasks[craving as keyof typeof fallbackTasks] || fallbackTasks.nofap;
  }

  // Check if user has remaining AI calls for today
  async hasRemainingCalls(): Promise<boolean> {
    // This would check the user's daily AI call count
    // For now, return true
    return true;
  }

  // Get user's AI usage stats
  async getUsageStats(): Promise<{
    callsToday: number;
    callsThisMonth: number;
    costThisMonth: number;
    remainingBudget: number;
  }> {
    // This would query the database for actual usage
    // For now, return mock data
    return {
      callsToday: 3,
      callsThisMonth: 15,
      costThisMonth: 0.002,
      remainingBudget: 0.008,
    };
  }
}

// Export singleton instances for different tiers
export const createOpenAIClient = (userId: string, tier: 'free' | 'plus' | 'ultra') => {
  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('OpenAI client not available, returning null');
    return null;
  }
  return new OpenAIClient(userId, tier);
};

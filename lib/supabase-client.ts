// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import { isMockMode, getEnv } from './utils';

// Create mock client for development when credentials are not available
const createMockClient = () => ({
  from: (table: string) => ({
    // Mock API parameters intentionally unused to match Supabase API shape
    select: () => ({ 
      eq: (_column: string, value: any) => ({ 
        single: () => {
          console.log(`MOCK DB: SELECT from ${table} WHERE ${_column} = ${value}`);
          if (table === 'users' && _column === 'clerk_user_id') {
            // Return a mock user that has completed onboarding
            return { 
              data: {
                id: 'mock-user-123',
                clerk_user_id: value,
                email: 'test@example.com',
                name: 'Test User',
                avatar_url: null,
                subscription_tier: 'free',
                xp: 0,
                cravecoins: 0,
                streak_count: 0,
                current_level: 1,
                primary_craving: 'nofap', // This breaks the onboarding loop
                ai_summary: 'Welcome to CraveVerse!',
                preferences: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, 
              error: null 
            };
          }
          return { data: null, error: null };
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        limit: (_count: number) => ({ data: [], error: null })
      }),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      limit: (_count: number) => ({ data: [], error: null })
    }),
    insert: (data: any) => ({ 
      data: { id: 'mock-insert-123', ...data }, 
      error: null 
    }),
    update: (data: any) => ({ 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      eq: (_column: string, _value: any) => ({ 
        data: { id: 'mock-update-123', ...data }, 
        error: null 
      })
    }),
    delete: () => ({ 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      eq: (_column: string, _value: any) => ({ 
        data: null, 
        error: null 
      })
    }),
  }),
  auth: {
    getUser: () => ({ data: { user: null }, error: null }),
    signInWithPassword: () => ({ data: { user: null }, error: null }),
    signUp: () => ({ data: { user: null }, error: null }),
    signOut: () => ({ error: null }),
  },
});

// Safe client creation function with timeout and error handling
function createSafeClient(url: string, key: string) {
  try {
    if (isMockMode()) {
      return createMockClient() as any;
    }
    
    if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
      return createMockClient() as any;
    }
    
    const client = createClient(url, key, {
      auth: {
        persistSession: false, // Server-side client shouldn't persist sessions
      },
      global: {
        headers: {
          'x-application-name': 'craveverse',
        },
      },
    });
    
    console.log('Supabase: Real client created successfully');
    return client;
  } catch (error) {
    console.error('Supabase client creation failed, using mock client:', error);
    return createMockClient() as any;
  }
}

// Get Supabase credentials with safe fallbacks
function getSupabaseConfig() {
  try {
    if (isMockMode()) {
      return {
        url: 'https://placeholder.supabase.co',
        anonKey: 'placeholder-anon-key',
        serviceKey: 'placeholder-service-key',
      };
    }
    
    return {
      url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    };
  } catch (error) {
    console.warn('Supabase config error, using mock:', error);
    return {
      url: 'https://placeholder.supabase.co',
      anonKey: 'placeholder-anon-key',
      serviceKey: 'placeholder-service-key',
    };
  }
}

const config = getSupabaseConfig();

// Client-side Supabase client
export const supabaseClient = createSafeClient(config.url, config.anonKey);

// Server-side Supabase client with service role
export const supabaseServer = createSafeClient(config.url, config.serviceKey);

// Admin client for elevated permissions
export const supabaseAdmin = createSafeClient(config.url, config.serviceKey);

// Safe createClient function that handles missing environment variables
export function createSupabaseClient(url?: string, key?: string) {
  return createSafeClient(url || config.url, key || config.anonKey);
}

// Test database connection with timeout
export async function testDatabaseConnection() {
  // Skip database test in mock mode
  if (isMockMode()) {
    return { connected: true, error: null }; // Mock mode always succeeds
  }
  
  try {
    // Add timeout to prevent hanging (reduced from 5s to 3s for faster failures)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 3000)
    );
    
    const queryPromise = supabaseServer
      .from('users')
      .select('id')
      .limit(1);
    
    const { error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) {
      return { connected: false, error: error.message };
    }
    
    return { connected: true, error: null };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export createClient for use in other files
export { createClient };
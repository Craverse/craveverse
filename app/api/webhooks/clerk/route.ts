// Clerk webhook handler for user events
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, createTraceId } from '@/lib/logger';
import { isMockMode, getEnv } from '@/lib/utils';

export async function POST(req: Request) {
  const traceId = createTraceId();
  const logger = createLogger('clerk-webhook', traceId);
  
  try {
    logger.info('Clerk webhook received');
    
    // Skip webhook processing in mock mode
    if (isMockMode()) {
      logger.info('Mock mode: Skipping webhook processing');
      return new Response('Mock mode - webhook skipped', { status: 200 });
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.warn('Missing svix headers');
      return new Response('Error occurred -- no svix headers', {
        status: 400,
      });
    }

    // Get the body
    const payload = await req.text();
    const body = JSON.parse(payload);

    // Get webhook secret with validation
    const webhookSecret = getEnv('CLERK_WEBHOOK_SECRET');
    
    // Create a new Svix instance with your secret
    const wh = new Webhook(webhookSecret);

    let evt: WebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      logger.error('Error verifying webhook', { error: err });
      return new Response('Error occurred', {
        status: 400,
      });
    }

    // Handle the webhook
    const eventType = evt.type;
    logger.info('Processing webhook event', { eventType });

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      
      try {
        logger.info('Creating user profile', { clerkUserId: id });
        
        // Create user profile in Supabase with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        );
        
        const insertPromise = supabaseServer
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            clerk_user_id: id,
            email: email_addresses[0]?.email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim(),
            avatar_url: image_url,
            subscription_tier: 'free',
            xp: 0,
            cravecoins: 0,
            streak_count: 0,
            current_level: 1,
            primary_craving: null, // Explicitly set to null for onboarding check
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

        if (error) {
          logger.error('Error creating user profile', { clerkUserId: id, error: error.message });
          return new Response('Error creating user profile', {
            status: 500,
          });
        }

        logger.info('User profile created successfully', { clerkUserId: id, userId: data.id });
      } catch (error) {
        logger.error('Error in user.created webhook', { clerkUserId: id, error });
        return new Response('Error processing webhook', {
          status: 500,
        });
      }
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      
      try {
        logger.info('Updating user profile', { clerkUserId: id });
        
        // Update user profile in Supabase
        const { error } = await supabaseServer
          .from('users')
          .update({
            email: email_addresses[0]?.email_address,
            name: `${first_name || ''} ${last_name || ''}`.trim(),
            avatar_url: image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', id);

        if (error) {
          logger.error('Error updating user profile', { clerkUserId: id, error: error.message });
          return new Response('Error updating user profile', {
            status: 500,
          });
        }

        logger.info('User profile updated successfully', { clerkUserId: id });
      } catch (error) {
        logger.error('Error in user.updated webhook', { clerkUserId: id, error });
        return new Response('Error processing webhook', {
          status: 500,
        });
      }
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;
      
      try {
        logger.info('Deleting user profile', { clerkUserId: id });
        
        // Delete user profile and related data from Supabase
        const { error } = await supabaseServer
          .from('users')
          .delete()
          .eq('clerk_user_id', id);

        if (error) {
          logger.error('Error deleting user profile', { clerkUserId: id, error: error.message });
          return new Response('Error deleting user profile', {
            status: 500,
          });
        }

        logger.info('User profile deleted successfully', { clerkUserId: id });
      } catch (error) {
        logger.error('Error in user.deleted webhook', { clerkUserId: id, error });
        return new Response('Error processing webhook', {
          status: 500,
        });
      }
    }

    logger.info('Webhook processed successfully', { eventType });
    return new Response('', { status: 200 });
  } catch (error) {
    logger.error('Webhook processing error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return new Response('Internal server error', { status: 500 });
  }
}

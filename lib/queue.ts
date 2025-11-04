// Job Queue System using Vercel Cron + Supabase
// Handles batched AI processing and background tasks

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface QueueJob {
  id: string;
  jobType: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt: Date;
  processedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface BatchAIJob {
  userIds: string[];
  jobType: 'onboarding_personalization' | 'user_summary' | 'battle_tasks';
  craving?: string;
  metadata?: any;
}

// Job queue manager
export class JobQueue {
  // Add job to queue
  static async addJob(
    jobType: string,
    payload: any,
    scheduledAt?: Date
  ): Promise<string> {
    const { data, error } = await supabase
      .from('queue_jobs')
      .insert({
        job_type: jobType,
        payload,
        scheduled_at: scheduledAt || new Date(),
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add job: ${error.message}`);
    }

    return data.id;
  }

  // Get pending jobs
  static async getPendingJobs(limit: number = 50): Promise<QueueJob[]> {
    const { data, error } = await supabase
      .from('queue_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }

    return data.map(job => ({
      id: job.id,
      jobType: job.job_type,
      payload: job.payload,
      status: job.status,
      scheduledAt: new Date(job.scheduled_at),
      processedAt: job.processed_at ? new Date(job.processed_at) : undefined,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
    }));
  }

  // Mark job as processing
  static async markJobProcessing(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('queue_jobs')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to mark job as processing: ${error.message}`);
    }
  }

  // Mark job as completed
  static async markJobCompleted(jobId: string): Promise<void> {
    const { error } = await supabase
      .from('queue_jobs')
      .update({
        status: 'completed',
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to mark job as completed: ${error.message}`);
    }
  }

  // Mark job as failed
  static async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('queue_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to mark job as failed: ${error.message}`);
    }
  }

  // Clean up old completed jobs
  static async cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabase
      .from('queue_jobs')
      .delete()
      .eq('status', 'completed')
      .lt('processed_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }
  }
}

// Batch AI job processor
export class BatchAIProcessor {
  // Process onboarding personalization batch
  static async processOnboardingPersonalization(job: BatchAIJob): Promise<void> {
    const { userIds, craving } = job;
    
    try {
      // Get user quiz answers from database
      const { data: users, error } = await supabase
        .from('users')
        .select('id, preferences')
        .in('id', userIds)
        .eq('primary_craving', craving);

      if (error) {
        throw new Error(`Failed to get users: ${error.message}`);
      }

      // Process each user's personalization
      for (const user of users) {
        try {
          // Generate personalized content using AI
          const personalization = await this.generatePersonalization(
            user.preferences,
            craving || 'nofap'
          );

          // Update user with personalization
          await supabase
            .from('users')
            .update({
              ai_summary: personalization.introMessage,
              preferences: {
                ...user.preferences,
                customHints: personalization.customHints,
              },
            })
            .eq('id', user.id);

          console.log(`Processed personalization for user ${user.id}`);
        } catch (error) {
          console.error(`Failed to process user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Batch personalization error:', error);
      throw error;
    }
  }

  // Process user summary batch
  static async processUserSummary(job: BatchAIJob): Promise<void> {
    const { userIds } = job;
    
    try {
      // Get user progress data
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          current_level,
          streak_count,
          xp,
          user_progress (
            completed_at,
            relapse_count,
            user_response
          )
        `)
        .in('id', userIds);

      if (error) {
        throw new Error(`Failed to get users: ${error.message}`);
      }

      // Process each user's summary
      for (const user of users) {
        try {
          // Generate summary using AI
          const summary = await this.generateUserSummary(user);

          // Update user summary
          await supabase
            .from('users')
            .update({
              ai_summary: summary,
            })
            .eq('id', user.id);

          console.log(`Processed summary for user ${user.id}`);
        } catch (error) {
          console.error(`Failed to process user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Batch summary error:', error);
      throw error;
    }
  }

  // Process battle tasks generation
  static async processBattleTasks(job: BatchAIJob): Promise<void> {
    const { craving } = job;
    
    try {
      // Generate battle tasks using AI
      const tasks = await this.generateBattleTasks(craving!);

      // Store tasks in database
      const taskInserts = tasks.map(task => ({
        craving_type: craving,
        task_text: task,
        reuse_count: 0,
      }));

      const { error } = await supabase
        .from('battle_tasks')
        .insert(taskInserts);

      if (error) {
        throw new Error(`Failed to insert battle tasks: ${error.message}`);
      }

      console.log(`Generated ${tasks.length} battle tasks for ${craving}`);
    } catch (error) {
      console.error('Battle tasks generation error:', error);
      throw error;
    }
  }

  // Generate personalization (mock implementation)
  private static async generatePersonalization(
    preferences: any,
    craving: string
  ): Promise<{ introMessage: string; customHints: string[] }> {
    // In production, this would call OpenAI API
    // For now, return mock data
    return {
      introMessage: `Welcome to your ${craving} journey! You've got this!`,
      customHints: [
        'Start each day with intention',
        'Track your triggers carefully',
        'Celebrate small wins',
      ],
    };
  }

  // Generate user summary (mock implementation)
  private static async generateUserSummary(user: any): Promise<string> {
    // In production, this would call OpenAI API
    // For now, return mock summary
    return `User: Level ${user.current_level}/30. ${user.streak_count}-day streak. Recent progress shows strong commitment.`;
  }

  // Generate battle tasks (mock implementation)
  private static async generateBattleTasks(craving: string): Promise<string[]> {
    // In production, this would call OpenAI API
    // For now, return mock tasks
    const fallbackTasks = {
      nofap: [
        'Do 20 pushups when craving hits',
        'Take a cold shower for 2 minutes',
        'Read 10 pages of a book',
        'Go for a 15-minute walk',
        'Practice deep breathing for 5 minutes',
      ],
      sugar: [
        'Drink a full glass of water',
        'Eat a piece of fruit instead',
        'Take a 10-minute walk outside',
        'Brush your teeth',
        'Call a friend for support',
      ],
      shopping: [
        'Wait 24 hours before buying',
        'Calculate the real cost (including interest)',
        'Find 3 free alternatives',
        'Delete shopping apps for the day',
        'Put the money in savings instead',
      ],
      smoking_vaping: [
        'Chew gum for 5 minutes',
        'Do 10 jumping jacks',
        'Call your support person',
        'Practice the 4-7-8 breathing technique',
        'Go to a smoke-free environment',
      ],
      social_media: [
        'Put phone in another room for 1 hour',
        'Read a book for 30 minutes',
        'Go for a walk without your phone',
        'Call a friend instead of texting',
        'Do a creative activity offline',
      ],
    };

    return fallbackTasks[craving as keyof typeof fallbackTasks] || fallbackTasks.nofap;
  }
}

// Queue processor for Vercel Cron
export class QueueProcessor {
  // Process all pending jobs
  static async processPendingJobs(): Promise<void> {
    try {
      const jobs = await JobQueue.getPendingJobs(50);
      console.log(`Processing ${jobs.length} pending jobs`);

      for (const job of jobs) {
        try {
          await JobQueue.markJobProcessing(job.id);
          await this.processJob(job);
          await JobQueue.markJobCompleted(job.id);
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          await JobQueue.markJobFailed(job.id, (error as Error).message);
        }
      }

      // Cleanup old jobs
      await JobQueue.cleanupOldJobs();
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  // Process individual job
  private static async processJob(job: QueueJob): Promise<void> {
    switch (job.jobType) {
      case 'onboarding_personalization':
        await BatchAIProcessor.processOnboardingPersonalization(job.payload);
        break;
      case 'user_summary':
        await BatchAIProcessor.processUserSummary(job.payload);
        break;
      case 'battle_tasks':
        await BatchAIProcessor.processBattleTasks(job.payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
  }
}

// Queue utilities
export class QueueUtils {
  // Schedule onboarding personalization for new users
  static async scheduleOnboardingPersonalization(
    userIds: string[],
    craving: string
  ): Promise<void> {
    await JobQueue.addJob('onboarding_personalization', {
      userIds,
      craving,
    });
  }

  // Schedule user summary update
  static async scheduleUserSummary(userIds: string[]): Promise<void> {
    await JobQueue.addJob('user_summary', {
      userIds,
    });
  }

  // Schedule battle tasks generation
  static async scheduleBattleTasks(craving: string): Promise<void> {
    await JobQueue.addJob('battle_tasks', {
      craving,
    });
  }

  // Get queue statistics
  static async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('queue_jobs')
      .select('status')
      .in('status', ['pending', 'processing', 'completed', 'failed']);

    if (error) {
      throw new Error(`Failed to get queue stats: ${error.message}`);
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const job of data) {
      stats[job.status as keyof typeof stats]++;
    }

    return stats;
  }
}

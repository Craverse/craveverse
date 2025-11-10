// Individual thread page with replies
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  ThumbsUp,
  Clock,
  User,
  Crown,
  Star,
  Reply,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useUserContext } from '@/contexts/user-context';

interface Thread {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  craving_type: string;
  upvotes: number;
  created_at: string;
  ai_reply_suggested?: string;
}

interface Reply {
  id: string;
  content: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  upvotes: number;
  created_at: string;
  ai_generated: boolean;
  parent_reply_id?: string;
}

export default function ThreadPage() {
  const params = useParams();
  const threadId = params?.threadId as string;
  const { userProfile } = useUserContext();
  
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const canReply = (userProfile?.subscription_tier ?? 'free') !== 'free';

  const fetchThreadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Add timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`/api/forum/threads/${threadId}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setThread(data.thread);
        setReplies(data.replies);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Thread fetch timeout');
      } else {
        console.error('Error fetching thread data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchThreadData();
  }, [fetchThreadData]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canReply) {
      toast.info('Upgrade to Plus to join the discussion.');
      return;
    }

    if (!newReply.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/forum/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          content: newReply.trim(),
        }),
      });

      if (response.ok) {
        setNewReply('');
        fetchThreadData();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAISuggestion = async () => {
    if (!thread) return;
    if (!canReply) {
      toast.info('AI reply drafting is a Plus feature. Upgrade to unlock.');
      return;
    }

    try {
      const response = await fetch('/api/forum/suggest-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadTitle: thread.title,
          craving: thread.craving_type,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestion(data.suggestion);
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'plus':
      case 'plus_trial':
        return <Star className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'plus':
      case 'plus_trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCravingIcon = (craving: string) => {
    const icons = {
      nofap: '🚫',
      sugar: '🍭',
      shopping: '🛍️',
      smoking_vaping: '🚭',
      social_media: '📱',
    };
    return icons[craving as keyof typeof icons] || '🌐';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Thread not found</h1>
          <p className="text-muted-foreground">This thread may have been deleted or doesn't exist.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forum
          </Button>
          
          <div className="flex items-center space-x-2 mb-4">
            <Badge variant="outline">
              {getCravingIcon(thread.craving_type)} {thread.craving_type.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Thread */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{thread.title}</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={thread.author_avatar} />
                      <AvatarFallback>
                        {thread.author_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{thread.author_name}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getTierColor(thread.author_tier)}`}
                    >
                      {getTierIcon(thread.author_tier)}
                      <span className="ml-1">{thread.author_tier.toUpperCase()}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{thread.content}</p>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {thread.upvotes} Upvotes
                </Button>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>{replies.length} Replies</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestion */}
        {thread.ai_reply_suggested && (
          <Card className="mb-6 border-crave-orange/20 bg-crave-orange/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-crave-orange" />
                <span className="text-sm font-medium text-crave-orange">AI Suggested Reply</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {thread.ai_reply_suggested}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewReply(thread.ai_reply_suggested || '')}
                className="text-xs"
              >
                Use This Reply
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Reply Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Add a Reply</CardTitle>
            <CardDescription>
              Share your thoughts and help the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canReply && (
              <div className="mb-4 rounded-lg border border-dashed border-crave-orange/40 bg-crave-orange/5 p-4 text-sm text-orange-700">
                <p className="mb-3">
                  Replies are a Plus feature. Upgrade to unlock full community participation.
                </p>
                <Button
                  variant="outline"
                  className="border-crave-orange text-crave-orange hover:bg-crave-orange hover:text-white"
                  asChild
                >
                  <a href="/pricing?highlight=plus">
                    Upgrade to Plus
                  </a>
                </Button>
              </div>
            )}
            <form onSubmit={handleReplySubmit} className="space-y-4">
              <Textarea
                placeholder="Write your reply..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                className="min-h-[100px]"
                disabled={!canReply}
                maxLength={1000}
                required
              />
              
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {newReply.length}/1000 characters
                </p>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggestion}
                    className="text-xs"
                    disabled={!canReply}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Get AI Help
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canReply || !newReply.trim() || isSubmitting}
                    className="bg-crave-orange hover:bg-crave-orange-dark"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              </div>
            </form>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="mt-4 p-3 bg-crave-orange/10 border border-crave-orange/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-4 w-4 text-crave-orange" />
                  <span className="text-sm font-medium text-crave-orange">AI Suggestion</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{aiSuggestion}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewReply(aiSuggestion)}
                  className="text-xs"
                >
                  Use This Content
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          
          {replies.length > 0 ? (
            replies.map((reply) => (
              <Card key={reply.id} className="ml-4">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reply.author_avatar} />
                      <AvatarFallback>
                        {reply.author_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium">{reply.author_name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getTierColor(reply.author_tier)}`}
                        >
                          {getTierIcon(reply.author_tier)}
                          <span className="ml-1">{reply.author_tier.toUpperCase()}</span>
                        </Badge>
                        {reply.ai_generated && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      <div className="flex items-center space-x-4 mt-3">
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {reply.upvotes}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Reply className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No replies yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share your thoughts on this thread!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


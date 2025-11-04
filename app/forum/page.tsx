// Forum main page with thread list
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter,
  TrendingUp,
  Clock,
  Users,
  Flame
} from 'lucide-react';
import { ThreadList } from '../../components/forum/thread-list';
import { CreateThreadModal } from '../../components/forum/create-thread-modal';
import { ForumFilters } from '../../components/forum/forum-filters';
import { useLogger } from '@/lib/logger';

interface ForumThread {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  craving_type: string;
  upvotes: number;
  reply_count: number;
  created_at: string;
  ai_reply_suggested?: string;
}

export default function ForumPage() {
  const logger = useLogger('ForumPage');
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCraving, setSelectedCraving] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [selectedCraving, sortBy]);

  const fetchThreads = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/forum/threads?craving=${selectedCraving}&sort=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads);
      }
    } catch (error) {
      logger.error('Error fetching threads', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleThreadCreated = () => {
    fetchThreads();
    setIsCreateModalOpen(false);
  };

  const cravingOptions = [
    { value: 'all', label: 'All Topics', icon: '🌐' },
    { value: 'nofap', label: 'NoFap', icon: '🚫' },
    { value: 'sugar', label: 'Sugar Free', icon: '🍭' },
    { value: 'shopping', label: 'Shopping Control', icon: '🛍️' },
    { value: 'smoking_vaping', label: 'Smoke Free', icon: '🚭' },
    { value: 'social_media', label: 'Social Media Detox', icon: '📱' },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'trending', label: 'Trending' },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Community Forum</h1>
              <p className="text-muted-foreground">
                Connect with others on their journey
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-crave-orange hover:bg-crave-orange-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Thread
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Craving Filter */}
            <ForumFilters
              selectedCraving={selectedCraving}
              onCravingChange={setSelectedCraving}
              cravingOptions={cravingOptions}
            />
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Sort by:</span>
            <Tabs value={sortBy} onValueChange={setSortBy}>
              <TabsList>
                {sortOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-crave-orange" />
                <div>
                  <p className="text-sm font-medium">Total Threads</p>
                  <p className="text-2xl font-bold">{threads.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">1.2k</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Today's Posts</p>
                  <p className="text-2xl font-bold">47</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Flame className="h-5 w-5 text-crave-orange" />
                <div>
                  <p className="text-sm font-medium">Hot Threads</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI CraveBot Section */}
        <Card className="border-crave-orange/20 bg-crave-orange/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-crave-orange" />
              <span>Ask CraveBot</span>
            </CardTitle>
            <CardDescription>
              Get AI-powered advice and support for your journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* AI PLACEHOLDER: CraveBot replies - AI integration coming in Stage 2 */}
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-400 mb-2">API</div>
                <div className="text-sm text-gray-500" title="AI integration coming in Stage 2">
                  AI-powered CraveBot responses
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Thread List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange"></div>
            </div>
          ) : threads.length > 0 ? (
            <ThreadList 
              threads={threads} 
              onThreadUpdate={fetchThreads}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No threads found</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to start a conversation in this category!
                </p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-crave-orange hover:bg-crave-orange-dark"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Thread
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Thread Modal */}
        <CreateThreadModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </div>
    </AuthGuard>
  );
}

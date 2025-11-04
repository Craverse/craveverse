// Admin dashboard for monitoring and management
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLogger } from '@/lib/logger';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Zap,
  Crown,
  Star,
  Clock,
  Target
} from 'lucide-react';

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  aiCosts: number;
  aiCostPerUser: number;
  conversionRate: number;
  churnRate: number;
  topFeatures: Array<{ name: string; usage: number }>;
  userTiers: Array<{ tier: string; count: number; percentage: number }>;
  recentActivity: Array<{ action: string; user: string; timestamp: string }>;
}

export default function AdminPage() {
  const logger = useLogger('AdminPage');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeframe]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/metrics?timeframe=${selectedTimeframe}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      logger.error('Error fetching metrics', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const getCostStatusColor = (costPerUser: number) => {
    if (costPerUser <= 0.005) return 'text-green-600';
    if (costPerUser <= 0.01) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConversionStatusColor = (rate: number) => {
    if (rate >= 0.15) return 'text-green-600';
    if (rate >= 0.10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor system performance and user metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button onClick={fetchMetrics} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-2xl font-bold">${metrics.monthlyRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  metrics.aiCostPerUser <= 0.005 ? 'bg-green-100' : 
                  metrics.aiCostPerUser <= 0.01 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Zap className={`h-6 w-6 ${
                    metrics.aiCostPerUser <= 0.005 ? 'text-green-600' : 
                    metrics.aiCostPerUser <= 0.01 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Cost/User</p>
                  <p className={`text-2xl font-bold ${getCostStatusColor(metrics.aiCostPerUser)}`}>
                    ${metrics.aiCostPerUser.toFixed(4)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="ai-costs">AI Costs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Tiers */}
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Breakdown by subscription tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.userTiers.map((tier) => (
                      <div key={tier.tier} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {tier.tier === 'free' && <Star className="h-4 w-4 text-gray-500" />}
                          {tier.tier === 'plus' && <Zap className="h-4 w-4 text-blue-500" />}
                          {tier.tier === 'ultra' && <Crown className="h-4 w-4 text-yellow-500" />}
                          <span className="font-medium capitalize">{tier.tier}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{tier.count.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">{tier.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Performance Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                  <CardDescription>Critical business metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Conversion Rate</span>
                      <Badge className={getConversionStatusColor(metrics.conversionRate)}>
                        {(metrics.conversionRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Churn Rate</span>
                      <Badge variant={metrics.churnRate > 0.05 ? 'destructive' : 'secondary'}>
                        {(metrics.churnRate * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-semibold">${metrics.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">AI Costs</span>
                      <span className="font-semibold">${metrics.aiCosts.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Analytics</CardTitle>
                <CardDescription>Detailed user metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{metrics.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{metrics.activeUsers}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-crave-orange">
                      {((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Activation Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-costs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Cost Analysis</CardTitle>
                <CardDescription>OpenAI usage and cost optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Cost Per User</h4>
                      <div className={`text-2xl font-bold ${getCostStatusColor(metrics.aiCostPerUser)}`}>
                        ${metrics.aiCostPerUser.toFixed(4)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Target: ≤$0.01/user/month
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Total AI Costs</h4>
                      <div className="text-2xl font-bold">${metrics.aiCosts.toFixed(2)}</div>
                      <p className="text-sm text-muted-foreground">
                        This {selectedTimeframe}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Top AI Features</h4>
                    <div className="space-y-2">
                      {metrics.topFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="capitalize">{feature.name.replace('_', ' ')}</span>
                          <Badge variant="outline">{feature.usage} calls</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest user actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-crave-orange/10 rounded-lg">
                          <Target className="h-4 w-4 text-crave-orange" />
                        </div>
                        <div>
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-sm text-muted-foreground">by {activity.user}</div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {activity.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}











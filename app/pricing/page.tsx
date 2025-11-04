// Pricing page with subscription tiers
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { PRICING_TIERS } from '../../lib/config';

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    // Stripe disabled - all features are free
    alert('All features are currently free! No payment required. Enjoy your journey! 🎉');
      setIsLoading(null);
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case 'free':
        return <Star className="h-5 w-5 text-gray-500" />;
      case 'plus':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'ultra':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      default:
        return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTierColor = (tierId: string) => {
    switch (tierId) {
      case 'free':
        return 'border-gray-200';
      case 'plus':
        return 'border-blue-200 bg-blue-50/50';
      case 'ultra':
        return 'border-yellow-200 bg-yellow-50/50';
      default:
        return 'border-gray-200';
    }
  };

  const features = [
    { name: '30-Day Journey', free: true, plus: true, ultra: true },
    { name: 'AI-Powered Feedback', free: true, plus: true, ultra: true },
    { name: 'Community Forum', free: true, plus: true, ultra: true },
    { name: '1v1 Battles', free: false, plus: true, ultra: true },
    { name: 'Advanced Analytics', free: false, plus: true, ultra: true },
    { name: 'Priority Support', free: false, plus: true, ultra: true },
    { name: 'Unlimited Battles', free: false, plus: false, ultra: true },
    { name: 'Personal Coach', free: false, plus: false, ultra: true },
    { name: 'Real-World Rewards', free: false, plus: false, ultra: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your journey for free, or unlock premium features to accelerate your progress
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.values(PRICING_TIERS).map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                tier.id === 'plus' ? 'scale-105 border-crave-orange' : ''
              } ${getTierColor(tier.id)}`}
            >
              {tier.id === 'plus' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-crave-orange text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {getTierIcon(tier.id)}
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                </div>
                <CardDescription className="text-base">
                  {tier.id === 'free' && 'Perfect for getting started'}
                  {tier.id === 'plus' && 'For serious challengers'}
                  {tier.id === 'ultra' && 'For ultimate transformation'}
                </CardDescription>
                
                <div className="mt-4">
                  {tier.id === 'free' ? (
                    <div className="text-4xl font-bold">Free</div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-4xl font-bold">
                        ${tier.price_monthly_usd}
                        <span className="text-lg font-normal text-muted-foreground">/month</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        or ${tier.price_yearly_usd}/year (save 17%)
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Key Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold">What's Included:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{tier.levels_unlocked === Infinity ? 'Unlimited' : tier.levels_unlocked} Levels</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{tier.cravings_unlocked === Infinity ? 'All' : tier.cravings_unlocked} Cravings</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{tier.forum_post_limit_per_day === Infinity ? 'Unlimited' : tier.forum_post_limit_per_day} Forum Posts/Day</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{tier.pause_tokens_per_month === Infinity ? 'Unlimited' : tier.pause_tokens_per_month} Pause Tokens</span>
                    </li>
                    {tier.streak_recovery && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Streak Recovery</span>
                      </li>
                    )}
                    {tier.ai_weekly_insight_summaries && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Weekly AI Insights</span>
                      </li>
                    )}
                    {tier.dynamic_ai_coach && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Personal AI Coach</span>
                      </li>
                    )}
                    {tier.real_world_reward && (
                      <li className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Real-World Rewards</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  {tier.id === 'free' ? (
                    <Button 
                      className="w-full bg-gray-600 hover:bg-gray-700"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={isLoading === tier.id}
                      className={`w-full ${
                        tier.id === 'plus' 
                          ? 'bg-crave-orange hover:bg-crave-orange-dark' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isLoading === tier.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        `Upgrade to ${tier.name}`
                      )}
                    </Button>
                  )}
                </div>

                {/* Trial Info */}
                {tier.id !== 'free' && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>14-day free trial • Cancel anytime</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Features</th>
                      <th className="text-center p-4 font-medium">Free</th>
                      <th className="text-center p-4 font-medium">Plus</th>
                      <th className="text-center p-4 font-medium">Ultra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-4 font-medium">{feature.name}</td>
                        <td className="text-center p-4">
                          {feature.free ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {feature.plus ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {feature.ultra ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What happens if I cancel?</h3>
                <p className="text-muted-foreground">
                  You'll keep access to premium features until your current billing period ends. Your progress and data are always preserved.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-muted-foreground">
                  Yes! All paid plans come with a 14-day free trial. No credit card required to start.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


// Personalization results component
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lightbulb, Target, Users } from 'lucide-react';

interface PersonalizationResultsProps {
  personalization: {
    introMessage: string;
    customHints: string[];
  };
  craving: string;
  onComplete: () => void;
  isLoading: boolean;
}

const cravingInfo = {
  nofap: {
    name: 'NoFap',
    icon: '🚫',
    color: '#FF6B6B',
    description: 'Overcome pornography addiction and build self-control',
  },
  sugar: {
    name: 'Sugar Free',
    icon: '🍭',
    color: '#FFD93D',
    description: 'Break free from sugar addiction and improve health',
  },
  shopping: {
    name: 'Shopping Control',
    icon: '🛍️',
    color: '#6BCF7F',
    description: 'Stop impulse buying and save money',
  },
  smoking_vaping: {
    name: 'Smoke Free',
    icon: '🚭',
    color: '#4ECDC4',
    description: 'Quit smoking and vaping for better health',
  },
  social_media: {
    name: 'Social Media Detox',
    icon: '📱',
    color: '#A8E6CF',
    description: 'Reduce social media usage and reclaim time',
  },
};

export function PersonalizationResults({
  personalization,
  craving,
  onComplete,
  isLoading,
}: PersonalizationResultsProps) {
  const info = cravingInfo[craving as keyof typeof cravingInfo];

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="border-crave-orange/20 bg-crave-orange/5">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{info.icon}</div>
            <div>
              <CardTitle className="text-xl">{info.name} Journey</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium text-crave-orange">
            {personalization.introMessage}
          </p>
          {/* AI PLACEHOLDER: Personalization preview - AI integration coming in Stage 2 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-400 mb-2">API</div>
              <div className="text-sm text-gray-500" title="AI integration coming in Stage 2">
                AI-powered personalization preview
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Hints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-crave-orange" />
            <span>Your Personalized Tips</span>
          </CardTitle>
          <CardDescription>
            Based on your responses, here are your custom recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {personalization.customHints.map((hint, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-crave-orange/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-crave-orange">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm">{hint}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-crave-orange" />
            <span>What's Next?</span>
          </CardTitle>
          <CardDescription>
            Your journey starts with these first steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Complete your first level today</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Track your progress daily</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Join the community for support</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Earn XP and CraveCoins as you progress</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Support */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Community Support</span>
          </CardTitle>
          <CardDescription>
            You're not alone in this journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              Join thousands of others who are conquering their cravings.
              Share your progress, get encouragement, and celebrate victories together.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">24/7 Support</Badge>
              <Badge variant="secondary">AI-Powered Tips</Badge>
              <Badge variant="secondary">Progress Tracking</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="text-center">
        <Button
          onClick={onComplete}
          disabled={isLoading}
          size="lg"
          className="bg-crave-orange hover:bg-crave-orange-dark text-white px-8 py-3 text-lg"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Setting up your journey...</span>
            </div>
          ) : (
            'Start My Journey'
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Your personalized journey is ready to begin
        </p>
      </div>
    </div>
  );
}

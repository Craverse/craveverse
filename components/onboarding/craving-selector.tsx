// Craving selection component for onboarding
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CravingOption {
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: string;
}

const cravingOptions: CravingOption[] = [
  {
    type: 'nofap',
    name: 'NoFap',
    description: 'Overcome pornography addiction and build self-control',
    icon: '🚫',
    color: '#FF6B6B',
    difficulty: 'Hard',
    duration: '30-90 days',
  },
  {
    type: 'sugar',
    name: 'Sugar Free',
    description: 'Break free from sugar addiction and improve health',
    icon: '🍭',
    color: '#FFD93D',
    difficulty: 'Medium',
    duration: '21-60 days',
  },
  {
    type: 'shopping',
    name: 'Shopping Control',
    description: 'Stop impulse buying and save money',
    icon: '🛍️',
    color: '#6BCF7F',
    difficulty: 'Easy',
    duration: '14-30 days',
  },
  {
    type: 'smoking_vaping',
    name: 'Smoke Free',
    description: 'Quit smoking and vaping for better health',
    icon: '🚭',
    color: '#4ECDC4',
    difficulty: 'Hard',
    duration: '30-90 days',
  },
  {
    type: 'social_media',
    name: 'Social Media Detox',
    description: 'Reduce social media usage and reclaim time',
    icon: '📱',
    color: '#A8E6CF',
    difficulty: 'Easy',
    duration: '7-30 days',
  },
];

interface CravingSelectorProps {
  onSelect: (craving: string) => void;
}

export function CravingSelector({ onSelect }: CravingSelectorProps) {
  const [selectedCraving, setSelectedCraving] = useState<string | null>(null);

  const handleSelect = (craving: string) => {
    setSelectedCraving(craving);
    onSelect(craving);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cravingOptions.map((option) => (
        <Card
          key={option.type}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
            selectedCraving === option.type
              ? 'ring-2 ring-crave-orange bg-crave-orange/5'
              : 'hover:shadow-md'
          }`}
          onClick={() => handleSelect(option.type)}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="text-4xl">{option.icon}</div>
              
              {/* Name */}
              <h3 className="text-xl font-semibold">{option.name}</h3>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
              
              {/* Difficulty and Duration */}
              <div className="flex justify-center space-x-2">
                <Badge 
                  variant={option.difficulty === 'Easy' ? 'default' : option.difficulty === 'Medium' ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {option.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {option.duration}
                </Badge>
              </div>
              
              {/* Color indicator */}
              <div 
                className="w-full h-2 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

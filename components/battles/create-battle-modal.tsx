'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sword,
  Clock,
  Target,
  Users,
} from 'lucide-react';

interface CreateBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBattleCreated: () => void;
}

export function CreateBattleModal({ isOpen, onClose, onBattleCreated }: CreateBattleModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    opponent_username: '',
    craving_type: '',
    duration: '7',
    description: '',
    stakes: 'friendly'
  });

const cravingOptions = [
    { value: 'nofap', label: 'NoFap', icon: '🚫', description: 'Overcome porn addiction' },
    { value: 'sugar', label: 'Sugar Free', icon: '🍭', description: 'Eliminate sugar cravings' },
    { value: 'shopping', label: 'Shopping Control', icon: '🛍️', description: 'Control impulse buying' },
    { value: 'smoking_vaping', label: 'Smoke Free', icon: '🚭', description: 'Quit smoking/vaping' },
  { value: 'social_media', label: 'Social Media Detox', icon: '📱', description: 'Reduce social media usage' },
];

const durationOptions = [
    { value: '3', label: '3 Days', description: 'Quick challenge' },
    { value: '7', label: '1 Week', description: 'Standard challenge' },
    { value: '14', label: '2 Weeks', description: 'Extended challenge' },
    { value: '30', label: '1 Month', description: 'Long-term challenge' },
  ];

  const stakesOptions = [
    { value: 'friendly', label: 'Friendly Competition', description: 'Just for fun and motivation' },
    { value: 'coins', label: 'CraveCoins', description: 'Winner takes CraveCoins' },
    { value: 'xp', label: 'XP Boost', description: 'Winner gets bonus XP' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/battles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onBattleCreated();
        setFormData({
          opponent_username: '',
          craving_type: '',
          duration: '7',
          description: '',
          stakes: 'friendly'
        });
      } else {
        console.error('Failed to create battle');
      }
    } catch (error) {
      console.error('Error creating battle:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedCraving = cravingOptions.find(opt => opt.value === formData.craving_type);
  const selectedDuration = durationOptions.find(opt => opt.value === formData.duration);
  const selectedStakes = stakesOptions.find(opt => opt.value === formData.stakes);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sword className="h-5 w-5 text-crave-orange" />
            <span>Create New Battle</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Opponent Selection */}
          <div className="space-y-2">
            <Label htmlFor="opponent">Opponent Username</Label>
            <Input
              id="opponent"
              placeholder="Enter username to challenge"
              value={formData.opponent_username}
              onChange={(e) => handleInputChange('opponent_username', e.target.value)}
              required
            />
          </div>

          {/* Craving Type Selection */}
          <div className="space-y-2">
            <Label>Challenge Type</Label>
            <Select value={formData.craving_type} onValueChange={(value) => handleInputChange('craving_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a challenge type" />
              </SelectTrigger>
              <SelectContent>
                {cravingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCraving && (
              <p className="text-sm text-muted-foreground">{selectedCraving.description}</p>
            )}
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>Battle Duration</Label>
            <Select value={formData.duration} onValueChange={(value) => handleInputChange('duration', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{option.label}</span>
                      <span className="text-muted-foreground">- {option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
                      </div>

          {/* Stakes Selection */}
          <div className="space-y-2">
            <Label>Battle Stakes</Label>
            <Select value={formData.stakes} onValueChange={(value) => handleInputChange('stakes', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stakes" />
              </SelectTrigger>
              <SelectContent>
                {stakesOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>{option.label}</span>
                      <span className="text-muted-foreground">- {option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Battle Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for your battle..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Battle Preview */}
          {formData.opponent_username && formData.craving_type && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Battle Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>You vs {formData.opponent_username}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{selectedCraving?.icon}</span>
                    <span>{selectedCraving?.label} Challenge</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>{selectedDuration?.label}</span>
                </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-yellow-600" />
                    <span>{selectedStakes?.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.opponent_username || !formData.craving_type}
              className="flex-1 bg-crave-orange hover:bg-crave-orange-dark"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Sword className="h-4 w-4 mr-2" />
                  Create Battle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
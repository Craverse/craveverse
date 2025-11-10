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
  MessageSquare, 
  Plus 
} from 'lucide-react';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated: () => void;
}

export function CreateThreadModal({ isOpen, onClose, onThreadCreated }: CreateThreadModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    craving_type: '',
    tags: '',
    ai_assistance: true
  });

  const cravingOptions = [
    { value: 'nofap', label: 'NoFap', icon: '🚫', description: 'Overcome porn addiction' },
    { value: 'sugar', label: 'Sugar Free', icon: '🍭', description: 'Eliminate sugar cravings' },
    { value: 'shopping', label: 'Shopping Control', icon: '🛍️', description: 'Control impulse buying' },
    { value: 'smoking_vaping', label: 'Smoke Free', icon: '🚭', description: 'Quit smoking/vaping' },
    { value: 'social_media', label: 'Social Media Detox', icon: '📱', description: 'Reduce social media usage' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/forum/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onThreadCreated();
        setFormData({
          title: '',
          content: '',
          craving_type: '',
          tags: '',
          ai_assistance: true
        });
      } else {
        console.error('Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedCraving = cravingOptions.find(opt => opt.value === formData.craving_type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-crave-orange" />
            <span>Create New Thread</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thread Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Thread Title</Label>
            <Input
              id="title"
              placeholder="What's your question or topic?"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Craving Type Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.craving_type} onValueChange={(value) => handleInputChange('craving_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
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

          {/* Thread Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Thread Content</Label>
            <Textarea
              id="content"
              placeholder="Share your thoughts, ask questions, or start a discussion..."
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              required
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {formData.content.length}/2000 characters
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="e.g., motivation, tips, support"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>

          {/* AI Assistance */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.ai_assistance}
                onChange={(e) => handleInputChange('ai_assistance', e.target.checked)}
                className="rounded"
              />
              <span>Enable AI Reply Suggestions</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow AI to suggest helpful replies to your thread
            </p>
          </div>

          {/* Thread Preview */}
          {formData.title && formData.content && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Thread Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{selectedCraving?.icon}</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">
                    {formData.content}
                  </p>
                  {formData.tags && (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">Tags:</span>
                      <span className="text-xs">{formData.tags}</span>
                    </div>
                  )}
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
              disabled={isCreating || !formData.title || !formData.content || !formData.craving_type}
              className="flex-1 bg-crave-orange hover:bg-crave-orange-dark"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Thread
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// Onboarding quiz component
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

interface OnboardingQuizProps {
  craving: string;
  onComplete: (answers: Record<string, any>) => void;
}

const quizQuestions: Record<string, QuizQuestion[]> = {
  nofap: [
    {
      id: 'severity',
      question: 'How would you describe your current situation?',
      options: [
        { value: 'beginner', label: 'Just starting to recognize the problem', description: 'New to this journey' },
        { value: 'moderate', label: 'Been struggling for a while', description: 'Some experience with attempts' },
        { value: 'severe', label: 'This is a major life issue', description: 'Significant impact on daily life' },
      ],
    },
    {
      id: 'triggers',
      question: 'What are your main triggers? (Select all that apply)',
      options: [
        { value: 'stress', label: 'Stress and anxiety' },
        { value: 'boredom', label: 'Boredom' },
        { value: 'loneliness', label: 'Loneliness' },
        { value: 'social_media', label: 'Social media exposure' },
        { value: 'evening', label: 'Evening/night time' },
      ],
    },
    {
      id: 'attempts',
      question: 'How many times have you tried to quit before?',
      options: [
        { value: 'never', label: 'This is my first serious attempt' },
        { value: 'few', label: '2-5 times' },
        { value: 'many', label: '6-10 times' },
        { value: 'countless', label: 'Too many to count' },
      ],
    },
    {
      id: 'motivation',
      question: 'What motivates you most to make this change?',
      options: [
        { value: 'health', label: 'Physical and mental health' },
        { value: 'relationships', label: 'Better relationships' },
        { value: 'productivity', label: 'Increased productivity' },
        { value: 'self_worth', label: 'Self-respect and confidence' },
      ],
    },
    {
      id: 'support',
      question: 'Do you have support from others?',
      options: [
        { value: 'strong', label: 'Yes, strong support system' },
        { value: 'some', label: 'Some support, but limited' },
        { value: 'minimal', label: 'Very little support' },
        { value: 'none', label: 'No support system' },
      ],
    },
  ],
  sugar: [
    {
      id: 'severity',
      question: 'How would you describe your sugar consumption?',
      options: [
        { value: 'mild', label: 'I eat sweets occasionally', description: 'A few times per week' },
        { value: 'moderate', label: 'I have sweets daily', description: 'Regular consumption' },
        { value: 'severe', label: 'I crave sugar constantly', description: 'Multiple times per day' },
      ],
    },
    {
      id: 'triggers',
      question: 'When do you crave sugar most?',
      options: [
        { value: 'after_meals', label: 'After meals' },
        { value: 'stress', label: 'When stressed' },
        { value: 'afternoon', label: 'Afternoon energy dip' },
        { value: 'evening', label: 'Evening/night' },
      ],
    },
    {
      id: 'attempts',
      question: 'Have you tried to reduce sugar before?',
      options: [
        { value: 'never', label: 'This is my first attempt' },
        { value: 'few', label: 'A few times' },
        { value: 'many', label: 'Many times' },
        { value: 'constant', label: 'I try constantly but fail' },
      ],
    },
    {
      id: 'motivation',
      question: 'What motivates you to reduce sugar?',
      options: [
        { value: 'weight', label: 'Weight management' },
        { value: 'energy', label: 'Better energy levels' },
        { value: 'health', label: 'Overall health' },
        { value: 'skin', label: 'Clearer skin' },
      ],
    },
    {
      id: 'support',
      question: 'How supportive is your environment?',
      options: [
        { value: 'very', label: 'Very supportive' },
        { value: 'somewhat', label: 'Somewhat supportive' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'unsupportive', label: 'Not supportive' },
      ],
    },
  ],
  // Add more craving-specific questions...
};

export function OnboardingQuiz({ craving, onComplete }: OnboardingQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = quizQuestions[craving] || quizQuestions.nofap;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setSelectedAnswer(value);
  };

  const handleNext = () => {
    const question = questions[currentQuestion];
    setAnswers(prev => ({
      ...prev,
      [question.id]: selectedAnswer,
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer('');
    } else {
      // Quiz complete
      const finalAnswers = {
        ...answers,
        [question.id]: selectedAnswer,
      };
      onComplete(finalAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      const question = questions[currentQuestion - 1];
      setSelectedAnswer(answers[question.id] || '');
    }
  };

  const currentQ = questions[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <Badge variant="secondary">{Math.round(progress)}%</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedAnswer}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {currentQ.options.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-1"
                />
                <Label
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedAnswer}
          className="bg-crave-orange hover:bg-crave-orange-dark"
        >
          {currentQuestion === questions.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

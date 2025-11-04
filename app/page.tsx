// Landing page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserContext } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Star, 
  Zap, 
  Crown,
  Target,
  Users,
  Trophy,
  Shield,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { isMockMode } from '@/lib/utils';

// Note: Lazy loading components can be implemented when needed

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const mock = isMockMode();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { userProfile, isLoading: profileLoading, isOnboardingComplete } = useUserContext();

  // Redirect authenticated users away from landing page
  useEffect(() => {
    if (mock) return; // Skip in mock mode
    
    if (clerkLoaded && clerkUser) {
      // User is authenticated - check onboarding status
      if (!profileLoading) {
        if (isOnboardingComplete) {
          // Redirect to dashboard if onboarding complete
          router.push('/dashboard');
        } else {
          // Redirect to onboarding if incomplete
          router.push('/onboarding');
        }
      }
    }
  }, [clerkLoaded, clerkUser, profileLoading, isOnboardingComplete, mock, router]);

  const features = [
    {
      icon: <Target className="h-6 w-6 text-crave-orange" />,
      title: '30-Day Journey',
      description: 'Structured levels designed to break your cravings step by step',
    },
    {
      icon: <Zap className="h-6 w-6 text-crave-orange" />,
      title: 'AI-Powered Feedback',
      description: 'Personalized encouragement and insights powered by advanced AI',
    },
    {
      icon: <Users className="h-6 w-6 text-crave-orange" />,
      title: 'Community Support',
      description: 'Connect with others on similar journeys in our supportive forum',
    },
    {
      icon: <Trophy className="h-6 w-6 text-crave-orange" />,
      title: '1v1 Battles',
      description: 'Challenge others in competitive battles to stay motivated',
    },
    {
      icon: <Shield className="h-6 w-6 text-crave-orange" />,
      title: 'Streak Recovery',
      description: 'Built-in tools to help you bounce back from setbacks',
    },
    {
      icon: <Star className="h-6 w-6 text-crave-orange" />,
      title: 'Real Rewards',
      description: 'Earn actual rewards for completing your transformation',
    },
  ];

  const stats = [
    { label: 'Users Transformed', value: '10,000+' },
    { label: 'Success Rate', value: '85%' },
    { label: 'Average Streak', value: '45 days' },
    { label: 'Community Posts', value: '50,000+' },
  ];

  const testimonials = [
    {
      name: 'Sarah M.',
      role: 'NoFap Journey',
      content: 'CraveVerse helped me break free from a 5-year addiction. The AI feedback was incredibly motivating.',
      rating: 5,
    },
    {
      name: 'Mike R.',
      role: 'Sugar Free',
      content: 'The 30-day structure made it manageable. I never thought I could go without sugar for this long!',
      rating: 5,
    },
    {
      name: 'Lisa K.',
      role: 'Social Media Detox',
      content: 'The community support and battles kept me engaged. I finally have my life back!',
      rating: 5,
    },
  ];

  const handleGetStarted = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    try {
      setIsLoading(true);
      
      // Set auth intent flag so Clerk loads on next navigation
      if (typeof window !== 'undefined' && !mock) {
        sessionStorage.setItem('authIntent', 'true');
      }
      
      // Use window.location for immediate navigation
      window.location.href = '/sign-up';
    } catch (error) {
      // Fallback to router
      setIsLoading(false);
      router.push('/sign-up');
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ position: 'relative', zIndex: 1 }}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 bg-crave-orange/10 text-crave-orange border-crave-orange/20">
              <Star className="h-3 w-3 mr-1" />
              Join 10,000+ people transforming their lives
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Conquer Your{' '}
              <span className="text-crave-orange">Cravings</span>
              <br />
              Transform Your Life
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Break free from addiction with our AI-powered 30-day journey system. 
              Join a supportive community and prove your strength in 1v1 battles.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                type="button"
                size="lg" 
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGetStarted(e);
                }}
                disabled={isLoading}
                className="bg-crave-orange hover:bg-crave-orange-dark text-white px-8 py-4 text-lg cursor-pointer"
                style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  <>
                    Start Your Journey
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = '/pricing';
                }}
                className="px-8 py-4 text-lg"
              >
                View Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-crave-orange mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why CraveVerse Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our scientifically-backed approach combines AI technology with 
              community support to help you break free from any craving.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    {feature.icon}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Success Stories</h2>
            <p className="text-xl text-muted-foreground">
              Real people, real transformations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-4">
                    "{testimonial.content}"
                  </blockquote>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-crave-orange/5 border-crave-orange/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Transform Your Life?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of people who have already broken free from their cravings. 
                Your journey starts with a single step.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  type="button"
                  size="lg" 
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGetStarted(e);
                  }}
                  disabled={isLoading}
                  className="bg-crave-orange hover:bg-crave-orange-dark text-white px-8 py-4 text-lg cursor-pointer z-50 relative"
                  style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = '/pricing';
                  }}
                  className="px-8 py-4 text-lg"
                >
                  View All Plans
                </Button>
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                14-day free trial • No credit card required • Cancel anytime
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">CraveVerse</h3>
              <p className="text-muted-foreground">
                Transform your life by conquering your cravings with our 
                AI-powered 30-day journey system.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/features">Features</Link></li>
                <li><Link href="/about">About</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/forum">Forum</Link></li>
                <li><Link href="/leaderboard">Leaderboard</Link></li>
                <li><Link href="/battles">Battles</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 CraveVerse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}




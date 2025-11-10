# CraveVerse - AI-Powered Craving Management Platform

A modern, production-ready Next.js application designed to help users overcome cravings through gamification, AI-powered insights, and community support. Built with battle systems, level progression, and intelligent coaching.

## 🚀 Features

- **Gamified Progression**: Level-based system with XP, coins, and achievements
- **Battle System**: Compete with others in 24-hour challenges
- **AI-Powered Coaching**: Personalized insights and suggestions
- **Community Forum**: Share experiences and get support
- **Smart Analytics**: Track progress with detailed metrics
- **Subscription Tiers**: Free, Plus, and Ultra plans with different features
- **Real-time Updates**: Live progress tracking and notifications

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Authentication**: Clerk
- **Database**: Supabase
- **Analytics**: PostHog
- **Payments**: Stripe
- **AI**: OpenAI GPT models
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 📁 Project Structure

```
app/
├── layout.tsx                 # Root layout with providers
├── page.tsx                   # Landing page
├── globals.css               # Global styles
├── dashboard/                # User dashboard
├── onboarding/               # User onboarding flow
├── battles/                  # Battle system pages
├── forum/                    # Community forum
├── leaderboard/              # Rankings and stats
├── pricing/                  # Subscription plans
├── progress/[userId]/        # User progress tracking
├── admin/                    # Admin dashboard
└── api/                      # API routes
    ├── battles/              # Battle management
    ├── forum/                # Forum operations
    ├── levels/               # Level progression
    ├── stripe/               # Payment processing
    ├── webhooks/             # Webhook handlers
    └── user/                 # User management

components/
├── ui/                       # Base UI components
├── battles/                  # Battle-related components
├── forum/                    # Forum components
├── levels/                   # Level progression components
├── onboarding/               # Onboarding flow components
└── dashboard/                # Dashboard components

lib/
├── auth-utils.ts             # Authentication utilities
├── cache.ts                  # Caching layer
├── config.ts                 # Application configuration
├── cost-control.ts           # AI cost management
├── feature-gates.ts          # Feature access control
├── openai-client.ts         # AI integration
├── queue.ts                  # Background job queue
├── rate-limiter.ts           # Rate limiting
├── supabase-client.ts        # Database operations
├── types.ts                  # TypeScript definitions
└── utils.ts                  # Common utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account
- OpenAI account
- Stripe account (for payments)
- PostHog account (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd craveverse-deploy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
   CLERK_SECRET_KEY=your-clerk-secret-key
   
   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   
   # Stripe
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   
   # PostHog (optional)
   NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   
   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the schema in `database/craveverse-complete-schema.sql` (includes tables, indexes, RLS, functions, triggers)
   - Verify Row Level Security policies are enabled after import
   - Set up storage buckets

5. **Set up Clerk**
   - Create a new Clerk application
   - Configure authentication providers
   - Set up webhooks for user events

6. **Set up OpenAI**
   - Get your API key from OpenAI
   - Configure usage limits and monitoring

7. **Set up Stripe**
   - Create a Stripe account
   - Get your API keys
   - Configure webhooks for payment events

8. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Setup

The application uses Supabase with the following key tables:

- **users**: User profiles and subscription info
- **levels**: Level progression and completion
- **battles**: Battle system and matchmaking
- **forum_threads**: Community discussions
- **forum_replies**: Thread responses
- **user_progress**: Progress tracking
- **subscriptions**: Stripe subscription data
- **user_quiz_responses**: Persisted onboarding answers and derived preferences
- **button_interactions**: Aggregated per-page/button click counts for UX analytics
- **journey_events**: Time-series telemetry for onboarding, level flow, and latency diagnostics

Run the complete schema from `database/craveverse-complete-schema.sql` to set up all tables, relationships, RLS policies, helper functions, and rewards-related triggers.

## 🎮 Core Features

### Level System
- 30 levels per craving type
- XP-based progression
- Achievement badges
- Streak tracking

### Battle System
- 24-hour challenges
- Matchmaking by level and timezone
- Real-time progress tracking
- Winner/loser rewards

### Forum Community
- Thread creation and replies
- Upvoting system with CraveCoins
- AI-powered reply suggestions
- Moderation tools

### AI Coaching
- Personalized feedback
- Smart reply suggestions
- Progress insights
- Motivational messages

### Personalized Onboarding Quiz
- Runs immediately after sign-up to gather craving context
- Stores responses in `user_quiz_responses` and updates user preferences
- Marks users as no longer newbies so the dashboard unlocks instantly
- Feeds tailored themes, streak helpers, and battle recommendations

## 🔧 Configuration

### Subscription Tiers

**Free Tier:**
- 10 levels unlocked
- 1 craving type
- 1 forum post per day
- Basic AI features

**Plus Tier ($11.99/month):**
- 30 levels unlocked
- 2 craving types
- Unlimited forum posts
- Advanced AI coaching
- Streak recovery

**Ultra Tier ($29.99/month):**
- 30 levels unlocked
- 5 craving types
- Unlimited forum posts
- Premium AI coaching
- Real-world rewards
- Priority support

### AI Configuration
- Cost control with monthly budgets
- Rate limiting per user tier
- Fallback templates when budget exceeded
- Caching for improved performance

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed Vercel deployment instructions.

## ✅ Testing & QA

- `npm run type-check` – TypeScript correctness
- `npm run lint` – ESLint (existing warnings documented in `TEST_RESULTS.md`)
- `npm run test` – Type-safe Node.js test runner (tsx + node:test)
- `npx playwright test` – End-to-end smoke (once Playwright suite is finalized)
- PowerShell harnesses (`scripts/test-all.ps1`, `scripts/test-rewards-api.ps1`) for Windows regression
- Manual regression checklist: see `TEST_PLAN.md`
- Latest automation log: `TEST_RESULTS.md`

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript checks

# Setup (cross-platform)
npm run setup           # Node.js setup script
npm run setup:windows   # Windows batch setup
npm run setup:unix      # Unix shell setup
npm run setup:powershell # PowerShell setup
```

## 🔒 Security & Privacy

- **Row Level Security** (RLS) in Supabase
- **Secure authentication** with Clerk
- **Rate limiting** on all API endpoints
- **Cost controls** for AI usage
- **Data encryption** in transit and at rest
- **GDPR compliance** ready

## 📊 Monitoring & Analytics

- **PostHog integration** for user behavior
- **Performance monitoring** with built-in metrics
- **Error tracking** and logging
- **Cost monitoring** for AI usage
- **Health checks** for all services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Contact the development team

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI coaching features
- [ ] Team battles and group challenges
- [ ] Integration with fitness trackers
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

---

Built with ❤️ for overcoming cravings and building better habits
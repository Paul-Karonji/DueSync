# DueSync - Smart Task Management & Google Calendar Sync

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> A modern, full-featured task management Progressive Web App with Google Calendar integration, email & push notifications, and offline support.

**Made by:** [WIK Technologies](https://wiktechnologies.com)

## ✨ Features

### Core Features
- 📝 **Task Management** - Create, edit, delete, and organize tasks with priorities
- 🔄 **Google Calendar Sync** - Two-way sync with Google Calendar
- 🏷️ **Categories & Tags** - Organize tasks with custom categories and color-coded tags
- 🔁 **Recurring Tasks** - Set up daily, weekly, or monthly recurring tasks
- 📱 **Progressive Web App** - Install on any device, works offline
- 🎯 **Focus Mode** - Built-in Pomodoro timer for concentrated work sessions
- 📊 **Priority Queue** - Smart task ordering based on due date and priority
- 📦 **Archive** - Archive completed tasks for a clean workspace

### Notifications
- 📧 **Email Notifications** - Daily digests and weekly reports (via Resend)
- 🔔 **Push Notifications** - Real-time browser notifications
- ⏰ **Smart Reminders** - Customizable reminder times before tasks are due

### User Experience
- 🎨 **Beautiful UI** - Built with Tailwind CSS and Radix UI components
- 🌍 **Timezone Support** - Full timezone awareness for global users
- 🔐 **Secure Authentication** - Google OAuth 2.0 via NextAuth v5
- 📱 **Responsive Design** - Optimized for mobile, tablet, and desktop
- 🎓 **Interactive Onboarding** - Guided tour for new users

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (we recommend [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app))
- **Google OAuth** credentials ([Google Cloud Console](https://console.cloud.google.com))
- **Resend** account for emails ([resend.com](https://resend.com))
- **Upstash** Redis for rate limiting ([upstash.com](https://upstash.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/duesync.git
   cd duesync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

   See [Configuration Guide](#configuration) for detailed setup instructions.

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Required Environment Variables

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Google OAuth & Calendar
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"

# NextAuth
NEXTAUTH_SECRET="" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Push Notifications
VAPID_PUBLIC_KEY="" # Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:your-email@example.com"

# Cron Security
CRON_SECRET="" # Generate with: openssl rand -base64 32
```

### Setup Guides

For detailed configuration instructions, see:

- [Google Calendar Integration](docs/GOOGLE_CALENDAR_INTEGRATION.md)
- [Email Notifications](docs/EMAIL_NOTIFICATIONS.md)
- [Push Notifications](docs/PUSH_NOTIFICATIONS.md)
- [PWA Setup](docs/PWA_GUIDE.md)

## 📖 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - How to use DueSync
- **[FAQ](docs/FAQ.md)** - Frequently asked questions
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Security Policy](SECURITY.md)** - Security practices and reporting

### Feature Documentation

- [Focus Mode](docs/FOCUS_MODE.md) - Pomodoro timer and productivity features
- [Recurring Tasks](docs/RECURRING_TASKS.md) - Setting up recurring tasks
- [Categories & Tags](docs/CATEGORIES_TAGS.md) - Organizing with categories and tags
- [Timezone Support](docs/TIMEZONE_SUPPORT.md) - Working with timezones
- [Error Monitoring](docs/ERROR_MONITORING.md) - Setting up Sentry monitoring

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 15.5.7 (App Router - Security Patched)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4
- **UI Components:** Radix UI primitives
- **State Management:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth v5 with Google OAuth
- **Email:** Resend API
- **Caching/Rate Limiting:** Upstash Redis
- **APIs:** Google Calendar API v3

### Infrastructure
- **Hosting:** Vercel (recommended)
- **Database:** Supabase PostgreSQL
- **Email Service:** Resend
- **Redis:** Upstash
- **Monitoring:** Sentry (optional)

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

### Database Commands

```bash
npx prisma studio           # Open Prisma Studio (database GUI)
npx prisma generate         # Generate Prisma Client
npx prisma db push          # Push schema changes to database
npx prisma migrate dev      # Create and apply migrations
npx prisma migrate deploy   # Deploy migrations (production)
```

### Project Structure

```
duesync/
├── app/                 # Next.js 15 App Router
│   ├── api/            # API routes
│   ├── (auth)/         # Auth pages
│   └── (dashboard)/    # Dashboard pages
├── components/          # React components
│   ├── tasks/          # Task-related components
│   ├── ui/             # UI primitives (shadcn/ui)
│   └── providers/      # Context providers
├── lib/                # Utility functions and hooks
├── prisma/             # Database schema and migrations
├── public/             # Static assets
├── types/              # TypeScript type definitions
└── docs/               # Documentation
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository

3. **Configure Environment Variables**
   - Add all variables from `.env` to Vercel
   - Update `NEXTAUTH_URL` to your production domain
   - Update `GOOGLE_REDIRECT_URI` to production callback URL

4. **Set up Cron Jobs**

   Create `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/generate-recurring",
         "schedule": "0 * * * *"
       },
       {
         "path": "/api/cron/send-notifications",
         "schedule": "0 * * * *"
       },
       {
         "path": "/api/cron/push-reminders",
         "schedule": "*/15 * * * *"
       }
     ]
   }
   ```

5. **Deploy Migrations**
   ```bash
   npx prisma migrate deploy
   ```

For detailed deployment instructions, see the [Deployment Guide](#) section in the docs folder.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 🔒 Security

Security is a top priority. DueSync implements:

- **Row-Level Security (RLS)** on all database tables
- **Secure authentication** with Google OAuth 2.0
- **Rate limiting** to prevent abuse
- **Environment variable protection** - no secrets in code
- **HTTPS-only** in production
- **Input validation** with Zod schemas
- **SQL injection prevention** via Prisma ORM
- **CVE-2025-55182/CVE-2025-66478 patched** - Updated to Next.js 15.5.7 to fix critical RSC vulnerability

For security concerns, please see our [Security Policy](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [NextAuth](https://next-auth.js.org/) - Authentication for Next.js
- [Radix UI](https://www.radix-ui.com/) - Unstyled UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [Lucide Icons](https://lucide.dev/) - Beautiful icons

## 💬 Support

- **Documentation:** Check our [docs](docs/) folder
- **Issues:** [GitHub Issues](https://github.com/yourusername/duesync/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/duesync/discussions)

## 🗺️ Roadmap

### Upcoming Features
- [ ] Team collaboration and task sharing
- [ ] Mobile apps (iOS & Android)
- [ ] Desktop app (Electron)
- [ ] Subtasks and task dependencies
- [ ] Calendar view
- [ ] Kanban board view
- [ ] Task templates
- [ ] AI-powered task suggestions
- [ ] Time tracking
- [ ] Export/import (CSV, JSON)
- [ ] More integrations (Slack, Trello, etc.)

---

**Built with ❤️ by [WIK Technologies](https://wiktechnologies.com)**

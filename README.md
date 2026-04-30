# Budgetly

## Overview

Budgetly is a React-based personal finance dashboard designed to help users manage budgets, track expenses, and hit savings goals. It combines modern UI patterns with Supabase authentication and database services to deliver a mobile-friendly budgeting experience.

## Objectives

- Provide secure user authentication with Supabase auth.
- Track monthly budgets, spending, and savings targets.
- Manage expenses with category metadata and recent transaction history.
- Offer insights through analytics and notifications.
- Enable subscription tracking and profile management.
- Support PIN-based protection for enhanced security.

## Architecture

Budgetly is built with a frontend-first architecture using:

- **Vite** for fast development and production builds.
- **React 18** with function components and hooks.
- **React Router v6** for client-side navigation.
- **React Query** for server state management and Supabase data fetching.
- **Supabase** for authentication, session handling, and persistent storage.
- **Tailwind CSS** and custom Shadcn-style UI primitives for styling.

The app is structured as a single-page application with authenticated and public routes:

- `src/App.tsx` configures routing, query client, and global providers.
- `src/hooks/useAuth.tsx` manages authentication state, sign-up, sign-in, and sign-out flows.
- `src/integrations/supabase/client.ts` creates the Supabase client using environment variables.
- `src/components/AppLayout.tsx` provides the shared mobile-first layout and bottom navigation.

Authentication is handled at the app layer with `ProtectedRoute` and `PublicRoute` wrappers, ensuring only signed-in users can access budget, analytics, and profile screens.

## Project Structure

```text
budgetly-hub-main/
├── src/
│   ├── App.tsx                   # Application router and provider setup
│   ├── main.tsx                  # React entry point
│   ├── pages/                    # Screen-level route components
│   │   ├── Auth.tsx              # Login / registration page
│   │   ├── Dashboard.tsx         # Main budget overview page
│   │   ├── AddExpense.tsx        # Expense creation page
│   │   ├── Analytics.tsx         # Spending insights and charts
│   │   ├── Subscriptions.tsx     # Subscription tracking screen
│   │   ├── Profile.tsx           # User profile and budget settings
│   │   ├── Notifications.tsx     # App notifications page
│   │   ├── PinLogin.tsx          # PIN-based access lock screen
│   │   ├── PinSetup.tsx          # PIN setup flow
│   │   └── NotFound.tsx          # 404 fallback page
│   ├── components/               # Shared UI and layout components
│   │   ├── AppLayout.tsx         # App shell + bottom navigation wrapper
│   │   ├── BottomNav.tsx         # Mobile bottom navigation
│   │   └── ui/                   # Reusable UI primitives
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.tsx           # Auth context and helpers
│   │   ├── use-mobile.tsx        # Mobile detection hook
│   │   └── use-toast.ts          # Toast notification helper
│   └── integrations/             # Third-party integrations
│       └── supabase/             # Supabase setup and schema types
│           ├── client.ts         # Supabase client initializer
│           └── types.ts          # Database type definitions
├── supabase/                     # Database migrations and Supabase config
│   ├── config.toml
│   └── migrations/
├── package.json                  # Project scripts and dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
└── README.md                     # Project documentation
```

## Core Features

- **Budget Dashboard**: Shows current month budget, spent amount, remaining balance, and savings target progress.
- **Expense Tracking**: Records expense entries and displays recent transactions with categories, icons, and colors.
- **Analytics**: Visualizes spending trends and helps users understand where their money goes.
- **Subscriptions**: Lets users track recurring payments and subscription costs.
- **Notifications**: Surfaces pending alerts, unread messages, and budget warnings.
- **Profile Management**: Stores user preferences, currency, and account information.
- **PIN Protection**: Adds an extra security layer for authenticated users.

## Supabase Integration

Budgetly uses Supabase for:

- User authentication and session persistence.
- Storing user profiles, budgets, expenses, notifications, and subscription records.
- Running migrations from `supabase/migrations/`.

Key Supabase environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The Supabase client is initialized in `src/integrations/supabase/client.ts` and typed against a generated `Database` schema.

## Getting Started

### Prerequisites

- Node.js 20+ or compatible runtime
- `pnpm`, `npm`, or `bun` installed
- Supabase project with credentials

### Installation

```bash
npm install
```

### Environment

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
```

### Run Locally

```bash
npm run dev
```

Open the app in your browser at the local Vite address.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Development Notes

- The app uses `@tanstack/react-query` to cache and manage Supabase data fetches.
- `ProtectedRoute` ensures authenticated-only access to budget and analytics pages.
- UI components are built with Tailwind CSS and a Shadcn-style component library located in `src/components/ui/`.
- The app is optimized for a mobile-first experience using a centered layout and bottom navigation.

## Future Improvements

Possible next steps for Budgetly:

- Add recurring expense scheduling and auto-budget suggestions.
- Implement richer analytics with category breakdowns and exportable reports.
- Add multi-currency support and custom budgeting rules.
- Add offline sync and local caching for better mobile resilience.

## License

This project is currently configured as a private app. Update `package.json` and repo settings if you want to publish it as open source.



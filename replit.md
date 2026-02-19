# NIVARANA - Ayurvedic Diet Management Platform

## Overview

NIVARANA is a personalized Ayurvedic diet management platform that combines ancient Ayurvedic wisdom with modern web technology. The application helps users discover their unique dosha constitution (Vata, Pitta, Kapha) through a comprehensive assessment quiz and provides personalized food recommendations based on their constitution and health goals.

The platform guides users through:
1. Profile creation with health metrics (BMI, maintenance calories)
2. A 30-question dosha assessment quiz
3. Health goal selection
4. Personalized food recommendations organized in tiers based on their dosha and goals

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Radix UI primitives with shadcn/ui components styled using Tailwind CSS in the "new-york" style

**Styling System**: 
- Tailwind CSS with custom color variables supporting light/dark themes
- Earthy, nature-inspired color palette reflecting Ayurvedic philosophy
- Typography: Serif fonts (Playfair Display) for headings, sans-serif (Inter) for body text
- Custom CSS variables for dosha-specific colors (vata, pitta, kapha)

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration

**Routing**: Wouter for lightweight client-side routing

**Key Pages**:
- Landing page with hero section, features, and dosha introduction
- Onboarding flow for collecting user profile data (age, gender, height, weight, activity level)
- Dosha assessment quiz (30 questions with 0-4 rating scale)
- Dosha results display with constitution breakdown
- Health goals selection interface
- Food list with tier-based recommendations

**Theme System**: Custom ThemeProvider supporting light/dark modes with localStorage persistence

### Backend Architecture

**Framework**: Express.js server with TypeScript

**API Design**: RESTful endpoints under `/api` namespace
- Authentication endpoints
- Profile management (GET, POST, PUT)
- Dosha assessment endpoints
- Health goals management
- Food filtering and recommendations

**Food Filtering Logic**: 
- Single dosha: 3-tier system (favorable, neutral, unfavorable)
- Dual dosha: 5-tier system accounting for primary and secondary dosha effects
- Health goal filtering: Additional tier organization based on health goal effects

**Session Management**: Express sessions with PostgreSQL store using connect-pg-simple

**Build System**: Custom esbuild configuration bundling allowlisted dependencies for optimized cold start times

### Data Storage

**ORM**: Drizzle ORM with Neon serverless PostgreSQL driver

**Database Schema**:
- `sessions` - Session storage for authentication
- `users` - User accounts (id, email, name, profile image)
- `user_profiles` - Health metrics (age, gender, height, weight, BMI, calories, activity level, onboarding status)
- `dosha_assessments` - Quiz results and dosha scores (vata, pitta, kapha percentages, constitution type, primary/secondary doshas)
- `user_health_goals` - Selected health goals from predefined list

**Schema Validation**: Zod schemas with drizzle-zod for runtime type safety

**Food Data**: Static JSON dataset containing foods with:
- Name and category
- Dosha effects (favorable/neutral/unfavorable for each dosha)
- Health goal effects for 10+ health categories

### Authentication & Authorization

**Authentication Provider**: Replit Auth using OpenID Connect (OIDC)

**Implementation**: Passport.js strategy with custom session handling

**Session Storage**: PostgreSQL-backed sessions with 1-week TTL

**Protected Routes**: Custom `isAuthenticated` middleware checking session state

### External Dependencies

**Database**: Neon serverless PostgreSQL via `@neondatabase/serverless` with WebSocket support

**Authentication**: Replit OIDC provider for user authentication

**UI Components**: 
- Radix UI primitives (@radix-ui/* packages) for accessible, unstyled components
- shadcn/ui configuration for styled component variants
- Lucide React for iconography

**Form Handling**: React Hook Form with @hookform/resolvers for validation

**Development Tools**:
- Vite with React plugin for fast development
- Replit-specific plugins (cartographer, dev-banner, runtime-error-modal)
- TypeScript for type safety
- ESBuild for production builds

**Utilities**:
- date-fns for date manipulation
- clsx and tailwind-merge for className management
- nanoid for unique ID generation
- memoizee for function memoization

**Key Data Files**:
- `food_dataset.json` - Comprehensive food database with dosha and health effects
- `ayurvedic_system.py` - Reference Python implementation of dosha assessment logic
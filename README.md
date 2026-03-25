<div align="center">

<img src="https://img.shields.io/badge/Ayurveda_Meets_Technology-🌿-4CAF50?style=for-the-badge&labelColor=1a1a2e" alt="tagline"/>

# 🌿 NIVARANA
### *Personalized Ayurvedic Diet Management Platform*

[![TypeScript](https://img.shields.io/badge/TypeScript-92%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Python](https://img.shields.io/badge/Python-4.1%25-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> *"Food is medicine. Medicine is food."* — Charaka Samhita

**Nivarana** bridges 5,000 years of Ayurvedic wisdom with modern full-stack engineering — delivering hyper-personalized diet recommendations through a science-backed dosha assessment engine.

[🚀 Live Demo](#) • [📖 Documentation](#architecture) • [🛠 Setup](#getting-started) • [🤝 Contribute](#contributing)

---

</div>

## 📌 Table of Contents

- [Why Nivarana?](#-why-nivarana)
- [Features](#-features)
- [Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Dosha Engine Logic](#-dosha-engine-logic)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 💡 Why Nivarana?

Modern diet apps give generic calorie trackers. Nivarana gives you **a system that knows who you are**.

Ayurveda classifies every person into a unique mind-body constitution — a **dosha** — determined by physical traits, lifestyle, and tendencies. Food that heals one person may harm another. Nivarana solves this with a **30-question dosha assessment engine** that scores your Vata, Pitta, and Kapha balance, then cross-references a comprehensive food database to surface foods ranked specifically for *your* constitution and *your* health goals.

This isn't wellness fluff. It's a data pipeline for personalized nutrition.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧬 **Dosha Assessment Engine** | 30-question quiz scoring Vata, Pitta & Kapha on a 0–4 scale with percentage breakdown |
| 🥗 **Tiered Food Recommendations** | 3-tier system for single dosha; 5-tier for dual-dosha constitutions |
| 🎯 **Health Goal Filtering** | 10+ health categories (weight loss, digestion, immunity, etc.) layered over dosha tiers |
| 📊 **BMI & Calorie Calculator** | Auto-computed from user metrics on onboarding |
| 🌓 **Dark / Light Mode** | Full theme support with `localStorage` persistence |
| 🔐 **OAuth Authentication** | Secure login via Replit OIDC / Passport.js |
| 📱 **Responsive UI** | Mobile-first design with Radix UI + Tailwind CSS |
| 🏛️ **Earthy Aesthetic** | Serif typography + dosha-specific color tokens (Vata indigo, Pitta amber, Kapha green) |

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│                                                                  │
│  Landing → Onboarding → Dosha Quiz → Results → Goals → Foods    │
│                                                                  │
│  TanStack Query  │  Wouter Router  │  React Hook Form            │
│  shadcn/ui       │  Radix UI       │  Tailwind CSS               │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST API (/api/*)
┌───────────────────────────▼──────────────────────────────────────┐
│                      SERVER (Express + TypeScript)               │
│                                                                  │
│  Auth Middleware (isAuthenticated)                               │
│  Profile API  │  Assessment API  │  Goals API  │  Food API       │
│                                                                  │
│  Dosha Filtering Logic (3-tier / 5-tier)                         │
│  Health Goal Overlay Engine                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Drizzle ORM + WebSocket
┌───────────────────────────▼──────────────────────────────────────┐
│               DATABASE (Neon Serverless PostgreSQL)              │
│                                                                  │
│  sessions  │  users  │  user_profiles  │  dosha_assessments      │
│  user_health_goals                                               │
└──────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                   STATIC DATA LAYER                              │
│                                                                  │
│  food_dataset.json  →  Dosha effects + Health goal effects       │
│  ayurvedic_system.py → Reference Dosha calculation logic (Python)│
└──────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + TypeScript** | Component architecture & type safety |
| **Vite** | Lightning-fast build tooling & HMR |
| **TanStack Query** | Server state, caching & background sync |
| **Wouter** | Lightweight client-side routing (~1.3KB) |
| **Radix UI + shadcn/ui** | Accessible, headless component primitives |
| **Tailwind CSS** | Utility-first styling with custom design tokens |
| **React Hook Form + Zod** | Form validation with runtime type safety |

### Backend
| Technology | Purpose |
|---|---|
| **Express.js + TypeScript** | RESTful API server |
| **Drizzle ORM** | Type-safe SQL query builder |
| **Neon (Serverless PostgreSQL)** | Scalable, edge-ready database |
| **Passport.js + OIDC** | OAuth2 authentication |
| **connect-pg-simple** | PostgreSQL session store |
| **ESBuild** | Optimized production bundling |

### Dev & Tooling
| Technology | Purpose |
|---|---|
| **Python** | Reference Ayurvedic scoring logic |
| **drizzle-kit** | Database migrations |
| **nanoid** | Unique ID generation |
| **date-fns** | Date manipulation |
| **memoizee** | Function-level memoization |

---

## 🗄 Database Schema

```sql
-- User accounts (via OIDC)
users           { id, email, name, profileImage }

-- Health profile collected during onboarding
user_profiles   { userId, age, gender, height, weight, bmi,
                  maintenanceCalories, activityLevel, onboardingComplete }

-- Dosha quiz results
dosha_assessments { userId, vataScore, pittaScore, kaphaScore,
                    vataPct, pittaPct, kaphaPct,
                    constitutionType, primaryDosha, secondaryDosha }

-- Selected health goals
user_health_goals { userId, goalKey, createdAt }

-- Auth sessions
sessions        { sid, sess, expire }
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL (or a [Neon](https://neon.tech) account)
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Ayushb1604/Nivarana-Diet_Management_project.git
cd Nivarana-Diet_Management_project

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# 4. Run database migrations
npm run db:push

# 5. Start the development server
npm run dev
```

The app will be running at `http://localhost:5000` 🎉

---

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Authentication (Replit OIDC)
REPLIT_DOMAINS=your-replit-domain
SESSION_SECRET=your-session-secret

# App
NODE_ENV=development
PORT=5000
```

---

## 📁 Project Structure

```
nivarana/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level page components
│   │   │   ├── landing.tsx
│   │   │   ├── onboarding.tsx
│   │   │   ├── quiz.tsx
│   │   │   ├── results.tsx
│   │   │   ├── goals.tsx
│   │   │   └── foods.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities & query client
│
├── server/                  # Express backend
│   ├── routes.ts            # API route definitions
│   ├── auth.ts              # Passport.js OIDC setup
│   ├── storage.ts           # Database access layer
│   └── foodFilter.ts        # Dosha-based filtering logic
│
├── shared/                  # Shared types & schemas (Zod)
├── migrations/              # Drizzle DB migrations
├── script/                  # Data scripts
│   └── food_dataset.json    # Comprehensive food database
├── attached_assets/
│   └── ayurvedic_system.py  # Python reference implementation
│
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/user` | Get authenticated user |
| `POST` | `/api/profile` | Create user profile |
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update user profile |
| `POST` | `/api/dosha-assessment` | Submit quiz answers |
| `GET` | `/api/dosha-assessment` | Get assessment results |
| `GET` | `/api/health-goals` | List available health goals |
| `POST` | `/api/health-goals` | Save selected goals |
| `GET` | `/api/foods` | Get personalized food list |
| `GET` | `/api/foods?tier=1` | Filter by recommendation tier |

---

## 🧠 Dosha Engine Logic

The heart of Nivarana is its food recommendation engine:

**Single Dosha Constitution → 3 Tiers**
```
Tier 1: Favorable    — Balances your dominant dosha
Tier 2: Neutral      — Neither aggravates nor pacifies
Tier 3: Unfavorable  — Aggravates your dominant dosha
```

**Dual Dosha Constitution → 5 Tiers**
```
Tier 1: Favorable for both doshas
Tier 2: Favorable for primary, neutral for secondary
Tier 3: Neutral for both
Tier 4: Unfavorable for secondary, neutral for primary
Tier 5: Unfavorable for both doshas
```

Health goal filters then apply a secondary ranking layer on top — so if you're Vata-Pitta with a weight loss goal, you get a finely ranked list that respects all three variables simultaneously.

The reference logic is also implemented in `ayurvedic_system.py` for validation and algorithmic clarity.


## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# Fork the repo and create your branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git commit -m "feat: add your feature"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow the existing code style and include relevant tests where applicable.

---

## 👨‍💻 Author

**Ayush B.**
- GitHub: [@Ayushb1604](https://github.com/Ayushb1604)

---

<div align="center">

Made with 🌿 and TypeScript

*"Swasthya" (स्वास्थ्य) — Sanskrit for health, literally means "established in oneself"*

⭐ Star this repo if you found it useful!

</div>

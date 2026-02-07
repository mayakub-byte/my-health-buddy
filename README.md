# 🍽️ My Health Buddy

**AI-powered family nutrition assistant for Telugu households**

AIGF Cohort 5 — Group 3 | February 2026

---

## 🎯 What is My Health Buddy?

My Health Buddy helps busy parents—especially working moms in Telangana/AP—make their everyday home-cooked meals healthier. Instead of prescribing new meal plans, the app starts from what families already eat and provides personalized, actionable suggestions for each family member.

### Core Features
- 📸 **Snap your meal** — Take a photo of what you cooked
- 🍛 **Telugu cuisine intelligence** — Recognizes pesarattu, gongura, pappu, and 100+ regional dishes
- 👨‍👩‍👧‍👦 **Personalized scores** — Same meal, different scores based on each family member's health profile
- 💡 **Gentle nudges** — Small improvements, not strict diets

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Supabase (DB, Auth, Storage) |
| AI | Claude Vision (Anthropic) |
| Build | Vite |
| Hosting | Netlify / Vercel |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Claude API key (from Anthropic)

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/mayakub-byte/my-health-buddy.git
cd my-health-buddy
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup environment variables
\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\` with your credentials:
\`\`\`
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_CLAUDE_API_KEY=your_claude_api_key
\`\`\`

### 4. Run locally
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:5173 in your browser.

---

## 📁 Project Structure

\`\`\`
my-health-buddy/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── BottomNav.tsx
│   │   └── LoadingScreen.tsx
│   ├── pages/          # Page components
│   │   ├── Welcome.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Home.tsx
│   │   ├── Upload.tsx
│   │   ├── Results.tsx
│   │   ├── Family.tsx
│   │   └── History.tsx
│   ├── hooks/          # Custom React hooks
│   │   └── useFamily.ts
│   ├── lib/            # Utilities and API clients
│   │   └── supabase.ts
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx         # Main app with routing
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles with Tailwind
├── .env.example        # Environment variables template
├── tailwind.config.js  # Tailwind configuration
└── package.json
\`\`\`

---

## 🙏 Team — AIGF Cohort 5, Group 3

- **Team Lead:** Sarathi
- **Frontend:** Joohi, Pushpinder
- **Backend:** Sakthi, Yakub (support: Monica)
- **AI Integration:** Yakub, Joohi (support: Monica)
- **Testing SIT:** Satish, Akhil
- **Testing UAT:** Pushpinder, Sarathi

---

## 📄 License

MIT License

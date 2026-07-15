# UstaTop

Mahalliy xizmat ko'rsatuvchi ustalarni mijozlar bilan bog'lovchi marketplace platforma.

## Loyiha strukturasi

```
UstaTop - Startup/
├── backend/     # NestJS + Prisma + PostgreSQL (Supabase)
├── web/         # Next.js + TypeScript + Tailwind + shadcn/ui
├── mobile/      # React Native (Expo)
└── cursor_ui_ux_insights_from_pdf.md
```

## Ishlab chiqish tartibi

1. **Backend** — API, auth, buyurtmalar, chat
2. **Web** — mijoz, usta, admin panel
3. **Mobile** — iOS/Android ilova

## Boshlash

### Backend

```bash
cd backend
cp .env.example .env   # Supabase ma'lumotlarini kiriting
npm run prisma:migrate
npm run start:dev
```

### Web

```bash
cd web
npm install
npm run dev
# http://localhost:3000
```

### Mobile (keyinroq)

```bash
cd mobile
npm install
npx expo start
```
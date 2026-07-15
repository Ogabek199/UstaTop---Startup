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

## Sizdan kerak bo'ladigan narsalar

| Narsa | Qachon kerak | Qayerdan olish |
|-------|--------------|----------------|
| Supabase loyiha | **Hozir** | [supabase.com](https://supabase.com) |
| Payme sandbox | To'lov bosqichida | payme.uz merchant |
| Click sandbox | To'lov bosqichida | click.uz |
| Eskiz.uz SMS | Production OTP | eskiz.uz |
| Yandex Maps API | Manzil xaritasi | developer.tech.yandex.ru |
| FCM | Mobile push | Firebase Console |

Hozircha barcha integratsiyalar **mock** rejimda ishlaydi.

## Autentifikatsiya

| Holat | Oqim |
|-------|------|
| **Birinchi marta** | Ro'yxatdan o'tish → OTP → parol o'rnatish |
| **Keyingi kirishlar** | Kirish → telefon + parol |

Test hisoblar uchun seed parol: `123456` (seed ishga tushirilgandan keyin)

```bash
cd backend && npm run prisma:seed
```

| Rol | Telefon | Parol |
|-----|---------|-------|
| Mijoz | +998909876543 | 123456 |
| Usta | +998901234567 | 123456 |

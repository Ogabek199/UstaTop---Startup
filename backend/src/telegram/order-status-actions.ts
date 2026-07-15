import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "To'lov kutilmoqda",
  pending: 'Kutilmoqda',
  accepted: 'Qabul qilindi',
  on_the_way: "Yo'lda",
  in_progress: 'Ish jarayonida',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

export const ORDER_STATUS_HEADERS: Record<OrderStatus, string> = {
  awaiting_payment: '💳 <b>To\'lov kutilmoqda</b>',
  pending: '🆕 <b>Yangi buyurtma!</b>',
  accepted: '✅ <b>Buyurtma qabul qilindi!</b>',
  on_the_way: '🚗 <b>Yo\'lga chiqdingiz</b>',
  in_progress: '🔧 <b>Ish boshlandi</b>',
  completed: '✅ <b>Ish yakunlandi!</b>',
  cancelled: '❌ <b>Buyurtma rad etildi</b>',
};

export const TELEGRAM_STATUS_ACTIONS: Partial<
  Record<OrderStatus, { label: string; next: OrderStatus }[]>
> = {
  [OrderStatus.accepted]: [
    { label: "🚗 Yo'lga chiqdim", next: OrderStatus.on_the_way },
    { label: '✅ Yakunlash', next: OrderStatus.completed },
  ],
  [OrderStatus.on_the_way]: [
    { label: '🔧 Ishni boshladim', next: OrderStatus.in_progress },
    { label: '✅ Yakunlash', next: OrderStatus.completed },
  ],
  [OrderStatus.in_progress]: [
    { label: '✅ Yakunladim', next: OrderStatus.completed },
  ],
};

export const CLIENT_STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.on_the_way]: "yo'lga chiqdi",
  [OrderStatus.in_progress]: 'ishni boshladi',
  [OrderStatus.completed]: 'ishni yakunladi',
};

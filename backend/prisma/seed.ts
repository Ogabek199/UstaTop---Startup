import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SEED_PASSWORD = '123456';

const DEMO_MASTER = {
  phone: '+998901502658',
  name: 'Otabek Yusupov',
  district: 'Yunusobod',
  serviceKey: 'Santexnik',
  bio: "Santexnika, quvur va kalitsozlik bo'yicha 7 yillik tajriba.",
  experienceYears: 7,
  priceMin: 140000,
  priceMax: 280000,
  ratingAvg: 4.85,
  reviewCount: 56,
  completedOrders: 142,
  isPremium: true,
};

const DEMO_ORDERS: {
  daysAgo: number;
  address: string;
  price: number;
  serviceKey: string;
  status: OrderStatus;
}[] = [
  { daysAgo: 2, address: 'Yunusobod, Amir Temur 45', price: 195000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 5, address: 'Yunusobod, Markaz 12', price: 220000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 8, address: 'Mirzo Ulugbek, Buyuk Ipak 8', price: 175000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 12, address: 'Chilonzor, 15-mavze 3', price: 260000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 18, address: 'Yunusobod, Shifokorlar 21', price: 185000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 25, address: 'Yakkasaroy, Sabzi 7', price: 210000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 35, address: 'Yunusobod, Minor 2', price: 240000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 48, address: 'Olmazor, Gulsaroy 14', price: 165000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 62, address: 'Yunusobod, Qo\'yliq 9', price: 290000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 75, address: 'Sergeli, Yangi Sergeli 5', price: 200000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 95, address: 'Yunusobod, Bodomzor 18', price: 225000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 120, address: 'Chilonzor, Katta Xirmontepa 4', price: 180000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 150, address: 'Yunusobod, Shahriston 11', price: 255000, serviceKey: 'Santexnik', status: OrderStatus.completed },
  { daysAgo: 0, address: 'Yunusobod, Navoiy 33', price: 190000, serviceKey: 'Santexnik', status: OrderStatus.pending },
  { daysAgo: 0, address: 'Yunusobod, Qorasuv 6', price: 170000, serviceKey: 'Santexnik', status: OrderStatus.pending },
  { daysAgo: 0, address: 'Yunusobod, Minor masjidi yonida 2', price: 210000, serviceKey: 'Santexnik', status: OrderStatus.pending },
  { daysAgo: 0, address: 'Yunusobod, Osiyo 14', price: 155000, serviceKey: 'Santexnik', status: OrderStatus.pending },
  { daysAgo: 0, address: 'Yunusobod, Buyuk Ipak yo\'li 28', price: 235000, serviceKey: 'Santexnik', status: OrderStatus.pending },
  { daysAgo: 1, address: 'Yunusobod, Shifokorlar 5', price: 180000, serviceKey: 'Santexnik', status: OrderStatus.pending },
];

const MASTERS = [
  {
    phone: '+998901234567',
    name: 'Jamshid Karimov',
    district: 'Yunusobod',
    serviceKey: 'Santexnik',
    bio: "10 yillik tajriba. Santexnika va quvurlar bo'yicha mutaxassis.",
    experienceYears: 10,
    priceMin: 150000,
    priceMax: 300000,
    ratingAvg: 4.9,
    reviewCount: 127,
    completedOrders: 340,
    isPremium: true,
  },
  {
    phone: '+998901234568',
    name: 'Rustam Toshmatov',
    district: 'Chilonzor',
    serviceKey: 'Elektrik',
    bio: 'Elektr montaj, rozetka va yoritish tizimlari.',
    experienceYears: 8,
    priceMin: 120000,
    priceMax: 250000,
    ratingAvg: 4.8,
    reviewCount: 89,
    completedOrders: 210,
    isPremium: false,
  },
  {
    phone: '+998901234569',
    name: "Dilshod Rahimov",
    district: "Mirzo Ulug'bek",
    serviceKey: 'Konditsioner',
    bio: "Konditsioner o'rnatish, to'ldirish va ta'mirlash.",
    experienceYears: 6,
    priceMin: 200000,
    priceMax: 400000,
    ratingAvg: 4.7,
    reviewCount: 64,
    completedOrders: 156,
    isPremium: false,
  },
  {
    phone: '+998901234570',
    name: 'Aziza Karimova',
    district: 'Yakkasaroy',
    serviceKey: 'Tozalash',
    bio: 'Uy va ofis chuqur tozalash xizmati.',
    experienceYears: 5,
    priceMin: 80000,
    priceMax: 150000,
    ratingAvg: 4.9,
    reviewCount: 203,
    completedOrders: 520,
    isPremium: true,
  },
  {
    phone: '+998901234571',
    name: 'Bekzod Mirzayev',
    district: 'Olmazor',
    serviceKey: "Mebel yig'ish",
    bio: "IKEA va boshqa mebel yig'ish — tez va sifatli.",
    experienceYears: 4,
    priceMin: 100000,
    priceMax: 200000,
    ratingAvg: 4.6,
    reviewCount: 45,
    completedOrders: 98,
    isPremium: false,
  },
  {
    phone: '+998901234572',
    name: 'Sardor Nazarov',
    district: 'Sergeli',
    serviceKey: "Bo'yoqchilik",
    bio: "Devor bo'yash, oboy yopishtirish va pardoz ishlari.",
    experienceYears: 12,
    priceMin: 180000,
    priceMax: 350000,
    ratingAvg: 4.8,
    reviewCount: 72,
    completedOrders: 180,
    isPremium: false,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const services = [
    { nameUz: 'Santexnik', nameRu: 'Сантехник', icon: 'wrench', category: 'home', description: 'Santexnika xizmatlari' },
    { nameUz: 'Elektrik', nameRu: 'Электрик', icon: 'zap', category: 'home', description: 'Elektr montaj ishlari' },
    { nameUz: 'Konditsioner', nameRu: 'Кондиционер', icon: 'wind', category: 'home', description: "Konditsioner o'rnatish va ta'mirlash" },
    { nameUz: "Mebel yig'ish", nameRu: 'Сборка мебели', icon: 'sofa', category: 'home', description: "Mebel yig'ish va montaj" },
    { nameUz: 'Tozalash', nameRu: 'Уборка', icon: 'sparkles', category: 'home', description: 'Uy va ofis tozalash' },
    { nameUz: "Bo'yoqchilik", nameRu: 'Малярные работы', icon: 'paintbrush', category: 'home', description: "Bo'yoq va pardoz ishlari" },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.nameUz },
      update: service,
      create: { id: service.nameUz, ...service },
    });
  }

  await prisma.user.upsert({
    where: { phone: '+998900000001' },
    update: { passwordHash },
    create: {
      phone: '+998900000001',
      name: 'Admin',
      role: UserRole.admin,
      passwordHash,
      isVerified: true,
    },
  });

  for (const m of MASTERS) {
    const user = await prisma.user.upsert({
      where: { phone: m.phone },
      update: { name: m.name, passwordHash },
      create: {
        phone: m.phone,
        name: m.name,
        role: UserRole.professional,
        passwordHash,
        isVerified: true,
      },
    });

    await prisma.masterProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: m.bio,
        experienceYears: m.experienceYears,
        serviceCategoryIds: [m.serviceKey],
        priceMin: m.priceMin,
        priceMax: m.priceMax,
        ratingAvg: m.ratingAvg,
        reviewCount: m.reviewCount,
        completedOrders: m.completedOrders,
        district: m.district,
        isApproved: true,
        isPremium: m.isPremium,
      },
      create: {
        userId: user.id,
        bio: m.bio,
        experienceYears: m.experienceYears,
        serviceCategoryIds: [m.serviceKey],
        priceMin: m.priceMin,
        priceMax: m.priceMax,
        ratingAvg: m.ratingAvg,
        reviewCount: m.reviewCount,
        completedOrders: m.completedOrders,
        district: m.district,
        isApproved: true,
        isPremium: m.isPremium,
        portfolioImages: [],
      },
    });
  }

  const customer = await prisma.user.upsert({
    where: { phone: '+998909876543' },
    update: { passwordHash },
    create: {
      phone: '+998909876543',
      name: 'Dilnoza Rakhimova',
      role: UserRole.customer,
      passwordHash,
      isVerified: true,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { phone: DEMO_MASTER.phone },
    update: { name: DEMO_MASTER.name, passwordHash },
    create: {
      phone: DEMO_MASTER.phone,
      name: DEMO_MASTER.name,
      role: UserRole.professional,
      passwordHash,
      isVerified: true,
    },
  });

  await prisma.masterProfile.upsert({
    where: { userId: demoUser.id },
    update: {
      bio: DEMO_MASTER.bio,
      experienceYears: DEMO_MASTER.experienceYears,
      serviceCategoryIds: [DEMO_MASTER.serviceKey],
      priceMin: DEMO_MASTER.priceMin,
      priceMax: DEMO_MASTER.priceMax,
      ratingAvg: DEMO_MASTER.ratingAvg,
      reviewCount: DEMO_MASTER.reviewCount,
      completedOrders: DEMO_MASTER.completedOrders,
      district: DEMO_MASTER.district,
      isApproved: true,
      isPremium: DEMO_MASTER.isPremium,
    },
    create: {
      userId: demoUser.id,
      bio: DEMO_MASTER.bio,
      experienceYears: DEMO_MASTER.experienceYears,
      serviceCategoryIds: [DEMO_MASTER.serviceKey],
      priceMin: DEMO_MASTER.priceMin,
      priceMax: DEMO_MASTER.priceMax,
      ratingAvg: DEMO_MASTER.ratingAvg,
      reviewCount: DEMO_MASTER.reviewCount,
      completedOrders: DEMO_MASTER.completedOrders,
      district: DEMO_MASTER.district,
      isApproved: true,
      isPremium: DEMO_MASTER.isPremium,
      portfolioImages: [],
    },
  });

  await prisma.order.deleteMany({ where: { masterId: demoUser.id } });

  const now = new Date();
  for (const item of DEMO_ORDERS) {
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - item.daysAgo);
    orderDate.setHours(10 + (item.daysAgo % 8), 30, 0, 0);

    const order = await prisma.order.create({
      data: {
        clientId: customer.id,
        masterId: demoUser.id,
        serviceId: item.serviceKey,
        status: item.status,
        description: 'Santexnika ta\'mirlash',
        address: item.address,
        price: item.price,
        createdAt: orderDate,
        updatedAt: orderDate,
      },
    });

    if (item.status === OrderStatus.completed) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: item.price,
          commission: Math.round(item.price * 0.1),
          provider: PaymentProvider.payme,
          status: PaymentStatus.completed,
          createdAt: orderDate,
        },
      });

      await prisma.review.create({
        data: {
          orderId: order.id,
          rating: 4 + (item.daysAgo % 2),
          comment: 'Yaxshi ish bajarildi, rahmat!',
          createdAt: orderDate,
        },
      });
    }
  }

  console.log(`Seed completed — test password: ${SEED_PASSWORD}`);
  console.log(`Demo usta: ${DEMO_MASTER.phone}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, Language } from './users/user.entity';
import { Payment, PaymentMethod, PaymentStatus } from './payments/payment.entity';
import { Announcement } from './notifications/announcement.entity';

const db = new DataSource({
  type: 'better-sqlite3',
  database: 'cedros-dev.sqlite',
  entities: [User, Payment, Announcement],
  synchronize: true,
} as any);

async function seed() {
  await db.initialize();

  const users = db.getRepository(User);
  const payments = db.getRepository(Payment);
  const announcements = db.getRepository(Announcement);

  await payments.clear();
  await users.clear();
  await announcements.clear();

  const hash = await bcrypt.hash('password123', 12);

  // Admin
  const admin = await users.save(users.create({
    firstName: 'Juan',
    lastName: 'Cabrera',
    email: 'admin@cedros.com',
    passwordHash: hash,
    apartmentNumber: '101',
    monthlyFee: 162.03,
    role: UserRole.ADMIN,
    language: Language.ES,
    isActive: true,
  }));

  // Residents
  const residentData = [
    { firstName: 'María', lastName: 'González', email: 'maria@cedros.com', apt: '101', lang: Language.ES },
    { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos@cedros.com', apt: '102', lang: Language.ES },
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana@cedros.com', apt: '201', lang: Language.EN },
    { firstName: 'Pedro', lastName: 'López', email: 'pedro@cedros.com', apt: '202', lang: Language.ES },
    { firstName: 'Laura', lastName: 'Díaz', email: 'laura@cedros.com', apt: '301', lang: Language.ES },
    { firstName: 'Luis', lastName: 'Hernández', email: 'luis@cedros.com', apt: '302', lang: Language.EN },
    { firstName: 'Sofia', lastName: 'Torres', email: 'sofia@cedros.com', apt: '401', lang: Language.ES },
    { firstName: 'Miguel', lastName: 'Reyes', email: 'miguel@cedros.com', apt: '402', lang: Language.ES },
  ];

  const residents: User[] = [];
  for (const r of residentData) {
    const isPH = r.apt.startsWith('4');
    const resident = await users.save(users.create({
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      passwordHash: hash,
      apartmentNumber: r.apt,
      monthlyFee: isPH ? 237.26 : 162.03,
      role: UserRole.RESIDENT,
      language: r.lang,
      isActive: true,
      moveInDate: new Date('2023-01-01'),
    }));
    residents.push(resident);
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  // Some paid this month, some didn't
  const paidThisMonth = [residents[0], residents[1], residents[2], residents[6], residents[7]];
  const lateResident = residents[3]; // Pedro is late

  for (const r of paidThisMonth) {
    const p = new Payment();
    p.userId = r.id;
    p.amount = r.monthlyFee;
    p.processingFee = Number((r.monthlyFee * 0.008).toFixed(2));
    p.method = PaymentMethod.ACH;
    p.status = PaymentStatus.COMPLETED;
    p.billingMonth = month;
    p.billingYear = year;
    p.stripeChargeId = `ch_mock_${r.id.slice(0, 8)}`;
    await payments.save(p);
  }

  // Everyone paid last month
  for (const r of residents) {
    const p = new Payment();
    p.userId = r.id;
    p.amount = r.monthlyFee;
    p.processingFee = Number((r.monthlyFee * 0.029 + 0.30).toFixed(2));
    p.method = r === lateResident ? PaymentMethod.MANUAL : PaymentMethod.CARD;
    p.status = r === lateResident ? PaymentStatus.MANUAL : PaymentStatus.COMPLETED;
    p.billingMonth = prevMonth;
    p.billingYear = prevYear;
    if (r !== lateResident) p.stripeChargeId = `ch_mock_prev_${r.id.slice(0, 8)}`;
    if (r === lateResident) p.notes = 'Pago en efectivo recibido con 10 días de retraso';
    await payments.save(p);
  }

  // Announcements
  await announcements.save([
    announcements.create({
      titleEs: 'Mantenimiento del ascensor',
      titleEn: 'Elevator maintenance',
      bodyEs: 'Les informamos que el ascensor principal estará fuera de servicio el sábado 24 de mayo de 8am a 2pm por mantenimiento preventivo.',
      bodyEn: 'Please be advised that the main elevator will be out of service on Saturday, May 24th from 8am to 2pm for preventive maintenance.',
      isActive: true,
    }),
    announcements.create({
      titleEs: 'Limpieza de la piscina',
      titleEn: 'Pool cleaning',
      bodyEs: 'La piscina será limpiada todos los martes y jueves. Durante ese tiempo estará cerrada de 7am a 10am.',
      bodyEn: 'The pool will be cleaned every Tuesday and Thursday. During that time it will be closed from 7am to 10am.',
      isActive: true,
    }),
  ]);

  console.log('\n✅ Seed complete!\n');
  console.log('Admin login:');
  console.log('  Email:    admin@cedros.com');
  console.log('  Password: password123\n');
  console.log('Resident login (paid):');
  console.log('  Email:    maria@cedros.com');
  console.log('  Password: password123\n');
  console.log('Resident login (unpaid):');
  console.log('  Email:    pedro@cedros.com');
  console.log('  Password: password123\n');

  await db.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });

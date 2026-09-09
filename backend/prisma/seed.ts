import { PrismaClient, TelecomNetworkCode, DataPlanType, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SaniPay database master data...');

  // 0. Seed Administrative & Demo Users
  const argonOptions = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 };
  const defaultPinHash = await argon2.hash('1234', argonOptions);

  const seedUsers = [
    {
      email: 'admin@sanipay.ng',
      phone: '08012345678',
      password: 'AdminSecurePassword123!',
      fullName: 'SaniPay Super Admin',
      role: UserRole.SUPER_ADMIN,
      referralCode: 'SANIADMIN',
      initialBalanceKobo: BigInt(100000000), // ₦1,000,000.00 float reserve
    },
    {
      email: 'finance@sanipay.ng',
      phone: '08012345679',
      password: 'FinanceSecurePassword123!',
      fullName: 'SaniPay Finance Officer',
      role: UserRole.FINANCE_ADMIN,
      referralCode: 'SANIFINANCE',
      initialBalanceKobo: BigInt(50000000), // ₦500,000.00
    },
    {
      email: 'user@sanipay.ng',
      phone: '08012345680',
      password: 'UserSecurePassword123!',
      fullName: 'SaniPay Demo Customer',
      role: UserRole.CUSTOMER,
      referralCode: 'SANIDEMO',
      initialBalanceKobo: BigInt(5000000), // ₦50,000.00
    },
  ];

  for (const u of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await argon2.hash(u.password, argonOptions);
      const user = await prisma.user.create({
        data: {
          email: u.email,
          phone: u.phone,
          passwordHash,
          transactionPinHash: defaultPinHash,
          role: u.role,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isPhoneVerified: true,
          referralCode: u.referralCode,
          profile: {
            create: {
              fullName: u.fullName,
              bvnVerified: true,
              ninVerified: true,
            },
          },
          wallet: {
            create: {
              balanceKobo: u.initialBalanceKobo,
              ledgerBalanceKobo: u.initialBalanceKobo,
            },
          },
        },
      });
      console.log(`- Created Seed User: ${u.fullName} (${u.email}) [${u.role}]`);
    } else {
      console.log(`- User already exists: ${u.email} (${u.role})`);
    }
  }

  // 1. Telecom Networks
  const networksData = [
    { code: TelecomNetworkCode.MTN, name: 'MTN Nigeria', airtimeDiscountBps: 250, isActive: true },
    { code: TelecomNetworkCode.AIRTEL, name: 'Airtel Nigeria', airtimeDiscountBps: 200, isActive: true },
    { code: TelecomNetworkCode.GLO, name: 'Globacom', airtimeDiscountBps: 300, isActive: true },
    { code: TelecomNetworkCode.NINE_MOBILE, name: '9mobile', airtimeDiscountBps: 300, isActive: true },
  ];

  const networkMap = new Map<TelecomNetworkCode, string>();

  for (const net of networksData) {
    const record = await prisma.network.upsert({
      where: { code: net.code },
      update: { name: net.name, airtimeDiscountBps: net.airtimeDiscountBps, isActive: net.isActive },
      create: net,
    });
    networkMap.set(net.code, record.id);
    console.log(`- Upserted Network: ${net.name} (${net.code})`);
  }

  // 2. Data Plans (Sample SME & Direct Plans)
  const mtnId = networkMap.get(TelecomNetworkCode.MTN)!;
  const airtelId = networkMap.get(TelecomNetworkCode.AIRTEL)!;
  const gloId = networkMap.get(TelecomNetworkCode.GLO)!;

  const dataPlans = [
    // MTN Plans
    { networkId: mtnId, planCode: 'MTN-SME-500MB', name: '500MB SME Data', type: DataPlanType.SME, validity: '30 Days', costPriceKobo: BigInt(11500), sellingPriceKobo: BigInt(13000) }, // ₦130
    { networkId: mtnId, planCode: 'MTN-SME-1GB', name: '1GB SME Data', type: DataPlanType.SME, validity: '30 Days', costPriceKobo: BigInt(22500), sellingPriceKobo: BigInt(25000) },   // ₦250
    { networkId: mtnId, planCode: 'MTN-SME-2GB', name: '2GB SME Data', type: DataPlanType.SME, validity: '30 Days', costPriceKobo: BigInt(45000), sellingPriceKobo: BigInt(50000) },   // ₦500
    { networkId: mtnId, planCode: 'MTN-SME-5GB', name: '5GB SME Data', type: DataPlanType.SME, validity: '30 Days', costPriceKobo: BigInt(112500), sellingPriceKobo: BigInt(125000) }, // ₦1,250
    // Airtel Plans
    { networkId: airtelId, planCode: 'AIRTEL-CORP-1GB', name: '1GB Corporate Gifting', type: DataPlanType.CORPORATE_GIFTING, validity: '30 Days', costPriceKobo: BigInt(21000), sellingPriceKobo: BigInt(24000) },
    { networkId: airtelId, planCode: 'AIRTEL-CORP-2GB', name: '2GB Corporate Gifting', type: DataPlanType.CORPORATE_GIFTING, validity: '30 Days', costPriceKobo: BigInt(42000), sellingPriceKobo: BigInt(48000) },
    // Glo Plans
    { networkId: gloId, planCode: 'GLO-DIR-1GB', name: '1GB Direct Data', type: DataPlanType.DIRECT_GIFTING, validity: '30 Days', costPriceKobo: BigInt(21500), sellingPriceKobo: BigInt(24500) },
  ];

  for (const plan of dataPlans) {
    await prisma.dataPlan.upsert({
      where: {
        networkId_planCode: {
          networkId: plan.networkId,
          planCode: plan.planCode,
        },
      },
      update: {
        name: plan.name,
        type: plan.type,
        validity: plan.validity,
        costPriceKobo: plan.costPriceKobo,
        sellingPriceKobo: plan.sellingPriceKobo,
        isActive: true,
      },
      create: plan,
    });
    console.log(`- Upserted Data Plan: ${plan.name}`);
  }

  // 3. Electricity Distribution Companies (DisCos)
  const discos = [
    { code: 'IKEDC', name: 'Ikeja Electric (IKEDC)', convenienceFeeKobo: BigInt(10000) },
    { code: 'EKEDC', name: 'Eko Electric (EKEDC)', convenienceFeeKobo: BigInt(10000) },
    { code: 'AEDC', name: 'Abuja Electricity (AEDC)', convenienceFeeKobo: BigInt(10000) },
    { code: 'IBEDC', name: 'Ibadan Electricity (IBEDC)', convenienceFeeKobo: BigInt(10000) },
    { code: 'PHED', name: 'Port Harcourt Electric (PHED)', convenienceFeeKobo: BigInt(10000) },
    { code: 'KEDCO', name: 'Kano Electricity (KEDCO)', convenienceFeeKobo: BigInt(10000) },
    { code: 'JED', name: 'Jos Electricity (JED)', convenienceFeeKobo: BigInt(10000) },
    { code: 'EEDC', name: 'Enugu Electricity (EEDC)', convenienceFeeKobo: BigInt(10000) },
  ];

  for (const disco of discos) {
    await prisma.electricityProvider.upsert({
      where: { code: disco.code },
      update: { name: disco.name, convenienceFeeKobo: disco.convenienceFeeKobo, isActive: true },
      create: disco,
    });
    console.log(`- Upserted DisCo: ${disco.name}`);
  }

  // 4. Cable TV Providers
  const cableProviders = [
    { code: 'DSTV', name: 'DStv Nigeria', convenienceFeeKobo: BigInt(10000) },
    { code: 'GOTV', name: 'GOtv Nigeria', convenienceFeeKobo: BigInt(10000) },
    { code: 'STARTIMES', name: 'StarTimes Nigeria', convenienceFeeKobo: BigInt(10000) },
    { code: 'SHOWMAX', name: 'Showmax Nigeria', convenienceFeeKobo: BigInt(10000) },
  ];

  for (const cable of cableProviders) {
    await prisma.cableProvider.upsert({
      where: { code: cable.code },
      update: { name: cable.name, convenienceFeeKobo: cable.convenienceFeeKobo, isActive: true },
      create: cable,
    });
    console.log(`- Upserted Cable Provider: ${cable.name}`);
  }

  // 5. System Settings
  const defaultSettings = [
    { key: 'APP_NAME', value: 'SaniPay', description: 'Working application branding' },
    { key: 'REFERRAL_BONUS_KOBO', value: '5000', description: 'Referral reward per qualified first transaction (₦50.00)' },
    { key: 'REFERRAL_QUALIFY_MIN_FUNDING_KOBO', value: '100000', description: 'Min wallet funding to qualify referral (₦1,000.00)' },
    { key: 'MAINTENANCE_MODE', value: 'false', description: 'System-wide maintenance toggle' },
    { key: 'ACTIVE_VTU_PROVIDER', value: 'mock', description: 'Default active VTU provider routing' },
    { key: 'ACTIVE_PAYMENT_GATEWAY', value: 'mock', description: 'Default active payment gateway routing' },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
    console.log(`- Upserted System Setting: ${setting.key}`);
  }

  console.log('Master data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

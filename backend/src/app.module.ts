import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AirtimeModule } from './modules/airtime/airtime.module';
import { DataModule } from './modules/data/data.module';
import { ElectricityModule } from './modules/electricity/electricity.module';
import { CableModule } from './modules/cable/cable.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProvidersModule } from './modules/providers/providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    PaymentsModule,
    AirtimeModule,
    DataModule,
    ElectricityModule,
    CableModule,
    TransactionsModule,
    ReferralsModule,
    NotificationsModule,
    SupportModule,
    AdminModule,
    ProvidersModule,
  ],
})
export class AppModule {}

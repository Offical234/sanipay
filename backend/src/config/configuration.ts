export interface AppConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  apiPrefix: string;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  payment: {
    defaultGateway: string;
    paystackSecretKey?: string;
    paystackPublicKey?: string;
    flutterwaveSecretKey?: string;
  };
  vtu: {
    defaultProvider: string;
    vtpassApiKey?: string;
    vtpassSecretKey?: string;
    vtpassBaseUrl?: string;
    clubkonnektApiKey?: string;
    clubkonnektUserId?: string;
    clubkonnektBaseUrl?: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'SaniPay',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://sanipay_user:sanipay_password@localhost:5432/sanipay_db?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      'sanipay_jwt_access_secret_development_minimum_32_chars_ok',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'sanipay_jwt_refresh_secret_development_minimum_32_chars_ok',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  payment: {
    defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'mock',
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  },
  vtu: {
    defaultProvider: process.env.DEFAULT_VTU_PROVIDER || 'mock',
    vtpassApiKey: process.env.VTPASS_API_KEY,
    vtpassSecretKey: process.env.VTPASS_SECRET_KEY,
    vtpassBaseUrl: process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api',
    clubkonnektApiKey: process.env.CLUBKONNEKT_API_KEY,
    clubkonnektUserId: process.env.CLUBKONNEKT_USER_ID,
    clubkonnektBaseUrl: process.env.CLUBKONNEKT_BASE_URL || 'https://www.clubkonnect.com/api',
  },
});

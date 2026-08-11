process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'mysql://root:password@localhost:3306/clinic_crm_test';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_at_least_32_characters_long';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
process.env.BCRYPT_SALT_ROUNDS ??= '4';
process.env.LOG_LEVEL ??= 'error';

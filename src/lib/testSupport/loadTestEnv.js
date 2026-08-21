try {
  process.loadEnvFile('.env.test');
} catch {
  // .env.test not present locally — assume MYSQL_* env vars are already set (e.g. in CI)
}

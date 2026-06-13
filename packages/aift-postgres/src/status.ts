export function databaseConfigured() {
  return Boolean(process.env.AIFT_POSTGRES_URL || process.env.DATABASE_URL);
}

export function databaseStatus() {
  return {
    configured: databaseConfigured(),
    provider: 'postgres',
    ready: false,
    note: databaseConfigured()
      ? 'Database environment is present. Schema approval is required before writes are enabled.'
      : 'Database environment is not configured for this node.',
  };
}

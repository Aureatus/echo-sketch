import { defineConfig } from 'drizzle-kit';

import { Resource } from 'sst';

// Construct the URL from environment variables
const dbUrl = `postgresql://${Resource.MyPostgres.username}:${Resource.MyPostgres.password}@${Resource.MyPostgres.host}:${Resource.MyPostgres.port}/${Resource.MyPostgres.database}`;

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  strict: true,
  verbose: true
});

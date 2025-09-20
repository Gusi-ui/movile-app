/* eslint-disable @typescript-eslint/no-var-requires */
// Load environment variables for tests, preferring .env.test and falling back to .env.development
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const env = dotenv.config({ path: filePath });
    dotenvExpand.expand(env);
  }
}

const root = process.cwd();
const testEnvPath = path.join(root, '.env.test');
const devEnvPath = path.join(root, '.env.development');

// Load .env.test first, then .env.development as fallback
loadEnv(testEnvPath);
loadEnv(devEnvPath);

// Ensure required Supabase env vars are present before tests run
if (
  !process.env.EXPO_PUBLIC_SUPABASE_URL ||
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
) {
  // eslint-disable-next-line no-console
  console.warn(
    '[jest.setup] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment.'
  );
}

// Optional test credentials for integration tests
if (!process.env.SUPABASE_TEST_EMAIL || !process.env.SUPABASE_TEST_PASSWORD) {
  // eslint-disable-next-line no-console
  console.warn(
    '[jest.setup] SUPABASE_TEST_EMAIL and/or SUPABASE_TEST_PASSWORD not set. Login success test will be skipped.'
  );
}

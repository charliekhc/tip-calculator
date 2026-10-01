import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config/load.js';

const configPath = fileURLToPath(new URL('../config/app.json', import.meta.url));

try {
  const config = loadConfig({ filePath: configPath, env: process.env });
  const app = buildApp(config, true);
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`Startup failed: ${error.message}`);
  } else {
    console.error('Startup failed:', error);
  }
  process.exit(1);
}

// Loads server/.env no matter which folder the server is started from.
// (Plain `import 'dotenv/config'` only looks in the current working
// directory, which broke when launching from the project root.)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'),
});

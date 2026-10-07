import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter, scanner } from './server/routes';
import { createDemoWorkspace } from './server/demoGenerator';
import { DEMO_DIR } from './server/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Ensure SmartClean_Demo workspace exists with sample data
  if (!fs.existsSync(DEMO_DIR)) {
    console.log('[SmartClean] Initializing Demo Workspace...');
    try {
      createDemoWorkspace();
    } catch (e) {
      console.error('[SmartClean] Error generating demo workspace:', e);
    }
  }

  // Pre-seed initial scan on DEMO_DIR if it exists so dashboard immediately has real rich data
  if (fs.existsSync(DEMO_DIR) && scanner.status === 'idle') {
    try {
      console.log(`[SmartClean] Pre-loading initial scan on demo workspace: ${DEMO_DIR}`);
      scanner.startScan(DEMO_DIR);
    } catch (e) {
      console.warn('[SmartClean] Initial demo scan notice:', e);
    }
  }

  // Mount API router directly
  app.use('/api', apiRouter);

  if (!isProd) {
    // Mount Vite dev middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartClean] Application running at http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[SmartClean] Failed to bootstrap server:', err);
});


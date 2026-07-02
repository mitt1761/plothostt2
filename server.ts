import express from 'express';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body-parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express session setup
const sessionSecret = process.env.SESSION_SECRET || 'plottea-cozy-secret-tea-blend-9982';
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: false, // Set to true if HTTPS is used
      httpOnly: true,
    },
  })
);

// Serve uploaded posters static files
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (fsErr) {
  console.warn('Warning: Could not create uploads directory (might be a read-only serverless environment like Vercel):', fsErr);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Import routers using ES modules extension
import { db } from './server/config/db.js';
import authRouter from './server/routes/auth.js';
import watchlistRouter from './server/routes/watchlist.js';

// API endpoints
app.use('/api/auth', authRouter);
app.use('/api/watchlist', watchlistRouter);

// System status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'PlotTea',
    database: {
      type: db.isMySQL() ? 'MySQL (External Server)' : 'SQLite/JSON fallback (Cozy Preview Mode)',
    },
    uploadsDir: UPLOADS_DIR,
  });
});

// Setup Vite middleware for development or static serving for production
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Server: Operating in DEVELOPMENT mode. Loading Vite dev middleware.');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Server: Operating in PRODUCTION mode. Serving static files.');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`  PlotTea server is listening on port ${PORT}`);
    console.log(`  Local UI: http://localhost:${PORT}`);
    console.log(`  Development DB: ${process.env.DB_HOST ? 'MySQL' : 'JSON DB File'}`);
    console.log(`================================================`);
  });
}

export default app;

if (!process.env.VERCEL) {
  setupVite().catch((err) => {
    console.error('Fatal: Failed to boot Vite Express applet server:', err);
  });
}

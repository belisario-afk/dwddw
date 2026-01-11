import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import apiRoutes, { initializeDatabase } from './routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(limiter);

// API routes
app.use('/api', apiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Start server
async function start() {
  try {
    // Try to initialize database, but don't fail if unavailable
    try {
      await initializeDatabase();
      console.log('✓ Database connected and seeded');
    } catch (dbError) {
      console.warn('⚠ Database not available - running without persistence');
      console.warn('  Presets will not be saved. Set DATABASE_URL to enable.');
    }
    
    app.listen(PORT, () => {
      console.log(`✓ SDF Spatial Studio server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');

const { config } = require('./config/config');          // your config.js
const GeminiService = require('./services/geminiService'); // geminiService.js
const createArticleRouter = require('./routes/articleRoutes'); // articleRoutes.js

// Firebase Admin (use default creds or service account)
if (!admin.apps.length) admin.initializeApp();

const app = express();

// basic hardening & body parsing
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: config.app.jsonLimit }));
app.use(cors({ origin: config.app.allowedOrigins }));

app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
}));

// Auth middleware: verifies Bearer token and sets req.user
const requireAuth = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const idToken = auth.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }
};

// Gemini init
const geminiService = new GeminiService();
geminiService.initialize(process.env.GEMINI_API_KEY).catch((e) => {
  console.error('Failed to initialize Gemini:', e.message);
});

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// routes (protected)
app.use('/api/article', requireAuth, createArticleRouter(geminiService, geminiService.validator));

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));

module.exports = app;

// 1) Load env vars for local dev (Cloud Run injects envs automatically)
require('dotenv').config();

// 2) Imports
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('express-async-handler');

const { config } = require('./config/config');
const { logger } = require('./utils/logger');
const InputValidator = require('./validators/validators');
const GeminiService = require('./services/geminiService');
const articleRoutes = require('./routes/articleRoutes');


// 3) Firebase Admin — let ADC auto-detect the project (no hardcoding)
admin.initializeApp({
  projectId: 'a-stats-2e54e'
});

// 4) Express app
const app = express();
app.set('trust proxy', 1);

// Services & validators
const inputValidator = new InputValidator();
const geminiService = new GeminiService();

// 5) Initialize Gemini from env var injected by Secret Manager (Option A)
async function initGeminiFromEnv() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY env var is missing. Ensure the Cloud Run service has a secret-mounted env var.');
    }
    await geminiService.initialize(apiKey);
    geminiService.initialized = true;
    logger.info('GeminiService initialized from env var.');
  } catch (error) {
    geminiService.initializationError = error;
    logger.error('Failed to initialize GeminiService from env.', { error: error.message });
  }
}
// Fire and forget (non-blocking)
initGeminiFromEnv();

// --- CRITICAL FIX: Move CORS config to the very top to handle preflight requests first ---
const corsOptions = {
    origin: ['https://a-stats-2e54e-dae91.web.app', 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Explicit preflight for everything (runs before any other middleware)
app.options('*', cors(corsOptions), (req, res) => res.sendStatus(204));

// --- now the rest ---
app.use(helmet());
app.use(compression());

// Rate limiting (skip health)
const apiLimiter = rateLimit({
  windowMs: config?.rateLimit?.windowMs || 60_000,
  max: config?.rateLimit?.max || 60,
  message: 'Too many requests, please try again later.',
  skipSuccessfulRequests: !!config?.rateLimit?.skipSuccessfulRequests,
  skip: (req) => req.path === '/health',
});
app.use(apiLimiter);

app.use(express.json({ limit: config?.app?.jsonLimit || '1mb' }));

// 7) Auth middleware (Firebase ID token). Allows dev bypass if configured.
const authenticateUser = async (req, res, next) => {
  // CRITICAL FIX: The cors middleware now handles OPTIONS, so this isn't strictly necessary but is a good belt-and-suspenders approach.
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Missing/invalid Authorization header.');
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const idToken = authHeader.substring('Bearer '.length);
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    logger.error('Invalid ID token', { error: err.message });
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// 8) Block until Gemini is initialized (or report init error)
const checkInitialization = (req, res, next) => {
  if (!geminiService.initialized) {
    if (geminiService.initializationError) {
      return res.status(500).json({
        error: 'Service unavailable due to initialization error.',
        details: geminiService.initializationError.message,
      });
    }
    return res.status(503).json({ error: 'Service initializing. Try again shortly.' });
  }
  return next();
};

// 9) Routes
app.get('/health', (_req, res) => {
  const status = geminiService.initialized
    ? 'healthy'
    : (geminiService.initializationError ? 'unhealthy' : 'initializing');
  res.json({
    status,
    timestamp: new Date().toISOString(),
    geminiServiceInitialized: !!geminiService.initialized,
    initializationError: geminiService.initializationError?.message || null,
  });
});

const apiRouter = require('./routes/articleRoutes')(geminiService, inputValidator);
app.use('/api/article', checkInitialization, authenticateUser, apiRouter);


// 404
app.use((req, res) => {
  logger.warn('404 Not Found', { url: req.originalUrl, method: req.method });
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// 10) Exports & Cloud Run entrypoint
// Keep the existing exports if you still plan to use Functions somewhere:
exports.app = app;

// ✅ If running as a standalone server (Cloud Run / local `node index.js`), start listening.
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
  });
}

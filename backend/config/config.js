// backend/config/config.js

exports.config = {
    // Application settings
    app: {
        jsonLimit: '1mb',
        // CRITICAL FIX: The allowedOrigins must match your new frontend URL
        allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://a-stats-2e54e.web.app'],
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    
    // Gemini API settings
    gemini: {
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
        topP: parseFloat(process.env.GEMINI_TOP_P) || 0.95,
        topK: parseFloat(process.env.GEMINI_TOP_K) || 64,
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 24000,
    },
    
    // Rate limiting settings
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
        max: parseInt(process.env.RATE_LIMIT_MAX) || 60, // 60 requests per minute
        skipSuccessfulRequests: process.env.SKIP_SUCCESSFUL_REQUESTS === 'true' || true
    },

    // Retry policy for API calls
    retry: {
        maxRetries: parseInt(process.env.RETRY_MAX_RETRIES) || 3,
        baseDelay: parseInt(process.env.RETRY_BASE_DELAY) || 1000, // 1 second
        maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 8000 // 8 seconds
    }
};

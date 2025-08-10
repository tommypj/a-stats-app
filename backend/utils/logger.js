// backend/utils/logger.js
const winston = require('winston');

// Simple utility to measure and log function execution time
exports.createTimer = (label) => {
    const start = process.hrtime();
    return {
        end: (meta = {}) => {
            const end = process.hrtime(start);
            const duration = (end[0] * 1e9 + end[1]) / 1e6; // Convert to milliseconds
            exports.logger.info(`Performance: ${label} completed`, {
                duration: `${duration.toFixed(2)}ms`,
                ...meta
            });
        }
    };
};

// Simplified logger that works in all environments
exports.logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Console logging for both development and production
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
        // Removed Google Cloud Logging for now to avoid the error
    ],
    defaultMeta: {
        service: 'a-stats-app-backend',
        timestamp: () => new Date().toISOString()
    },
});
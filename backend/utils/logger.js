// backend/utils/logger.js
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');

// A simple utility to measure and log function execution time.
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

const loggingWinston = new LoggingWinston({
    level: 'info'
});

exports.logger = winston.createLogger({
    level: 'info', // Adjust the log level as needed
    transports: [
        // Log to the console for local development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        // Log to Google Cloud Logging in production
        loggingWinston,
    ],
    // The default format for logs sent to Cloud Logging
    format: winston.format.json(),
    defaultMeta: {
        service: 'a-stats-app-backend', // A service name for easy filtering
        timestamp: () => new Date().toISOString()
    },
});

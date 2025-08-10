// backend/utils/jsonParser.js
const { logger } = require('./logger');

/**
 * Parses the Gemini API response text, handling potential markdown and other formatting.
 * @param {string} text The raw text response from the Gemini API.
 * @param {string} stepName The name of the generation step for logging.
 * @returns {object} The parsed JSON object.
 * @throws {Error} If the response is not valid JSON.
 */
exports.parseGeminiJSON = (text, stepName = 'Unknown Step') => {
    // 1. Clean the text: remove markdown fences and trim whitespace
    let cleanText = text.replace(/```json\s*\n?|```/g, '').trim();

    // 2. Handle cases where the model wraps the response in a single string literal
    if (cleanText.startsWith('`') && cleanText.endsWith('`')) {
        cleanText = cleanText.substring(1, cleanText.length - 1).trim();
    }

    // 3. Attempt to parse the cleaned text
    try {
        const parsed = JSON.parse(cleanText);
        logger.info(`JSON parsed successfully for ${stepName}`, { userId: 'N/A' });
        return parsed;
    } catch (error) {
        // Log the full error and the problematic text
        logger.error(`JSON parsing failed for ${stepName}. Text: "${cleanText}"`, { 
            error: error.message,
            stepName,
            userId: 'N/A'
        });
        throw new Error(`Failed to parse JSON response at ${stepName}: ${error.message}`);
    }
};

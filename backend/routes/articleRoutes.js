// routes/articleRoutes.js
const express = require('express');
const asyncHandler = require('express-async-handler');

// This file exports a function that creates the router.
// It receives the initialized service instances as arguments.
module.exports = (geminiService, inputValidator) => {
  const router = express.Router();

  // Step 1: Generate initial ideas and keywords
  router.post('/step1', asyncHandler(async (req, res) => {
    const validatedBody = inputValidator.validateStep1Request(req.body);
    const userId = req.user.uid; 
    const result = await geminiService.generateStep1(validatedBody.initialSubject, userId);
    res.json({ success: true, ...result });
  }));

  // Step 2: Generate article structure and meta data
  router.post('/step2', asyncHandler(async (req, res) => {
    const validatedBody = inputValidator.validateStep2Request(req.body);
    const userId = req.user.uid;
    const { finalSubject, keywords } = validatedBody;
    const result = await geminiService.generateStep2(finalSubject, keywords, userId);
    res.json({ success: true, ...result });
  }));

  // Step 3: Research details and references
  router.post('/step3', asyncHandler(async (req, res) => {
    const validatedBody = inputValidator.validateStep3Request(req.body);
    const userId = req.user.uid;
    const { finalSubject, articleOutline } = validatedBody;
    const result = await geminiService.generateStep3(finalSubject, articleOutline, userId);
    res.json({ success: true, ...result });
  }));

  // Step 4: Generate full HTML article
  router.post('/step4', asyncHandler(async (req, res) => {
    const validatedBody = inputValidator.validateStep4Request(req.body);
    const userId = req.user.uid;
    const { finalSubject, step1Result, step2Result, step3Result } = validatedBody;
    const { autori_concepte, idei_statistici, surse_externe_sugerate } = step3Result;
    const { structura_articol, meta_titlu_propus, meta_descriere_propusa } = step2Result;

    const htmlArticle = await geminiService.generateStep4(
      finalSubject,
      step1Result,
      step2Result,
      autori_concepte,
      idei_statistici,
      surse_externe_sugerate,
      meta_titlu_propus,
      meta_descriere_propusa,
      structura_articol,
      userId
    );
    res.json({ success: true, htmlArticle });
  }));

  // Step 5: SEO analysis
  router.post('/step5', asyncHandler(async (req, res) => {
    const validatedBody = inputValidator.validateStep5Request(req.body);
    const userId = req.user.uid;
    const { htmlArticle, keywords } = validatedBody;
    const seoReport = await geminiService.generateStep5(htmlArticle, keywords, userId);
    res.json({ success: true, seoReport });
  }));

  return router;
};

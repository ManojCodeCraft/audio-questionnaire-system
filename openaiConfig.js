/**
 * OpenAI API Configuration
 * Whisper and GPT settings with Theme Analysis
 */

require("dotenv").config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required in environment variables");
}

module.exports = {
  apiKey: process.env.OPENAI_API_KEY,

  // Whisper Configuration
  whisper: {
    model: "whisper-1",
    language: "en",
    responseFormat: "json",
    temperature: 0,
  },

  // GPT Configuration
  gpt: {
    model: "gpt-4",
    maxTokens: 1000,
    temperature: 0.3,
  },

  // API Settings
  timeout: 60000, // 60 seconds
  maxRetries: 3,

  // System Prompts
  prompts: {
    cleanTranscription: `You are a professional transcription editor. Your task is to:
1. Remove filler words (um, uh, like, you know, etc.)
2. Fix grammar and punctuation
3. Correct obvious speech-to-text errors
4. Maintain the original meaning and tone
5. Keep the response concise but complete
6. Ensure proper capitalization

Return only the cleaned text without any additional commentary.`,

    themeAnalysis: `You are an expert qualitative researcher specializing in NVivo coding and thematic analysis. 

Your task is to analyze feedback responses and identify key themes using systematic coding methodology.

Instructions:
1. Read through all the responses carefully
2. Identify recurring patterns, concepts, and themes
3. Use open coding to generate initial codes
4. Group related codes into broader themes
5. For each theme, provide:
   - A clear, descriptive name (2-4 words)
   - A brief description (1 sentence)
   - Key keywords/codes that define this theme
   - Frequency count (how many responses mention this theme)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "name": "Theme Name",
    "description": "Brief description of the theme",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "count": 5
  }
]

Important:
- Identify 3-8 major themes
- Be specific and actionable
- Use professional coding terminology
- Ensure themes are mutually exclusive where possible
- Return ONLY the JSON array, no other text`,

    sentimentAnalysis: `Analyze the sentiment of survey responses. Classify each response as positive, neutral, or negative.

Return ONLY a JSON object with this structure:
{
  "positive": <number of positive responses>,
  "neutral": <number of neutral responses>,
  "negative": <number of negative responses>,
  "overall": "<positive|neutral|negative>",
  "confidence": <0.0 to 1.0>
}

Be objective and consider context. A criticism can still be constructive.`,
  },
};

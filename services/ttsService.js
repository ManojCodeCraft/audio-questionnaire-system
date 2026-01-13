const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Convert text to speech using OpenAI TTS
 */
async function textToSpeech(text, outputFile) {
  try {
    console.log(`🔊 Generating TTS for: "${text.substring(0, 50)}..."`);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      speed: 0.9, // Slightly slower for clarity
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Ensure directory exists
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(outputFile, buffer);
    console.log(`✅ TTS audio saved: ${outputFile}`);

    return outputFile;
  } catch (error) {
    console.error("❌ TTS Error:", error);
    throw error;
  }
}

/**
 * Generate greeting audio
 */
async function generateGreeting(focusGroupTitle, participantCount) {
  const text = `Hello everyone! I am your AI moderator for today's focus group discussion on ${focusGroupTitle}. 
  I can see ${participantCount} participants have joined us today. 
  I will be asking you a series of questions, and I would like each of you to share your thoughts. 
  Please speak one at a time when responding, so everyone's voice can be heard clearly. 
  Are we all ready to begin? Let's start!`;

  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const audioPath = path.join(tempDir, `greeting-${Date.now()}.mp3`);
  return await textToSpeech(text, audioPath);
}

/**
 * Generate question audio
 */
/**
 * Generate question audio
 */
async function generateQuestionAudio(
  questionText,
  questionNumber,
  totalQuestions
) {
  // Extract text if it's an object
  const text =
    typeof questionText === "object" ? questionText.text : questionText;

  const speech = `Question ${questionNumber} of ${totalQuestions}: ${text}. 
  Please take a moment to think, and then share your thoughts one at a time.`;

  const tempDir = path.join(__dirname, "../temp");
  const audioPath = path.join(
    tempDir,
    `question-${questionNumber}-${Date.now()}.mp3`
  );
  return await textToSpeech(speech, audioPath);
}

/**
 * Generate transition audio (between responses)
 */
async function generateTransition() {
  const phrases = [
    "Thank you. Would anyone else like to add their thoughts on this?",
    "Great input. Does anyone else have something to share?",
    "Interesting perspective. Anyone else want to contribute?",
    "Thank you for sharing. Who else would like to respond?",
  ];

  const text = phrases[Math.floor(Math.random() * phrases.length)];
  const tempDir = path.join(__dirname, "../temp");
  const audioPath = path.join(tempDir, `transition-${Date.now()}.mp3`);
  return await textToSpeech(text, audioPath);
}

/**
 * Generate closing message audio
 */
async function generateClosing() {
  const text = `Thank you all for your valuable input and thoughtful responses today. 
  Your insights will be extremely helpful for our research. 
  This concludes our focus group session. Have a wonderful day, everyone!`;

  const tempDir = path.join(__dirname, "../temp");
  const audioPath = path.join(tempDir, `closing-${Date.now()}.mp3`);
  return await textToSpeech(text, audioPath);
}

/**
 * Generate summary audio for a question
 */
async function generateQuestionSummary(summary) {
  const text = `Let me briefly summarize what I heard: ${summary}. 
  Now, let's move on to the next question.`;

  const tempDir = path.join(__dirname, "../temp");
  const audioPath = path.join(tempDir, `summary-${Date.now()}.mp3`);
  return await textToSpeech(text, audioPath);
}

module.exports = {
  textToSpeech,
  generateGreeting,
  generateQuestionAudio,
  generateTransition,
  generateClosing,
  generateQuestionSummary,
};

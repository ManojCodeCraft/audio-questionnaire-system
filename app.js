// ============================================
// COMPLETE AUDIO FEEDBACK SYSTEM WITH AUTH
// ============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { OpenAI } = require("openai");

// Import configurations and models
const openaiConfig = require("./openaiConfig");
const Questionnaire = require("./models/Questionnaire");
const Response = require("./models/Response");
const User = require("./models/User");

// Import middleware
const auth = require("./middleware/authMiddleware");

// Import routes
const authRoutes = require("./routes/auth");
const focusGroupRoutes = require("./routes/focusGroup");
const { google } = require("googleapis");

dotenv.config();
const app = express();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/api/google/callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Ensure temp directory exists
if (!fs.existsSync(path.join(__dirname, "temp"))) {
  fs.mkdirSync(path.join(__dirname, "temp"));
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/feedback-system",
    {
      autoIndex: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(" MongoDB error:", err));

// OpenAI Setup
const openai = new OpenAI({
  apiKey: openaiConfig.apiKey,
  timeout: openaiConfig.timeout,
  maxRetries: openaiConfig.maxRetries,
});

// Email Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use("/api/auth", authRoutes);
app.use("/api/focus-groups", focusGroupRoutes);

// LANDING PAGE
app.get("/", (req, res) => {
  res.render("index");
});

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.render("login");
});

// SIGNUP PAGE
app.get("/signup", (req, res) => {
  res.render("signup");
});

// FORGOT PASSWORD PAGE
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

// RESET PASSWORD PAGE
app.get("/reset-password", (req, res) => {
  res.render("reset-password");
});

// ADMIN DASHBOARD (Protected - Admin Only)
app.get("/admin", (req, res) => {
  // This will be accessed via frontend with JWT token
  res.render("admin");
});

// USER DASHBOARD (Protected - Any authenticated user)
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

// SURVEY PAGE (Public - Anyone with link can access)
app.get("/survey/:link", async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      link: req.params.link,
    });
    if (!questionnaire || !questionnaire.isActive) {
      return res.status(404).render("not-found");
    }
    res.render("survey", { questionnaire: JSON.stringify(questionnaire) });
  } catch (error) {
    res.status(500).render("error", { error: error.message });
  }
});

app.get("/results/:questionnaireId", (req, res) => {
  res.render("results");
});

app.get("/api/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code received");

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Save only once in .env, not in logs
    if (tokens.refresh_token) {
      console.log("Google OAuth connected successfully");
    }

    res.send(`
      <h2>OAuth Successful</h2>
      <p>You can close this tab now.</p>
    `);
  } catch (err) {
    console.error("OAuth error:", err.message);
    res.send("OAuth Failed");
  }
});

// ============================================
// QUESTIONNAIRE APIs (Protected)
// ============================================

// Create Questionnaire (User must be authenticated)
app.post("/api/create-questionnaire", auth(), async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid input data" });
    }

    const link = `survey-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const formattedQuestions = questions
      .filter((q) => typeof q === "string" && q.trim())
      .map((q, i) => ({
        order: i + 1,
        text: q.trim(),
      }));

    if (formattedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one valid question required",
      });
    }

    const questionnaire = new Questionnaire({
      title: title.trim(),
      description: description ? description.trim() : "",
      questions: formattedQuestions,
      owner: req.user.id, // From JWT token
      link: link,
    });

    await questionnaire.save();
    const surveyUrl = `${
      process.env.APP_URL || "http://localhost:3000"
    }/survey/${link}`;
    res.json({ success: true, link: surveyUrl, id: questionnaire._id });
  } catch (error) {
    console.error("Error creating questionnaire:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get User's Questionnaires (Protected)
app.get("/api/questionnaires", auth(), async (req, res) => {
  try {
    const questionnaires = await Questionnaire.find({
      owner: req.user.id,
    }).sort({ createdAt: -1 });
    res.json({ success: true, questionnaires });
  } catch (error) {
    console.error("Error fetching questionnaires:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Questionnaire by Link (Public)
app.get("/api/survey/:link", async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      link: req.params.link,
    });
    if (!questionnaire || !questionnaire.isActive) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }
    res.json({ success: true, questionnaire });
  } catch (error) {
    console.error("Error fetching survey:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN ONLY APIs
// ============================================

// Get All Users (Admin Only)
app.get("/api/admin/all-users", auth(["admin"]), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get All Surveys (Admin Only)
app.get("/api/admin/all-surveys", auth(["admin"]), async (req, res) => {
  try {
    const surveys = await Questionnaire.find().populate("owner", "name email");
    res.json({ success: true, surveys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Admin Analytics (Admin Only)
app.get("/api/admin/analytics", auth(["admin"]), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSurveys = await Questionnaire.countDocuments();
    const totalResponses = await Response.countDocuments();

    const activeUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const surveysByUser = await Questionnaire.aggregate([
      {
        $group: {
          _id: "$owner",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userName: "$user.name",
          userEmail: "$user.email",
          surveyCount: "$count",
        },
      },
      {
        $sort: { surveyCount: -1 },
      },
    ]);

    res.json({
      success: true,
      analytics: {
        totalUsers,
        totalSurveys,
        totalResponses,
        activeUsers,
        surveysByUser,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TTS & RESPONSE SUBMISSION APIs
// ============================================

// Text-to-Speech (Public)
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error) {
    console.error("Error generating TTS audio:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit Response (Public)
app.post("/api/submit-response", async (req, res) => {
  try {
    const { questionnaireId, respondentName, respondentEmail, responses } =
      req.body;
    const processedResponses = [];

    for (const response of responses) {
      const audioBuffer = Buffer.from(response.audio, "base64");
      const audioPath = path.join(
        __dirname,
        "temp",
        `audio-${Date.now()}-${Math.random()}.wav`
      );

      fs.writeFileSync(audioPath, audioBuffer);

      try {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(audioPath),
          model: openaiConfig.whisper.model,
          language: openaiConfig.whisper.language,
          response_format: openaiConfig.whisper.responseFormat,
          temperature: openaiConfig.whisper.temperature,
        });

        const normalizeResponse = await openai.chat.completions.create({
          model: openaiConfig.gpt.model,
          messages: [
            {
              role: "system",
              content: openaiConfig.prompts.cleanTranscription,
            },
            {
              role: "user",
              content: transcription.text,
            },
          ],
          max_tokens: openaiConfig.gpt.maxTokens,
          temperature: openaiConfig.gpt.temperature,
        });

        processedResponses.push({
          questionId: response.questionId,
          questionText: response.questionText,
          transcription: transcription.text,
          normalized: normalizeResponse.choices[0].message.content,
          timestamp: new Date(),
        });
      } catch (aiError) {
        console.error("Error processing audio:", aiError);
        processedResponses.push({
          questionId: response.questionId,
          questionText: response.questionText,
          transcription: "Error processing audio",
          normalized: "Error processing audio",
          timestamp: new Date(),
        });
      }

      try {
        fs.unlinkSync(audioPath);
      } catch (e) {}
    }

    const feedbackResponse = new Response({
      questionnaireId,
      respondentName: respondentName || respondentEmail,
      respondentEmail,
      responses: processedResponses,
    });

    await feedbackResponse.save();
    res.json({ success: true, message: "Response submitted successfully" });
  } catch (error) {
    console.error("Error submitting response:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Results (Protected - Owner or Admin)

app.get("/api/results/:questionnaireId", auth(), async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findById(
      req.params.questionnaireId
    );
    if (!questionnaire) {
      return res
        .status(404)
        .json({ success: false, error: "Questionnaire not found" });
    }
    const hasOwner = !!questionnaire.owner;

    const isAdmin = req.user.role === "admin";
    let isOwner = false;

    if (hasOwner) {
      isOwner = questionnaire.owner.toString() === req.user.id;
    }
    if (hasOwner) {
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }
    } else {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error:
            "This survey was created before user accounts existed. Only admins can view its results.",
        });
      }
    }
    const responses = await Response.find({
      questionnaireId: req.params.questionnaireId,
    });

    res.json({ success: true, responses });
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send Survey Link via Email (Protected)
app.post("/api/send-survey-link", auth(), async (req, res) => {
  try {
    const { surveyLink, recipientEmails } = req.body;

    if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No recipient emails provided." });
    }

    if (recipientEmails.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Cannot send to more than 10 emails at a time.",
      });
    }

    const emailPromises = recipientEmails.map((email) => {
      const surveyLinkWithEmail = `${surveyLink}?email=${encodeURIComponent(
        email
      )}`;

      return transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "🎤 Please Complete Our Audio Feedback Survey",
        html: `
          <div style="font-family: 'Segoe UI', Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white; text-align: center;">
              <h2 style="margin: 0;">Your Feedback Matters!</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">We would love to hear your thoughts</p>
            </div>
            <div style="background: white; padding: 30px; text-align: center;">
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                Please take a few minutes to complete our audio feedback survey. Your voice and opinions are valuable to us.
              </p>
              <a href="${surveyLinkWithEmail}" style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Start Survey
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                Or copy this link: <br><code style="background: #f3f4f6; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">${surveyLinkWithEmail}</code>
              </p>
            </div>
          </div>
        `,
      });
    });

    await Promise.all(emailPromises);

    res.json({
      success: true,
      message: `Survey links sent successfully to ${recipientEmails.length} recipients.`,
    });
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while sending emails.",
    });
  }
});

// Analyze Themes (Protected)
app.post("/api/analyze-themes", auth(), async (req, res) => {
  try {
    const { responses } = req.body;

    if (!responses || responses.length === 0) {
      return res.json({ success: true, themes: [] });
    }

    const allText = responses
      .flatMap((r) => r.responses.map((resp) => resp.normalized))
      .join("\n\n");

    const themeAnalysis = await openai.chat.completions.create({
      model: openaiConfig.gpt.model,
      messages: [
        {
          role: "system",
          content: `You are an expert qualitative researcher specializing in NVivo coding and thematic analysis. 

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
        },
        {
          role: "user",
          content: `Analyze these survey responses and identify key themes:\n\n${allText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let themes = [];
    try {
      const content = themeAnalysis.choices[0].message.content.trim();
      const jsonContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      themes = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Error parsing theme analysis:", parseError);
      themes = extractBasicThemes(allText);
    }

    themes.sort((a, b) => b.count - a.count);
    res.json({ success: true, themes });
  } catch (error) {
    console.error("Error analyzing themes:", error);
    res.status(500).json({ success: false, error: error.message, themes: [] });
  }
});

// Fallback function for basic theme extraction
function extractBasicThemes(text) {
  const lowerText = text.toLowerCase();
  const themes = [];

  const patterns = [
    {
      name: "Customer Service",
      keywords: ["service", "support", "help", "staff", "team"],
      description: "Feedback related to customer service and support",
    },
    {
      name: "Product Quality",
      keywords: [
        "quality",
        "product",
        "feature",
        "functionality",
        "performance",
      ],
      description: "Comments about product quality and features",
    },
    {
      name: "User Experience",
      keywords: ["experience", "easy", "difficult", "interface", "usability"],
      description: "Feedback on user experience and usability",
    },
    {
      name: "Pricing & Value",
      keywords: ["price", "cost", "value", "expensive", "affordable"],
      description: "Comments about pricing and value for money",
    },
    {
      name: "Speed & Performance",
      keywords: ["fast", "slow", "speed", "quick", "performance"],
      description: "Feedback on speed and performance",
    },
  ];

  patterns.forEach((pattern) => {
    const count = pattern.keywords.reduce((sum, keyword) => {
      const regex = new RegExp(keyword, "gi");
      const matches = text.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);

    if (count > 0) {
      themes.push({
        name: pattern.name,
        description: pattern.description,
        keywords: pattern.keywords,
        count: count,
      });
    }
  });

  return themes;
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

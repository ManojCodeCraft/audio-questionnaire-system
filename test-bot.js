require("dotenv").config();
const mongoose = require("mongoose");
const { startBot } = require("./services/botService");
const FocusGroup = require("./models/FocusGroup");
const FocusGroupSession = require("./models/FocusGroupSession");

async function testBot() {
  try {
    await mongoose.connect(process.env.MONGODB_URI); // ← Fixed: MONGODB_URI not MONGO_URI
    console.log("✅ Connected to MongoDB");

    // Find a focus group to test
    const focusGroup = await FocusGroup.findOne({
      status: "scheduled",
    }).populate("questionnaire");

    if (!focusGroup) {
      console.log("❌ No scheduled focus group found");
      console.log("💡 Create a focus group first from the dashboard");
      process.exit(0);
    }

    console.log(`🤖 Testing bot for: ${focusGroup.title}`); // ← Fixed: was console.log`...`
    console.log(`🔗 Meeting link: ${focusGroup.meetingLink}`); // ← Fixed: was console.log`...`
    console.log(`📋 Questionnaire: ${focusGroup.questionnaire.title}`);
    console.log(`❓ Questions: ${focusGroup.questionnaire.questions.length}`);

    // Create a test session
    const session = new FocusGroupSession({
      focusGroup: focusGroup._id,
      status: "waiting",
      botStatus: "idle",
    });
    await session.save();

    console.log("✅ Session created:", session._id);
    console.log("🚀 Starting bot...\n");

    // Start the bot
    await startBot(focusGroup, session);

    console.log("✅ Bot test completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test error:", error);
    process.exit(1);
  }
}

testBot();

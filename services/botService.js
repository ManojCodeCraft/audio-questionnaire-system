const FocusGroupSession = require("../models/FocusGroupSession");
const { runMeetingBot } = require("../meetingbotpoc/src/playwright/meetingBot");

/**
 * Start the bot for a focus group meeting
 */
async function startBot(focusGroup, session) {
  try {
    console.log(`🤖 Starting bot for focus group: ${focusGroup.title}`);

    // Update session status
    session.botStatus = "joining";
    session.startedAt = new Date();
    await session.save();

    // Run the bot (this is async and long-running)
    runMeetingBot(focusGroup, session).catch(async (error) => {
      console.error("❌ Bot error:", error);

      // Log error to session
      session.errorLogs.push({
        timestamp: new Date(),
        error: error.message,
        context: "Bot execution failed",
      });
      session.botStatus = "disconnected";
      session.status = "failed";
      await session.save();
    });

    return { success: true, message: "Bot started successfully" };
  } catch (error) {
    console.error("❌ Error starting bot:", error);
    throw error;
  }
}

/**
 * Stop the bot (if needed)
 */
async function stopBot(sessionId) {
  try {
    const session = await FocusGroupSession.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    session.botStatus = "ended";
    session.endedAt = new Date();
    await session.save();

    return { success: true, message: "Bot stopped" };
  } catch (error) {
    console.error("❌ Error stopping bot:", error);
    throw error;
  }
}

module.exports = {
  startBot,
  stopBot,
};

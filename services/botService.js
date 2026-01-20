const { spawn } = require("child_process");
const path = require("path");

function startBot({ meetingLink, questions, sessionId }) {
  console.log("Spawning meeting bot...");

  const botPath = path.join(__dirname, "..", "meetingbot", "index.js");

  const botProcess = spawn(
    "node",
    [
      botPath,
      "--meetLink",
      meetingLink,
      "--questions",
      JSON.stringify(questions),
      "--sessionId",
      sessionId,
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  botProcess.unref();

  console.log("Bot process started");
}

module.exports = { startBot };

console.log("meetingbot/index.js started");

console.log("RAW ARGS:", process.argv);

const { joinMeetAndAskQuestions } = require("./bot/joinMeetBot");

const args = process.argv.slice(2);

let meetingLink = null;
let questions = [];
let sessionId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--meetLink") {
    meetingLink = args[i + 1];
  }

  if (args[i] === "--questions") {
    try {
      questions = JSON.parse(args[i + 1]);
    } catch (err) {
      console.error("Failed to parse questions JSON");
    }
  }
  if (args[i] === "--sessionId") {
    sessionId = args[i + 1];
  }
}

if (!meetingLink) {
  console.error("meetingLink NOT received");
  process.exit(1);
}
if (!sessionId) {
  console.error("sessionId NOT received");
  process.exit(1);
}
console.log("Parsed meeting link:", meetingLink);
console.log("Questions count:", questions.length);

joinMeetAndAskQuestions(meetingLink, questions, sessionId)
  .then(() => {
    console.log("Bot execution completed");
  })
  .catch((err) => {
    console.error("Bot execution failed:", err);
  });

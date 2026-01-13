require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  !process.env.GOOGLE_REDIRECT_URI
) {
  console.error("❌ Missing Google OAuth env variables.");
  console.log("Check your .env file path & values.");
  process.exit(1);
}

const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
});

console.log("🔗 Authorize here:\n", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nPaste code here: ", async (code) => { 
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\n🔥 NEW REFRESH TOKEN:\n", tokens.refresh_token);
  rl.close();
});

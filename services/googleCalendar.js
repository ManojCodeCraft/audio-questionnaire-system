const { google } = require("googleapis");

// -----------------------------
// OAuth2 Client Setup
// -----------------------------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Attach refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Optional: observe token refresh (safe log)
oauth2Client.on("tokens", (tokens) => {
  if (tokens.access_token) {
    console.log("Google access token refreshed");
  }
});

// Calendar client
const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

// -----------------------------
// Create Google Meet Event
// -----------------------------
async function createMeetingWithLink(focusGroup) {
  try {
    const startTime = new Date(focusGroup.scheduledAt);
    const endTime = new Date(
      startTime.getTime() + (focusGroup.duration || 60) * 60000
    );

    const event = {
      summary: focusGroup.title,
      description: focusGroup.description || "Focus Group Discussion",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees: [
        { email: process.env.BOT_EMAIL },
        ...(focusGroup.participants || []).map((p) => ({ email: p.email })),
      ],
      conferenceData: {
        createRequest: {
          requestId: `focus-group-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 30 },
          { method: "popup", minutes: 10 },
        ],
      },
    };
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      resource: event,
    });

    const meetLink =
      response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri || null;

    return {
      calendarEventId: response.data.id,
      meetingLink: meetLink,
      meetingId: meetLink ? meetLink.split("/").pop() : null,
    };
  } catch (error) {
    console.error("Google Calendar Error:", error.message);
    throw new Error("Failed to create meeting");
  }
}

module.exports = { createMeetingWithLink };

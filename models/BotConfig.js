const mongoose = require("mongoose");

const BotConfigSchema = new mongoose.Schema(
  {
    name: { type: String, default: "VGDQ Bot" },
    email: { type: String, required: true, unique: true },
    greeting: {
      type: String,
      default:
        "Hello everyone! I am your AI moderator for today's group discussion. I will be asking you a series of questions. Please speak one at a time when responding. Let's begin!",
    },
    closingMessage: {
      type: String,
      default:
        "Thank you all for your valuable input today. This concludes our session. Have a great day!",
    },
    authFile: { type: String, default: "auth.json" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BotConfig", BotConfigSchema);

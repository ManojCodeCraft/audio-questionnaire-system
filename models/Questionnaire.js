const mongoose = require("mongoose");

const questionnaireSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,

  questions: [
    {
      order: Number,
      text: String,
    },
  ],

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  link: String,
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("Questionnaire", questionnaireSchema);

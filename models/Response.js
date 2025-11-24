const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  questionnaireId: mongoose.Schema.Types.ObjectId,
  respondentEmail: String,
  respondentName: String,
  responses: [
    {
      questionId: Number,
      questionText: String,
      transcription: String,
      normalized: String,
      timestamp: Date,
    },
  ],
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, default: "completed" },
});

module.exports = mongoose.model("Response", responseSchema);

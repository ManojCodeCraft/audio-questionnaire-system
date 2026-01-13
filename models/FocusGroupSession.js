const mongoose = require("mongoose");

const ResponseSchema = new mongoose.Schema({
  participantEmail: String,
  participantName: String,
  text: String,
  timestamp: Date,
  duration: Number,
});

const QuestionResponseSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  questionText: String,
  askedAt: Date,
  responses: [ResponseSchema],
  summary: String,
});

const FocusGroupSessionSchema = new mongoose.Schema(
  {
    focusGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FocusGroup",
      required: true,
    },
    startedAt: Date,
    endedAt: Date,
    status: {
      type: String,
      enum: ["waiting", "in-progress", "completed", "failed"],
      default: "waiting",
    },
    botStatus: {
      type: String,
      enum: ["idle", "joining", "active", "disconnected", "ended"],
      default: "idle",
    },
    participants: [
      {
        email: String,
        name: String,
        joinedAt: Date,
        speakingTime: Number,
        responseCount: Number,
      },
    ],
    questionResponses: [QuestionResponseSchema],
    fullTranscript: String,
    errorLogs: {
      type: [
        {
          timestamp: Date,
          error: String,
          context: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FocusGroupSession", FocusGroupSessionSchema);

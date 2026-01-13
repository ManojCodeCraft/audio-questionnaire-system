const mongoose = require("mongoose");

const FocusGroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionnaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Questionnaire",
      required: true,
    },
    participants: [
      {
        email: { type: String, required: true },
        name: String,
        status: {
          type: String,
          enum: ["invited", "joined", "completed"],
          default: "invited",
        },
      },
    ],
    scheduledAt: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 60,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    meetingLink: String,
    meetingId: String,
    calendarEventId: String,
    settings: {
      maxParticipants: { type: Number, default: 20 },
      timePerQuestion: { type: Number, default: 5 },
      enableSummarization: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FocusGroup", FocusGroupSchema);

const FocusGroup = require("../models/FocusGroup");
const FocusGroupSession = require("../models/FocusGroupSession");
const Questionnaire = require("../models/Questionnaire");
const { createMeetingWithLink } = require("../services/googleCalendar");
const { startBot } = require("../services/botService");

exports.createFocusGroup = async (req, res) => {
  try {
    const {
      title,
      description,
      questionnaireId,
      participants,
      scheduledAt,
      duration,
    } = req.body;

    if (!questionnaireId) {
      return res.status(400).json({
        success: false,
        error: "questionnaireId is required",
      });
    }

    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: "Questionnaire not found",
      });
    }

    const focusGroup = new FocusGroup({
      title,
      description,
      createdBy: req.user.id,
      questionnaire: questionnaireId,
      participants,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      status: "scheduled",
    });

    const meetingData = await createMeetingWithLink(focusGroup);

    focusGroup.meetingLink = meetingData.meetingLink;
    focusGroup.meetingId = meetingData.meetingId;
    focusGroup.calendarEventId = meetingData.calendarEventId;

    await focusGroup.save();

    res.status(201).json({
      success: true,
      focusGroup: {
        _id: focusGroup._id,
        title: focusGroup.title,
        meetingLink: focusGroup.meetingLink,
        scheduledAt: focusGroup.scheduledAt,
      },
    });
  } catch (error) {
    console.error("Create Focus Group Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getFocusGroups = async (req, res) => {
  try {
    const focusGroups = await FocusGroup.find({
      createdBy: req.user.id,
    })
      .populate("questionnaire", "title")
      .sort({ scheduledAt: -1 });

    res.json({ success: true, focusGroups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.startFocusGroupBot = async (req, res) => {
  try {
    const { id } = req.params;

    const focusGroup = await FocusGroup.findById(id).populate("questionnaire");

    if (!focusGroup) {
      return res.status(404).json({
        success: false,
        error: "Focus group not found",
      });
    }

    const session = new FocusGroupSession({
      focusGroup: focusGroup._id,
      status: "waiting",
      botStatus: "joining",
    });
    await session.save();

    startBot(focusGroup, session);

    res.json({
      success: true,
      message: "Bot is joining the meeting",
      session: {
        _id: session._id,
        status: session.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await FocusGroupSession.findOne({
      focusGroup: id,
    })
      .populate("focusGroup")
      .sort({ createdAt: -1 })
      .limit(1);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

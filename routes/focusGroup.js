const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const focusGroupController = require("../controllers/focusGroupController");

// Create focus group
router.post("/create", auth(), focusGroupController.createFocusGroup);

// Get all focus groups
router.get("/", auth(), focusGroupController.getFocusGroups);

// Start bot for focus group
router.post("/:id/start", auth(), focusGroupController.startFocusGroupBot);

// Get session status
router.get("/:id/session", auth(), focusGroupController.getSessionStatus);

module.exports = router;

const express = require("express");

const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes require authentication.
router.use(protect);

// Get notifications and unread count.
router.get("/", getNotifications);

// Mark all notifications as read.
router.patch("/read-all", markAllNotificationsRead);

// Mark one notification as read.
router.patch("/:id/read", markNotificationRead);

module.exports = router;

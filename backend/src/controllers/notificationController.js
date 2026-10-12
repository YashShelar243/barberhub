const pool = require("../config/database");

// Get notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         appointment_id,
         title,
         message,
         type,
         is_read,
         created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id],
    );

    const unreadResult = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      notifications: result.rows,
      unreadCount: unreadResult.rows[0].unread_count,
    });
  } catch (error) {
    console.error("Get notifications error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications.",
    });
  }
};

// Mark one notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [Number(id), req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification: result.rows[0],
    });
  } catch (error) {
    console.error("Mark notification read error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification.",
    });
  }
};

// Mark all notifications as read for the logged-in user
const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: result.rowCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications.",
    });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};

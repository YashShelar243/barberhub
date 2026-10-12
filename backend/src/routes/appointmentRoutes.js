const express = require("express");

const {
  createAppointment,
  getOwnerAppointments,
  updateAppointmentStatus,
  getCustomerAppointments,
  cancelCustomerAppointment,
} = require("../controllers/appointmentController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Customer routes
router.post("/", protect, authorize("customer"), createAppointment);
router.get("/my", protect, authorize("customer"), getCustomerAppointments);
router.patch(
  "/:id/cancel",
  protect,
  authorize("customer"),
  cancelCustomerAppointment,
);

// Owner routes
router.get("/owner", protect, authorize("owner"), getOwnerAppointments);
router.patch(
  "/:id/status",
  protect,
  authorize("owner"),
  updateAppointmentStatus,
);

module.exports = router;

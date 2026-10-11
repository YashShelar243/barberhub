const express = require("express");

const {
  createAppointment,
  getOwnerAppointments,
  updateAppointmentStatus,
  getCustomerAppointments,
} = require("../controllers/appointmentController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Customer: book an appointment
router.post("/", protect, authorize("customer"), createAppointment);

// Owner: view appointments for their shop
router.get("/owner", protect, authorize("owner"), getOwnerAppointments);

// Owner: confirm or reject an appointment
router.patch(
  "/:id/status",
  protect,
  authorize("owner"),
  updateAppointmentStatus,
);

// Customer: view their appointments
router.get("/my", protect, authorize("customer"), getCustomerAppointments);

module.exports = router;

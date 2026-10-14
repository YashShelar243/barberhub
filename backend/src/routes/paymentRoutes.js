const express = require("express");

const {
  createPayment,
  getEligibleServices,
  getPayments,
  getPaymentById,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All payment endpoints require authentication.
router.use(protect);

// Record payment and generate receipt.
router.post("/", createPayment);

// List all receipts for the logged-in owner's shop.
router.get("/", getPayments);

// List completed appointments and walk-in services awaiting payment.
// Keep this route before "/:id".
router.get("/eligible", getEligibleServices);

// Fetch a specific receipt by ID.
router.get("/:id", getPaymentById);

module.exports = router;

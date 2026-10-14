const express = require("express");

const {
  createPayment,
  getPayments,
  getPaymentById,
} = require("../controllers/paymentController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// These endpoints are for shop owners.
router.post("/", createPayment);
router.get("/", getPayments);
router.get("/:id", getPaymentById);

module.exports = router;

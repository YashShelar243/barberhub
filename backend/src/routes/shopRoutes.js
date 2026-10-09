const express = require("express");
const { getShops, createShop } = require("../controllers/shopController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Get active barber shops for logged-in users
router.get("/", protect, getShops);

// Allow only logged-in owners to register a shop
router.post("/", protect, authorize("owner"), createShop);

module.exports = router;

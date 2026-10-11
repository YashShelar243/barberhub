const express = require("express");
const {
  getShops,
  createShop,
  getMyShop,
  updateMyShop,
} = require("../controllers/shopController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Get active barber shops for logged-in users
router.get("/", protect, getShops);

// Allow only logged-in owners to register a shop
router.post("/", protect, authorize("owner"), createShop);
router.get("/my-shop", protect, authorize("owner"), getMyShop);

router.patch("/my-shop", protect, authorize("owner"), updateMyShop);

module.exports = router;

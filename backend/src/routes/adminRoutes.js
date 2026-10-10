const express = require("express");

const {
  createOwner,
  getAllShops,
  updateShopStatus,
} = require("../controllers/adminController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new owner — admin only
router.post("/owners", protect, authorize("admin"), createOwner);

// Get all shops, including inactive shops — admin only
router.get("/shops", protect, authorize("admin"), getAllShops);

router.patch(
  "/shops/:id/status",
  protect,
  authorize("admin"),
  updateShopStatus,
);

module.exports = router;

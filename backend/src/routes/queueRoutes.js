const express = require("express");

const {
  getMyQueue,
  addWalkIn,
  startService,
  completeService,
  cancelQueueEntry,
  getShopCrowd,
} = require("../controllers/queueController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Customers can view crowd information for a shop.
router.get("/shop/:shopId/crowd", protect, getShopCrowd);

// Owner-only queue management.
router.get("/my-shop", protect, authorize("owner"), getMyQueue);
router.post("/", protect, authorize("owner"), addWalkIn);

router.patch("/:id/start", protect, authorize("owner"), startService);
router.patch("/:id/complete", protect, authorize("owner"), completeService);
router.patch("/:id/cancel", protect, authorize("owner"), cancelQueueEntry);

module.exports = router;
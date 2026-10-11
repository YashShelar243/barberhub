const express = require("express");

const {
  getShopServices,
  getMyShopServices,
  createService,
  updateService,
} = require("../controllers/serviceController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Public: customers can view available services for a shop
router.get("/shop/:shopId", getShopServices);

// Owner: view all services belonging to their shop
router.get("/my-shop", protect, authorize("owner"), getMyShopServices);

// Owner: add a service
router.post("/", protect, authorize("owner"), createService);

// Owner: update a service or change its availability
router.patch("/:id", protect, authorize("owner"), updateService);

module.exports = router;

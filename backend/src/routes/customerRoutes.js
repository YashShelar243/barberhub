const express = require("express");

const {
  getCustomers,
  getCustomerById,
} = require("../controllers/customerController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Only authenticated, active shop owners can access customer data.
router.use(protect, authorize("owner"));

// Keep the list route before the parameterized profile route.
router.get("/", getCustomers);
router.get("/:id", getCustomerById);

module.exports = router;

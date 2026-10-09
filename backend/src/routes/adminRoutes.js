const express = require("express");
const { createOwner } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Only authenticated administrators can create owners
router.post("/owners", protect, authorize("admin"), createOwner);

module.exports = router;

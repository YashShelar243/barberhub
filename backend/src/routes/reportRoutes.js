const express = require("express");
const { getOwnerReports } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/owner", protect, authorize("owner"), getOwnerReports);

module.exports = router;

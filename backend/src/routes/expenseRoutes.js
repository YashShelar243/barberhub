const express = require("express");

const {
  getExpenses,
  getExpenseSummary,
  createExpense,
  deleteExpense,
} = require("../controllers/expenseController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({
      success: false,
      message: "Only shop owners can manage expenses.",
    });
  }

  next();
});

router.get("/summary", getExpenseSummary);
router.get("/", getExpenses);
router.post("/", createExpense);
router.delete("/:id", deleteExpense);

module.exports = router;

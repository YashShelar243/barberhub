const pool = require("../config/database");

const VALID_CATEGORIES = [
  "rent",
  "salary",
  "utilities",
  "supplies",
  "maintenance",
  "equipment",
  "marketing",
  "other",
];

const VALID_PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer"];

async function getOwnerShop(ownerId) {
  const result = await pool.query(
    `SELECT id
     FROM public.barber_shops
     WHERE owner_id = $1
       AND is_active = TRUE
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] || null;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateDateRange(startDate, endDate) {
  if (startDate && !isValidDate(startDate)) {
    return "Invalid start_date. Use a valid YYYY-MM-DD date.";
  }

  if (endDate && !isValidDate(endDate)) {
    return "Invalid end_date. Use a valid YYYY-MM-DD date.";
  }

  if (startDate && endDate && startDate > endDate) {
    return "start_date cannot be after end_date.";
  }

  return null;
}

// GET /api/expenses
const getExpenses = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const dateError = validateDateRange(start_date, end_date);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No active barber shop found for this owner.",
      });
    }

    const conditions = ["shop_id = $1"];
    const values = [shop.id];

    if (start_date) {
      values.push(start_date);
      conditions.push(`expense_date >= $${values.length}::date`);
    }

    if (end_date) {
      values.push(end_date);
      conditions.push(`expense_date <= $${values.length}::date`);
    }

    const result = await pool.query(
      `SELECT
         id,
         title,
         category,
         amount,
         expense_date,
         payment_method,
         notes,
         created_at
       FROM public.shop_expenses
       WHERE ${conditions.join(" AND ")}
       ORDER BY expense_date DESC, created_at DESC
       LIMIT 1000`,
      values,
    );

    return res.status(200).json({
      success: true,
      expenses: result.rows,
    });
  } catch (error) {
    console.error("Get expenses error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch expenses.",
    });
  }
};

// GET /api/expenses/summary?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
const getExpenseSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const dateError = validateDateRange(start_date, end_date);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError,
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No active barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `WITH completed_revenue AS (
         SELECT
           a.appointment_date::date AS service_date,
           a.service_price::numeric AS amount
         FROM public.appointments a
         WHERE a.shop_id = $1
           AND a.status = 'completed'

         UNION ALL

         SELECT
           (q.completed_at AT TIME ZONE 'Asia/Kolkata')::date
             AS service_date,
           q.service_price::numeric AS amount
         FROM public.shop_queue q
         WHERE q.shop_id = $1
           AND q.status = 'completed'
           AND q.appointment_id IS NULL
           AND q.completed_at IS NOT NULL
       ),
       revenue_total AS (
         SELECT COALESCE(SUM(amount), 0) AS revenue
         FROM completed_revenue
         WHERE ($2::date IS NULL OR service_date >= $2::date)
           AND ($3::date IS NULL OR service_date <= $3::date)
       ),
       expense_total AS (
         SELECT COALESCE(SUM(amount), 0) AS expenses
         FROM public.shop_expenses
         WHERE shop_id = $1
           AND ($2::date IS NULL OR expense_date >= $2::date)
           AND ($3::date IS NULL OR expense_date <= $3::date)
       )
       SELECT
         revenue_total.revenue,
         expense_total.expenses,
         revenue_total.revenue - expense_total.expenses AS net_profit
       FROM revenue_total
       CROSS JOIN expense_total`,
      [shop.id, start_date || null, end_date || null],
    );

    const totals = result.rows[0];

    return res.status(200).json({
      success: true,
      summary: {
        revenue: Number(totals.revenue),
        expenses: Number(totals.expenses),
        netProfit: Number(totals.net_profit),
        start_date: start_date || null,
        end_date: end_date || null,
      },
    });
  } catch (error) {
    console.error("Get expense summary error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to calculate profit summary.",
    });
  }
};

// POST /api/expenses
const createExpense = async (req, res) => {
  const {
    title,
    category,
    amount,
    expense_date,
    payment_method = "cash",
    notes = "",
  } = req.body || {};

  if (typeof title !== "string" || !title.trim() || title.trim().length > 150) {
    return res.status(400).json({
      success: false,
      message: "Title is required and must not exceed 150 characters.",
    });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: "Invalid expense category.",
    });
  }

  const numericAmount = Number(amount);

  if (
    amount === undefined ||
    amount === null ||
    amount === "" ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 9999999999.99
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid expense amount greater than zero.",
    });
  }

  if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment method.",
    });
  }

  const dateValue =
    expense_date === undefined || expense_date === "" ? null : expense_date;

  if (dateValue !== null && !isValidDate(dateValue)) {
    return res.status(400).json({
      success: false,
      message: "Invalid expense date. Use a valid YYYY-MM-DD date.",
    });
  }

  if (typeof notes !== "string" || notes.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Notes must not exceed 2000 characters.",
    });
  }

  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No active barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `INSERT INTO public.shop_expenses (
         shop_id,
         owner_id,
         title,
         category,
         amount,
         expense_date,
         payment_method,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8)
       RETURNING
         id,
         title,
         category,
         amount,
         expense_date,
         payment_method,
         notes,
         created_at`,
      [
        shop.id,
        req.user.id,
        title.trim(),
        category,
        numericAmount,
        dateValue,
        payment_method,
        notes.trim(),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      expense: result.rows[0],
    });
  } catch (error) {
    console.error("Create expense error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to record expense.",
    });
  }
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid expense ID.",
    });
  }

  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No active barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `DELETE FROM public.shop_expenses
       WHERE id = $1
         AND shop_id = $2
         AND owner_id = $3
       RETURNING id`,
      [Number(req.params.id), shop.id, req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found in your shop.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    console.error("Delete expense error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete expense.",
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseSummary,
  createExpense,
  deleteExpense,
};

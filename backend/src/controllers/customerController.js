const pool = require("../config/database");

// Resolve the shop belonging to the authenticated owner.
const getOwnerShopId = async (ownerId) => {
  const result = await pool.query(
    "SELECT id FROM barber_shops WHERE owner_id = $1 LIMIT 1",
    [ownerId],
  );

  return result.rows[0]?.id ?? null;
};

// GET /api/customers?search=
const getCustomers = async (req, res) => {
  try {
    const shopId = await getOwnerShopId(req.user.id);

    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const search = String(req.query.search || "").trim();

    const result = await pool.query(
      `WITH linked_customers AS (
         SELECT customer_id
         FROM appointments
         WHERE shop_id = $1

         UNION

         SELECT customer_id
         FROM shop_queue
         WHERE shop_id = $1
           AND customer_id IS NOT NULL

         UNION

         SELECT customer_id
         FROM payments
         WHERE shop_id = $1
           AND customer_id IS NOT NULL
       ),
       appointment_stats AS (
         SELECT
           customer_id,
           COUNT(*) AS appointment_count,
           COUNT(*) FILTER (WHERE status = 'completed')
             AS completed_appointments,
           MAX(appointment_date + appointment_time)
             AS last_appointment
         FROM appointments
         WHERE shop_id = $1
         GROUP BY customer_id
       ),
       payment_stats AS (
         SELECT
           customer_id,
           COALESCE(SUM(amount), 0) AS total_spent
         FROM payments
         WHERE shop_id = $1
           AND customer_id IS NOT NULL
         GROUP BY customer_id
       )
       SELECT
         u.id,
         u.name,
         u.phone,
         u.email,
         u.created_at,
         COALESCE(a.appointment_count, 0)::int AS appointment_count,
         COALESCE(a.completed_appointments, 0)::int
           AS completed_appointments,
         COALESCE(p.total_spent, 0) AS total_spent,
         a.last_appointment
       FROM linked_customers lc
       JOIN users u ON u.id = lc.customer_id
       LEFT JOIN appointment_stats a ON a.customer_id = u.id
       LEFT JOIN payment_stats p ON p.customer_id = u.id
       WHERE u.role = 'customer'
         AND (
           $2 = ''
           OR u.name ILIKE '%' || $2 || '%'
           OR u.phone ILIKE '%' || $2 || '%'
           OR u.email ILIKE '%' || $2 || '%'
         )
       ORDER BY u.name ASC`,
      [shopId, search],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      customers: result.rows,
    });
  } catch (error) {
    console.error("Get customers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers.",
    });
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const shopId = await getOwnerShopId(req.user.id);

    if (!shopId) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const customerId = req.params.id;

    if (!/^\d+$/.test(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    // A customer must be linked to this shop.
    const customerResult = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.created_at
       FROM users u
       WHERE u.id = $1
         AND u.role = 'customer'
         AND (
           EXISTS (
             SELECT 1 FROM appointments a
             WHERE a.customer_id = u.id AND a.shop_id = $2
           )
           OR EXISTS (
             SELECT 1 FROM shop_queue q
             WHERE q.customer_id = u.id AND q.shop_id = $2
           )
           OR EXISTS (
             SELECT 1 FROM payments p
             WHERE p.customer_id = u.id AND p.shop_id = $2
           )
         )`,
      [customerId, shopId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found for this shop.",
      });
    }

    const [appointmentsResult, paymentsResult, queueResult] = await Promise.all(
      [
        pool.query(
          `SELECT
             id,
             appointment_date,
             appointment_time,
             service_name,
             service_price,
             status,
             notes
           FROM appointments
           WHERE shop_id = $1 AND customer_id = $2
           ORDER BY appointment_date DESC, appointment_time DESC`,
          [shopId, customerId],
        ),
        pool.query(
          `SELECT
             id,
             receipt_number,
             service_name,
             amount,
             payment_method,
             appointment_id,
             queue_id
           FROM payments
           WHERE shop_id = $1 AND customer_id = $2
           ORDER BY id DESC`,
          [shopId, customerId],
        ),
        pool.query(
          `SELECT
             id,
             service_id,
             customer_name,
             status,
             created_at,
             started_at,
             completed_at
           FROM shop_queue
           WHERE shop_id = $1 AND customer_id = $2
           ORDER BY created_at DESC`,
          [shopId, customerId],
        ),
      ],
    );

    const payments = paymentsResult.rows;
    const totalSpent = payments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0,
    );

    return res.json({
      success: true,
      customer: customerResult.rows[0],
      summary: {
        appointmentCount: appointmentsResult.rows.length,
        completedAppointments: appointmentsResult.rows.filter(
          (appointment) => appointment.status === "completed",
        ).length,
        paymentCount: payments.length,
        totalSpent: Number(totalSpent.toFixed(2)),
      },
      appointments: appointmentsResult.rows,
      payments,
      queueHistory: queueResult.rows,
    });
  } catch (error) {
    console.error("Get customer details error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer details.",
    });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
};

const pool = require("../config/database");

// Owner: get daily and monthly business reports
const getOwnerReports = async (req, res) => {
  try {
    // Only retrieve the shop belonging to the logged-in owner.
    const shopResult = await pool.query(
      `SELECT id, name
       FROM barber_shops
       WHERE owner_id = $1
       LIMIT 1`,
      [req.user.id],
    );

    if (shopResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const shopId = shopResult.rows[0].id;

    // Appointment counts by status.
    const statsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_appointments,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM appointments
       WHERE shop_id = $1`,
      [shopId],
    );

    // Revenue estimates from completed appointments.
    // These are not verified payment collections.
    const revenueResult = await pool.query(
      `SELECT
         COALESCE(
           SUM(service_price) FILTER (
             WHERE status = 'completed'
               AND appointment_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
           ), 0
         ) AS today_revenue,
         COALESCE(
           SUM(service_price) FILTER (
             WHERE status = 'completed'
               AND appointment_date >=
                   date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata')::date
               AND appointment_date <
                   (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata')
                    + INTERVAL '1 month')::date
           ), 0
         ) AS monthly_revenue
       FROM appointments
       WHERE shop_id = $1`,
      [shopId],
    );

    // Daily revenue for the last seven calendar days, including today.
    const dailyResult = await pool.query(
      `SELECT
         appointment_date::text AS date,
         COALESCE(SUM(service_price), 0) AS revenue,
         COUNT(*)::int AS completed_appointments
       FROM appointments
       WHERE shop_id = $1
         AND status = 'completed'
         AND appointment_date >=
             ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6)
         AND appointment_date <=
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       GROUP BY appointment_date
       ORDER BY appointment_date ASC`,
      [shopId],
    );

    // Most frequently completed services.
    const servicesResult = await pool.query(
      `SELECT
         service_name,
         COUNT(*)::int AS bookings,
         COALESCE(SUM(service_price), 0) AS revenue
       FROM appointments
       WHERE shop_id = $1
         AND status = 'completed'
       GROUP BY service_name
       ORDER BY bookings DESC, revenue DESC
       LIMIT 5`,
      [shopId],
    );

    return res.status(200).json({
      success: true,
      shop: shopResult.rows[0],
      appointments: statsResult.rows[0],
      revenue: revenueResult.rows[0],
      dailyRevenue: dailyResult.rows,
      popularServices: servicesResult.rows,
    });
  } catch (error) {
    console.error("Get owner reports error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate business reports.",
    });
  }
};

module.exports = { getOwnerReports };

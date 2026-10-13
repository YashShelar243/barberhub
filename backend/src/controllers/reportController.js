const pool = require("../config/database");

// Owner: get daily and monthly business reports.
const getOwnerReports = async (req, res) => {
  try {
    const shopResult = await pool.query(
      `SELECT id, name
       FROM public.barber_shops
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

    // Keep the appointment statistics from the existing report.
    const statsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_appointments,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM public.appointments
       WHERE shop_id = $1`,
      [shopId],
    );

    // A common revenue source for completed appointments and walk-ins.
    // Appointment-linked queue rows are excluded to prevent double-counting.
    const revenueCte = `
      WITH completed_revenue AS (
        SELECT
          a.appointment_date AS service_date,
          a.service_name,
          a.service_price::numeric AS amount
        FROM public.appointments a
        WHERE a.shop_id = $1
          AND a.status = 'completed'

        UNION ALL

        SELECT
          (q.completed_at AT TIME ZONE 'Asia/Kolkata')::date
            AS service_date,
          ss.name AS service_name,
          q.service_price::numeric AS amount
        FROM public.shop_queue q
        JOIN public.shop_services ss ON ss.id = q.service_id
        WHERE q.shop_id = $1
          AND q.status = 'completed'
          AND q.appointment_id IS NULL
          AND q.completed_at IS NOT NULL
      )
    `;

    const revenueResult = await pool.query(
      `${revenueCte}
       SELECT
         COALESCE(
           SUM(amount) FILTER (
             WHERE service_date =
               (NOW() AT TIME ZONE 'Asia/Kolkata')::date
           ), 0
         ) AS today_revenue,
         COALESCE(
           SUM(amount) FILTER (
             WHERE service_date >=
               date_trunc(
                 'month',
                 NOW() AT TIME ZONE 'Asia/Kolkata'
               )::date
               AND service_date <
               (
                 date_trunc(
                   'month',
                   NOW() AT TIME ZONE 'Asia/Kolkata'
                 ) + INTERVAL '1 month'
               )::date
           ), 0
         ) AS monthly_revenue
       FROM completed_revenue`,
      [shopId],
    );

    const dailyResult = await pool.query(
      `${revenueCte}
       SELECT
         service_date::text AS date,
         COALESCE(SUM(amount), 0) AS revenue,
         COUNT(*)::int AS completed_appointments
       FROM completed_revenue
       WHERE service_date >=
         ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6)
         AND service_date <=
         (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       GROUP BY service_date
       ORDER BY service_date ASC`,
      [shopId],
    );

    const servicesResult = await pool.query(
      `${revenueCte}
       SELECT
         service_name,
         COUNT(*)::int AS bookings,
         COALESCE(SUM(amount), 0) AS revenue
       FROM completed_revenue
       GROUP BY service_name
       ORDER BY bookings DESC, revenue DESC
       LIMIT 5`,
      [shopId],
    );

    // Report walk-ins separately from online appointments.
    const walkInResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('waiting', 'in_service')
         )::int AS active_walk_ins,
         COUNT(*) FILTER (
           WHERE status = 'completed'
         )::int AS completed_walk_ins
       FROM public.shop_queue
       WHERE shop_id = $1
         AND appointment_id IS NULL`,
      [shopId],
    );

    return res.status(200).json({
      success: true,
      shop: shopResult.rows[0],
      appointments: statsResult.rows[0],
      walkIns: walkInResult.rows[0],
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

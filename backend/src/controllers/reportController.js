const pool = require("../config/database");

// Owner: get business reports and customer analytics.
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

    // Existing appointment statistics.
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

    // Existing service-price revenue calculations.
    // Appointment-linked queue entries are excluded to prevent double-counting.
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

    // Existing walk-in statistics.
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

    // Count registered customers linked to this shop.
    const customerStatsResult = await pool.query(
      `WITH linked_customers AS (
         SELECT customer_id
         FROM public.appointments
         WHERE shop_id = $1
           AND customer_id IS NOT NULL

         UNION

         SELECT customer_id
         FROM public.shop_queue
         WHERE shop_id = $1
           AND customer_id IS NOT NULL

         UNION

         SELECT customer_id
         FROM public.payments
         WHERE shop_id = $1
           AND customer_id IS NOT NULL
       ),
       paid_visits AS (
         SELECT
           customer_id,
           COUNT(*)::int AS visit_count,
           COALESCE(SUM(amount), 0) AS total_spent
         FROM public.payments
         WHERE shop_id = $1
           AND customer_id IS NOT NULL
           AND payment_status = 'paid'
         GROUP BY customer_id
       )
       SELECT
         COUNT(*)::int AS total_customers,
         COUNT(*) FILTER (
           WHERE COALESCE(pv.visit_count, 0) > 1
         )::int AS repeat_customers
       FROM linked_customers lc
       JOIN public.users u
         ON u.id = lc.customer_id
        AND u.role = 'customer'
       LEFT JOIN paid_visits pv
         ON pv.customer_id = lc.customer_id`,
      [shopId],
    );

    // Top five registered customers by actual recorded paid spending.
    const topCustomersResult = await pool.query(
      `SELECT
         p.customer_id AS id,
         u.name,
         u.phone,
         COUNT(p.id)::int AS payment_count,
         COALESCE(SUM(p.amount), 0) AS total_spent
       FROM public.payments p
       JOIN public.users u
         ON u.id = p.customer_id
        AND u.role = 'customer'
       WHERE p.shop_id = $1
         AND p.customer_id IS NOT NULL
         AND p.payment_status = 'paid'
       GROUP BY p.customer_id, u.name, u.phone
       ORDER BY total_spent DESC, payment_count DESC, u.name ASC
       LIMIT 5`,
      [shopId],
    );

    // Six-month trend from actual recorded payments after discounts.
    const monthlyTrendResult = await pool.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc(
             'month',
             NOW() AT TIME ZONE 'Asia/Kolkata'
           ) - INTERVAL '5 months',
           date_trunc(
             'month',
             NOW() AT TIME ZONE 'Asia/Kolkata'
           ),
           INTERVAL '1 month'
         )::date AS month_start
       ),
       paid_monthly AS (
         SELECT
           date_trunc(
             'month',
             COALESCE(p.paid_at, p.created_at)
               AT TIME ZONE 'Asia/Kolkata'
           )::date AS month_start,
           COALESCE(SUM(p.amount), 0) AS revenue,
           COUNT(*)::int AS payment_count
         FROM public.payments p
         WHERE p.shop_id = $1
           AND p.payment_status = 'paid'
           AND COALESCE(p.paid_at, p.created_at) >=
             (
               date_trunc(
                 'month',
                 NOW() AT TIME ZONE 'Asia/Kolkata'
               ) - INTERVAL '5 months'
             ) AT TIME ZONE 'Asia/Kolkata'
           AND COALESCE(p.paid_at, p.created_at) <
             (
               date_trunc(
                 'month',
                 NOW() AT TIME ZONE 'Asia/Kolkata'
               ) + INTERVAL '1 month'
             ) AT TIME ZONE 'Asia/Kolkata'
         GROUP BY 1
       )
       SELECT
         TO_CHAR(m.month_start, 'YYYY-MM') AS month,
         TO_CHAR(m.month_start, 'Mon YYYY') AS month_label,
         COALESCE(pm.revenue, 0) AS revenue,
         COALESCE(pm.payment_count, 0)::int AS payment_count
       FROM months m
       LEFT JOIN paid_monthly pm
         ON pm.month_start = m.month_start
       ORDER BY m.month_start ASC`,
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

      // New customer analytics.
      customerAnalytics: customerStatsResult.rows[0],
      topCustomers: topCustomersResult.rows,
      monthlyRevenueTrend: monthlyTrendResult.rows,
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

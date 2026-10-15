const pool = require("../config/database");

async function getOwnerShop(ownerId) {
  const result = await pool.query(
    `SELECT id, name, phone, email, address, city
     FROM public.barber_shops
     WHERE owner_id = $1
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] || null;
}

// Owner: record payment, redeem optional loyalty points,
// award new points, and generate the receipt.
const createPayment = async (req, res) => {
  const {
    appointment_id,
    queue_id,
    payment_method,
    points_redeemed = 0,
  } = req.body || {};

  if (
    !["cash", "upi", "card"].includes(payment_method) ||
    Boolean(appointment_id) === Boolean(queue_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Provide exactly one appointment_id or queue_id and a valid payment method.",
    });
  }

  const sourceId = appointment_id ?? queue_id;

  if (!/^[1-9]\d*$/.test(String(sourceId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment or queue entry ID.",
    });
  }

  const pointsToRedeem = Number(points_redeemed);

  if (
    !Number.isSafeInteger(pointsToRedeem) ||
    pointsToRedeem < 0 ||
    pointsToRedeem % 100 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Points must be a non-negative multiple of 100.",
    });
  }

  let client;
  let transactionStarted = false;

  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    let source;

    if (appointment_id) {
      const result = await client.query(
        `SELECT
           a.id,
           a.shop_id,
           a.customer_id,
           u.name AS customer_name,
           a.service_name,
           a.service_price AS amount,
           a.status
         FROM public.appointments a
         JOIN public.users u
           ON u.id = a.customer_id
         WHERE a.id = $1
           AND a.shop_id = $2
         FOR UPDATE OF a`,
        [Number(sourceId), shop.id],
      );

      source = result.rows[0];

      if (!source) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: "Appointment not found in your shop.",
        });
      }

      if (source.status !== "completed") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Only completed appointments can be paid.",
        });
      }
    } else {
      const result = await client.query(
        `SELECT
           q.id,
           q.shop_id,
           q.customer_id,
           q.customer_name,
           ss.name AS service_name,
           COALESCE(q.service_price, ss.price) AS amount,
           q.status
         FROM public.shop_queue q
         JOIN public.shop_services ss
           ON ss.id = q.service_id
         WHERE q.id = $1
           AND q.shop_id = $2
           AND q.appointment_id IS NULL
         FOR UPDATE OF q`,
        [Number(sourceId), shop.id],
      );

      source = result.rows[0];

      if (!source) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: "Walk-in entry not found in your shop.",
        });
      }

      if (source.status !== "completed") {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Only completed walk-in services can be paid.",
        });
      }
    }

    if (
      source.amount == null ||
      !Number.isFinite(Number(source.amount)) ||
      Number(source.amount) < 0
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "A valid service price is required to record payment.",
      });
    }

    // Use integer paise for monetary calculations.
    const subtotalPaise = Math.round(Number(source.amount) * 100);
    const subtotal = subtotalPaise / 100;

    let discountAmount = 0;
    let discountPaise = 0;

    // Validate the customer's loyalty balance before redemption.
    if (pointsToRedeem > 0) {
      if (!source.customer_id) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Loyalty redemption requires a registered customer.",
        });
      }

      const loyaltyResult = await client.query(
        `SELECT points_balance
         FROM public.customer_loyalty
         WHERE shop_id = $1
           AND customer_id = $2
         FOR UPDATE`,
        [shop.id, source.customer_id],
      );

      if (
        loyaltyResult.rowCount === 0 ||
        Number(loyaltyResult.rows[0].points_balance) < pointsToRedeem
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "Insufficient loyalty points.",
        });
      }

      // 100 points = ₹10 discount.
      discountPaise = pointsToRedeem * 10;

      if (discountPaise > subtotalPaise) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(400).json({
          success: false,
          message: "The discount cannot exceed the service price.",
        });
      }

      discountAmount = discountPaise / 100;
    }

    const finalAmount = Math.round(subtotalPaise - discountPaise) / 100;

    const receiptNumber = `BH-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;

    // Save the original price, discount, redeemed points,
    // and final amount in the payment record.
    const paymentResult = await client.query(
      `INSERT INTO public.payments (
         receipt_number,
         shop_id,
         appointment_id,
         queue_id,
         customer_id,
         customer_name,
         service_name,
         amount,
         subtotal,
         discount_amount,
         points_redeemed,
         payment_method,
         payment_status
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, 'paid'
       )
       RETURNING *`,
      [
        receiptNumber,
        shop.id,
        appointment_id ? Number(sourceId) : null,
        queue_id ? Number(sourceId) : null,
        source.customer_id,
        source.customer_name || "Walk-in Customer",
        source.service_name,
        finalAmount,
        subtotal,
        discountAmount,
        pointsToRedeem,
        payment_method,
      ],
    );

    const payment = paymentResult.rows[0];

    // Deduct redeemed points and record the transaction.
    if (pointsToRedeem > 0) {
      const debitResult = await client.query(
        `UPDATE public.customer_loyalty
         SET points_balance = points_balance - $1,
             updated_at = NOW()
         WHERE shop_id = $2
           AND customer_id = $3
           AND points_balance >= $1
         RETURNING points_balance`,
        [pointsToRedeem, shop.id, source.customer_id],
      );

      if (debitResult.rowCount !== 1) {
        throw new Error("Loyalty balance changed; redemption cancelled.");
      }

      await client.query(
        `INSERT INTO public.loyalty_transactions (
           shop_id,
           customer_id,
           payment_id,
           transaction_type,
           points,
           discount_amount,
           description
         )
         VALUES ($1, $2, $3, 'redeemed', $4, $5, $6)`,
        [
          shop.id,
          source.customer_id,
          payment.id,
          pointsToRedeem,
          discountAmount,
          `Redeemed ${pointsToRedeem} points for discount`,
        ],
      );
    }

    // Award points based on the final amount paid.
    // Only registered customers earn points.
    let earnedPoints = 0;

    if (source.customer_id) {
      earnedPoints = Math.floor(finalAmount / 10);

      if (earnedPoints > 0) {
        await client.query(
          `INSERT INTO public.customer_loyalty (
             shop_id,
             customer_id,
             points_balance,
             lifetime_points_earned,
             updated_at
           )
           VALUES ($1, $2, $3, $3, NOW())
           ON CONFLICT (shop_id, customer_id)
           DO UPDATE SET
             points_balance =
               public.customer_loyalty.points_balance
               + EXCLUDED.points_balance,
             lifetime_points_earned =
               public.customer_loyalty.lifetime_points_earned
               + EXCLUDED.lifetime_points_earned,
             updated_at = NOW()`,
          [shop.id, source.customer_id, earnedPoints],
        );

        await client.query(
          `INSERT INTO public.loyalty_transactions (
             shop_id,
             customer_id,
             payment_id,
             transaction_type,
             points,
             description
           )
           VALUES ($1, $2, $3, 'earned', $4, $5)`,
          [
            shop.id,
            source.customer_id,
            payment.id,
            earnedPoints,
            `Earned ${earnedPoints} points from payment`,
          ],
        );
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Payment recorded and receipt generated.",
      shop: {
        id: shop.id,
        name: shop.name,
        phone: shop.phone,
        email: shop.email,
        address: shop.address,
        city: shop.city,
      },
      receipt: payment,
      loyalty: {
        pointsRedeemed: pointsToRedeem,
        discountAmount,
        pointsEarned: earnedPoints,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A payment receipt already exists for this service.",
      });
    }

    console.error("Create payment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to record payment.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Owner: list completed services awaiting payment.
// Also return the customer's current loyalty points.
const getEligibleServices = async (req, res) => {
  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM (
         SELECT
           'appointment'::text AS source_type,
           a.id AS source_id,
           a.customer_id,
           u.name AS customer_name,
           a.service_name,
           a.service_price AS amount,
           a.created_at AS completed_at,
           COALESCE(cl.points_balance, 0) AS points_balance
         FROM public.appointments a
         JOIN public.users u
           ON u.id = a.customer_id
         LEFT JOIN public.customer_loyalty cl
           ON cl.shop_id = a.shop_id
          AND cl.customer_id = a.customer_id
         WHERE a.shop_id = $1
           AND a.status = 'completed'
           AND a.service_price IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM public.payments p
             WHERE p.appointment_id = a.id
           )

         UNION ALL

         SELECT
           'queue'::text AS source_type,
           q.id AS source_id,
           q.customer_id,
           COALESCE(
             q.customer_name,
             'Walk-in Customer'
           ) AS customer_name,
           ss.name AS service_name,
           COALESCE(
             q.service_price,
             ss.price
           ) AS amount,
           q.completed_at AS completed_at,
           COALESCE(cl.points_balance, 0) AS points_balance
         FROM public.shop_queue q
         JOIN public.shop_services ss
           ON ss.id = q.service_id
         LEFT JOIN public.customer_loyalty cl
           ON cl.shop_id = q.shop_id
          AND cl.customer_id = q.customer_id
         WHERE q.shop_id = $1
           AND q.status = 'completed'
           AND q.appointment_id IS NULL
           AND COALESCE(q.service_price, ss.price) IS NOT NULL
           AND NOT EXISTS (
             SELECT 1
             FROM public.payments p
             WHERE p.queue_id = q.id
           )
       ) AS eligible
       ORDER BY completed_at DESC NULLS LAST`,
      [shop.id],
    );

    return res.status(200).json({
      success: true,
      services: result.rows,
    });
  } catch (error) {
    console.error("Get eligible services error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch services awaiting payment.",
    });
  }
};

// Owner: list receipts for their shop.
const getPayments = async (req, res) => {
  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `SELECT
         p.id,
         p.receipt_number,
         p.appointment_id,
         p.queue_id,
         p.customer_id,
         p.customer_name,
         p.service_name,
         p.amount,
         p.subtotal,
         p.discount_amount,
         p.points_redeemed,
         p.payment_method,
         p.payment_status,
         p.paid_at,
         p.created_at
       FROM public.payments p
       WHERE p.shop_id = $1
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [shop.id],
    );

    return res.status(200).json({
      success: true,
      receipts: result.rows,
    });
  } catch (error) {
    console.error("Get payments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch receipts.",
    });
  }
};

// Owner: view a specific receipt.
const getPaymentById = async (req, res) => {
  try {
    if (!/^[1-9]\d*$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receipt ID.",
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "No barber shop found for this owner.",
      });
    }

    const result = await pool.query(
      `SELECT
         p.*,
         bs.name AS shop_name,
         bs.phone AS shop_phone,
         bs.email AS shop_email,
         bs.address AS shop_address,
         bs.city AS shop_city
       FROM public.payments p
       JOIN public.barber_shops bs
         ON bs.id = p.shop_id
       WHERE p.id = $1
         AND p.shop_id = $2`,
      [Number(req.params.id), shop.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found.",
      });
    }

    return res.status(200).json({
      success: true,
      receipt: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the receipt.",
    });
  }
};

module.exports = {
  createPayment,
  getEligibleServices,
  getPayments,
  getPaymentById,
};

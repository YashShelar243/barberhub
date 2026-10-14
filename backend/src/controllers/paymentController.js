const pool = require("../config/database");

async function getOwnerShop(ownerId) {
  const result = await pool.query(
    `SELECT id, name, phone, email, address, city
     FROM public.barber_shops
     WHERE owner_id = $1
     LIMIT 1`,
    [ownerId],
  );
  console.log("Payment API owner/shop check:", {
    ownerId,
    foundShop: Boolean(result.rows[0]),
    shopId: result.rows[0]?.id,
  });

  return result.rows[0] || null;

  return result.rows[0] || null;
}

// Owner: record payment for a completed appointment or walk-in.
const createPayment = async (req, res) => {
  const { appointment_id, queue_id, payment_method } = req.body;

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

  let client;

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
         JOIN public.users u ON u.id = a.customer_id
         WHERE a.id = $1
           AND a.shop_id = $2
         FOR UPDATE OF a`,
        [Number(sourceId), shop.id],
      );

      source = result.rows[0];

      if (!source) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Appointment not found in your shop.",
        });
      }

      if (source.status !== "completed") {
        await client.query("ROLLBACK");
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
         JOIN public.shop_services ss ON ss.id = q.service_id
         WHERE q.id = $1
           AND q.shop_id = $2
           AND q.appointment_id IS NULL
         FOR UPDATE OF q`,
        [Number(sourceId), shop.id],
      );

      source = result.rows[0];

      if (!source) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Walk-in entry not found in your shop.",
        });
      }

      if (source.status !== "completed") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Only completed walk-in services can be paid.",
        });
      }
    }

    const receiptNumber = `BH-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;

    const result = await client.query(
      `INSERT INTO public.payments (
         receipt_number,
         shop_id,
         appointment_id,
         queue_id,
         customer_id,
         customer_name,
         service_name,
         amount,
         payment_method,
         payment_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'paid')
       RETURNING *`,
      [
        receiptNumber,
        shop.id,
        appointment_id ? Number(sourceId) : null,
        queue_id ? Number(sourceId) : null,
        source.customer_id,
        source.customer_name,
        source.service_name,
        source.amount,
        payment_method,
      ],
    );

    await client.query("COMMIT");

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
      receipt: result.rows[0],
    });
  } catch (error) {
    if (client) {
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
    if (client) client.release();
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
       JOIN public.barber_shops bs ON bs.id = p.shop_id
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
  getPayments,
  getPaymentById,
};

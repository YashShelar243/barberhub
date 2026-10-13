const pool = require("../config/database");

// Get the authenticated owner's shop.
async function getOwnerShop(ownerId) {
  const result = await pool.query(
    `SELECT id
     FROM public.barber_shops
     WHERE owner_id = $1
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] || null;
}

// Calculate remaining time for the current service and full duration
// for each waiting customer.
function remainingMinutes(entry, now = Date.now()) {
  const duration = Math.max(0, Number(entry.duration_minutes) || 0);

  if (entry.status !== "in_service" || !entry.started_at) {
    return duration;
  }

  const started = new Date(entry.started_at).getTime();

  if (!Number.isFinite(started)) {
    return duration;
  }

  const elapsed = Math.max(0, Math.floor((now - started) / 60000));

  return Math.max(0, duration - elapsed);
}

function estimateWait(queue) {
  const now = Date.now();

  return queue.reduce(
    (total, entry) => total + remainingMinutes(entry, now),
    0,
  );
}

// Owner: view today's active queue.
const getMyQueue = async (req, res) => {
  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Register your barber shop first.",
      });
    }

    const result = await pool.query(
      `SELECT
         q.id,
         q.shop_id,
         q.service_id,
         q.customer_id,
         q.customer_name,
         q.customer_phone,
         q.appointment_id,
         q.queue_date,
         q.service_price,
         q.status,
         q.created_at,
         q.started_at,
         q.completed_at,
         ss.name AS service_name,
         ss.duration_minutes,
         COALESCE(q.service_price, ss.price) AS price,
         a.appointment_time
       FROM public.shop_queue q
       JOIN public.shop_services ss
         ON ss.id = q.service_id
       LEFT JOIN public.appointments a
         ON a.id = q.appointment_id
       WHERE q.shop_id = $1
         AND q.queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND q.status IN ('waiting', 'in_service')
       ORDER BY
         CASE WHEN q.status = 'in_service' THEN 0 ELSE 1 END,
         q.created_at ASC,
         q.id ASC`,
      [shop.id],
    );

    const queue = result.rows;

    const waiting = queue.filter((entry) => entry.status === "waiting");

    const inService = queue.filter((entry) => entry.status === "in_service");

    return res.status(200).json({
      success: true,
      shop_id: shop.id,
      crowd: {
        waiting: waiting.length,
        in_service: inService.length,
        estimated_wait_minutes: estimateWait(queue),
        level:
          waiting.length < 3 ? "low" : waiting.length < 7 ? "moderate" : "busy",
      },
      queue,
    });
  } catch (error) {
    console.error("Get owner queue error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the queue.",
    });
  }
};

// Owner: add a walk-in customer and save the service price.
const addWalkIn = async (req, res) => {
  try {
    const { service_id, customer_name, customer_phone } = req.body;

    if (!Number.isInteger(Number(service_id)) || Number(service_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Select a valid service.",
      });
    }

    if (
      typeof customer_name !== "string" ||
      !customer_name.trim() ||
      customer_name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name is required and must be at most 100 characters.",
      });
    }

    if (
      customer_phone != null &&
      (typeof customer_phone !== "string" || customer_phone.trim().length > 15)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid customer phone number.",
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Register your barber shop first.",
      });
    }

    const serviceResult = await pool.query(
      `SELECT id, price
       FROM public.shop_services
       WHERE id = $1
         AND shop_id = $2
         AND is_available = TRUE`,
      [Number(service_id), shop.id],
    );

    if (serviceResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "The selected service is unavailable for your shop.",
      });
    }

    const service = serviceResult.rows[0];

    const result = await pool.query(
      `INSERT INTO public.shop_queue (
         shop_id,
         service_id,
         customer_name,
         customer_phone,
         queue_date,
         service_price,
         status
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
         $5,
         'waiting'
       )
       RETURNING *`,
      [
        shop.id,
        Number(service_id),
        customer_name.trim(),
        customer_phone?.trim() || null,
        service.price,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Customer added to the queue.",
      queue_entry: result.rows[0],
    });
  } catch (error) {
    console.error("Add walk-in error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add the customer to the queue.",
    });
  }
};

// Owner: start the next waiting customer.
// Only one customer can be in service at a time.
const startService = async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid queue entry ID.",
    });
  }

  let client;

  try {
    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Register your barber shop first.",
      });
    }

    client = await pool.connect();

    await client.query("BEGIN");

    await client.query(
      `SELECT id
       FROM public.barber_shops
       WHERE id = $1
       FOR UPDATE`,
      [shop.id],
    );

    const active = await client.query(
      `SELECT id
       FROM public.shop_queue
       WHERE shop_id = $1
         AND queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND status = 'in_service'
       LIMIT 1`,
      [shop.id],
    );

    if (active.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Complete the current service before starting another.",
      });
    }

    // Enforce FIFO queue order.
    const next = await client.query(
      `SELECT id
       FROM public.shop_queue
       WHERE shop_id = $1
         AND queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND status = 'waiting'
       ORDER BY created_at ASC, id ASC
       LIMIT 1
       FOR UPDATE`,
      [shop.id],
    );

    if (next.rowCount === 0 || Number(next.rows[0].id) !== Number(id)) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Please serve customers in queue order.",
      });
    }

    const result = await client.query(
      `UPDATE public.shop_queue
       SET status = 'in_service',
           started_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND shop_id = $2
         AND queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND status = 'waiting'
       RETURNING *`,
      [Number(id), shop.id],
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Waiting queue entry not found.",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Service started.",
      queue_entry: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Start queue service error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to start the service.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Owner: complete a service.
const completeService = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue entry ID.",
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Register your barber shop first.",
      });
    }

    const result = await pool.query(
      `UPDATE public.shop_queue
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND shop_id = $2
         AND queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND status = 'in_service'
       RETURNING *`,
      [Number(id), shop.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active queue entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service completed.",
      queue_entry: result.rows[0],
    });
  } catch (error) {
    console.error("Complete queue service error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to complete the service.",
    });
  }
};

// Owner: cancel a waiting customer.
const cancelQueueEntry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid queue entry ID.",
      });
    }

    const shop = await getOwnerShop(req.user.id);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Register your barber shop first.",
      });
    }

    const result = await pool.query(
      `UPDATE public.shop_queue
       SET status = 'cancelled'
       WHERE id = $1
         AND shop_id = $2
         AND status = 'waiting'
       RETURNING *`,
      [Number(id), shop.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Waiting queue entry not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Queue entry cancelled.",
      queue_entry: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel queue entry error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel the queue entry.",
    });
  }
};

// Customer: today's live crowd and estimated wait.
// Confirmed online appointments for today are included because
// appointmentController inserts them into shop_queue on confirmation.
const getShopCrowd = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!/^[1-9]\d*$/.test(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID.",
      });
    }

    const result = await pool.query(
      `SELECT
         q.status,
         q.started_at,
         ss.duration_minutes
       FROM public.shop_queue q
       JOIN public.shop_services ss
         ON ss.id = q.service_id
       JOIN public.barber_shops bs
         ON bs.id = q.shop_id
       WHERE q.shop_id = $1
         AND bs.is_active = TRUE
         AND q.queue_date =
             (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         AND q.status IN ('waiting', 'in_service')
       ORDER BY
         CASE WHEN q.status = 'in_service' THEN 0 ELSE 1 END,
         q.created_at ASC,
         q.id ASC`,
      [Number(shopId)],
    );

    const queue = result.rows;

    const waiting = queue.filter((entry) => entry.status === "waiting");

    const inService = queue.filter((entry) => entry.status === "in_service");

    return res.status(200).json({
      success: true,
      shop_id: Number(shopId),
      crowd: {
        waiting: waiting.length,
        in_service: inService.length,
        estimated_wait_minutes: estimateWait(queue),
        level:
          waiting.length < 3 ? "low" : waiting.length < 7 ? "moderate" : "busy",
      },
    });
  } catch (error) {
    console.error("Get shop crowd error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch crowd information.",
    });
  }
};

module.exports = {
  getMyQueue,
  addWalkIn,
  startService,
  completeService,
  cancelQueueEntry,
  getShopCrowd,
};

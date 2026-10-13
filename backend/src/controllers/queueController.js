
const pool = require("../config/database");

// Get the authenticated owner's shop
async function getOwnerShop(ownerId) {
  const result = await pool.query(
    `SELECT id
     FROM barber_shops
     WHERE owner_id = $1
     LIMIT 1`,
    [ownerId],
  );

  return result.rows[0] || null;
}

// Owner: view the queue for their shop
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
         q.status,
         q.created_at,
         q.started_at,
         q.completed_at,
         ss.name AS service_name,
         ss.duration_minutes,
         ss.price
       FROM shop_queue q
       JOIN shop_services ss ON ss.id = q.service_id
       WHERE q.shop_id = $1
         AND q.status IN ('waiting', 'in_service')
       ORDER BY
         CASE WHEN q.status = 'in_service' THEN 0 ELSE 1 END,
         q.created_at ASC,
         q.id ASC`,
      [shop.id],
    );

    const waiting = result.rows.filter(
      (entry) => entry.status === "waiting",
    );

    const inService = result.rows.filter(
      (entry) => entry.status === "in_service",
    );

    const estimatedWaitMinutes = waiting.reduce(
      (total, entry) => total + Number(entry.duration_minutes),
      inService.reduce(
        (total, entry) => total + Number(entry.duration_minutes),
        0,
      ),
    );

    return res.status(200).json({
      success: true,
      shop_id: shop.id,
      crowd: {
        waiting: waiting.length,
        in_service: inService.length,
        estimated_wait_minutes: estimatedWaitMinutes,
        level:
          waiting.length < 3
            ? "low"
            : waiting.length < 7
              ? "moderate"
              : "busy",
      },
      queue: result.rows,
    });
  } catch (error) {
    console.error("Get owner queue error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the queue.",
    });
  }
};

// Owner: add a walk-in customer
const addWalkIn = async (req, res) => {
  try {
    const { service_id, customer_name, customer_phone } = req.body;

    if (
      !Number.isInteger(Number(service_id)) ||
      Number(service_id) <= 0
    ) {
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
        message: "Customer name is required and must be at most 100 characters.",
      });
    }

    if (
      customer_phone != null &&
      (typeof customer_phone !== "string" ||
        customer_phone.trim().length > 15)
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
      `SELECT id
       FROM shop_services
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

    const result = await pool.query(
      `INSERT INTO shop_queue (
         shop_id,
         service_id,
         customer_name,
         customer_phone
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        shop.id,
        Number(service_id),
        customer_name.trim(),
        customer_phone?.trim() || null,
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

// Owner: start serving a waiting customer
const startService = async (req, res) => {
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

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Lock the shop row so simultaneous requests cannot start
      // two services for the same shop.
      await client.query(
        "SELECT id FROM barber_shops WHERE id = $1 FOR UPDATE",
        [shop.id],
      );

      const activeResult = await client.query(
        `SELECT id
         FROM shop_queue
         WHERE shop_id = $1
           AND status = 'in_service'
         LIMIT 1`,
        [shop.id],
      );

      if (activeResult.rowCount > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message: "Complete the current service before starting another.",
        });
      }

      const result = await client.query(
        `UPDATE shop_queue
         SET status = 'in_service',
             started_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND shop_id = $2
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
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Start queue service error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to start the service.",
    });
  }
};

// Owner: complete a service
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
      `UPDATE shop_queue
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND shop_id = $2
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

// Owner: cancel a waiting queue entry
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
      `UPDATE shop_queue
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

// Customer: view crowd information for an active shop
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
         ss.duration_minutes
       FROM shop_queue q
       JOIN shop_services ss ON ss.id = q.service_id
       JOIN barber_shops bs ON bs.id = q.shop_id
       WHERE q.shop_id = $1
         AND bs.is_active = TRUE
         AND q.status IN ('waiting', 'in_service')
       ORDER BY
         CASE WHEN q.status = 'in_service' THEN 0 ELSE 1 END,
         q.created_at ASC,
         q.id ASC`,
      [Number(shopId)],
    );

    const waiting = result.rows.filter(
      (entry) => entry.status === "waiting",
    );

    const inService = result.rows.filter(
      (entry) => entry.status === "in_service",
    );

    const estimatedWaitMinutes = result.rows.reduce(
      (total, entry) => total + Number(entry.duration_minutes),
      0,
    );

    return res.status(200).json({
      success: true,
      shop_id: Number(shopId),
      crowd: {
        waiting: waiting.length,
        in_service: inService.length,
        estimated_wait_minutes: estimatedWaitMinutes,
        level:
          waiting.length < 3
            ? "low"
            : waiting.length < 7
              ? "moderate"
              : "busy",
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

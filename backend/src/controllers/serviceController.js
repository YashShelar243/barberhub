const pool = require("../config/database");

// Get services for a shop
// Public customers see available services; owners can view all their shop's services.
const getShopServices = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!/^[1-9]\d*$/.test(shopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID.",
      });
    }

    const result = await pool.query(
      `SELECT id, shop_id, name, description, price,
              duration_minutes, is_available, created_at, updated_at
       FROM shop_services
       WHERE shop_id = $1
         AND is_available = TRUE
       ORDER BY name ASC`,
      [Number(shopId)],
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      services: result.rows,
    });
  } catch (error) {
    console.error("Get shop services error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch shop services.",
    });
  }
};

// Owner: view all services for their own shop, including unavailable ones
const getMyShopServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ss.id, ss.shop_id, ss.name, ss.description, ss.price,
              ss.duration_minutes, ss.is_available, ss.created_at,
              ss.updated_at
       FROM shop_services ss
       JOIN barber_shops bs ON bs.id = ss.shop_id
       WHERE bs.owner_id = $1
       ORDER BY ss.created_at DESC`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      services: result.rows,
    });
  } catch (error) {
    console.error("Get owner services error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your services.",
    });
  }
};

// Owner: add a service
const createService = async (req, res) => {
  try {
    const { name, description, price, duration_minutes } = req.body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Service name is required and must be at most 150 characters.",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid service price of zero or more.",
      });
    }

    const duration = Number(duration_minutes ?? 30);

    if (!Number.isInteger(duration) || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a positive whole number of minutes.",
      });
    }

    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be text.",
      });
    }

    const shopResult = await pool.query(
      `SELECT id
       FROM barber_shops
       WHERE owner_id = $1
       LIMIT 1`,
      [req.user.id],
    );

    if (shopResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Register your barber shop before adding services.",
      });
    }

    const shopId = shopResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO shop_services
         (shop_id, name, description, price, duration_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        shopId,
        name.trim(),
        description?.trim() || null,
        Number(price),
        duration,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Service added successfully.",
      service: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A service with this name already exists in your shop.",
      });
    }

    console.error("Create service error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to add service.",
    });
  }
};

// Owner: update a service belonging to their shop
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration_minutes, is_available } =
      req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Service name is required and must be at most 150 characters.",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid service price of zero or more.",
      });
    }

    if (
      !Number.isInteger(Number(duration_minutes)) ||
      Number(duration_minutes) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a positive whole number of minutes.",
      });
    }

    if (typeof is_available !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Availability must be true or false.",
      });
    }

    if (description != null && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be text.",
      });
    }

    const result = await pool.query(
      `UPDATE shop_services ss
       SET name = $1,
           description = $2,
           price = $3,
           duration_minutes = $4,
           is_available = $5,
           updated_at = CURRENT_TIMESTAMP
       FROM barber_shops bs
       WHERE ss.id = $6
         AND ss.shop_id = bs.id
         AND bs.owner_id = $7
       RETURNING ss.*`,
      [
        name.trim(),
        description?.trim() || null,
        Number(price),
        Number(duration_minutes),
        is_available,
        Number(id),
        req.user.id,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found in your shop.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully.",
      service: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A service with this name already exists in your shop.",
      });
    }

    console.error("Update service error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update service.",
    });
  }
};

module.exports = {
  getShopServices,
  getMyShopServices,
  createService,
  updateService,
};

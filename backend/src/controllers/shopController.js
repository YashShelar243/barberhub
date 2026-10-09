const pool = require("../config/database");

// Get all active barber shops
const getShops = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          id,
          owner_id,
          name,
          description,
          phone,
          email,
          address,
          city,
          logo_url,
          cover_image_url,
          primary_color,
          is_active,
          created_at
       FROM barber_shops
       WHERE is_active = TRUE
       ORDER BY created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      shops: result.rows,
    });
  } catch (error) {
    console.error("Get shops error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch barber shops.",
    });
  }
};

// Create a barber shop (owner only)
const createShop = async (req, res) => {
  try {
    const {
      name,
      description,
      phone,
      email,
      address,
      city,
      logo_url,
      cover_image_url,
      primary_color,
    } = req.body;

    // Validate required fields
    if (!name?.trim() || !phone?.trim() || !address?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Shop name, phone, and address are required.",
      });
    }

    // Check whether this owner already has a shop
    const existingShop = await pool.query(
      "SELECT id FROM barber_shops WHERE owner_id = $1",
      [req.user.id],
    );

    if (existingShop.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have a registered shop.",
      });
    }

    // Register the shop for the authenticated owner
    const result = await pool.query(
      `INSERT INTO barber_shops (
          owner_id,
          name,
          description,
          phone,
          email,
          address,
          city,
          logo_url,
          cover_image_url,
          primary_color
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING
          id,
          owner_id,
          name,
          description,
          phone,
          email,
          address,
          city,
          logo_url,
          cover_image_url,
          primary_color,
          is_active,
          created_at`,
      [
        req.user.id,
        name.trim(),
        description?.trim() || null,
        phone.trim(),
        email?.trim() || null,
        address.trim(),
        city?.trim() || null,
        logo_url || null,
        cover_image_url || null,
        primary_color || "#2563EB",
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Barber shop registered successfully.",
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Create shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to register barber shop.",
    });
  }
};

module.exports = {
  getShops,
  createShop,
};

const pool = require("../config/database");

// Get all active barber shops

const getShops = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          bs.id,
          bs.owner_id,
          u.name AS owner_name,
          u.email AS owner_email,
          u.phone AS owner_phone,
          bs.name,
          bs.description,
          bs.phone,
          bs.email,
          bs.address,
          bs.city,
          bs.logo_url,
          bs.cover_image_url,
          bs.primary_color,
          bs.is_active,
          bs.created_at
       FROM barber_shops bs
       LEFT JOIN users u ON u.id = bs.owner_id
       WHERE bs.is_active = TRUE
       ORDER BY bs.created_at DESC`,
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

const getMyShop = async (req, res) => {
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
       WHERE owner_id = $1
       LIMIT 1`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "You have not registered a barber shop yet.",
      });
    }

    return res.status(200).json({
      success: true,
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Get owner shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your shop profile.",
    });
  }
};

const updateMyShop = async (req, res) => {
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

    if (
      (name !== undefined && (typeof name !== "string" || !name.trim())) ||
      (phone !== undefined && (typeof phone !== "string" || !phone.trim())) ||
      (address !== undefined &&
        (typeof address !== "string" || !address.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Shop name, phone, and address cannot be empty.",
      });
    }

    const result = await pool.query(
      `UPDATE barber_shops
       SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          city = COALESCE($6, city),
          logo_url = COALESCE($7, logo_url),
          cover_image_url = COALESCE($8, cover_image_url),
          primary_color = COALESCE($9, primary_color)
       WHERE owner_id = $10
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
        name === undefined ? null : name.trim(),
        description === undefined ? null : description,
        phone === undefined ? null : phone.trim(),
        email === undefined ? null : email,
        address === undefined ? null : address.trim(),
        city === undefined ? null : city,
        logo_url === undefined ? null : logo_url,
        cover_image_url === undefined ? null : cover_image_url,
        primary_color === undefined ? null : primary_color,
        req.user.id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "You have not registered a barber shop yet.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop profile updated successfully.",
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Update owner shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update your shop profile.",
    });
  }
};

module.exports = {
  getShops,
  createShop,
  getMyShop,
  updateMyShop,
};

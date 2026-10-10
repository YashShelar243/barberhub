const bcrypt = require("bcryptjs");
const pool = require("../config/database");

// Create a barber shop owner account
const createOwner = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required",
      });
    }

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 1 and 100 characters",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (!/^\d{10,15}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must contain 10 to 15 digits",
      });
    }

    if (password.length < 6 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 6 and 72 characters",
      });
    }

    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1 OR phone = $2`,
      [cleanEmail, cleanPhone],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users
        (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [cleanName, cleanEmail, cleanPhone, passwordHash],
    );

    return res.status(201).json({
      success: true,
      message: "Owner account created successfully",
      owner: result.rows[0],
    });
  } catch (error) {
    console.error("Create owner error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create owner account",
    });
  }
};
const getAllShops = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          bs.id,
          bs.owner_id,
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
          bs.created_at,
          u.name AS owner_name,
          u.email AS owner_email,
          u.phone AS owner_phone
       FROM barber_shops bs
       LEFT JOIN users u ON u.id = bs.owner_id
       ORDER BY bs.created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      shops: result.rows,
    });
  } catch (error) {
    console.error("Get all shops error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch barber shops.",
    });
  }
};

const updateShopStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID.",
      });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false.",
      });
    }

    const result = await pool.query(
      `UPDATE barber_shops
       SET is_active = $1
       WHERE id = $2
       RETURNING id, name, is_active`,
      [is_active, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Barber shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Shop ${is_active ? "activated" : "deactivated"} successfully.`,
      shop: result.rows[0],
    });
  } catch (error) {
    console.error("Update shop status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update shop status.",
    });
  }
};

module.exports = {
  createOwner,
  getAllShops,
  updateShopStatus,
};

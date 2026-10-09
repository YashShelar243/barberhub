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

module.exports = {
  createOwner,
};

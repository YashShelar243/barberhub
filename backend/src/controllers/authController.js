const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// CUSTOMER REGISTRATION
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are required",
      });
    }

    // Validate field types
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

    if (
      cleanEmail.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
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

    // Check existing email
    const existingEmail = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [cleanEmail],
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Check existing phone
    const existingPhone = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [cleanPhone],
    );

    if (existingPhone.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Phone number is already registered",
      });
    }

    // Hash password before storing it
    const passwordHash = await bcrypt.hash(password, 10);

    // Public registration ALWAYS creates a customer.
    // Never accept the role from the request body.
    const result = await pool.query(
      `INSERT INTO users
        (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, name, email, phone, role, is_active, created_at`,
      [cleanName, cleanEmail, cleanPhone, passwordHash],
    );

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    // Handle concurrent duplicate registrations
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, name, email, phone, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [cleanEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Require a configured JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables");

      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // Include the user's database role in the signed token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    // Never send the password hash to the client
    const { password_hash: passwordHash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
    });
  }
};

module.exports = {
  register,
  login,
};

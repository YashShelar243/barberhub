const pool = require("../config/database");

// Customer: create an appointment

const createAppointment = async (req, res) => {
  try {
    const { shop_id, appointment_date, appointment_time, service_id, notes } =
      req.body;

    if (
      !Number.isInteger(Number(shop_id)) ||
      Number(shop_id) <= 0 ||
      !appointment_date ||
      !appointment_time ||
      !Number.isInteger(Number(service_id)) ||
      Number(service_id) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Shop, appointment date, time, and a valid service are required.",
      });
    }

    // Validate date format and calendar date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
      return res.status(400).json({
        success: false,
        message: "Use YYYY-MM-DD for the appointment date.",
      });
    }

    const date = new Date(`${appointment_date}T00:00:00Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== appointment_date
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date.",
      });
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    if (appointment_date < today) {
      return res.status(400).json({
        success: false,
        message: "Appointments cannot be booked for a past date.",
      });
    }

    // Validate time.
    if (!/^\d{2}:\d{2}$/.test(appointment_time)) {
      return res.status(400).json({
        success: false,
        message: "Use HH:MM for the appointment time.",
      });
    }

    const [hours, minutes] = appointment_time.split(":").map(Number);

    if (hours > 23 || minutes > 59) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment time.",
      });
    }

    if (notes != null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be text.",
      });
    }

    // Verify that the shop is active.
    const shopResult = await pool.query(
      `SELECT id
       FROM barber_shops
       WHERE id = $1 AND is_active = TRUE`,
      [Number(shop_id)],
    );

    if (shopResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active barber shop not found.",
      });
    }

    // Verify that the service belongs to this shop and is available.
    const serviceResult = await pool.query(
      `SELECT id, name, price
       FROM shop_services
       WHERE id = $1
         AND shop_id = $2
         AND is_available = TRUE`,
      [Number(service_id), Number(shop_id)],
    );

    if (serviceResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected service is unavailable for this shop.",
      });
    }

    // Verify the customer account.
    const customerResult = await pool.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND role = 'customer'
         AND is_active = TRUE`,
      [req.user.id],
    );

    if (customerResult.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "An active customer account is required to book.",
      });
    }

    // Use the service name and price from the database,
    // never values supplied by the frontend.
    const service = serviceResult.rows[0];

    const result = await pool.query(
      `INSERT INTO appointments (
         shop_id,
         customer_id,
         appointment_date,
         appointment_time,
         service_id,
         service_name,
         service_price,
         notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        Number(shop_id),
        req.user.id,
        appointment_date,
        appointment_time,
        service.id,
        service.name,
        service.price,
        notes?.trim() || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Appointment requested successfully.",
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error("Create appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create appointment.",
    });
  }
};

// Owner: view appointments for their own shop
const getOwnerAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.shop_id,
         a.customer_id,
         a.appointment_date,
         a.appointment_time,
         a.service_name,
         a.service_price,
         a.notes,
         a.status,
         a.created_at,
         u.name AS customer_name,
         u.email AS customer_email,
         u.phone AS customer_phone
       FROM appointments a
       JOIN barber_shops bs ON bs.id = a.shop_id
       JOIN users u ON u.id = a.customer_id
       WHERE bs.owner_id = $1
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error("Get owner appointments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch appointments.",
    });
  }
};

// Owner: confirm or reject a pending appointment
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (!["confirmed", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be confirmed or rejected.",
      });
    }

    const result = await pool.query(
      `UPDATE appointments a
       SET status = $1
       FROM barber_shops bs
       WHERE a.id = $2
         AND a.shop_id = bs.id
         AND bs.owner_id = $3
         AND a.status = 'pending'
       RETURNING
         a.id,
         a.shop_id,
         a.customer_id,
         a.appointment_date,
         a.appointment_time,
         a.service_name,
         a.status`,
      [status, Number(id), req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pending appointment not found for your shop.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully.`,
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error("Update appointment status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update appointment status.",
    });
  }
};

const getCustomerAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.shop_id,
         bs.name AS shop_name,
         bs.address AS shop_address,
         a.appointment_date,
         a.appointment_time,
         a.service_name,
         a.service_price,
         a.notes,
         a.status,
         a.created_at
       FROM appointments a
       JOIN barber_shops bs ON bs.id = a.shop_id
       WHERE a.customer_id = $1
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [req.user.id],
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error("Get customer appointments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your appointments.",
    });
  }
};

module.exports = {
  createAppointment,
  getOwnerAppointments,
  updateAppointmentStatus,
  getCustomerAppointments,
};

const pool = require("../config/database");

// Create a notification without breaking the appointment operation
// if notification insertion fails.
const createNotification = async ({
  userId,
  appointmentId,
  title,
  message,
}) => {
  try {
    await pool.query(
      `INSERT INTO notifications (
         user_id,
         appointment_id,
         title,
         message,
         type
       )
       VALUES ($1, $2, $3, $4, 'appointment')`,
      [userId, appointmentId, title, message],
    );
  } catch (error) {
    console.error("Create notification error:", error.message);
  }
};

// Customer: create an appointment with overlap protection
const createAppointment = async (req, res) => {
  let client;
  let transactionStarted = false;

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

    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Serialize bookings for the same shop.
    const shopResult = await client.query(
      `SELECT id
       FROM barber_shops
       WHERE id = $1 AND is_active = TRUE
       FOR UPDATE`,
      [Number(shop_id)],
    );

    if (shopResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Active barber shop not found.",
      });
    }

    const customerResult = await client.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND role = 'customer'
         AND is_active = TRUE`,
      [req.user.id],
    );

    if (customerResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: "An active customer account is required to book.",
      });
    }

    const serviceResult = await client.query(
      `SELECT id, name, price, duration_minutes
       FROM shop_services
       WHERE id = $1
         AND shop_id = $2
         AND is_available = TRUE`,
      [Number(service_id), Number(shop_id)],
    );

    if (serviceResult.rowCount === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Selected service is unavailable for this shop.",
      });
    }

    const service = serviceResult.rows[0];
    const duration = Number(service.duration_minutes);

    if (!Number.isInteger(duration) || duration <= 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "The selected service has an invalid duration.",
      });
    }

    const startMinutes = hours * 60 + minutes;

    if (startMinutes + duration > 24 * 60) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Appointment duration cannot extend past midnight.",
      });
    }

    // Pending and confirmed appointments reserve the slot.
    // Rejected and cancelled appointments do not.
    const conflictResult = await client.query(
      `SELECT a.id
       FROM appointments a
       JOIN shop_services existing_service
         ON existing_service.id = a.service_id
       WHERE a.shop_id = $1
         AND a.appointment_date = $2
         AND a.status IN ('pending', 'confirmed')
         AND (
           a.appointment_time,
           a.appointment_time
             + (existing_service.duration_minutes * INTERVAL '1 minute')
         ) OVERLAPS (
           $3::time,
           $3::time + ($4::integer * INTERVAL '1 minute')
         )
       LIMIT 1`,
      [Number(shop_id), appointment_date, appointment_time, duration],
    );

    if (conflictResult.rowCount > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message:
          "This time slot overlaps another pending or confirmed appointment. Please choose a different time.",
      });
    }

    const result = await client.query(
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

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Appointment requested successfully.",
      appointment: result.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Create appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create appointment.",
    });
  } finally {
    if (client) {
      client.release();
    }
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

// Owner: confirm, reject, or complete an appointment
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

    const allowedTransitions = {
      pending: ["confirmed", "rejected"],
      confirmed: ["completed"],
    };

    if (
      !Object.values(allowedTransitions).some((statuses) =>
        statuses.includes(status),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status transition.",
      });
    }

    const result = await pool.query(
      `UPDATE appointments a
       SET status = $1
       FROM barber_shops bs
       WHERE a.id = $2
         AND a.shop_id = bs.id
         AND bs.owner_id = $3
         AND (
           (a.status = 'pending' AND $1 IN ('confirmed', 'rejected'))
           OR (a.status = 'confirmed' AND $1 = 'completed')
         )
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
        message:
          "Appointment not found, not owned by your shop, or its status no longer allows this action.",
      });
    }

    const appointment = result.rows[0];

    // Notify the customer about confirmation or rejection.
    if (status === "confirmed" || status === "rejected") {
      const dateText = String(appointment.appointment_date).slice(0, 10);
      const timeText = String(appointment.appointment_time).slice(0, 5);

      await createNotification({
        userId: appointment.customer_id,
        appointmentId: appointment.id,
        title:
          status === "confirmed"
            ? "Appointment confirmed"
            : "Appointment rejected",
        message:
          status === "confirmed"
            ? `Your ${appointment.service_name} appointment on ${dateText} at ${timeText} has been confirmed.`
            : `Your ${appointment.service_name} appointment on ${dateText} at ${timeText} has been rejected. Please book another slot.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully.`,
      appointment,
    });
  } catch (error) {
    console.error("Update appointment status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update appointment status.",
    });
  }
};

// Customer: view their appointments
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

// Customer: cancel their own upcoming appointment
const cancelCustomerAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const result = await pool.query(
      `UPDATE appointments AS a
       SET status = 'cancelled'
       WHERE a.id = $1
         AND a.customer_id = $2
         AND a.status IN ('pending', 'confirmed')
         AND (a.appointment_date + a.appointment_time) >
             (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
       RETURNING
         a.id,
         a.shop_id,
         a.customer_id,
         a.appointment_date,
         a.appointment_time,
         a.service_name,
         a.status`,
      [Number(id), req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message:
          "This appointment cannot be cancelled. It may not belong to you, may already be processed, or may have already started.",
      });
    }

    const appointment = result.rows[0];

    // Notify the shop owner that the customer cancelled.
    const shopResult = await pool.query(
      `SELECT owner_id
       FROM barber_shops
       WHERE id = $1`,
      [appointment.shop_id],
    );

    if (shopResult.rowCount > 0) {
      const dateText = String(appointment.appointment_date).slice(0, 10);
      const timeText = String(appointment.appointment_time).slice(0, 5);

      await createNotification({
        userId: shopResult.rows[0].owner_id,
        appointmentId: appointment.id,
        title: "Appointment cancelled",
        message: `The customer cancelled the ${appointment.service_name} appointment scheduled for ${dateText} at ${timeText}.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Cancel customer appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel appointment. Please try again.",
    });
  }
};

module.exports = {
  createAppointment,
  getOwnerAppointments,
  updateAppointmentStatus,
  getCustomerAppointments,
  cancelCustomerAppointment,
};

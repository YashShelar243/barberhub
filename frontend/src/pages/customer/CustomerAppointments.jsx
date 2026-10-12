import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
  completed: "bg-blue-100 text-blue-800",
};

function formatDate(date) {
  if (!date) return "Date unavailable";

  const [year, month, day] = String(date).slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "Time unavailable";

  const [hours, minutes] = String(time).slice(0, 5).split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function canCancelAppointment(appointment) {
  const status = String(appointment.status || "").toLowerCase();

  if (!["pending", "confirmed"].includes(status)) {
    return false;
  }

  // Compare using the appointment's local date and time.
  const date = String(appointment.appointment_date || "").slice(0, 10);
  const time = String(appointment.appointment_time || "").slice(0, 5);

  if (!date || !time) return false;

  const appointmentDateTime = new Date(`${date}T${time}:00`);

  return (
    !Number.isNaN(appointmentDateTime.getTime()) &&
    appointmentDateTime.getTime() > Date.now()
  );
}

export default function CustomerAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setMessage("");

    try {
      const response = await api.get("/appointments/my");
      setAppointments(response.data.appointments || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load appointments. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function cancelAppointment(appointment) {
    if (!canCancelAppointment(appointment)) {
      setError("This appointment is no longer eligible for cancellation.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel your appointment at ${
        appointment.shop_name || "this barber shop"
      }?`,
    );

    if (!confirmed) return;

    setCancellingId(appointment.id);
    setError("");
    setMessage("");

    try {
      // This endpoint must be implemented in the backend.
      const response = await api.patch(
        `/appointments/${appointment.id}/cancel`,
      );

      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? { ...item, ...response.data.appointment }
            : item,
        ),
      );

      setMessage(
        response.data.message || "Appointment cancelled successfully.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to cancel appointment. Please try again.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Appointments
            </h1>
            <p className="mt-2 text-gray-600">
              Track and manage your barber shop bookings.
            </p>
          </div>

          <button
            onClick={() => loadAppointments(true)}
            disabled={loading || refreshing}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>
            <button
              onClick={() => loadAppointments()}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {message && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-600">
            Loading your appointments...
          </div>
        ) : !error && appointments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-4xl">✂️</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">
              No appointments yet
            </h2>
            <p className="mt-2 text-gray-600">
              Explore barber shops and book your first appointment.
            </p>
            <button
              onClick={() => navigate("/customer/shops")}
              className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Explore Barber Shops
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {appointments.map((appointment) => {
              const status = String(
                appointment.status || "pending",
              ).toLowerCase();

              const isCancelling = cancellingId === appointment.id;
              const cancellationAllowed = canCancelAppointment(appointment);

              return (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {appointment.shop_name || "Barber Shop"}
                      </h2>
                      {appointment.shop_address && (
                        <p className="mt-1 text-sm text-gray-600">
                          {appointment.shop_address}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                        statusStyles[status] || statusStyles.pending
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Service</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {appointment.service_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Service Price</p>
                      <p className="mt-1 font-semibold text-green-700">
                        {appointment.service_price != null
                          ? `₹${Number(appointment.service_price).toFixed(2)}`
                          : "Price unavailable"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Appointment date</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Appointment time</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Booking ID</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        #{appointment.id}
                      </p>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-500">Your notes</p>
                      <p className="mt-1 text-gray-800">{appointment.notes}</p>
                    </div>
                  )}

                  {cancellationAllowed && (
                    <div className="mt-5 flex justify-end border-t border-gray-100 pt-5">
                      <button
                        onClick={() => cancelAppointment(appointment)}
                        disabled={isCancelling}
                        className="rounded-lg border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCancelling ? "Cancelling..." : "Cancel Appointment"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <button
          onClick={() => navigate("/customer/shops")}
          className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Explore Barber Shops
        </button>
      </div>
    </main>
  );
}

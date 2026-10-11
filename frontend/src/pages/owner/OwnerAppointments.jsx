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

export default function OwnerAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setMessage("");

    try {
      const response = await api.get("/appointments/owner");
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
    fetchAppointments();
  }, [fetchAppointments]);

  async function updateStatus(id, status) {
    const action = status === "confirmed" ? "confirm" : "reject";

    if (
      !window.confirm(`Are you sure you want to ${action} this appointment?`)
    ) {
      return;
    }

    setUpdatingId(id);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(`/appointments/${id}/status`, {
        status,
      });

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === id
            ? { ...appointment, ...response.data.appointment }
            : appointment,
        ),
      );

      setMessage(response.data.message || `Appointment ${status}.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update appointment. Please try again.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredAppointments =
    filter === "all"
      ? appointments
      : appointments.filter((appointment) => appointment.status === filter);

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/owner/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Appointments
            </h1>
            <p className="mt-2 text-gray-600">
              Review customer bookings and manage requests for your shop.
            </p>
          </div>

          <button
            onClick={() => fetchAppointments(true)}
            disabled={loading || refreshing}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total appointments</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {appointments.length}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-white p-5">
            <p className="text-sm text-gray-500">Pending requests</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-white p-5">
            <p className="text-sm text-gray-500">Confirmed appointments</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {appointments.filter((a) => a.status === "confirmed").length}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="appointment-filter"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Filter appointments
          </label>

          <select
            id="appointment-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 sm:max-w-xs"
          >
            <option value="all">All appointments</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
            <button
              onClick={() => fetchAppointments()}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p className="py-12 text-center text-gray-600">
            Loading appointments...
          </p>
        ) : !error && filteredAppointments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <div className="text-4xl">✂️</div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              No appointments found
            </h2>
            <p className="mt-2 text-gray-600">
              {filter === "all"
                ? "Customer bookings will appear here."
                : `There are no ${filter} appointments.`}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {filteredAppointments.map((appointment) => {
              const status = appointment.status || "pending";
              const isUpdating = updatingId === appointment.id;

              return (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {appointment.customer_name || "Customer"}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Booking ID: #{appointment.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                        statusStyles[status] || statusStyles.pending
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatTime(appointment.appointment_time)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Customer phone</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {appointment.customer_phone || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Customer email</p>
                      <p className="mt-1 break-words font-semibold text-gray-900">
                        {appointment.customer_email || "Not provided"}
                      </p>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-gray-500">Customer notes</p>
                      <p className="mt-1 text-gray-800">{appointment.notes}</p>
                    </div>
                  )}

                  {status === "pending" && (
                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                      <button
                        onClick={() => updateStatus(appointment.id, "rejected")}
                        disabled={isUpdating}
                        className="rounded-lg border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {isUpdating ? "Updating..." : "Reject"}
                      </button>

                      <button
                        onClick={() =>
                          updateStatus(appointment.id, "confirmed")
                        }
                        disabled={isUpdating}
                        className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {isUpdating ? "Updating..." : "Confirm Appointment"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const statusStyles = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  confirmed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled:
    "border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
  completed:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
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

  if (!["pending", "confirmed"].includes(status)) return false;

  const date = String(appointment.appointment_date || "").slice(0, 10);
  const time = String(appointment.appointment_time || "").slice(0, 5);

  if (!date || !time) return false;

  const appointmentDateTime = new Date(`${date}T${time}:00`);

  return (
    !Number.isNaN(appointmentDateTime.getTime()) &&
    appointmentDateTime.getTime() > Date.now()
  );
}

function Detail({ icon, label, value, accent = false }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-gray-800"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
          {label}
        </p>
        <p
          className={`mt-1 break-words text-sm font-semibold ${
            accent
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {value || "Not available"}
        </p>
      </div>
    </div>
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

  const upcomingCount = appointments.filter((appointment) =>
    canCancelAppointment(appointment),
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      String(appointment.status || "").toLowerCase() === "completed",
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950 sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:gap-3 dark:text-blue-400"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </button>

        {/* Page heading */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10"
          />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                YOUR BOOKINGS
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                My Appointments
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
                Keep track of your grooming visits, booking details, and
                appointment status in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAppointments(true)}
              disabled={loading || refreshing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true">↻</span>
              {refreshing ? "Refreshing..." : "Refresh bookings"}
            </button>
          </div>
        </header>

        {/* Overview cards */}
        <section
          aria-label="Appointment overview"
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                Total bookings
              </p>
              <span className="text-xl" aria-hidden="true">
                📋
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
              {appointments.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              All your recorded appointments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                Upcoming
              </p>
              <span className="text-xl" aria-hidden="true">
                🗓️
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-blue-700 dark:text-blue-400">
              {upcomingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              Future pending or confirmed bookings
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">
                Completed
              </p>
              <span className="text-xl" aria-hidden="true">
                ✓
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {completedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              Visits marked as completed
            </p>
          </div>
        </section>

        {/* Error and success feedback */}
        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => loadAppointments()}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {message}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-slate-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 font-medium text-slate-600 dark:text-gray-300">
              Loading your appointments...
            </p>
          </div>
        ) : !error && appointments.length === 0 ? (
          /* Empty state */
          <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl dark:bg-blue-950"
              aria-hidden="true"
            >
              ✂️
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Your next fresh look starts here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-gray-400">
              You haven't made any appointments yet. Explore barber shops and
              find the right service for your next visit.
            </p>
            <button
              type="button"
              onClick={() => navigate("/customer/shops")}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              Explore Barber Shops →
            </button>
          </section>
        ) : (
          /* Appointment list */
          <section className="mt-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Your bookings
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                  Review each appointment and its current status.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {appointments.length}{" "}
                {appointments.length === 1 ? "booking" : "bookings"}
              </span>
            </div>

            <div className="grid gap-5">
              {appointments.map((appointment) => {
                const status = String(
                  appointment.status || "pending",
                ).toLowerCase();

                const isCancelling = cancellingId === appointment.id;
                const cancellationAllowed = canCancelAppointment(appointment);

                return (
                  <article
                    key={appointment.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                  >
                    {/* Shop and status */}
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 dark:border-gray-800 sm:flex-row sm:items-start sm:p-6">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-950"
                          aria-hidden="true"
                        >
                          ✂️
                        </div>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                            {appointment.shop_name || "Barber Shop"}
                          </h3>
                          {appointment.shop_address && (
                            <p className="mt-1 flex items-start gap-2 text-sm leading-5 text-slate-500 dark:text-gray-400">
                              <span aria-hidden="true">📍</span>
                              {appointment.shop_address}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-medium text-slate-400 dark:text-gray-500">
                            Booking ID #{appointment.id}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${statusStyles[status] || statusStyles.pending}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {status}
                      </span>
                    </div>

                    {/* Appointment details */}
                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                      <Detail
                        icon="💈"
                        label="Service"
                        value={appointment.service_name}
                      />
                      <Detail
                        icon="💰"
                        label="Service price"
                        value={
                          appointment.service_price != null
                            ? `₹${Number(appointment.service_price).toFixed(2)}`
                            : "Price unavailable"
                        }
                        accent
                      />
                      <Detail
                        icon="📅"
                        label="Appointment date"
                        value={formatDate(appointment.appointment_date)}
                      />
                      <Detail
                        icon="🕒"
                        label="Appointment time"
                        value={formatTime(appointment.appointment_time)}
                      />
                    </div>

                    {/* Optional notes */}
                    {appointment.notes && (
                      <div className="mx-5 mb-5 rounded-xl bg-slate-50 p-4 dark:bg-gray-800 sm:mx-6">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                          Your notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-gray-200">
                          {appointment.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {cancellationAllowed && (
                      <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-gray-800 sm:px-6">
                        <button
                          type="button"
                          onClick={() => cancelAppointment(appointment)}
                          disabled={isCancelling}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950 dark:focus:ring-red-950"
                        >
                          {isCancelling ? (
                            <>
                              <span
                                aria-hidden="true"
                                className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-700"
                              />
                              Cancelling...
                            </>
                          ) : (
                            "Cancel Appointment"
                          )}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom action */}
        {!loading && appointments.length > 0 && (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Need another appointment?
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Explore shops and plan your next visit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/customer/shops")}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 sm:w-auto"
            >
              Explore Barber Shops →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

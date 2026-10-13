
import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const initialForm = {
  customer_name: "",
  customer_phone: "",
  service_id: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

const buttonClass =
  "rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

function formatDuration(minutes) {
  const value = Number(minutes) || 0;

  if (value < 60) return `${value} min`;

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerQueue() {
  const [queue, setQueue] = useState([]);
  const [services, setServices] = useState([]);
  const [crowd, setCrowd] = useState({
    waiting: 0,
    in_service: 0,
    estimated_wait_minutes: 0,
    level: "low",
  });

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const [queueResponse, servicesResponse] = await Promise.all([
        api.get("/queue/my-shop"),
        api.get("/services/my-shop"),
      ]);

      setQueue(queueResponse.data.queue || []);
      setCrowd(
        queueResponse.data.crowd || {
          waiting: 0,
          in_service: 0,
          estimated_wait_minutes: 0,
          level: "low",
        },
      );

      setServices(servicesResponse.data.services || []);

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load queue information. Please try again.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAddWalkIn = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.post("/queue", {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        service_id: Number(form.service_id),
      });

      setForm(initialForm);
      setMessage("Walk-in customer added to the queue.");

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add the customer to the queue.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQueueAction = async (entry, action) => {
    setActionId(entry.id);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/queue/${entry.id}/${action}`,
      );

      setMessage(response.data.message || "Queue updated successfully.");

      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update this queue entry.",
      );
    } finally {
      setActionId(null);
    }
  };

  const activeServices = services.filter(
    (service) => service.is_available,
  );

  const crowdLabel = {
    low: "Low crowd",
    moderate: "Moderate crowd",
    busy: "Busy",
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-300">
          Loading queue management...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              BarberHub
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Queue Management
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Manage walk-in customers and track service progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            className={`${buttonClass} border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200`}
          >
            Refresh queue
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          >
            {message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Waiting"
            value={crowd.waiting}
            description="Customers in line"
          />
          <StatCard
            label="In service"
            value={crowd.in_service}
            description="Currently being served"
          />
          <StatCard
            label="Estimated wait"
            value={formatDuration(crowd.estimated_wait_minutes)}
            description="Approximate queue duration"
          />
          <StatCard
            label="Crowd level"
            value={crowdLabel[crowd.level] || "Unknown"}
            description="Based on waiting customers"
          />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Add walk-in customer
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Add a customer who visits without a prior appointment.
          </p>

          {activeServices.length === 0 ? (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Add an available service in Service Management before adding a customer.
            </p>
          ) : (
            <form
              onSubmit={handleAddWalkIn}
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="queue-customer-name"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Customer name *
                </label>
                <input
                  id="queue-customer-name"
                  className={inputClass}
                  value={form.customer_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customer_name: event.target.value,
                    })
                  }
                  placeholder="Enter customer name"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="queue-customer-phone"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Phone number
                </label>
                <input
                  id="queue-customer-phone"
                  type="tel"
                  className={inputClass}
                  value={form.customer_phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customer_phone: event.target.value,
                    })
                  }
                  placeholder="Optional phone number"
                  maxLength={15}
                />
              </div>

              <div>
                <label
                  htmlFor="queue-service"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Select service *
                </label>
                <select
                  id="queue-service"
                  className={inputClass}
                  value={form.service_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      service_id: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Choose a service</option>
                  {activeServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — ₹{service.price} (
                      {service.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`${buttonClass} w-full bg-blue-600 text-white hover:bg-blue-700`}
                >
                  {saving ? "Adding..." : "Add to queue"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-5 dark:border-gray-800 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Active queue
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Queue data refreshes automatically every 10 seconds.
            </p>
          </div>

          {queue.length === 0 ? (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                No customers in the queue
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Add a walk-in customer to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {queue.map((entry, index) => (
                <article
                  key={entry.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {entry.status === "in_service"
                        ? "▶"
                        : index + 1}
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-gray-900 dark:text-white">
                        {entry.customer_name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {entry.service_name} · ₹{entry.price}
                      </p>

                      {entry.customer_phone && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {entry.customer_phone}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Added at {formatDate(entry.created_at)} ·{" "}
                        {formatDuration(entry.duration_minutes)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        entry.status === "in_service"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      }`}
                    >
                      {entry.status === "in_service"
                        ? "In service"
                        : "Waiting"}
                    </span>

                    {entry.status === "waiting" && (
                      <>
                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() =>
                            handleQueueAction(entry, "start")
                          }
                          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
                        >
                          {actionId === entry.id
                            ? "Please wait..."
                            : "Start service"}
                        </button>

                        <button
                          type="button"
                          disabled={actionId !== null}
                          onClick={() =>
                            handleQueueAction(entry, "cancel")
                          }
                          className={`${buttonClass} border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950`}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {entry.status === "in_service" && (
                      <button
                        type="button"
                        disabled={actionId !== null}
                        onClick={() =>
                          handleQueueAction(entry, "complete")
                        }
                        className={`${buttonClass} bg-green-600 text-white hover:bg-green-700`}
                      >
                        {actionId === entry.id
                          ? "Please wait..."
                          : "Complete service"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

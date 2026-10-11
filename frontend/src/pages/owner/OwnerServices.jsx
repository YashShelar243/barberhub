import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "30",
  is_available: true,
};

export default function OwnerServices() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/services/my-shop");
      setServices(response.data.services || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load services. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
  }

  function startEditing(service) {
    setEditingId(service.id);
    setForm({
      name: service.name || "",
      description: service.description || "",
      price: String(service.price ?? ""),
      duration_minutes: String(service.duration_minutes ?? 30),
      is_available: Boolean(service.is_available),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
        is_available: form.is_available,
      };

      if (editingId !== null) {
        await api.patch(`/services/${editingId}`, payload);
        setMessage("Service updated successfully.");
      } else {
        await api.post("/services", payload);
        setMessage("Service added successfully.");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await fetchServices();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save service. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(service) {
    setError("");
    setMessage("");

    try {
      await api.patch(`/services/${service.id}`, {
        name: service.name,
        description: service.description || "",
        price: Number(service.price),
        duration_minutes: Number(service.duration_minutes),
        is_available: !service.is_available,
      });

      setMessage(
        `Service marked ${service.is_available ? "unavailable" : "available"}.`,
      );
      await fetchServices();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to change service availability.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate("/owner/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Services & Pricing
          </h1>
          <p className="mt-2 text-gray-600">
            Manage the services customers can book at your shop.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingId !== null ? "Edit Service" : "Add a Service"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="service-name"
                className="block text-sm font-medium text-gray-700"
              >
                Service Name *
              </label>
              <input
                id="service-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={150}
                required
                placeholder="e.g. Haircut"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="service-description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="service-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe what's included in this service"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="service-price"
                  className="block text-sm font-medium text-gray-700"
                >
                  Price (₹) *
                </label>
                <input
                  id="service-price"
                  name="price"
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 150"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="service-duration"
                  className="block text-sm font-medium text-gray-700"
                >
                  Duration (minutes) *
                </label>
                <input
                  id="service-duration"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration_minutes}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {editingId !== null && (
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      is_available: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded"
                />
                Available for customer bookings
              </label>
            )}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Add Service"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">Your Services</h2>
            <button
              type="button"
              onClick={fetchServices}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-600">
              Loading services...
            </p>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <div className="text-4xl">✂️</div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No services added yet
              </h3>
              <p className="mt-2 text-gray-600">
                Add your first service using the form above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-gray-900">
                      {service.name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        service.is_available
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {service.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <p className="mt-2 min-h-10 text-sm text-gray-600">
                    {service.description || "No description provided."}
                  </p>

                  <p className="mt-4 text-2xl font-bold text-gray-900">
                    ₹{Number(service.price).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {service.duration_minutes} minutes
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(service)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(service)}
                      className="flex-1 rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {service.is_available ? "Disable" : "Enable"}
                    </button>
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

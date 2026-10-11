import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const EMPTY_FORM = {
  name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  logo_url: "",
  cover_image_url: "",
  primary_color: "#2563EB",
};

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const populateForm = (shopData) => {
    setForm({
      name: shopData.name || "",
      description: shopData.description || "",
      phone: shopData.phone || "",
      email: shopData.email || "",
      address: shopData.address || "",
      city: shopData.city || "",
      logo_url: shopData.logo_url || "",
      cover_image_url: shopData.cover_image_url || "",
      primary_color: shopData.primary_color || "#2563EB",
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchMyShop = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/shops/my-shop");

        if (cancelled) return;

        const myShop = response.data.shop;

        setShop(myShop);
        populateForm(myShop);
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 404) {
          // No shop registered yet. Show the registration form.
          setShop(null);
          setForm(EMPTY_FORM);
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load shop details. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMyShop();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let response;

      if (shop) {
        response = await api.patch("/shops/my-shop", form);
      } else {
        response = await api.post("/shops", form);
      }

      const savedShop = response.data.shop;

      setShop(savedShop);
      populateForm(savedShop);

      setMessage(
        shop
          ? "Shop profile updated successfully."
          : "Your barber shop has been registered successfully.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save your shop profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              BarberHub
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Owner Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              Welcome, {user?.name || "Shop Owner"}
            </p>
          </div>
          <button
            onClick={() => navigate("/owner/services")}
            className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Manage Services
          </button>

          <button
            onClick={() => navigate("/owner/appointments")}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Manage Appointments
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Logout
          </button>
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

        {shop && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {shop.cover_image_url ? (
              <img
                src={shop.cover_image_url}
                alt={`${shop.name} cover`}
                className="h-48 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="h-32"
                style={{
                  backgroundColor: shop.primary_color || "#2563EB",
                }}
              />
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-4">
                {shop.logo_url && (
                  <img
                    src={shop.logo_url}
                    alt={`${shop.name} logo`}
                    className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      {shop.name}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        shop.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {shop.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {shop.city || "City not provided"}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-gray-600">
                {shop.description || "No description added yet."}
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="mt-1 break-words font-medium text-gray-900">
                    {shop.phone}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="mt-1 break-words font-medium text-gray-900">
                    {shop.email || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="mt-1 font-medium text-gray-900">
                    {shop.address}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="mt-1 font-medium text-gray-900">
                    {shop.city || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {shop ? "Edit Shop Profile" : "Register Your Barber Shop"}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {shop
                ? "Keep your business information up to date for customers."
                : "Enter your shop details to get started with BarberHub."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="shop-name" className={labelClass}>
                Shop Name *
              </label>
              <input
                id="shop-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={150}
                className={inputClass}
                placeholder="Enter your shop name"
              />
            </div>

            <div>
              <label htmlFor="shop-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="shop-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={2000}
                className={inputClass}
                placeholder="Tell customers about your shop and services"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="shop-phone" className={labelClass}>
                  Shop Phone *
                </label>
                <input
                  id="shop-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  maxLength={15}
                  className={inputClass}
                  placeholder="Shop phone number"
                />
              </div>

              <div>
                <label htmlFor="shop-email" className={labelClass}>
                  Shop Email
                </label>
                <input
                  id="shop-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="shop@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="shop-address" className={labelClass}>
                Address *
              </label>
              <input
                id="shop-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                maxLength={500}
                className={inputClass}
                placeholder="Full shop address"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="shop-city" className={labelClass}>
                  City
                </label>
                <input
                  id="shop-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  maxLength={100}
                  className={inputClass}
                  placeholder="e.g. Pune"
                />
              </div>

              <div>
                <label htmlFor="shop-color" className={labelClass}>
                  Shop Theme Color
                </label>
                <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-300 p-2">
                  <input
                    id="shop-color"
                    name="primary_color"
                    type="color"
                    value={form.primary_color}
                    onChange={handleChange}
                    className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="text-sm font-medium uppercase text-gray-700">
                    {form.primary_color}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="shop-logo" className={labelClass}>
                Logo Image URL
              </label>
              <input
                id="shop-logo"
                name="logo_url"
                type="url"
                value={form.logo_url}
                onChange={handleChange}
                className={inputClass}
                placeholder="https://example.com/logo.png"
              />

              {form.logo_url && (
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="mt-3 h-20 w-20 rounded-lg border border-gray-200 object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            <div>
              <label htmlFor="shop-cover" className={labelClass}>
                Cover Image URL
              </label>
              <input
                id="shop-cover"
                name="cover_image_url"
                type="url"
                value={form.cover_image_url}
                onChange={handleChange}
                className={inputClass}
                placeholder="https://example.com/cover.jpg"
              />

              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  className="mt-3 h-32 w-full rounded-lg border border-gray-200 object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : shop
                    ? "Save Shop Changes"
                    : "Register Shop"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");

                  if (shop) {
                    populateForm(shop);
                  } else {
                    setForm(EMPTY_FORM);
                  }
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Reset Form
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

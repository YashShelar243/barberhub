import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    primary_color: "#2563EB",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchMyShop = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/shops");
        const shops = response.data.shops || [];

        const myShop = shops.find(
          (item) => Number(item.owner_id) === Number(user?.id),
        );

        if (!cancelled && myShop) {
          setShop(myShop);
          setForm({
            name: myShop.name || "",
            description: myShop.description || "",
            phone: myShop.phone || "",
            email: myShop.email || "",
            address: myShop.address || "",
            city: myShop.city || "",
            primary_color: myShop.primary_color || "#2563EB",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load shop details. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
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
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/shops", form);
      setShop(response.data.shop);
      setMessage("Your barber shop has been registered successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to register your shop. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
        <div className="mx-auto max-w-4xl py-12 text-center text-gray-600">
          Loading your dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Owner Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              Welcome, {user?.name || "Shop Owner"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
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

        {shop ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Barber Shop
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-sm ${
                  shop.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {shop.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div
              className="mb-5 h-2 rounded-full"
              style={{
                backgroundColor: shop.primary_color || "#2563EB",
              }}
            />

            <h3 className="text-2xl font-bold text-gray-900">{shop.name}</h3>

            <p className="mt-2 text-gray-600">
              {shop.description || "No description added."}
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="break-words font-medium text-gray-900">
                  {shop.phone}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="break-words font-medium text-gray-900">
                  {shop.email || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{shop.address}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="font-medium text-gray-900">
                  {shop.city || "Not provided"}
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              Your shop is registered. Shop editing and appointment management
              can be added next.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-gray-900">
              Register Your Barber Shop
            </h2>

            <p className="mb-6 mt-2 text-gray-600">
              Enter your shop details to get started with BarberHub.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="shop-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Shop Name *
                </label>
                <input
                  id="shop-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter your shop name"
                />
              </div>

              <div>
                <label
                  htmlFor="shop-description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>
                <textarea
                  id="shop-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Tell customers about your shop"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="shop-phone"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Shop phone number"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shop-email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Shop Email
                  </label>
                  <input
                    id="shop-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="shop@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="shop-address"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Address *
                </label>
                <input
                  id="shop-address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Full shop address"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="shop-city"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    City
                  </label>
                  <input
                    id="shop-city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Pune"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shop-color"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Shop Theme Color
                  </label>
                  <input
                    id="shop-color"
                    name="primary_color"
                    type="color"
                    value={form.primary_color}
                    onChange={handleChange}
                    className="h-11 w-full rounded-lg border border-gray-300 p-1"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Registering..." : "Register Shop"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

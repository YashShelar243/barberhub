import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import api from "./services/api";

// CUSTOMER DASHBOARD
function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-blue-600">BarberHub</h1>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">
              {user?.name || "Customer"}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-blue-100">
            CUSTOMER DASHBOARD
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Welcome, {user?.name || "Customer"}!
          </h2>

          <p className="mt-3 max-w-xl text-sm text-blue-100 sm:text-base">
            Find your preferred barber shop and book your next grooming
            appointment with ease.
          </p>

          <button
            onClick={() => navigate("/customer/shops")}
            className="mt-6 rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Explore Barber Shops
          </button>
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-bold text-gray-900">Your Overview</h3>

          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">✂️</div>
              <h4 className="mt-4 font-semibold text-gray-900">
                Find Barber Shops
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                Discover shops and choose the one that suits you.
              </p>
              <button
                onClick={() => navigate("/customer/shops")}
                className="mt-4 font-semibold text-blue-600 hover:text-blue-700"
              >
                Browse shops →
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">📅</div>
              <h4 className="mt-4 font-semibold text-gray-900">
                My Appointments
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                View your bookings and appointment status.
              </p>
              <button
                onClick={() => navigate("/customer/appointments")}
                className="mt-4 font-semibold text-blue-600 hover:text-blue-700"
              >
                View appointments →
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">👤</div>
              <h4 className="mt-4 font-semibold text-gray-900">My Profile</h4>
              <p className="mt-2 text-sm text-gray-500">
                View your account information.
              </p>
              <div className="mt-4 break-all text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900">
            Upcoming Appointments
          </h3>

          <p className="mt-3 text-sm text-gray-500">
            Your bookings will appear here once you book an appointment.
          </p>

          <button
            onClick={() => navigate("/customer/shops")}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Book an Appointment
          </button>
        </section>
      </main>
    </div>
  );
}

// CUSTOMER SHOPS
function CustomerShops() {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShops = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/shops");
      setShops(response.data.shops || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load barber shops. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Explore Barber Shops
          </h1>
          <p className="mt-2 text-gray-600">
            Find a shop for your next grooming appointment.
          </p>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-600">
            Loading barber shops...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
          >
            <p>{error}</p>
            <button
              onClick={fetchShops}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && shops.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <div className="text-5xl">✂️</div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              No barber shops available yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500">
              New shops will appear here once they are registered on BarberHub.
            </p>
          </div>
        )}

        {!loading && !error && shops.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {shop.cover_image_url ? (
                  <img
                    src={shop.cover_image_url}
                    alt={shop.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-44 items-center justify-center text-5xl"
                    style={{
                      backgroundColor: `${shop.primary_color || "#2563EB"}15`,
                    }}
                  >
                    ✂️
                  </div>
                )}

                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-900">
                    {shop.name}
                  </h2>

                  {shop.city && (
                    <p className="mt-1 text-sm text-gray-500">{shop.city}</p>
                  )}

                  <p className="mt-3 text-sm text-gray-600">
                    {shop.description || "Welcome to our barber shop."}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">{shop.address}</p>

                  <button
                    onClick={() =>
                      alert(
                        "Appointment booking will be implemented in the next step.",
                      )
                    }
                    className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Book Appointment
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// CUSTOMER APPOINTMENTS
function CustomerAppointments() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>

        <p className="mt-3 text-gray-600">
          Your appointments will appear here after booking is implemented.
        </p>
      </div>
    </main>
  );
}

// OWNER DASHBOARD
function OwnerDashboard() {
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
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Shop Name *
                </label>

                <input
                  id="name"
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
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
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
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Shop Phone *
                  </label>

                  <input
                    id="phone"
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
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Shop Email
                  </label>

                  <input
                    id="email"
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
                  htmlFor="address"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Address *
                </label>

                <input
                  id="address"
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
                    htmlFor="city"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Pune"
                  />
                </div>

                <div>
                  <label
                    htmlFor="primary_color"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Shop Theme Color
                  </label>

                  <input
                    id="primary_color"
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
                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

// ADMIN DASHBOARD
function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-white"
          >
            Logout
          </button>
        </div>

        <p className="mt-4 text-gray-600">
          Manage barber shops and owner accounts.
        </p>
      </div>
    </main>
  );
}

// APPLICATION ROUTES
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/customer/shops" element={<CustomerShops />} />
        <Route
          path="/customer/appointments"
          element={<CustomerAppointments />}
        />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

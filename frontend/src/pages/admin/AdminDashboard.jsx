import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdOwner, setCreatedOwner] = useState(null);

  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShop, setSelectedShop] = useState(null);
  const [updatingShopId, setUpdatingShopId] = useState(null);

  const fetchShops = async () => {
    setShopsLoading(true);
    setShopsError("");

    try {
      const response = await api.get("/admin/shops");
      setShops(response.data.shops || []);
    } catch (err) {
      setShopsError(
        err.response?.data?.message ||
          "Unable to load barber shops. Please try again.",
      );
    } finally {
      setShopsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setOwnerForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateOwner = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");
    setCreatedOwner(null);

    try {
      const response = await api.post("/admin/owners", ownerForm);

      setMessage(
        response.data.message || "Owner account created successfully.",
      );
      setCreatedOwner(response.data.owner || null);

      setOwnerForm({
        name: "",
        email: "",
        phone: "",
        password: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create the owner account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = [
      shop.name,
      shop.owner_name,
      shop.owner_email,
      shop.city,
      shop.address,
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalizedSearch),
    );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && shop.is_active === true) ||
      (statusFilter === "inactive" && shop.is_active === false);

    return matchesSearch && matchesStatus;
  });

  const handleToggleShopStatus = async (shop) => {
    const nextStatus = !shop.is_active;

    setUpdatingShopId(shop.id);
    setShopsError("");

    try {
      const response = await api.patch(`/admin/shops/${shop.id}/status`, {
        is_active: nextStatus,
      });

      const updatedShop = response.data.shop;

      setShops((prevShops) =>
        prevShops.map((item) =>
          item.id === updatedShop.id
            ? { ...item, is_active: updatedShop.is_active }
            : item,
        ),
      );

      setSelectedShop((prevShop) =>
        prevShop && prevShop.id === updatedShop.id
          ? { ...prevShop, is_active: updatedShop.is_active }
          : prevShop,
      );
    } catch (error) {
      setShopsError(
        error.response?.data?.message || "Unable to update shop status.",
      );
    } finally {
      setUpdatingShopId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              BarberHub Admin
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome, {user?.name || "Administrator"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold tracking-wider text-blue-100">
            ADMINISTRATION
          </p>
          <h2 className="mt-2 text-3xl font-bold">Manage BarberHub</h2>
          <p className="mt-3 max-w-2xl text-blue-100">
            Create owner accounts and review registered barber shops.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {message}
            {createdOwner && (
              <p className="mt-2 text-sm">
                Owner: {createdOwner.name} ({createdOwner.email})
              </p>
            )}
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-xl font-bold text-gray-900">
            Create Owner Account
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Owners are created by the administrator.
          </p>

          <form onSubmit={handleCreateOwner} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="owner-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="owner-name"
                name="name"
                value={ownerForm.name}
                onChange={handleChange}
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Owner's full name"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="owner-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="owner-email"
                  name="email"
                  type="email"
                  value={ownerForm.email}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  autoComplete="email"
                  placeholder="owner@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="owner-phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Phone Number
                </label>
                <input
                  id="owner-phone"
                  name="phone"
                  type="tel"
                  value={ownerForm.phone}
                  onChange={handleChange}
                  required
                  maxLength={15}
                  autoComplete="tel"
                  placeholder="Owner's phone number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="owner-password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Temporary Password
              </label>
              <input
                id="owner-password"
                name="password"
                type="password"
                value={ownerForm.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Creating Account..." : "Create Owner Account"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Registered Barber Shops
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filteredShops.length} shop
                {filteredShops.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <button
              type="button"
              onClick={fetchShops}
              disabled={shopsLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {shopsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-5">
            <label
              htmlFor="shop-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search shops
            </label>
            <input
              id="shop-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by shop, owner, email, or city..."
              className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="shop-status-filter"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Filter by status
            </label>

            <select
              id="shop-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64"
            >
              <option value="all">All shops</option>
              <option value="active">Active shops</option>
              <option value="inactive">Inactive shops</option>
            </select>
          </div>

          {shopsError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{shopsError}</p>
              <button
                type="button"
                onClick={fetchShops}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {shopsLoading && (
            <p className="py-10 text-center text-gray-500">
              Loading barber shops...
            </p>
          )}

          {!shopsLoading && !shopsError && filteredShops.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <div className="text-4xl">✂️</div>
              <h4 className="mt-3 font-semibold text-gray-900">
                {shops.length === 0
                  ? "No shops registered yet"
                  : "No shops match your search"}
              </h4>
              <p className="mt-2 text-sm text-gray-500">
                {shops.length === 0
                  ? "Registered shops will appear here."
                  : "Try another shop name, owner, email, or city."}
              </p>
            </div>
          )}

          {!shopsLoading && !shopsError && filteredShops.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm text-gray-600">
                    <th className="px-4 py-3 font-semibold">Shop</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map((shop) => (
                    <tr
                      key={shop.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {shop.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Shop ID: {shop.id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {shop.owner_name || "Owner details unavailable"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {shop.owner_email || "No owner email"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        <p>{shop.phone || "No shop phone"}</p>
                        <p className="mt-1 text-gray-500">
                          {shop.owner_phone || ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {shop.city || shop.address || "Not provided"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            shop.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {shop.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedShop(shop)}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleShopStatus(shop)}
                          disabled={updatingShopId === shop.id}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            shop.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {updatingShopId === shop.id
                            ? "Updating..."
                            : shop.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedShop && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedShop(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-details-title"
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="shop-details-title"
                    className="text-xl font-bold text-gray-900"
                  >
                    {selectedShop.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Shop ID: {selectedShop.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  aria-label="Close shop details"
                  className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  ["Shop Name", selectedShop.name],
                  ["Description", selectedShop.description],
                  ["Shop Phone", selectedShop.phone],
                  ["Shop Email", selectedShop.email],
                  ["Address", selectedShop.address],
                  ["City", selectedShop.city],
                  ["Owner Name", selectedShop.owner_name],
                  ["Owner Email", selectedShop.owner_email],
                  ["Owner Phone", selectedShop.owner_phone],
                  ["Primary Color", selectedShop.primary_color],
                  ["Logo URL", selectedShop.logo_url],
                  ["Cover Image URL", selectedShop.cover_image_url],
                  ["Status", selectedShop.is_active ? "Active" : "Inactive"],
                  [
                    "Created At",
                    selectedShop.created_at
                      ? new Date(selectedShop.created_at).toLocaleString()
                      : null,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-900">
                      {value || "Not provided"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

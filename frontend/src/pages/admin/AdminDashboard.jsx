import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function AdminDashboard() {
  const { user } = useAuth();

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

      setShops((previous) =>
        previous.map((item) =>
          item.id === updatedShop.id
            ? { ...item, is_active: updatedShop.is_active }
            : item,
        ),
      );

      setSelectedShop((previous) =>
        previous && previous.id === updatedShop.id
          ? { ...previous, is_active: updatedShop.is_active }
          : previous,
      );
    } catch (err) {
      setShopsError(
        err.response?.data?.message || "Unable to update shop status.",
      );
    } finally {
      setUpdatingShopId(null);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900";

  const labelClass =
    "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

  const cardClass =
    "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8";

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Dashboard heading — navigation and logout are in Navbar.jsx */}
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Welcome, {user?.name || "Administrator"}
          </p>
        </header>

        <section className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold tracking-wider text-blue-100">
            ADMINISTRATION
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Manage BarberHub
          </h2>

          <p className="mt-3 max-w-2xl text-blue-100">
            Create owner accounts and review registered barber shops.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          >
            {message}

            {createdOwner && (
              <p className="mt-2 text-sm">
                Owner: {createdOwner.name} ({createdOwner.email})
              </p>
            )}
          </div>
        )}

        {/* Create owner account */}
        <section className={cardClass}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create Owner Account
          </h2>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Owners are created by the administrator.
          </p>

          <form onSubmit={handleCreateOwner} className="mt-6 space-y-5">
            <div>
              <label htmlFor="owner-name" className={labelClass}>
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
                className={inputClass}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="owner-email" className={labelClass}>
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
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="owner-phone" className={labelClass}>
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
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="owner-password" className={labelClass}>
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
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Creating Account..." : "Create Owner Account"}
            </button>
          </form>
        </section>

        {/* Registered barber shops */}
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Registered Barber Shops
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {filteredShops.length} shop
                {filteredShops.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <button
              type="button"
              onClick={fetchShops}
              disabled={shopsLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {shopsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-5">
            <label htmlFor="shop-search" className={labelClass}>
              Search shops
            </label>
            <input
              id="shop-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by shop, owner, email, or city..."
              className={inputClass}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="shop-status-filter" className={labelClass}>
              Filter by status
            </label>

            <select
              id="shop-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClass} sm:w-64`}
            >
              <option value="all">All shops</option>
              <option value="active">Active shops</option>
              <option value="inactive">Inactive shops</option>
            </select>
          </div>

          {shopsError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
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
            <p className="py-10 text-center text-gray-500 dark:text-gray-400">
              Loading barber shops...
            </p>
          )}

          {!shopsLoading && !shopsError && filteredShops.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <div className="text-4xl" aria-hidden="true">
                ✂️
              </div>

              <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">
                {shops.length === 0
                  ? "No shops registered yet"
                  : "No shops match your search"}
              </h3>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {shop.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Shop ID: {shop.id}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {shop.owner_name || "Owner details unavailable"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {shop.owner_email || "No owner email"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <p>{shop.phone || "No shop phone"}</p>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                          {shop.owner_phone || ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {shop.city || shop.address || "Not provided"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            shop.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {shop.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedShop(shop)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleShopStatus(shop)}
                            disabled={updatingShopId === shop.id}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              shop.is_active
                                ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300"
                                : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
                            }`}
                          >
                            {updatingShopId === shop.id
                              ? "Updating..."
                              : shop.is_active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Shop details modal */}
        {selectedShop && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedShop(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-details-title"
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="shop-details-title"
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  >
                    {selectedShop.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Shop ID: {selectedShop.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  aria-label="Close shop details"
                  className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">
                      {value || "Not provided"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700"
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

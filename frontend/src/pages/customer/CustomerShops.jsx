import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900";

export default function CustomerShops() {
  const navigate = useNavigate();
  const location = useLocation();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [selectedShop, setSelectedShop] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  const [form, setForm] = useState({
    appointment_date: getToday(),
    appointment_time: "",
    service_id: "",
    notes: "",
  });

  const fetchShops = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...shops]
      .filter((shop) => {
        const searchableText = [
          shop.name,
          shop.city,
          shop.address,
          shop.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return (a.name || "").localeCompare(b.name || "");
        }

        if (sortBy === "city") {
          return (a.city || "").localeCompare(b.city || "");
        }

        return 0;
      });
  }, [shops, search, sortBy]);

  const openBooking = useCallback(async (shop) => {
    setSelectedShop(shop);
    setServices([]);
    setServicesLoading(true);
    setServiceError("");
    setBookingError("");

    setForm({
      appointment_date: getToday(),
      appointment_time: "",
      service_id: "",
      notes: "",
    });

    try {
      const response = await api.get(`/services/shop/${shop.id}`);
      setServices(response.data.services || []);
    } catch (err) {
      setServiceError(
        err.response?.data?.message ||
          "Unable to load services. Please try again.",
      );
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    const shopId = location.state?.bookShopId;
    if (!shopId || loading || shops.length === 0) return;

    const shop = shops.find((item) => String(item.id) === String(shopId));

    if (shop) {
      navigate(location.pathname, { replace: true, state: null });
      openBooking(shop);
    }
  }, [
    location.state?.bookShopId,
    location.pathname,
    loading,
    shops,
    openBooking,
    navigate,
  ]);

  function closeBooking() {
    if (booking) return;
    setSelectedShop(null);
    setServices([]);
    setBookingError("");
    setServiceError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setBookingError("");
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setBookingError("");

    if (!selectedShop) return;

    if (form.appointment_date < getToday()) {
      setBookingError("Please choose today or a future date.");
      return;
    }

    if (!form.appointment_time || !form.service_id) {
      setBookingError("Please select a service and appointment time.");
      return;
    }

    const selectedService = services.find(
      (service) => Number(service.id) === Number(form.service_id),
    );

    if (!selectedService || !selectedService.is_available) {
      setBookingError(
        "This service is no longer available. Please select another service.",
      );
      return;
    }

    setBooking(true);

    try {
      const response = await api.post("/appointments", {
        shop_id: Number(selectedShop.id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        service_id: Number(form.service_id),
        notes: form.notes.trim(),
      });

      setSelectedShop(null);

      navigate("/customer/appointments", {
        state: {
          bookingMessage:
            response.data.message || "Appointment requested successfully.",
        },
      });
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          "Unable to book your appointment. Please try again.",
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:gap-3 dark:text-blue-400"
        >
          <span aria-hidden="true">←</span> Back to Dashboard
        </button>

        {/* Page heading */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10"
          />

          <div className="relative max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              FIND YOUR NEXT LOOK
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Explore Barber Shops
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
              Discover your next favourite barber shop. Explore your options and
              book your grooming appointment with ease.
            </p>
          </div>
        </section>

        {/* Search and sorting */}
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <label
                htmlFor="shop-search"
                className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                Search barber shops
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400"
                >
                  ⌕
                </span>
                <input
                  id="shop-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by shop name, city or address..."
                  className={`${inputClass} pl-11`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="shop-sort"
                className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                Sort shops
              </label>
              <select
                id="shop-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className={inputClass}
              >
                <option value="name">Shop name (A–Z)</option>
                <option value="city">City (A–Z)</option>
              </select>
            </div>
          </div>

          {!loading && !error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-gray-800">
              <p
                className="text-sm text-gray-500 dark:text-gray-400"
                aria-live="polite"
              >
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredShops.length}
                </span>{" "}
                {filteredShops.length === 1 ? "shop" : "shops"} found
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </section>

        {/* Loading */}
        {loading && (
          <div
            role="status"
            className="py-16 text-center text-gray-600 dark:text-gray-300"
          >
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            Loading barber shops...
          </div>
        )}

        {/* Load error */}
        {!loading && error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchShops}
              className="mt-3 rounded-lg bg-red-100 px-4 py-2 font-semibold hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {/* No shops registered */}
        {!loading && !error && shops.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="text-5xl" aria-hidden="true">
              ✂️
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              No barber shops available yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
              New shops will appear here once they register on BarberHub. Please
              check again later.
            </p>
            <button
              type="button"
              onClick={fetchShops}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Refresh shops
            </button>
          </div>
        )}

        {/* No search results */}
        {!loading &&
          !error &&
          shops.length > 0 &&
          filteredShops.length === 0 && (
            <div className="mt-7 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="text-4xl" aria-hidden="true">
                🔎
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                No matching shops found
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try a different shop name or city.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Show all shops
              </button>
            </div>
          )}

        {/* Shop cards */}
        {!loading && !error && filteredShops.length > 0 && (
          <section className="mt-7">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredShops.map((shop) => (
                <article
                  key={shop.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:shadow-black/20"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-gray-800">
                    {shop.cover_image_url ? (
                      <img
                        src={shop.cover_image_url}
                        alt={`${shop.name} cover`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-full items-center justify-center text-6xl"
                        style={{
                          backgroundColor: `${shop.primary_color || "#2563EB"}15`,
                        }}
                        aria-label="Barber shop"
                      >
                        ✂️
                      </div>
                    )}

                    <span className="absolute bottom-3 left-3 rounded-full border border-white/50 bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow-sm">
                      Barber Shop
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {shop.name}
                    </h2>

                    {shop.city && (
                      <p className="mt-2 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span aria-hidden="true">📍</span>
                        <span>{shop.city}</span>
                      </p>
                    )}

                    <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {shop.description ||
                        "Discover grooming services at this barber shop."}
                    </p>

                    {shop.address && (
                      <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Address:{" "}
                        </span>
                        {shop.address}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-3">
                      <Link
                        to={`/customer/shops/${shop.id}`}
                        className="rounded-xl border border-blue-600 px-4 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:text-blue-400 dark:hover:bg-gray-800 dark:focus:ring-blue-900"
                      >
                        View Shop Details
                      </Link>

                      <button
                        type="button"
                        onClick={() => openBooking(shop)}
                        className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
                      >
                        Book Appointment →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Booking modal */}
      {selectedShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBooking();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  BARBERHUB BOOKING
                </p>
                <h2
                  id="booking-title"
                  className="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
                >
                  Book an Appointment
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {selectedShop.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBooking}
                disabled={booking}
                aria-label="Close booking form"
                className="rounded-xl px-3 py-1 text-2xl text-gray-500 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                &times;
              </button>
            </div>

            {servicesLoading ? (
              <div
                role="status"
                className="py-10 text-center text-gray-600 dark:text-gray-300"
              >
                Loading available services...
              </div>
            ) : (
              <>
                {serviceError && (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
                  >
                    <p>{serviceError}</p>
                    <button
                      type="button"
                      onClick={() => openBooking(selectedShop)}
                      className="mt-2 font-semibold underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!serviceError && services.length === 0 && (
                  <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                    This shop has no available services yet. Please try another
                    shop or check again later.
                  </div>
                )}

                {!serviceError && services.length > 0 && (
                  <form
                    onSubmit={handleBookingSubmit}
                    className="mt-6 space-y-5"
                  >
                    <div>
                      <label
                        htmlFor="service_id"
                        className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Select Service
                      </label>
                      <select
                        id="service_id"
                        name="service_id"
                        value={form.service_id}
                        onChange={handleChange}
                        required
                        disabled={booking}
                        className={inputClass}
                      >
                        <option value="">Choose a service</option>
                        {services
                          .filter((service) => service.is_available)
                          .map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name} — ₹
                              {Number(service.price).toFixed(2)} (
                              {service.duration_minutes} min)
                            </option>
                          ))}
                      </select>

                      {form.service_id && (
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                          {(() => {
                            const service = services.find(
                              (item) =>
                                Number(item.id) === Number(form.service_id),
                            );
                            if (!service) return null;

                            return (
                              <>
                                <p className="font-bold text-gray-900 dark:text-white">
                                  {service.name}
                                </p>
                                {service.description && (
                                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {service.description}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-blue-100 pt-3 text-sm dark:border-blue-900">
                                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    ₹{Number(service.price).toFixed(2)}
                                  </span>
                                  <span className="self-center text-gray-600 dark:text-gray-300">
                                    {service.duration_minutes} minutes
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="appointment_date"
                        className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Appointment Date
                      </label>
                      <input
                        id="appointment_date"
                        name="appointment_date"
                        type="date"
                        min={getToday()}
                        value={form.appointment_date}
                        onChange={handleChange}
                        required
                        disabled={booking}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="appointment_time"
                        className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Appointment Time
                      </label>
                      <input
                        id="appointment_time"
                        name="appointment_time"
                        type="time"
                        value={form.appointment_time}
                        onChange={handleChange}
                        required
                        disabled={booking}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="notes"
                        className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        maxLength={1000}
                        rows={3}
                        disabled={booking}
                        placeholder="Any special requests?"
                        className={inputClass}
                      />
                    </div>

                    {bookingError && (
                      <p
                        role="alert"
                        className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
                      >
                        {bookingError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row">
                      <button
                        type="button"
                        onClick={closeBooking}
                        disabled={booking}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={booking || servicesLoading}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {booking ? "Booking..." : "Confirm Booking"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

import { useCallback, useEffect, useState } from "react";
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
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900";

export default function CustomerShops() {
  const navigate = useNavigate();
  const location = useLocation();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Open the selected shop's booking modal when returning from ShopDetails.
  useEffect(() => {
    const shopId = location.state?.bookShopId;

    if (!shopId || loading || shops.length === 0) return;

    const shop = shops.find((item) => String(item.id) === String(shopId));

    if (shop) {
      // Clear navigation state so the modal does not reopen on later renders.
      navigate(location.pathname, {
        replace: true,
        state: null,
      });

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

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

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
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          &larr; Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Explore Barber Shops
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Find a shop for your next grooming appointment.
          </p>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-600 dark:text-gray-300">
            Loading barber shops...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchShops}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && shops.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
            <div className="text-5xl">✂️</div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              No barber shops available yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500 dark:text-gray-400">
              New shops will appear here once they are registered on BarberHub.
            </p>
          </div>
        )}

        {!loading && !error && shops.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <article
                key={shop.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                {shop.cover_image_url ? (
                  <img
                    src={shop.cover_image_url}
                    alt={`${shop.name} cover`}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {shop.name}
                  </h2>

                  {shop.city && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {shop.city}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    {shop.description || "Welcome to our barber shop."}
                  </p>

                  {shop.address && (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {shop.address}
                    </p>
                  )}

                  <Link
                    to={`/customer/shops/${shop.id}`}
                    className="mt-5 block w-full rounded-lg border border-blue-600 px-4 py-3 text-center font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800"
                  >
                    View Details
                  </Link>

                  <button
                    type="button"
                    onClick={() => openBooking(shop)}
                    className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Book Appointment
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedShop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBooking();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="booking-title"
                  className="text-2xl font-bold text-gray-900 dark:text-gray-100"
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
                className="rounded-lg px-3 py-1 text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                &times;
              </button>
            </div>

            {servicesLoading ? (
              <div className="py-10 text-center text-gray-600 dark:text-gray-300">
                Loading available services...
              </div>
            ) : (
              <>
                {serviceError && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
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
                  <div className="mt-5 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                    This shop has no available services yet. Please try another
                    shop or check again later.
                  </div>
                )}

                {!serviceError && services.length > 0 && (
                  <form
                    onSubmit={handleBookingSubmit}
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="service_id"
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
                        <div className="mt-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                          {(() => {
                            const service = services.find(
                              (item) =>
                                Number(item.id) === Number(form.service_id),
                            );

                            if (!service) return null;

                            return (
                              <>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                  {service.name}
                                </p>

                                {service.description && (
                                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    {service.description}
                                  </p>
                                )}

                                <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                                    ₹{Number(service.price).toFixed(2)}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-300">
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
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
                        className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
                      >
                        {bookingError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={closeBooking}
                        disabled={booking}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={booking || servicesLoading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

function InfoCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-gray-100">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function CrowdCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">
          {label}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

function formatWait(minutes) {
  const value = Math.max(0, Number(minutes) || 0);

  if (value === 0) return "0 min";
  if (value < 60) return `${value} min`;

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function getCrowdStatus(level, waiting) {
  const normalizedLevel = String(level || "").toLowerCase();

  if (
    normalizedLevel.includes("high") ||
    normalizedLevel.includes("busy") ||
    normalizedLevel.includes("crowded")
  ) {
    return {
      label: "High Crowd",
      description: "The shop may be busy right now.",
      className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      dot: "bg-red-500",
    };
  }

  if (
    normalizedLevel.includes("medium") ||
    normalizedLevel.includes("moderate")
  ) {
    return {
      label: "Moderate Crowd",
      description: "Some waiting may be expected.",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }

  if (normalizedLevel.includes("low") || normalizedLevel.includes("quiet")) {
    return {
      label: "Low Crowd",
      description: "The shop appears relatively quiet.",
      className:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }

  if (Number(waiting) >= 6) {
    return {
      label: "High Crowd",
      description: "Several customers may be waiting.",
      className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
      dot: "bg-red-500",
    };
  }

  if (Number(waiting) >= 3) {
    return {
      label: "Moderate Crowd",
      description: "Some waiting may be expected.",
      className:
        "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }

  return {
    label: "Crowd Information",
    description: "Check the estimated waiting time before visiting.",
    className:
      "bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300",
    dot: "bg-slate-400",
  };
}

function normalizeCrowdResponse(response) {
  const data = response?.data?.crowd || response?.data || {};

  return {
    waiting: Math.max(0, Number(data.waiting) || 0),
    in_service: Math.max(0, Number(data.in_service) || 0),
    estimated_wait_minutes: Math.max(
      0,
      Number(data.estimated_wait_minutes) || 0,
    ),
    level: data.level || "unknown",
  };
}

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [crowd, setCrowd] = useState({
    waiting: 0,
    in_service: 0,
    estimated_wait_minutes: 0,
    level: "unknown",
  });

  const [crowdLoading, setCrowdLoading] = useState(true);
  const [crowdError, setCrowdError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [crowdRetry, setCrowdRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadShopDetails() {
      setLoading(true);
      setError("");

      try {
        const shopResponse = await api.get("/shops");

        const shops = Array.isArray(shopResponse.data)
          ? shopResponse.data
          : shopResponse.data?.shops || [];

        const foundShop = shops.find(
          (item) => String(item.id) === String(shopId),
        );

        if (!foundShop) {
          throw new Error("Shop not found. It may have been removed.");
        }

        const serviceResponse = await api.get(`/services/shop/${shopId}`);

        const serviceData = Array.isArray(serviceResponse.data)
          ? serviceResponse.data
          : serviceResponse.data?.services || [];

        if (active) {
          setShop(foundShop);
          setServices(serviceData);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load shop details. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadShopDetails();

    return () => {
      active = false;
    };
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;

    let active = true;
    let intervalId;

    async function loadCrowd(isInitial = false) {
      if (isInitial && active) {
        setCrowdLoading(true);
      }

      try {
        const response = await api.get(`/queue/shop/${shopId}/crowd`);

        if (!active) return;

        setCrowd(normalizeCrowdResponse(response));
        setCrowdError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (!active) return;

        setCrowdError(
          err.response?.data?.message ||
            "Live crowd information is temporarily unavailable.",
        );
      } finally {
        if (active && isInitial) {
          setCrowdLoading(false);
        }
      }
    }

    loadCrowd(true);
    intervalId = setInterval(() => loadCrowd(false), 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [shopId, crowdRetry]);

  const availableServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.is_available !== false &&
          service.is_active !== false &&
          service.available !== false,
      ),
    [services],
  );

  const shopAddress = [shop?.address, shop?.city].filter(Boolean).join(", ");

  const mapSearchUrl = shopAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${shop?.name || ""} ${shopAddress}`.trim(),
      )}`
    : "";

  const directionsUrl = shopAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${shop?.name || ""} ${shopAddress}`.trim(),
      )}`
    : "";

  const currentCrowd = getCrowdStatus(crowd.level, crowd.waiting);

  function handleBookAppointment() {
    if (!shop) return;

    navigate("/customer/shops", {
      state: {
        bookShopId: shop.id,
      },
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
            Loading shop details
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
            Please wait while we get everything ready.
          </p>
        </div>
      </main>
    );
  }

  if (error || !shop) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl dark:bg-red-950">
            ⚠️
          </div>
          <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">
            Shop unavailable
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-gray-400">
            {error || "We could not find this shop."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/customer/shops")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Browse All Shops
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-gray-950 dark:text-white sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/customer/shops")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:gap-3 dark:text-blue-400"
          >
            <span aria-hidden="true">←</span>
            Back to shops
          </button>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            SHOP DETAILS
          </span>
        </div>

        {/* Shop profile */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {shop.cover_image_url ? (
            <div className="relative">
              <img
                src={shop.cover_image_url}
                alt={`${shop.name} cover`}
                className="h-56 w-full object-cover sm:h-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:left-7">
                ✦ Grooming & personal care
              </span>
            </div>
          ) : (
            <div
              className="relative flex h-56 items-center justify-center sm:h-80"
              style={{
                backgroundColor: `${shop.primary_color || "#2563EB"}15`,
              }}
            >
              <div className="text-center">
                <div className="text-7xl" aria-hidden="true">
                  ✂️
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-gray-400">
                  Welcome to {shop.name}
                </p>
              </div>
              <span className="absolute bottom-4 left-4 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-gray-900/80 dark:text-gray-200">
                ✦ Grooming & personal care
              </span>
            </div>
          )}

          <div className="p-5 sm:p-8 lg:p-9">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                {shop.city && (
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    📍 {shop.city}
                  </p>
                )}

                <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {shop.name}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-gray-300 sm:text-base">
                  {shop.description ||
                    "Discover professional grooming services and find the right option for your next visit."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                    ✂️ Grooming services
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                    📅 Appointment booking
                  </span>
                </div>
              </div>

              <div className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/50 lg:max-w-xs">
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                  Ready for your next visit?
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-gray-400">
                  Explore available services and choose your appointment time.
                </p>
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
                >
                  Book Appointment →
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 border-t border-slate-100 pt-7 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label="Shop Address"
                value={shop.address || "Address not provided"}
              />
              <InfoCard
                label="Contact Number"
                value={shop.phone || "Phone number not provided"}
              />
              <InfoCard
                label="Email"
                value={shop.email || "Email not provided"}
              />
              <InfoCard
                label="Shop Owner"
                value={shop.owner_name || "Shop owner"}
              />
            </div>
          </div>
        </section>

        {/* Live crowd */}
        <section
          aria-labelledby="crowd-heading"
          className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                PLAN YOUR VISIT
              </p>
              <h2
                id="crowd-heading"
                className="mt-2 text-2xl font-extrabold tracking-tight"
              >
                Live Crowd & Waiting Time
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">
                Check the reported queue before heading to the shop.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Updates every 10 seconds
            </span>
          </div>

          {crowdLoading ? (
            <div
              role="status"
              className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500 dark:bg-gray-800 dark:text-gray-400"
            >
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              <p className="mt-3">Checking current crowd information...</p>
            </div>
          ) : crowdError ? (
            <div
              role="status"
              className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              <p>{crowdError}</p>
              <button
                type="button"
                onClick={() => {
                  setCrowdLoading(true);
                  setCrowdRetry((previous) => previous + 1);
                }}
                className="mt-3 rounded-lg border border-amber-300 px-4 py-2 font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-gray-800">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${currentCrowd.className}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${currentCrowd.dot}`}
                  />
                  {currentCrowd.label}
                </span>
                <p className="text-sm text-slate-600 dark:text-gray-300">
                  {currentCrowd.description}
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <CrowdCard
                  label="Waiting"
                  value={crowd.waiting}
                  description="Customers in the queue"
                  icon="👥"
                />
                <CrowdCard
                  label="In service"
                  value={crowd.in_service}
                  description="Currently being served"
                  icon="✂️"
                />
                <CrowdCard
                  label="Estimated wait"
                  value={formatWait(crowd.estimated_wait_minutes)}
                  description="Approximate waiting time"
                  icon="⏱️"
                />
              </div>

              {lastUpdated && (
                <p className="mt-4 text-xs text-slate-400 dark:text-gray-500">
                  Last updated at{" "}
                  {lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              )}

              <p className="mt-2 text-xs leading-5 text-slate-400 dark:text-gray-500">
                Crowd levels and waiting times are estimates and may change.
              </p>
            </>
          )}
        </section>

        {/* Services and pricing */}
        <section className="mt-10" aria-labelledby="services-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                FIND YOUR SERVICE
              </p>
              <h2
                id="services-heading"
                className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl"
              >
                Services & Pricing
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">
                Compare services, prices, and durations before booking.
              </p>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              {availableServices.length}{" "}
              {availableServices.length === 1 ? "service" : "services"}{" "}
              available
            </span>
          </div>

          {availableServices.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <div className="text-4xl" aria-hidden="true">
                ✂️
              </div>
              <h3 className="mt-4 font-bold">No services available</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                This shop has no currently available services. Please check
                again later.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {availableServices.map((service) => (
                <article
                  key={service.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-950">
                      ✂️
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Available
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold">{service.name}</h3>

                  <p className="mt-2 min-h-12 flex-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
                    {service.description || "Professional grooming service."}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-gray-800">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                        Service price
                      </p>
                      <p className="mt-1 text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                        ₹{Number(service.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 dark:text-gray-400">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        {service.duration_minutes ?? "—"}{" "}
                        {service.duration_minutes != null ? "min" : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookAppointment}
                    className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
                  >
                    Book this service →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Location */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                VISIT THE SHOP
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">Find This Shop</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
                {shopAddress || "This shop has not provided an address yet."}
              </p>
            </div>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                <span aria-hidden="true">↗</span>
                Get Directions
              </a>
            )}
          </div>

          {mapSearchUrl ? (
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Find ${shop.name} on Google Maps`}
              className="mt-6 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center transition hover:border-blue-200 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-900"
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-gray-900"
                aria-hidden="true"
              >
                📍
              </span>
              <span className="mt-4 text-lg font-bold">
                View on Google Maps
              </span>
              <span className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Open the shop location in a new tab
              </span>
            </a>
          ) : (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              The shop owner has not added a location yet.
            </p>
          )}
        </section>

        {/* Final booking action */}
        <section className="mt-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">
                Ready to book your visit?
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">
                Choose your preferred service and appointment time.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBookAppointment}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3 font-bold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              Book This Shop →
            </button>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400 dark:text-gray-600">
          BarberHub · Your grooming, your schedule.
        </footer>
      </div>
    </main>
  );
}

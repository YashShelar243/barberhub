import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

const initialCrowd = {
  waiting: 0,
  in_service: 0,
  estimated_wait_minutes: 0,
  level: "low",
};

function formatWait(minutes) {
  const value = Number(minutes) || 0;

  if (value < 60) return `${value} minutes`;

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [crowd, setCrowd] = useState(initialCrowd);
  const [crowdLoading, setCrowdLoading] = useState(true);
  const [crowdError, setCrowdError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load shop details and available services.
  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");

      try {
        const [shopsResponse, servicesResponse] = await Promise.all([
          api.get("/shops"),
          api.get(`/services/shop/${shopId}`),
        ]);

        if (!active) return;

        const foundShop = (shopsResponse.data.shops || []).find(
          (item) => String(item.id) === String(shopId),
        );

        if (!foundShop) {
          setError("This barber shop could not be found or is unavailable.");
          return;
        }

        setShop(foundShop);
        setServices(servicesResponse.data.services || []);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load shop details. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [shopId]);

  // Load crowd information immediately and refresh every 10 seconds.
  useEffect(() => {
    let active = true;

    async function loadCrowd() {
      try {
        const response = await api.get(`/queue/shop/${shopId}/crowd`);

        if (!active) return;

        // Support either a direct crowd object or { crowd: {...} }.
        const data = response.data.crowd || response.data;

        setCrowd({
          waiting: Number(data.waiting) || 0,
          in_service: Number(data.in_service) || 0,
          estimated_wait_minutes: Number(data.estimated_wait_minutes) || 0,
          level: data.level || "low",
        });

        setCrowdError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (active) {
          setCrowdError(
            err.response?.data?.message ||
              "Live crowd information is temporarily unavailable.",
          );
        }
      } finally {
        if (active) setCrowdLoading(false);
      }
    }

    loadCrowd();

    const intervalId = setInterval(loadCrowd, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [shopId]);

  const availableServices = services.filter((service) => service.is_available);

  const shopAddress = [shop?.address, shop?.city].filter(Boolean).join(", ");

  const encodedAddress = encodeURIComponent(shopAddress);

  const mapSearchUrl = shopAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : null;

  const directionsUrl = shopAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    : null;

  const crowdStyles = {
    low: {
      label: "Low crowd",
      description: "It's relatively quiet right now.",
      className:
        "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
      dot: "bg-green-500",
    },
    moderate: {
      label: "Moderate crowd",
      description: "Some customers are waiting.",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      dot: "bg-amber-500",
    },
    busy: {
      label: "Busy",
      description: "Expect a longer wait.",
      className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      dot: "bg-red-500",
    },
  };

  const currentCrowd = crowdStyles[crowd.level] || crowdStyles.low;

  function handleBookAppointment() {
    navigate("/customer/shops", {
      state: { bookShopId: shop.id },
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 text-center text-gray-600 dark:bg-gray-950 dark:text-gray-300">
        Loading shop details...
      </main>
    );
  }

  if (error || !shop) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-gray-900">
          <p role="alert" className="text-red-600 dark:text-red-300">
            {error || "Shop not found."}
          </p>

          <Link
            to="/customer/shops"
            className="mt-4 inline-block font-semibold text-blue-600 hover:underline"
          >
            Back to shops
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate("/customer/shops")}
          className="mb-6 font-medium text-blue-600 hover:underline"
        >
          &larr; Back to shops
        </button>

        {/* Shop details */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {shop.cover_image_url ? (
            <img
              src={shop.cover_image_url}
              alt={`${shop.name} cover`}
              className="h-56 w-full object-cover sm:h-72"
            />
          ) : (
            <div
              className="flex h-48 items-center justify-center text-6xl"
              style={{
                backgroundColor: `${shop.primary_color || "#2563EB"}15`,
              }}
            >
              ✂️
            </div>
          )}

          <div className="p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {shop.name}
                </h1>

                {shop.city && (
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    {shop.city}
                  </p>
                )}

                <p className="mt-4 leading-7 text-gray-600 dark:text-gray-300">
                  {shop.description || "Welcome to our barber shop."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleBookAppointment}
                className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Book Appointment
              </button>
            </div>

            <div className="mt-8 grid gap-4 border-t border-gray-200 pt-6 dark:border-gray-700 sm:grid-cols-2">
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

        {/* Live crowd and queue information */}
        <section
          aria-labelledby="crowd-heading"
          className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="crowd-heading"
                className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              >
                Live Crowd & Waiting Time
              </h2>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Check how busy the shop is before booking.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Auto-refresh: 10 sec
            </span>
          </div>

          {crowdLoading ? (
            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              Loading live crowd information...
            </p>
          ) : crowdError ? (
            <div
              role="status"
              className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {crowdError}
              <button
                type="button"
                onClick={async () => {
                  setCrowdLoading(true);
                  try {
                    const response = await api.get(
                      `/queue/shop/${shopId}/crowd`,
                    );
                    const data = response.data.crowd || response.data;

                    setCrowd({
                      waiting: Number(data.waiting) || 0,
                      in_service: Number(data.in_service) || 0,
                      estimated_wait_minutes:
                        Number(data.estimated_wait_minutes) || 0,
                      level: data.level || "low",
                    });
                    setCrowdError("");
                    setLastUpdated(new Date());
                  } catch (err) {
                    setCrowdError(
                      err.response?.data?.message ||
                        "Live crowd information is temporarily unavailable.",
                    );
                  } finally {
                    setCrowdLoading(false);
                  }
                }}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${currentCrowd.className}`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${currentCrowd.dot}`}
                  />
                  {currentCrowd.label}
                </span>

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {currentCrowd.description}
                </span>
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
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Last updated at{" "}
                  {lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Crowd levels and waiting times are estimates and may change.
              </p>
            </>
          )}
        </section>

        {/* Shop location */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Find This Shop
              </h2>

              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {shopAddress || "This shop has not provided an address yet."}
              </p>
            </div>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
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
              className="mt-5 flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center transition hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:min-h-64"
            >
              <span className="text-5xl" aria-hidden="true">
                📍
              </span>

              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                View on Google Maps
              </span>

              <span className="text-sm text-gray-600 dark:text-gray-300">
                Open the shop location in Google Maps
              </span>
            </a>
          ) : (
            <p className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
              The shop owner has not added a location yet.
            </p>
          )}
        </section>

        {/* Services and pricing */}
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Services &amp; Pricing
            </h2>

            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Explore the services offered by this shop.
            </p>
          </div>

          {availableServices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              No services are currently available at this shop.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableServices.map((service) => (
                <article
                  key={service.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {service.name}
                  </h3>

                  <p className="mt-2 min-h-10 text-sm text-gray-600 dark:text-gray-300">
                    {service.description || "Professional grooming service."}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{Number(service.price).toFixed(2)}
                    </span>

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {service.duration_minutes} min
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookAppointment}
                    className="mt-4 w-full rounded-lg border border-blue-600 px-4 py-2.5 font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-gray-800"
                  >
                    Book Appointment
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleBookAppointment}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Book This Shop
          </button>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

function CrowdCard({ label, value, description, icon }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {label}
        </p>
        <span aria-hidden="true" className="text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

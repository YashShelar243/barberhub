import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const availableServices = services.filter((service) => service.is_available);

  // Use the saved address and city to create map links.
  const shopAddress = [shop?.address, shop?.city].filter(Boolean).join(", ");

  const encodedAddress = encodeURIComponent(shopAddress);

  const mapSearchUrl = shopAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    : null;

  const directionsUrl = shopAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
    : null;

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
                onClick={() =>
                  navigate("/customer/shops", {
                    state: { bookShopId: shop.id },
                  })
                }
                className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Book Appointment
              </button>
            </div>

            <div className="mt-8 grid gap-4 border-t border-gray-200 pt-6 dark:border-gray-700 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Shop Address
                </p>
                <p className="mt-2 text-gray-900 dark:text-gray-100">
                  {shop.address || "Address not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Contact Number
                </p>
                <p className="mt-2 text-gray-900 dark:text-gray-100">
                  {shop.phone || "Phone number not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <p className="mt-2 break-words text-gray-900 dark:text-gray-100">
                  {shop.email || "Email not provided"}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Shop Owner
                </p>
                <p className="mt-2 text-gray-900 dark:text-gray-100">
                  {shop.owner_name || "Shop owner"}
                </p>
              </div>
            </div>
          </div>
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
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() =>
              navigate("/customer/shops", {
                state: { bookShopId: shop.id },
              })
            }
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Book This Shop
          </button>
        </div>
      </div>
    </main>
  );
}

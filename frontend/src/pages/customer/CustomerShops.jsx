import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function CustomerShops() {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                    className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
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

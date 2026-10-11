import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Dashboard heading */}
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            BarberHub
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Customer Dashboard
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Welcome, {user?.name || "Customer"}!
          </p>
        </header>

        {/* Welcome banner */}
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
            type="button"
            onClick={() => navigate("/customer/shops")}
            className="mt-6 rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Explore Barber Shops
          </button>
        </section>

        {/* Overview cards */}
        <section className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Overview
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Find shops */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">
                ✂️
              </div>

              <h4 className="mt-4 font-semibold text-gray-900 dark:text-white">
                Find Barber Shops
              </h4>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Discover shops and choose the one that suits you.
              </p>

              <button
                type="button"
                onClick={() => navigate("/customer/shops")}
                className="mt-4 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Browse shops →
              </button>
            </div>

            {/* Appointments */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">
                📅
              </div>

              <h4 className="mt-4 font-semibold text-gray-900 dark:text-white">
                My Appointments
              </h4>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                View your bookings and appointment status.
              </p>

              <button
                type="button"
                onClick={() => navigate("/customer/appointments")}
                className="mt-4 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View appointments →
              </button>
            </div>

            {/* Profile */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="text-3xl" aria-hidden="true">
                👤
              </div>

              <h4 className="mt-4 font-semibold text-gray-900 dark:text-white">
                My Profile
              </h4>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                View your account information.
              </p>

              <div className="mt-4 break-all text-sm text-gray-600 dark:text-gray-300">
                {user?.email || "Email not available"}
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming appointments */}
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Upcoming Appointments
          </h3>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            View your bookings and appointment status in My Appointments.
          </p>

          <button
            type="button"
            onClick={() => navigate("/customer/shops")}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Book an Appointment
          </button>

          <button
            type="button"
            onClick={() => navigate("/customer/appointments")}
            className="ml-3 mt-4 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            My Appointments
          </button>
        </section>
      </div>
    </main>
  );
}

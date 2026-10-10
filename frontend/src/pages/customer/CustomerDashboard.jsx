import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function CustomerDashboard() {
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
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
            className="mt-6 rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
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
            className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Book an Appointment
          </button>
        </section>
      </main>
    </div>
  );
}

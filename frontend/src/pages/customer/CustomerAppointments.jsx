import { useNavigate } from "react-router-dom";

export default function CustomerAppointments() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/customer/dashboard")}
          className="mb-6 font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>

        <p className="mt-3 text-gray-600">
          Your appointments will appear here after booking is implemented.
        </p>

        <button
          onClick={() => navigate("/customer/shops")}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Explore Barber Shops
        </button>
      </div>
    </main>
  );
}

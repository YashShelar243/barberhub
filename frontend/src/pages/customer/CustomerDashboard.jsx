import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      icon: "✂️",
      title: "Find Barber Shops",
      description:
        "Discover nearby shops and find the right grooming service for you.",
      action: "Explore shops",
      onClick: () => navigate("/customer/shops"),
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    {
      icon: "📅",
      title: "My Appointments",
      description: "Check your bookings and keep track of appointment status.",
      action: "View appointments",
      onClick: () => navigate("/customer/appointments"),
      color:
        "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    },
    {
      icon: "👤",
      title: "My Profile",
      description: "Your account information, all in one convenient place.",
      action: null,
      color:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <header className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            BarberHub
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Your Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400 sm:text-base">
            Welcome back, {user?.name || "Customer"}! Ready for a fresh look?
          </p>
        </header>

        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-10 lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[35px] border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/10 blur-2xl"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
              YOUR PERSONAL GROOMING SPACE
            </span>

            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Look sharp.
              <br />
              Feel confident.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50 sm:text-base">
              Discover your preferred barber shop and make your next grooming
              appointment in just a few clicks.
            </p>

            <button
              type="button"
              onClick={() => navigate("/customer/shops")}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-blue-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30"
            >
              Explore Barber Shops
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        {/* Overview */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Quick Access
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Everything you need for your next visit.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((item) => (
              <article
                key={item.title}
                className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 dark:hover:shadow-black/20 sm:p-7"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${item.color}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>

                <h4 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h4>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
                  {item.description}
                </p>

                {item.title === "My Profile" ? (
                  <div className="mt-5 break-all border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-gray-800 dark:text-gray-300">
                    {user?.email || "Email not available"}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="mt-5 flex w-fit items-center gap-2 font-bold text-blue-600 transition hover:gap-3 hover:text-blue-700 focus:outline-none focus:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {item.action}
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Appointment actions */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="p-6 sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950"
                  aria-hidden="true"
                >
                  📅
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                    Ready for your next appointment?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                    Find a shop or review your existing bookings.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
              <button
                type="button"
                onClick={() => navigate("/customer/shops")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900"
              >
                Book an Appointment
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/appointments")}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-gray-800"
              >
                My Appointments
              </button>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400 dark:text-gray-600">
          BarberHub · Your grooming, your schedule.
        </footer>
      </div>
    </main>
  );
}

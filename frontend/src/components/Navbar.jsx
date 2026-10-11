import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const navigationByRole = {
  customer: [
    { label: "Dashboard", path: "/customer/dashboard" },
    { label: "Explore Shops", path: "/customer/shops" },
    { label: "My Appointments", path: "/customer/appointments" },
  ],
  owner: [
    { label: "Dashboard", path: "/owner/dashboard" },
    { label: "Manage Services", path: "/owner/services" },
    { label: "Manage Appointments", path: "/owner/appointments" },
  ],
  admin: [{ label: "Dashboard", path: "/admin/dashboard" }],
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const links = navigationByRole[user?.role] || [];

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function isActive(path) {
    return location.pathname === path;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={
            user?.role === "owner"
              ? "/owner/dashboard"
              : user?.role === "admin"
                ? "/admin/dashboard"
                : user?.role === "customer"
                  ? "/customer/dashboard"
                  : "/login"
          }
          className="shrink-0 text-2xl font-bold text-blue-600 dark:text-blue-400"
          onClick={() => setMenuOpen(false)}
        >
          BarberHub
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.path)
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-lg transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 sm:inline-flex"
            >
              Logout
            </button>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 text-xl transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 md:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {user?.name && (
              <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Signed in as {user.name}
              </p>
            )}

            {links.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                  isActive(item.path)
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 rounded-lg border border-gray-300 px-3 py-3 text-left text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Logout
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

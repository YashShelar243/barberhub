import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const navigationByRole = {
  customer: [
    { label: "Dashboard", path: "/customer/dashboard" },
    { label: "Explore Shops", path: "/customer/shops" },
    { label: "My Appointments", path: "/customer/appointments" },
  ],
  owner: [
    { label: "Dashboard", path: "/owner/dashboard" },
    { label: "Reports", path: "/owner/reports" },
    { label: "Customers", path: "/owner/customers" },
    { label: "Manage Services", path: "/owner/services" },
    { label: "Manage Appointments", path: "/owner/appointments" },
    { label: "Queue Management", path: "/owner/queue" },
    { label: "Payments & Receipts", path: "/owner/payments" },
    { label: "Expense Management", path: "/owner/expenses" },
    { label: "My Profile", path: "/owner/profile" },
  ],
  admin: [{ label: "Dashboard", path: "/admin/dashboard" }],
};

function formatNotificationDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const notificationRef = useRef(null);

  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const links = navigationByRole[user?.role] || [];

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setNotificationsLoading(true);
    setNotificationError("");

    try {
      const response = await api.get("/notifications");

      setNotifications(response.data.notifications || []);
      setUnreadCount(Number(response.data.unreadCount) || 0);
    } catch (error) {
      setNotificationError(
        error.response?.data?.message ||
          "Unable to load notifications. Please try again.",
      );
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsOpen(false);
    }
  }, [user, loadNotifications]);

  // Refresh the count periodically and when the user returns to the tab.
  useEffect(() => {
    if (!user) return undefined;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, loadNotifications]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    setNotificationsOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function isActive(path) {
    if (path === "/owner/dashboard" && location.pathname === "/owner/reports") {
      return false;
    }

    return location.pathname === path;
  }

  const homePath =
    user?.role === "owner"
      ? "/owner/dashboard"
      : user?.role === "admin"
        ? "/admin/dashboard"
        : user?.role === "customer"
          ? "/customer/dashboard"
          : "/login";

  async function markAsRead(notification) {
    if (notification.is_read || updatingId !== null) return;

    setUpdatingId(notification.id);

    try {
      await api.patch(`/notifications/${notification.id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationError(
        error.response?.data?.message || "Unable to mark notification as read.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setNotificationError("");

    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );

      setUnreadCount(0);
    } catch (error) {
      setNotificationError(
        error.response?.data?.message ||
          "Unable to mark notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function openNotification(notification) {
    markAsRead(notification);
    setNotificationsOpen(false);

    if (notification.appointment_id) {
      const appointmentsPath =
        user?.role === "owner"
          ? "/owner/appointments"
          : user?.role === "customer"
            ? "/customer/appointments"
            : null;

      if (appointmentsPath) {
        navigate(appointmentsPath);
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={homePath}
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

        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => {
                  const willOpen = !notificationsOpen;
                  setNotificationsOpen(willOpen);

                  if (willOpen) loadNotifications();
                }}
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={notificationsOpen}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-xl transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <span aria-hidden="true">{"\u{1F514}"}</span>

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
                    <div>
                      <h2 className="font-bold">Notifications</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {unreadCount} unread
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0 || markingAll}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                    >
                      {markingAll ? "Updating..." : "Mark all read"}
                    </button>
                  </div>

                  {notificationError && (
                    <div
                      role="alert"
                      className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                    >
                      {notificationError}
                      <button
                        type="button"
                        onClick={loadNotifications}
                        className="ml-2 font-semibold underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading && notifications.length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-500">
                        Loading notifications...
                      </p>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-2xl">{"\u{1F514}"}</p>
                        <p className="mt-2 font-medium">You're all caught up</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          New appointment updates will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => openNotification(notification)}
                          disabled={updatingId === notification.id}
                          className={`block w-full border-b border-gray-100 p-4 text-left transition last:border-b-0 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:hover:bg-gray-800 ${
                            !notification.is_read
                              ? "bg-blue-50/70 dark:bg-blue-950/30"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                notification.is_read
                                  ? "bg-gray-300 dark:bg-gray-600"
                                  : "bg-blue-600"
                              }`}
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">
                                {notification.title}
                              </p>

                              <p className="mt-1 whitespace-normal break-words text-sm text-gray-600 dark:text-gray-300">
                                {notification.message}
                              </p>

                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {formatNotificationDate(
                                  notification.created_at,
                                )}
                              </p>

                              {!notification.is_read && (
                                <span className="mt-2 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={loadNotifications}
                      disabled={notificationsLoading}
                      className="w-full rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
                    >
                      {notificationsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg border border-gray-300 px-3 py-2 text-lg transition hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            {isDark ? "\u2600\uFE0F" : "\u{1F319}"}
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
            {menuOpen ? "\u2715" : "\u2630"}
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

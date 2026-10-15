import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const [hours, minutes] = String(value).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClasses(status) {
  const value = String(status || "").toLowerCase();

  if (value === "completed" || value === "paid") {
    return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (value === "confirmed" || value === "waiting") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }

  if (value === "rejected" || value === "cancelled" || value === "canceled") {
    return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function CustomerAvatar({ name }) {
  const initials = String(name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      {initials || "C"}
    </div>
  );
}

function StatCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-950">
          {icon}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl dark:bg-gray-800">
        👥
      </div>
      <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}

export default function OwnerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/customers", {
          params: { search: search.trim() },
        });

        if (!active) return;

        const list = response.data?.customers;

        if (!Array.isArray(list)) {
          throw new Error("The server returned an unexpected customer list.");
        }

        setCustomers(list);
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load customers. Please try again.",
        );
        setCustomers([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, retry]);

  async function openCustomer(customerId) {
    setSelectedId(customerId);
    setProfile(null);
    setProfileError("");
    setProfileLoading(true);

    try {
      const response = await api.get(`/customers/${customerId}`);
      setProfile(response.data);
    } catch (err) {
      setProfileError(
        err.response?.data?.message || "Unable to load this customer profile.",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  function closeProfile() {
    setSelectedId(null);
    setProfile(null);
    setProfileError("");
  }

  const stats = useMemo(() => {
    const totalSpent = customers.reduce(
      (sum, customer) => sum + Number(customer.total_spent || 0),
      0,
    );

    const repeatCustomers = customers.filter(
      (customer) => Number(customer.completed_appointments || 0) > 1,
    ).length;

    return {
      total: customers.length,
      repeat: repeatCustomers,
      spent: totalSpent,
    };
  }, [customers]);

  const customer = profile?.customer;
  const summary = profile?.summary;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              SHOP MANAGEMENT
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Customers
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Manage customer relationships, visits, and payment history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            <span aria-hidden="true">↻</span>
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Customers"
            value={loading ? "—" : stats.total}
            description="Customers matching your search"
            icon="👥"
          />
          <StatCard
            label="Repeat customers"
            value={loading ? "—" : stats.repeat}
            description="More than one completed appointment"
            icon="↻"
          />
          <StatCard
            label="Recorded spending"
            value={loading ? "—" : currency.format(stats.spent)}
            description="Based on recorded payments"
            icon="₹"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Customer directory</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Search by customer name, phone number, or email.
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers..."
                aria-label="Search customers"
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-950 dark:focus:ring-blue-950"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              <p className="font-semibold">Unable to load customers</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="mt-3 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 p-5" aria-label="Loading customers">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center gap-3"
                >
                  <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : !error && customers.length === 0 ? (
            <EmptyState
              title={search ? "No matching customers" : "No customers yet"}
              message={
                search
                  ? "Try a different name, phone number, or email."
                  : "Customers linked to this shop through appointments, queue records, or payments will appear here."
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold">Appointments</th>
                      <th className="px-5 py-4 font-semibold">Last visit</th>
                      <th className="px-5 py-4 font-semibold">Total spent</th>
                      <th className="px-5 py-4 text-right font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {customers.map((item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <CustomerAvatar name={item.name} />
                            <div className="min-w-0">
                              <p className="font-semibold">{item.name}</p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {item.phone}
                              </p>
                              {item.email && (
                                <p className="mt-1 max-w-56 truncate text-xs text-gray-500 dark:text-gray-400">
                                  {item.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {Number(item.appointment_count || 0)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {Number(item.completed_appointments || 0)} completed
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                          {formatDate(item.last_appointment)}
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {currency.format(Number(item.total_spent || 0))}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openCustomer(item.id)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-gray-600 dark:text-blue-300 dark:hover:bg-blue-950"
                          >
                            View profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
                {customers.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <CustomerAvatar name={item.name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {item.phone}
                        </p>
                        {item.email && (
                          <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
                            {item.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Appointments
                        </p>
                        <p className="mt-1 font-semibold">
                          {Number(item.appointment_count || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Total spent
                        </p>
                        <p className="mt-1 font-semibold">
                          {currency.format(Number(item.total_spent || 0))}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Last visit
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatDate(item.last_appointment)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCustomer(item.id)}
                      className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      View customer profile
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {selectedId !== null && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeProfile();
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-profile-title"
              className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Customer details
                  </p>
                  <h2
                    id="customer-profile-title"
                    className="mt-1 text-xl font-bold"
                  >
                    {customer?.name || "Customer profile"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeProfile}
                  aria-label="Close customer profile"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-xl hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  ×
                </button>
              </div>

              {profileLoading ? (
                <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading customer profile...
                </div>
              ) : profileError ? (
                <div className="p-6">
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
                  >
                    {profileError}
                  </div>
                  <button
                    type="button"
                    onClick={() => openCustomer(selectedId)}
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Try again
                  </button>
                </div>
              ) : profile ? (
                <div className="space-y-6 p-5 sm:p-6">
                  <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60 sm:flex-row sm:items-center">
                    <CustomerAvatar name={customer?.name} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">{customer?.name}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {customer?.phone || "No phone number"}
                      </p>
                      <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-300">
                        {customer?.email || "No email address"}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Customer since {formatDate(customer?.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      label="Appointments"
                      value={summary?.appointmentCount ?? 0}
                      description="Recorded appointments"
                      icon="📅"
                    />
                    <StatCard
                      label="Completed"
                      value={summary?.completedAppointments ?? 0}
                      description="Completed appointments"
                      icon="✓"
                    />
                    <StatCard
                      label="Payments"
                      value={summary?.paymentCount ?? 0}
                      description="Recorded transactions"
                      icon="🧾"
                    />
                    <StatCard
                      label="Total spent"
                      value={currency.format(Number(summary?.totalSpent || 0))}
                      description="Based on payment records"
                      icon="₹"
                    />
                  </div>

                  <section>
                    <h3 className="text-lg font-bold">Appointment history</h3>
                    {profile.appointments?.length ? (
                      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Service</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {profile.appointments.map((appointment) => (
                              <tr key={appointment.id}>
                                <td className="px-4 py-3">
                                  <p>
                                    {formatDate(appointment.appointment_date)}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {formatTime(appointment.appointment_time)}
                                  </p>
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {appointment.service_name}
                                </td>
                                <td className="px-4 py-3">
                                  {currency.format(
                                    Number(appointment.service_price || 0),
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(appointment.status)}`}
                                  >
                                    {appointment.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        No appointments recorded.
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="text-lg font-bold">Payment history</h3>
                    {profile.payments?.length ? (
                      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Receipt</th>
                              <th className="px-4 py-3">Service</th>
                              <th className="px-4 py-3">Method</th>
                              <th className="px-4 py-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {profile.payments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="px-4 py-3 font-medium">
                                  {payment.receipt_number}
                                </td>
                                <td className="px-4 py-3">
                                  {payment.service_name}
                                </td>
                                <td className="px-4 py-3 capitalize">
                                  {payment.payment_method}
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                  {currency.format(Number(payment.amount || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        No payments recorded.
                      </p>
                    )}
                  </section>

                  {profile.queueHistory?.length > 0 && (
                    <section>
                      <h3 className="text-lg font-bold">Queue history</h3>
                      <div className="mt-3 space-y-2">
                        {profile.queueHistory.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                Queue entry #{item.id}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(item.created_at)}
                              </p>
                            </div>
                            <span
                              className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

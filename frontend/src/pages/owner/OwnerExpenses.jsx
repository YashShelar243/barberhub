import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "equipment", label: "Equipment" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const initialForm = {
  title: "",
  category: "supplies",
  amount: "",
  expense_date: getToday(),
  payment_method: "cash",
  notes: "",
};

const emptySummary = {
  revenue: 0,
  expenses: 0,
  netProfit: 0,
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const value = String(date).slice(0, 10);
  const [year, month, day] = value.split("-");

  return `${day}-${month}-${year}`;
};

export default function OwnerExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [form, setForm] = useState(initialForm);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [expensesResponse, summaryResponse] = await Promise.all([
        api.get("/expenses", { params }),
        api.get("/expenses/summary", { params }),
      ]);

      setExpenses(expensesResponse.data.expenses || []);

      const data = summaryResponse.data.summary || emptySummary;

      setSummary({
        revenue: Number(data.revenue) || 0,
        expenses: Number(data.expenses) || 0,
        netProfit: Number(data.netProfit) || 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load expenses and profit summary. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    const amount = Number(form.amount);

    if (
      !form.amount ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9999999999.99
    ) {
      setError("Please enter a valid expense amount greater than zero.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/expenses", {
        ...form,
        title: form.title.trim(),
        amount,
        notes: form.notes.trim(),
        expense_date: form.expense_date || undefined,
      });

      setForm({
        ...initialForm,
        expense_date: getToday(),
      });

      setMessage("Expense recorded successfully.");

      // Refresh both the expense list and profit summary.
      await loadExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the expense. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense) => {
    const confirmed = window.confirm(
      `Delete "${expense.title}" (${formatCurrency(expense.amount)})?`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(expense.id);

    try {
      await api.delete(`/expenses/${expense.id}`);

      setMessage("Expense deleted successfully.");

      // Recalculate expenses and profit after deletion.
      await loadExpenses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete the expense. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const categoryTotals = expenses.reduce((totals, expense) => {
    const category = expense.category;

    totals[category] = (totals[category] || 0) + Number(expense.amount || 0);

    return totals;
  }, {});

  const profitIsPositive = summary.netProfit >= 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Expense Management</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track shop expenses, service revenue, and estimated net profit.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          >
            {message}
          </div>
        )}

        {/* Profit summary */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              Business Financial Summary
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {startDate || endDate
                ? `${startDate ? formatDate(startDate) : "All dates"} – ${
                    endDate ? formatDate(endDate) : "All dates"
                  }`
                : "All recorded history"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Completed Service Revenue
              </p>
              <p className="mt-3 text-2xl font-bold text-green-600">
                {loading ? "Loading..." : formatCurrency(summary.revenue)}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Completed appointments and walk-ins
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Expenses
              </p>
              <p className="mt-3 text-2xl font-bold text-red-600">
                {loading ? "Loading..." : formatCurrency(summary.expenses)}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Recorded expenses for the selected period
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Net Profit / Loss
              </p>
              <p
                className={`mt-3 text-2xl font-bold ${
                  profitIsPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {loading ? "Loading..." : formatCurrency(summary.netProfit)}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Revenue minus recorded expenses
              </p>
            </div>
          </div>
        </section>

        {/* Add expense form */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-lg font-semibold">Add New Expense</h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="expense-title"
                  className="mb-1 block text-sm font-medium"
                >
                  Expense Title *
                </label>
                <input
                  id="expense-title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  maxLength={150}
                  required
                  placeholder="e.g. Shop rent"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-blue-950"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-category"
                  className="mb-1 block text-sm font-medium"
                >
                  Category *
                </label>
                <select
                  id="expense-category"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="expense-amount"
                  className="mb-1 block text-sm font-medium"
                >
                  Amount (₹) *
                </label>
                <input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  value={form.amount}
                  onChange={updateField}
                  required
                  placeholder="e.g. 2500"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-date"
                  className="mb-1 block text-sm font-medium"
                >
                  Expense Date *
                </label>
                <input
                  id="expense-date"
                  name="expense_date"
                  type="date"
                  value={form.expense_date}
                  onChange={updateField}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-payment"
                  className="mb-1 block text-sm font-medium"
                >
                  Payment Method *
                </label>
                <select
                  id="expense-payment"
                  name="payment_method"
                  value={form.payment_method}
                  onChange={updateField}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="expense-notes"
                  className="mb-1 block text-sm font-medium"
                >
                  Notes
                </label>
                <input
                  id="expense-notes"
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  maxLength={2000}
                  placeholder="Optional details"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Expense"}
            </button>
          </form>
        </section>

        {/* Expense history and filters */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Expense History</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select a date range to filter expenses and recalculate profit.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="filter-start"
                  className="mb-1 block text-xs font-medium"
                >
                  From
                </label>
                <input
                  id="filter-start"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label
                  htmlFor="filter-end"
                  className="mb-1 block text-xs font-medium"
                >
                  To
                </label>
                <input
                  id="filter-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:col-span-2"
              >
                Clear Date Filters
              </button>
            </div>
          </div>

          {/* Expense totals by category */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {CATEGORIES.filter(
                (category) => categoryTotals[category.value] > 0,
              ).map((category) => (
                <div
                  key={category.value}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-gray-800"
                >
                  <span className="text-gray-600 dark:text-gray-400">
                    {category.label}:
                  </span>{" "}
                  <span className="font-semibold">
                    {formatCurrency(categoryTotals[category.value])}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Expense table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Expense</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Notes</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-gray-500"
                    >
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-gray-500"
                    >
                      No expenses found for the selected dates.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="whitespace-nowrap px-3 py-4">
                        {formatDate(expense.expense_date)}
                      </td>

                      <td className="px-3 py-4 font-medium">{expense.title}</td>

                      <td className="px-3 py-4 capitalize">
                        {String(expense.category).replaceAll("_", " ")}
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {String(expense.payment_method).replaceAll("_", " ")}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>

                      <td className="max-w-48 px-3 py-4 text-gray-500">
                        {expense.notes || "—"}
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => handleDelete(expense)}
                          disabled={deletingId === expense.id}
                          className="rounded-md px-2 py-1 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950"
                        >
                          {deletingId === expense.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              {expenses.length} expense record(s) displayed
            </span>
            <span className="font-semibold">
              Filtered total: {formatCurrency(summary.expenses)}
            </span>
          </div>
        </section>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Profit is calculated as completed service revenue minus recorded
          expenses. It does not include unrecorded costs, taxes, or other
          accounting adjustments.
        </p>
      </div>
    </div>
  );
}

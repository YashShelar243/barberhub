import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function OwnerPayments() {
  const [services, setServices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [eligibleResponse, receiptsResponse] = await Promise.all([
        api.get("/payments/eligible"),
        api.get("/payments"),
      ]);

      setServices(eligibleResponse.data.services || []);
      setReceipts(receiptsResponse.data.receipts || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load payment information. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePayment = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setActiveReceipt(null);

    const service = services.find(
      (item) => `${item.source_type}:${item.source_id}` === selectedService,
    );

    if (!service) {
      setError("Please select a completed service.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        payment_method: paymentMethod,
        ...(service.source_type === "appointment"
          ? { appointment_id: service.source_id }
          : { queue_id: service.source_id }),
      };

      const response = await api.post("/payments", payload);

      setActiveReceipt({
        ...response.data.receipt,
        shop_name: response.data.shop?.name,
        shop_phone: response.data.shop?.phone,
        shop_email: response.data.shop?.email,
        shop_address: response.data.shop?.address,
        shop_city: response.data.shop?.city,
      });

      setMessage("Payment recorded successfully. Invoice generated.");
      setSelectedService("");
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const viewReceipt = async (id) => {
    setError("");
    setMessage("");

    try {
      const response = await api.get(`/payments/${id}`);
      setActiveReceipt(response.data.receipt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load this invoice.");
    }
  };

  const printReceipt = () => {
    if (!activeReceipt) {
      setError("Please select an invoice before printing.");
      return;
    }

    window.print();
  };

  const totalCollected = receipts
    .filter((receipt) => receipt.payment_status === "paid")
    .reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-white sm:px-6 lg:px-8">
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          html,
          body,
          #root {
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .receipt-print,
          .receipt-print * {
            visibility: visible !important;
          }

          .receipt-print {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 8mm !important;
            color: #000000 !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .receipt-print * {
            color: #000000 !important;
            text-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="no-print">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Payments & Receipts
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Record completed service payments and manage customer invoices.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="no-print rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="no-print rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          >
            {message}
          </div>
        )}

        <div className="no-print grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total invoices
            </p>
            <p className="mt-2 text-2xl font-bold">{receipts.length}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recorded payments
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalCollected)}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Record payment */}
          <section className="no-print rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="text-lg font-semibold">Record a payment</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Only completed services without an existing receipt appear here.
            </p>

            {loading ? (
              <p className="mt-5 text-sm text-gray-500">
                Loading completed services...
              </p>
            ) : (
              <form onSubmit={handlePayment} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="completed-service"
                    className="mb-2 block text-sm font-medium"
                  >
                    Completed service
                  </label>

                  <select
                    id="completed-service"
                    value={selectedService}
                    onChange={(event) => setSelectedService(event.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option
                        key={`${service.source_type}:${service.source_id}`}
                        value={`${service.source_type}:${service.source_id}`}
                      >
                        {service.customer_name} — {service.service_name} (
                        {formatCurrency(service.amount)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedService && (
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    {services
                      .filter(
                        (service) =>
                          `${service.source_type}:${service.source_id}` ===
                          selectedService,
                      )
                      .map((service) => (
                        <div
                          key={`${service.source_type}:${service.source_id}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-medium">
                              {service.service_name}
                            </p>
                            <p className="mt-1 text-xs capitalize text-gray-500 dark:text-gray-400">
                              {service.source_type} · {service.customer_name}
                            </p>
                          </div>
                          <p className="text-lg font-bold">
                            {formatCurrency(service.amount)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="payment-method"
                    className="mb-2 block text-sm font-medium"
                  >
                    Payment method
                  </label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || loading || !services.length}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Recording payment..." : "Record Payment"}
                </button>

                {!loading && services.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No completed services are awaiting payment.
                  </p>
                )}
              </form>
            )}
          </section>

          {/* Professional invoice preview */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="no-print text-lg font-semibold">
              Professional Invoice
            </h2>

            {!activeReceipt ? (
              <div className="no-print mt-5 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                Record a payment or select a receipt from history to preview the
                invoice.
              </div>
            ) : (
              <div className="receipt-print mx-auto mt-5 max-w-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm sm:p-8">
                {/* Shop details */}
                <div className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-5">
                  <div>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white">
                      {(activeReceipt.shop_name || "BH")
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </div>

                    <h3 className="text-2xl font-bold">
                      {activeReceipt.shop_name || "BarberHub Shop"}
                    </h3>

                    {activeReceipt.shop_address && (
                      <p className="mt-2 text-sm">
                        {activeReceipt.shop_address}
                      </p>
                    )}

                    {activeReceipt.shop_city && (
                      <p className="text-sm">{activeReceipt.shop_city}</p>
                    )}

                    {activeReceipt.shop_phone && (
                      <p className="mt-2 text-sm">
                        Phone: {activeReceipt.shop_phone}
                      </p>
                    )}

                    {activeReceipt.shop_email && (
                      <p className="text-sm">{activeReceipt.shop_email}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                      Payment document
                    </p>
                    <h4 className="mt-1 text-xl font-extrabold tracking-wide">
                      INVOICE
                    </h4>
                    <p className="mt-2 break-all text-sm font-semibold">
                      {activeReceipt.receipt_number}
                    </p>
                    <span className="mt-2 inline-block rounded-full border border-green-300 px-3 py-1 text-xs font-bold uppercase text-green-700">
                      {activeReceipt.payment_status || "paid"}
                    </span>
                  </div>
                </div>

                {/* Customer and payment details */}
                <div className="mt-6 grid grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Billed to
                    </p>
                    <p className="mt-2 font-bold">
                      {activeReceipt.customer_name || "Walk-in Customer"}
                    </p>
                    {activeReceipt.customer_id && (
                      <p className="mt-1 text-sm text-gray-500">
                        Customer ID: {activeReceipt.customer_id}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Payment details
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="font-semibold">Date: </span>
                      {formatDate(
                        activeReceipt.paid_at || activeReceipt.created_at,
                      )}
                    </p>
                    <p className="mt-1 text-sm capitalize">
                      <span className="font-semibold">Method: </span>
                      {activeReceipt.payment_method || "—"}
                    </p>
                  </div>
                </div>

                {/* Service breakdown */}
                <div className="mt-7">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-y border-gray-300 bg-gray-50">
                        <th className="px-3 py-3 font-semibold">Description</th>
                        <th className="px-3 py-3 text-right font-semibold">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-5">
                          <p className="font-semibold">
                            {activeReceipt.service_name || "Barber service"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Service provided
                          </p>
                        </td>
                        <td className="px-3 py-5 text-right font-semibold">
                          {formatCurrency(activeReceipt.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Invoice totals */}
                <div className="ml-auto mt-5 max-w-xs space-y-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(activeReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-t-2 border-gray-900 pt-3 text-lg font-extrabold">
                    <span>Total paid</span>
                    <span>{formatCurrency(activeReceipt.amount)}</span>
                  </div>
                </div>

                {/* Invoice footer */}
                <div className="mt-8 border-t border-dashed border-gray-300 pt-5 text-center">
                  <p className="font-semibold">Thank you for choosing us!</p>
                  <p className="mt-1 text-xs text-gray-500">
                    We appreciate your visit. We look forward to serving you
                    again.
                  </p>
                </div>

                <div className="no-print mt-6">
                  <button
                    type="button"
                    onClick={printReceipt}
                    className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-700"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Payment history */}
        <section className="no-print overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold">Payment history</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your latest recorded receipts.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-gray-500">Loading receipts...</p>
          ) : receipts.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No receipts have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Service</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Method</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {receipts.map((receipt) => (
                    <tr
                      key={receipt.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-5 py-4 font-medium">
                        {receipt.receipt_number}
                      </td>
                      <td className="px-5 py-4">{receipt.customer_name}</td>
                      <td className="px-5 py-4">{receipt.service_name}</td>
                      <td className="px-5 py-4 font-semibold">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {receipt.payment_method}
                      </td>
                      <td className="px-5 py-4">
                        {formatDate(receipt.paid_at)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => viewReceipt(receipt.id)}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const initialReports = {
  appointments: {
    total_appointments: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    rejected: 0,
  },
  revenue: {
    today_revenue: 0,
    monthly_revenue: 0,
  },
  customerAnalytics: {
    total_customers: 0,
    repeat_customers: 0,
  },
  dailyRevenue: [],
  popularServices: [],
  topCustomers: [],
  monthlyRevenueTrend: [],
  walkIns: {
    active_walk_ins: 0,
    completed_walk_ins: 0,
  },
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const statCards = [
  {
    key: "today_revenue",
    title: "Today's Revenue",
    group: "revenue",
    color: "text-green-600 dark:text-green-400",
  },
  {
    key: "monthly_revenue",
    title: "This Month's Revenue",
    group: "revenue",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "total_appointments",
    title: "Total Appointments",
    group: "appointments",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "pending",
    title: "Pending",
    group: "appointments",
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "confirmed",
    title: "Confirmed",
    group: "appointments",
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "completed",
    title: "Completed",
    group: "appointments",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "cancelled",
    title: "Cancelled",
    group: "appointments",
    color: "text-red-600 dark:text-red-400",
  },
  {
    key: "rejected",
    title: "Rejected",
    group: "appointments",
    color: "text-gray-600 dark:text-gray-300",
  },
];

export default function OwnerReports() {
  const [reports, setReports] = useState(initialReports);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/reports/owner");
        const data = response.data || {};

        if (cancelled) return;

        setReports({
          ...initialReports,
          ...data,
          appointments: {
            ...initialReports.appointments,
            ...(data.appointments || {}),
          },
          revenue: {
            ...initialReports.revenue,
            ...(data.revenue || {}),
          },
          customerAnalytics: {
            ...initialReports.customerAnalytics,
            ...(data.customerAnalytics || {}),
          },
          walkIns: {
            ...initialReports.walkIns,
            ...(data.walkIns || {}),
          },
          dailyRevenue: Array.isArray(data.dailyRevenue)
            ? data.dailyRevenue
            : [],
          popularServices: Array.isArray(data.popularServices)
            ? data.popularServices
            : [],
          topCustomers: Array.isArray(data.topCustomers)
            ? data.topCustomers
            : [],
          monthlyRevenueTrend: Array.isArray(data.monthlyRevenueTrend)
            ? data.monthlyRevenueTrend
            : [],
        });

        setShopName(data.shop?.name || "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load reports. Please try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReports();

    return () => {
      cancelled = true;
    };
  }, []);

  // Export all report summaries and analytics to Excel.
  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ["BarberHub - Business Reports"],
        ["Shop Name", shopName || "Your shop"],
        ["Generated On", new Date().toLocaleString("en-IN")],
        [],
        ["Metric", "Value"],
        [
          "Today's Estimated Revenue (INR)",
          Number(reports.revenue.today_revenue) || 0,
        ],
        [
          "Monthly Estimated Revenue (INR)",
          Number(reports.revenue.monthly_revenue) || 0,
        ],
        [
          "Total Appointments",
          Number(reports.appointments.total_appointments) || 0,
        ],
        ["Pending Appointments", Number(reports.appointments.pending) || 0],
        ["Confirmed Appointments", Number(reports.appointments.confirmed) || 0],
        ["Completed Appointments", Number(reports.appointments.completed) || 0],
        ["Cancelled Appointments", Number(reports.appointments.cancelled) || 0],
        ["Rejected Appointments", Number(reports.appointments.rejected) || 0],
        ["Active Walk-ins", Number(reports.walkIns.active_walk_ins) || 0],
        ["Completed Walk-ins", Number(reports.walkIns.completed_walk_ins) || 0],
        [],
        [
          "Total Registered Customers",
          Number(reports.customerAnalytics.total_customers) || 0,
        ],
        [
          "Repeat Customers",
          Number(reports.customerAnalytics.repeat_customers) || 0,
        ],
        [],
        [
          "Revenue Note",
          "Estimated revenue uses completed service prices. Collected revenue uses recorded paid payments after discounts.",
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 36 }, { wch: 95 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const dailyData = reports.dailyRevenue.map((day) => ({
        Date: day.date,
        "Completed Services": Number(day.completed_appointments) || 0,
        "Estimated Revenue (INR)": Number(day.revenue) || 0,
      }));

      const dailySheet = XLSX.utils.json_to_sheet(dailyData, {
        header: ["Date", "Completed Services", "Estimated Revenue (INR)"],
      });
      dailySheet["!cols"] = [{ wch: 16 }, { wch: 24 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, dailySheet, "Daily Revenue");

      const serviceData = reports.popularServices.map((service) => ({
        "Service Name": service.service_name,
        "Completed Bookings": Number(service.bookings) || 0,
        "Estimated Revenue (INR)": Number(service.revenue) || 0,
      }));

      const servicesSheet = XLSX.utils.json_to_sheet(serviceData, {
        header: [
          "Service Name",
          "Completed Bookings",
          "Estimated Revenue (INR)",
        ],
      });
      servicesSheet["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, servicesSheet, "Popular Services");

      const customerData = reports.topCustomers.map((customer, index) => ({
        Rank: index + 1,
        Customer: customer.name || "Customer",
        Phone: customer.phone || "",
        "Recorded Payments": Number(customer.payment_count) || 0,
        "Total Spent (INR)": Number(customer.total_spent) || 0,
      }));

      const customersSheet = XLSX.utils.json_to_sheet(customerData, {
        header: [
          "Rank",
          "Customer",
          "Phone",
          "Recorded Payments",
          "Total Spent (INR)",
        ],
      });
      customersSheet["!cols"] = [
        { wch: 10 },
        { wch: 28 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(workbook, customersSheet, "Top Customers");

      const monthlyData = reports.monthlyRevenueTrend.map((month) => ({
        Month: month.month_label || month.month,
        "Collected Revenue (INR)": Number(month.revenue) || 0,
        "Paid Transactions": Number(month.payment_count) || 0,
      }));

      const monthlySheet = XLSX.utils.json_to_sheet(monthlyData, {
        header: ["Month", "Collected Revenue (INR)", "Paid Transactions"],
      });
      monthlySheet["!cols"] = [{ wch: 18 }, { wch: 27 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(
        workbook,
        monthlySheet,
        "Monthly Collections",
      );

      const safeShopName = (shopName || "BarberHub")
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim();

      const date = new Date().toISOString().slice(0, 10);

      XLSX.writeFile(workbook, `${safeShopName}_Reports_${date}.xlsx`);
    } catch (err) {
      console.error("Excel export error:", err);
      window.alert("Unable to export the Excel report. Please try again.");
    }
  };

  // Export reports and customer analytics to PDF.
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const generatedOn = new Date().toLocaleString("en-IN");

      doc.setFontSize(20);
      doc.text("BarberHub Business Report", 14, 20);

      doc.setFontSize(11);
      doc.text(`Shop: ${shopName || "Your shop"}`, 14, 30);
      doc.text(`Generated: ${generatedOn}`, 14, 37);

      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Today's Estimated Revenue", money(reports.revenue.today_revenue)],
          ["Monthly Estimated Revenue", money(reports.revenue.monthly_revenue)],
          [
            "Total Appointments",
            String(reports.appointments.total_appointments),
          ],
          ["Pending", String(reports.appointments.pending)],
          ["Confirmed", String(reports.appointments.confirmed)],
          ["Completed", String(reports.appointments.completed)],
          ["Cancelled", String(reports.appointments.cancelled)],
          ["Rejected", String(reports.appointments.rejected)],
          ["Active Walk-ins", String(reports.walkIns.active_walk_ins)],
          ["Completed Walk-ins", String(reports.walkIns.completed_walk_ins)],
          [
            "Total Registered Customers",
            String(reports.customerAnalytics.total_customers),
          ],
          [
            "Repeat Customers",
            String(reports.customerAnalytics.repeat_customers),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      let nextY = doc.lastAutoTable.finalY + 12;

      if (nextY > 245) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFontSize(14);
      doc.text("Monthly Collected Revenue (Last 6 Months)", 14, nextY);

      autoTable(doc, {
        startY: nextY + 5,
        head: [["Month", "Collected Revenue", "Paid Transactions"]],
        body: reports.monthlyRevenueTrend.length
          ? reports.monthlyRevenueTrend.map((month) => [
              String(month.month_label || month.month || ""),
              money(month.revenue),
              String(Number(month.payment_count) || 0),
            ])
          : [["No data available", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [126, 34, 206] },
        styles: { fontSize: 9 },
      });

      nextY = doc.lastAutoTable.finalY + 12;

      if (nextY > 245) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFontSize(14);
      doc.text("Top 5 Customers by Recorded Spending", 14, nextY);

      autoTable(doc, {
        startY: nextY + 5,
        head: [["Customer", "Phone", "Payments", "Total Spent"]],
        body: reports.topCustomers.length
          ? reports.topCustomers.map((customer) => [
              String(customer.name || "Customer"),
              String(customer.phone || "-"),
              String(Number(customer.payment_count) || 0),
              money(customer.total_spent),
            ])
          : [["No customers available", "-", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 40 },
        },
      });

      let nextSectionY = doc.lastAutoTable.finalY + 12;

      if (nextSectionY > 245) {
        doc.addPage();
        nextSectionY = 20;
      }

      doc.setFontSize(14);
      doc.text("Daily Revenue (Last 7 Days)", 14, nextSectionY);

      autoTable(doc, {
        startY: nextSectionY + 5,
        head: [["Date", "Completed Services", "Estimated Revenue"]],
        body: reports.dailyRevenue.length
          ? reports.dailyRevenue.map((day) => [
              String(day.date),
              String(Number(day.completed_appointments) || 0),
              money(day.revenue),
            ])
          : [["No data available", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      nextSectionY = doc.lastAutoTable.finalY + 12;

      if (nextSectionY > 245) {
        doc.addPage();
        nextSectionY = 20;
      }

      doc.setFontSize(14);
      doc.text("Popular Services", 14, nextSectionY);

      autoTable(doc, {
        startY: nextSectionY + 5,
        head: [["Service", "Completed Bookings", "Estimated Revenue"]],
        body: reports.popularServices.length
          ? reports.popularServices.map((service) => [
              String(service.service_name || ""),
              String(Number(service.bookings) || 0),
              money(service.revenue),
            ])
          : [["No services available", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      const safeShopName = (shopName || "BarberHub")
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim();

      const date = new Date().toISOString().slice(0, 10);

      doc.save(`${safeShopName}_Reports_${date}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      window.alert("Unable to export the PDF report. Please try again.");
    }
  };

  const cardValue = (card) => {
    const value = reports[card.group]?.[card.key] ?? 0;
    return card.group === "revenue" ? money(value) : value;
  };

  const maxDailyRevenue = Math.max(
    1,
    ...reports.dailyRevenue.map((day) => Number(day.revenue) || 0),
  );

  const maxMonthlyRevenue = Math.max(
    1,
    ...reports.monthlyRevenueTrend.map((month) => Number(month.revenue) || 0),
  );

  const sixMonthCollectedRevenue = reports.monthlyRevenueTrend.reduce(
    (total, month) => total + (Number(month.revenue) || 0),
    0,
  );

  const topCustomerSpending = Number(reports.topCustomers[0]?.total_spent || 0);

  const panelClass =
    "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900";

  const headingClass = "text-lg font-bold text-gray-900 dark:text-white";

  if (loading) {
    return (
      <section className={panelClass}>
        <p className="text-gray-600 dark:text-gray-300">
          Loading business reports...
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6" aria-labelledby="reports-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="reports-heading"
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Business Reports
          </h2>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {shopName || "Your shop"} · Business and customer analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!!error}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export to Excel
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={!!error}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export to PDF
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Refresh Reports
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {!error && (
        <>
          {/* Existing revenue and appointment cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <article
                key={card.key}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>

                <p className={`mt-3 text-2xl font-bold ${card.color}`}>
                  {cardValue(card)}
                </p>
              </article>
            ))}
          </div>

          {/* New customer analytics cards */}
          <div>
            <h3 className={`${headingClass} mb-4`}>Customer Analytics</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className={panelClass}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Registered Customers
                </p>
                <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {Number(reports.customerAnalytics.total_customers) || 0}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Customers linked to your shop
                </p>
              </article>

              <article className={panelClass}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Repeat Customers
                </p>
                <p className="mt-3 text-3xl font-bold text-green-600 dark:text-green-400">
                  {Number(reports.customerAnalytics.repeat_customers) || 0}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  More than one recorded paid visit
                </p>
              </article>

              <article className={panelClass}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Six-Month Collected Revenue
                </p>
                <p className="mt-3 text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {money(sixMonthCollectedRevenue)}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Recorded payments after discounts
                </p>
              </article>

              <article className={panelClass}>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Top Customer Spending
                </p>
                <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {money(topCustomerSpending)}
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Highest recorded customer spending
                </p>
              </article>
            </div>
          </div>

          {/* Six-month collected-revenue chart */}
          <div className={panelClass}>
            <h3 className={headingClass}>Monthly Collected Revenue</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Actual recorded payments after discounts over the last six months
            </p>

            {reports.monthlyRevenueTrend.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No payment data available for this period.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {reports.monthlyRevenueTrend.map((month) => {
                  const revenue = Number(month.revenue) || 0;
                  const width = (revenue / maxMonthlyRevenue) * 100;

                  return (
                    <div key={month.month}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {month.month_label || month.month}
                        </span>

                        <span className="text-gray-600 dark:text-gray-300">
                          {money(revenue)} · {Number(month.payment_count) || 0}{" "}
                          payments
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-purple-600 transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top five customers */}
          <div className={panelClass}>
            <h3 className={headingClass}>Top 5 Customers</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ranked by actual recorded paid spending
            </p>

            {reports.topCustomers.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No registered customers with recorded payments yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="py-3 pr-4 font-medium">Customer</th>
                      <th className="py-3 pr-4 font-medium">Payments</th>
                      <th className="py-3 text-right font-medium">
                        Total Spent
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {reports.topCustomers.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {index + 1}
                            </span>

                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {customer.name || "Customer"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {customer.phone || "No phone number"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                          {Number(customer.payment_count) || 0}
                        </td>

                        <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {money(customer.total_spent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Existing daily revenue report */}
          <div className={panelClass}>
            <h3 className={headingClass}>Daily Revenue</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Completed services over the last seven calendar days
            </p>

            {reports.dailyRevenue.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No completed services in this period.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {reports.dailyRevenue.map((day) => {
                  const revenue = Number(day.revenue) || 0;
                  const width = (revenue / maxDailyRevenue) * 100;

                  return (
                    <div key={day.date}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </span>

                        <span className="text-gray-600 dark:text-gray-300">
                          {money(revenue)} ·{" "}
                          {Number(day.completed_appointments) || 0} services
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Existing popular services report */}
          <div className={panelClass}>
            <h3 className={headingClass}>Popular Services</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ranked by completed service bookings
            </p>

            {reports.popularServices.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No completed service bookings yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <th className="py-3 pr-4 font-medium">Service</th>
                      <th className="py-3 pr-4 font-medium">Completed</th>
                      <th className="py-3 text-right font-medium">
                        Estimated Revenue
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {reports.popularServices.map((service) => (
                      <tr
                        key={service.service_name}
                        className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                      >
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                          {service.service_name}
                        </td>

                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                          {Number(service.bookings) || 0}
                        </td>

                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {money(service.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
            Estimated revenue is calculated from completed service prices and
            does not confirm payment collection. Customer spending and monthly
            collected revenue use recorded payments marked as paid, after
            applicable discounts.
          </p>
        </>
      )}
    </section>
  );
}

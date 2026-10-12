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
  dailyRevenue: [],
  popularServices: [],
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

        if (cancelled) return;

        setReports({
          ...initialReports,
          ...response.data,
          appointments: {
            ...initialReports.appointments,
            ...response.data.appointments,
          },
          revenue: {
            ...initialReports.revenue,
            ...response.data.revenue,
          },
          dailyRevenue: response.data.dailyRevenue || [],
          popularServices: response.data.popularServices || [],
        });

        setShopName(response.data.shop?.name || "");
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

  // Export reports to Excel
  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const summaryData = [
        ["BarberHub - Business Reports"],
        ["Shop Name", shopName || "Your shop"],
        ["Generated On", new Date().toLocaleString("en-IN")],
        [],
        ["Metric", "Value"],
        ["Today's Revenue (INR)", Number(reports.revenue.today_revenue) || 0],
        ["Monthly Revenue (INR)", Number(reports.revenue.monthly_revenue) || 0],
        [
          "Total Appointments",
          Number(reports.appointments.total_appointments) || 0,
        ],
        ["Pending Appointments", Number(reports.appointments.pending) || 0],
        ["Confirmed Appointments", Number(reports.appointments.confirmed) || 0],
        ["Completed Appointments", Number(reports.appointments.completed) || 0],
        ["Cancelled Appointments", Number(reports.appointments.cancelled) || 0],
        ["Rejected Appointments", Number(reports.appointments.rejected) || 0],
        [],
        [
          "Revenue Note",
          "Revenue is estimated from completed appointments and recorded service prices. Payment collection is not verified.",
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 32 }, { wch: 95 }];

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const dailyData = reports.dailyRevenue.map((day) => ({
        Date: day.date,
        "Completed Appointments": Number(day.completed_appointments) || 0,
        "Revenue (INR)": Number(day.revenue) || 0,
      }));

      const dailySheet = XLSX.utils.json_to_sheet(dailyData, {
        header: ["Date", "Completed Appointments", "Revenue (INR)"],
      });

      dailySheet["!cols"] = [{ wch: 16 }, { wch: 25 }, { wch: 18 }];

      XLSX.utils.book_append_sheet(workbook, dailySheet, "Daily Revenue");

      const serviceData = reports.popularServices.map((service) => ({
        "Service Name": service.service_name,
        "Completed Bookings": Number(service.bookings) || 0,
        "Revenue (INR)": Number(service.revenue) || 0,
      }));

      const servicesSheet = XLSX.utils.json_to_sheet(serviceData, {
        header: ["Service Name", "Completed Bookings", "Revenue (INR)"],
      });

      servicesSheet["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }];

      XLSX.utils.book_append_sheet(workbook, servicesSheet, "Popular Services");

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

  // Export reports to PDF
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
          ["Today's Revenue", money(reports.revenue.today_revenue)],
          ["Monthly Revenue", money(reports.revenue.monthly_revenue)],
          [
            "Total Appointments",
            String(reports.appointments.total_appointments),
          ],
          ["Pending", String(reports.appointments.pending)],
          ["Confirmed", String(reports.appointments.confirmed)],
          ["Completed", String(reports.appointments.completed)],
          ["Cancelled", String(reports.appointments.cancelled)],
          ["Rejected", String(reports.appointments.rejected)],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      let nextY = doc.lastAutoTable.finalY + 12;

      if (nextY > 250) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFontSize(14);
      doc.text("Daily Revenue (Last 7 Days)", 14, nextY);

      autoTable(doc, {
        startY: nextY + 5,
        head: [["Date", "Completed Appointments", "Revenue"]],
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

      nextY = doc.lastAutoTable.finalY + 12;

      if (nextY > 250) {
        doc.addPage();
        nextY = 20;
      }

      doc.setFontSize(14);
      doc.text("Popular Services", 14, nextY);

      autoTable(doc, {
        startY: nextY + 5,
        head: [["Service", "Completed Bookings", "Revenue"]],
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

      let finalY = doc.lastAutoTable.finalY + 12;

      if (finalY > 270) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(9);
      doc.text(
        "Revenue is estimated from completed appointments and recorded service prices. Payment collection is not verified.",
        14,
        finalY,
        { maxWidth: 180 },
      );

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

  const maxRevenue = Math.max(
    1,
    ...reports.dailyRevenue.map((day) => Number(day.revenue) || 0),
  );

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
            {shopName || "Your shop"} · Revenue and appointment overview
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

          <div className={panelClass}>
            <h3 className={headingClass}>Daily Revenue</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Completed appointments over the last seven calendar days
            </p>

            {reports.dailyRevenue.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                No completed appointments in this period.
              </p>
            ) : (
              <div className="mt-6 space-y-5">
                {reports.dailyRevenue.map((day) => {
                  const revenue = Number(day.revenue) || 0;
                  const width = (revenue / maxRevenue) * 100;

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
                          {money(revenue)} · {day.completed_appointments}{" "}
                          appointments
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

          <div className={panelClass}>
            <h3 className={headingClass}>Popular Services</h3>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ranked by completed appointments
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
                      <th className="py-3 text-right font-medium">Revenue</th>
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
                          {service.bookings}
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
            Revenue figures are estimates calculated from completed appointments
            and recorded service prices. They do not confirm that payment was
            collected.
          </p>
        </>
      )}
    </section>
  );
}

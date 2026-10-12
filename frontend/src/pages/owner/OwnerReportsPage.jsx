import { Link } from "react-router-dom";
import OwnerReports from "./OwnerReports";

export default function OwnerReportsPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            to="/owner/dashboard"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Business Reports
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Review your shop's revenue, appointments, and popular services.
          </p>
        </div>

        <OwnerReports />
      </div>
    </main>
  );
}

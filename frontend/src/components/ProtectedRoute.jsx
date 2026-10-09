import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Verifying your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboardRoutes = {
      customer: "/customer/dashboard",
      owner: "/owner/dashboard",
      admin: "/admin/dashboard",
    };

    return <Navigate to={dashboardRoutes[user.role] || "/login"} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

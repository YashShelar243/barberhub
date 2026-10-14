import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import ProtectedRoute from "./components/ProtectedRoute";

import AdminDashboard from "./pages/admin/AdminDashboard";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAppointments from "./pages/owner/OwnerAppointments";
import OwnerServices from "./pages/owner/OwnerServices";
import OwnerProfile from "./pages/owner/OwnerProfile";
import OwnerReportsPage from "./pages/owner/OwnerReportsPage";
import OwnerQueue from "./pages/owner/OwnerQueue";
import OwnerPayments from "./pages/owner/OwnerPayments";

import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerShops from "./pages/customer/CustomerShops";
import CustomerAppointments from "./pages/customer/CustomerAppointments";
import ShopDetails from "./pages/customer/ShopDetails";

function AppRoutes() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer routes */}
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/shops" element={<CustomerShops />} />
          <Route
            path="/customer/appointments"
            element={<CustomerAppointments />}
          />
          <Route path="/customer/shops/:shopId" element={<ShopDetails />} />
        </Route>

        {/* Owner routes */}
        <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/reports" element={<OwnerReportsPage />} />
          <Route path="/owner/appointments" element={<OwnerAppointments />} />
          <Route path="/owner/services" element={<OwnerServices />} />
          <Route path="/owner/profile" element={<OwnerProfile />} />
          <Route path="/owner/queue" element={<OwnerQueue />} />
          <Route path="/owner/payments" element={<OwnerPayments />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

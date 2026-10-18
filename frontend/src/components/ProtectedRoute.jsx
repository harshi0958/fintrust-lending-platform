
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading your FinTrust workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destinations = {
      CUSTOMER: "/customer",
      LOAN_MANAGER: "/manager",
      ADMIN: "/admin",
    };

    return (
      <Navigate
        to={destinations[user.role] || "/login"}
        replace
      />
    );
  }

  return <Outlet />;
}

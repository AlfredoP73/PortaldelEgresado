import { Navigate, Outlet } from "react-router-dom";
import PrivacyBlocker from "./PrivacyBlocker";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const getToken = () => localStorage.getItem("access_token");
const getUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.privacy_policy_accepted) {
        return <PrivacyBlocker onAccepted={() => window.location.reload()} />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role_name)) {
        // Redirigir a alguna página de 'No Autorizado' o al home correspondiente
        return <Navigate to="/login" replace />; // O a un Dashboard genérico
    }

    return <Outlet />;
}
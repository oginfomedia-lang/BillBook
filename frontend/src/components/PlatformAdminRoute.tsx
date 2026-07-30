import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { AccessDeniedPage } from "./AccessDeniedPage";

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isPlatformAdmin = !!user && user.is_super_admin && user.tenant_id === null;
    if (!isPlatformAdmin) {
        return <AccessDeniedPage />;
    }
    return <>{children}</>;
}
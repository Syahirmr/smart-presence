import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../stores/useAdminAuth';

type Props = {
  children: ReactNode;
};

export default function AdminProtectedRoute({ children }: Props) {
  const token = useAdminAuth((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
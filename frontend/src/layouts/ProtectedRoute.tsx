import { Navigate, Outlet } from 'react-router-dom';

/** 로그인 여부 확인 (JWT 토큰 존재 여부) */
export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

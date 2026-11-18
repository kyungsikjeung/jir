import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-dvh grid place-content-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            jir<span className="text-blue-600">.</span>
          </Link>
          <p className="text-xs text-gray-400 mt-1">ASPICE ALM</p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

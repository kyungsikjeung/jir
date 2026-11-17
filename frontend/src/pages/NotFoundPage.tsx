export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-gray-500 mb-6">Page not found</p>
      <a href="/" className="text-blue-600 hover:underline">Go to Dashboard</a>
    </div>
  );
}

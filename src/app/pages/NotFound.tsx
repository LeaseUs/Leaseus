import { Link } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl text-[#1E3A8A] mb-4">404</h1>
        <h2 className="text-xl text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#1E3A8A] text-white px-6 py-3 rounded-xl hover:bg-[#152d6b] transition-colors"
        >
          <Home className="w-4 h-4" />
          Go to Home
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="rounded-full bg-base-100 shadow-card p-4 inline-flex mb-4">
          <Compass size={28} className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold text-neutral">Page not found</h1>
        <p className="text-sm text-base-content/50 mt-1 mb-5">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/dashboard" className="btn-brand btn">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

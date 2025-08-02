'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, AlertTriangle, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">CivicTrack</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={() => {
                  // Handle logout
                }}
                className="btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-2 text-gray-600">
            Welcome to your CivicTrack dashboard. Report and track local issues in your community.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body text-center">
              <MapPin className="w-8 h-8 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Issue</h3>
              <p className="text-gray-600 mb-4">Report a new civic issue in your area</p>
              <button className="btn-primary w-full">Report Issue</button>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <AlertTriangle className="w-8 h-8 text-warning-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Issues</h3>
              <p className="text-gray-600 mb-4">Browse issues in your neighborhood</p>
              <button className="btn-secondary w-full">View Issues</button>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <TrendingUp className="w-8 h-8 text-success-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">My Reports</h3>
              <p className="text-gray-600 mb-4">Track your reported issues</p>
              <button className="btn-secondary w-full">My Reports</button>
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <Users className="w-8 h-8 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600 mb-4">Connect with your community</p>
              <button className="btn-secondary w-full">Community</button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Issues</h3>
              <p className="text-3xl font-bold text-primary-600">0</p>
              <p className="text-sm text-gray-600">in your area</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Reports</h3>
              <p className="text-3xl font-bold text-success-600">0</p>
              <p className="text-sm text-gray-600">issues reported</p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Resolved</h3>
              <p className="text-3xl font-bold text-warning-600">0</p>
              <p className="text-sm text-gray-600">issues resolved</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity to show</p>
              <p className="text-sm text-gray-400 mt-2">
                Start by reporting your first issue!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
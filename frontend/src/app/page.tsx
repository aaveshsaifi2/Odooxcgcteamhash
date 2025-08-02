'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, AlertTriangle, Users, TrendingUp, Shield, Globe } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: MapPin,
      title: 'Location-Based Reporting',
      description: 'Report issues in your neighborhood with precise GPS location tracking.'
    },
    {
      icon: AlertTriangle,
      title: 'Quick Issue Reporting',
      description: 'Easily report problems with photos, descriptions, and category selection.'
    },
    {
      icon: TrendingUp,
      title: 'Status Tracking',
      description: 'Track the progress of reported issues with real-time status updates.'
    },
    {
      icon: Users,
      title: 'Community Engagement',
      description: 'Connect with your local community and stay informed about neighborhood issues.'
    },
    {
      icon: Shield,
      title: 'Moderation & Safety',
      description: 'Robust moderation system ensures quality reports and community safety.'
    },
    {
      icon: Globe,
      title: 'Transparency',
      description: 'Full transparency with detailed status logs and resolution tracking.'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary-600">CivicTrack</h1>
              </div>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-700 hover:text-primary-600 transition-colors">
                Features
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-primary-600 transition-colors">
                About
              </Link>
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary">
                  Dashboard
                </Link>
              ) : (
                <div className="flex space-x-4">
                  <Link href="/login" className="btn-secondary">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Empower Citizens to
            <span className="text-primary-600"> Report Local Issues</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            CivicTrack enables communities to easily report and track local issues like road damage, 
            garbage, and water leaks. Foster transparency and engagement in your neighborhood.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link href="/report" className="btn-primary btn-lg">
                Report an Issue
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary btn-lg">
                  Get Started Free
                </Link>
                <Link href="/login" className="btn-secondary btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Community Engagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to report, track, and resolve local civic issues effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-lg border-2 transition-all duration-300 ${
                    index === currentFeature
                      ? 'border-primary-500 bg-primary-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-lg ${
                      index === currentFeature ? 'bg-primary-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        index === currentFeature ? 'text-primary-600' : 'text-gray-600'
                      }`} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Communities
            </h2>
            <p className="text-xl text-primary-100">
              Join thousands of citizens making their neighborhoods better.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-primary-100">Issues Reported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">5,000+</div>
              <div className="text-primary-100">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">85%</div>
              <div className="text-primary-100">Resolution Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50+</div>
              <div className="text-primary-100">Cities Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join CivicTrack today and start contributing to a better, more transparent community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link href="/report" className="btn-primary btn-lg">
                Report Your First Issue
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary btn-lg">
                  Create Free Account
                </Link>
                <Link href="/login" className="btn-secondary btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CivicTrack</h3>
              <p className="text-gray-400">
                Empowering citizens to report and track local issues for better communities.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Issue Reporting</li>
                <li>Status Tracking</li>
                <li>Community Engagement</li>
                <li>Location Services</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Twitter</li>
                <li>Facebook</li>
                <li>LinkedIn</li>
                <li>GitHub</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CivicTrack. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 
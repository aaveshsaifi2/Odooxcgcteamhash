'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, AlertTriangle, TrendingUp, Users, Shield, Globe, Eye, PlusCircle, Filter, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CreateIssueModal from '@/components/CreateIssueModal';
import IssueCard from '@/components/IssueCard';
import IssueFilters from '@/components/IssueFilters';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  location: {
    address: string;
    coordinates: [number, number];
  };
  images: string[];
  reporter: {
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    distance: '5'
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchIssues();
  }, [user, filters]);

  const fetchIssues = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/issues?${new URLSearchParams(filters as any)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      } else {
        toast.error('Failed to fetch issues');
      }
    } catch (error) {
      toast.error('Error fetching issues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (issueData: any) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', issueData.title);
      formData.append('description', issueData.description);
      formData.append('category', issueData.category);
      formData.append('latitude', issueData.latitude || '0');
      formData.append('longitude', issueData.longitude || '0');
      formData.append('address', issueData.address || '');
      formData.append('is_anonymous', issueData.is_anonymous || 'false');
      
      // Add images if any
      if (issueData.images && issueData.images.length > 0) {
        issueData.images.forEach((file: File) => {
          formData.append('images', file);
        });
      }

      const response = await fetch('http://localhost:5001/api/issues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Issue created successfully!');
        setShowCreateModal(false);
        fetchIssues();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create issue');
      }
    } catch (error) {
      toast.error('Error creating issue');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">CivicTrack Dashboard</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {user.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Issues</p>
                <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issues.filter(i => i.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issues.filter(i => i.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Reports</p>
                {/* <p className="text-2xl font-bold text-gray-900">
                  {issues.filter(i => i.reporter.email === user.email).length}
                </p> */}
              </div>
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Report Issue
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <IssueFilters filters={filters} onFiltersChange={setFilters} />

        {/* Issues List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Issues</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading issues...</p>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No issues found</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Report First Issue
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} onUpdate={fetchIssues} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateIssue}
        />
      )}
    </div>
  );
} 
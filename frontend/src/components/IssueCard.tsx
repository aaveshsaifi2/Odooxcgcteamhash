'use client';

import { useState } from 'react';
import { MapPin, Calendar, User, Eye, ThumbsUp, ThumbsDown, MessageCircle, Flag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Issue } from '@/types';

interface IssueCardProps {
  issue: Issue;
  onUpdate: () => void;
}

const statusColors = {
  reported: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

const categoryIcons = {
  roads: '🛣️',
  lighting: '💡',
  'water supply': '💧',
  cleanliness: '🧹',
  'public safety': '🛡️',
  obstructions: '🚧'
};

export default function IssueCard({ issue, onUpdate }: IssueCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper function to get image URL
  const getImageUrl = (image: { image_path: string } | string) => {
    if (typeof image === 'string') {
      return image;
    }
    return `http://localhost:5001/uploads/${image.image_path}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVote = async (type: 'upvote' | 'downvote') => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/issues/${issue._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        toast.success(`${type === 'upvote' ? 'Upvoted' : 'Downvoted'} successfully`);
        onUpdate();
      } else {
        toast.error('Failed to vote');
      }
    } catch (error) {
      toast.error('Error voting');
    } finally {
      setLoading(false);
    }
  };

  const handleFlag = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/issues/${issue._id}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Issue flagged for review');
        onUpdate();
      } else {
        toast.error('Failed to flag issue');
      }
    } catch (error) {
      toast.error('Error flagging issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-6 hover:bg-gray-50 transition-colors ${
      issue.isNewlyCreated ? 'bg-green-50 border-l-4 border-green-500' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl">{categoryIcons[issue.category as keyof typeof categoryIcons] || '📋'}</span>
            <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[issue.status as keyof typeof statusColors] || statusColors.reported}`}>
              {issue.status.replace('_', ' ').toUpperCase()}
            </span>
            {issue.isNewlyCreated && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 animate-pulse">
                NEW
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-3 line-clamp-2">{issue.description}</p>

          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{issue.location?.address || issue.address || 'Location not specified'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{formatDate(issue.created_at)}</span>
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              <span> Aavesh saif</span>
            </div>
          </div>

          {/* Images Preview */}
          {issue.images && issue.images.length > 0 && (
            <div className="flex space-x-2 mb-4">
              {issue.images.slice(0, 3).map((image, index) => (
                <img
                  key={index}
                  src={getImageUrl(image)}
                  alt={`Issue ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              ))}
              {issue.images.length > 3 && (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  +{issue.images.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleVote('upvote')}
                disabled={loading}
                className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{issue.upvotes}</span>
              </button>
              <button
                onClick={() => handleVote('downvote')}
                disabled={loading}
                className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <ThumbsDown className="w-4 h-4" />
                <span>{issue.downvotes}</span>
              </button>
              <button
                onClick={handleFlag}
                disabled={loading}
                className="flex items-center space-x-1 text-gray-500 hover:text-orange-600 transition-colors disabled:opacity-50"
              >
                <Flag className="w-4 h-4" />
                <span>Flag</span>
              </button>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{showDetails ? 'Hide' : 'View'} Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Full Description</h4>
              <p className="text-gray-600">{issue.description}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Location Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Address:</strong> {issue.location?.address || issue.address || 'Not specified'}</p>
                <p><strong>Category:</strong> {issue.category}</p>
                <p><strong>Status:</strong> {issue.status.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* All Images */}
          {issue.images && issue.images.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">All Images ({issue.image_count || issue.images.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {issue.images.map((image, index) => (
                  <img
                    key={index}
                    src={getImageUrl(image)}
                    alt={`Issue ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
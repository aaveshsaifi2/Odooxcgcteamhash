'use client';

import { Filter } from 'lucide-react';

interface Filters {
  status: string;
  category: string;
  distance: string;
}

interface IssueFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'reported', label: 'Reported' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'roads', label: 'Roads' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'water supply', label: 'Water Supply' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'public safety', label: 'Public Safety' },
  { value: 'obstructions', label: 'Obstructions' }
];

const distanceOptions = [
  { value: '1', label: '1 km' },
  { value: '3', label: '3 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' }
];

export default function IssueFilters({ filters, onFiltersChange }: IssueFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="flex items-center mb-4">
        <Filter className="w-5 h-5 text-gray-500 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category-filter"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Distance Filter */}
        <div>
          <label htmlFor="distance-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Distance
          </label>
          <select
            id="distance-filter"
            value={filters.distance}
            onChange={(e) => handleFilterChange('distance', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {distanceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.status !== 'all' || filters.category !== 'all' || filters.distance !== '5') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onFiltersChange({ status: 'all', category: 'all', distance: '5' })}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
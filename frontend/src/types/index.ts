export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_verified: boolean;
  is_admin: boolean;
  role?: string;
  created_at: string;
}

export interface Issue {
  id: string;
  _id?: string; // MongoDB ObjectId for compatibility
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  location?: {
    address: string;
    coordinates: [number, number];
    latitude?: number;
    longitude?: number;
  };
  address?: string;
  reporter_id?: string;
  reporter_name?: string;
  reporter?: {
    name: string;
    email: string;
  };
  is_anonymous: boolean;
  flag_count: number;
  upvotes: number;
  downvotes: number;
  is_hidden: boolean;
  image_count: number;
  distance?: number;
  created_at: string;
  updated_at: string;
  images?: Array<IssueImage | { image_path: string } | string>;
  status_logs?: StatusLog[];
  isNewlyCreated?: boolean; // UI-only flag for highlighting newly created issues
}

export interface IssueImage {
  id: string;
  image_path: string;
  created_at: string;
}

export interface StatusLog {
  id: string;
  issue_id: string;
  status: IssueStatus;
  comment?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
}

export type IssueCategory = 
  | 'roads'
  | 'lighting'
  | 'water_supply'
  | 'cleanliness'
  | 'public_safety'
  | 'obstructions';

export type IssueStatus = 
  | 'reported'
  | 'in_progress'
  | 'resolved';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IssuesResponse {
  issues: Issue[];
  pagination: Pagination;
}

export interface IssueResponse {
  issue: Issue;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface CreateIssueData {
  title: string;
  description: string;
  category: IssueCategory;
  latitude: number;
  longitude: number;
  address?: string;
  is_anonymous?: boolean;
  images?: File[];
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Filters {
  category?: IssueCategory;
  status?: IssueStatus;
  radius?: number;
}

export interface AdminStats {
  overall_stats: {
    total_issues: number;
    reported: number;
    in_progress: number;
    resolved: number;
    hidden: number;
    flagged: number;
  };
  user_stats: {
    total_users: number;
    verified_users: number;
    banned_users: number;
    admin_users: number;
  };
  recent_issues: Array<{
    id: string;
    title: string;
    category: IssueCategory;
    status: IssueStatus;
    created_at: string;
    reporter_name?: string;
  }>;
  category_stats: Array<{
    category: IssueCategory;
    count: number;
    resolved_count: number;
  }>;
  flagged_issues: Array<{
    id: string;
    title: string;
    category: IssueCategory;
    flag_count: number;
    created_at: string;
    reporter_name?: string;
  }>;
}

export interface UserStats {
  overview: {
    total_issues: number;
    reported: number;
    in_progress: number;
    resolved: number;
  };
  by_category: Array<{
    category: IssueCategory;
    count: number;
  }>;
} 
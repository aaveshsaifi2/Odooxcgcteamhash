# CivicTrack 🏛️

**Empower citizens to easily report local issues such as road damage, garbage, and water leaks. Seamlessly track the resolution of these issues and foster effortless engagement within your local community.**

## 🌟 Features

### Core Functionality
- **Location-Based Visibility**: Only civic issues within 3-5 km radius are visible based on GPS or manual location
- **Quick Issue Reporting**: Report issues with title, description, photos (up to 5), and category selection
- **Anonymous/Verified Reporting**: Support for both anonymous and verified user reporting
- **Status Tracking**: Real-time status updates with detailed logs and timestamps
- **Map Mode & Filtering**: Interactive map view with filters by status, category, and distance

### Issue Categories
- 🛣️ **Roads**: Potholes, obstructions, road damage
- 💡 **Lighting**: Broken or flickering street lights
- 💧 **Water Supply**: Leaks, low pressure, water issues
- 🗑️ **Cleanliness**: Overflowing bins, garbage, sanitation
- ⚠️ **Public Safety**: Open manholes, exposed wiring, safety hazards
- 🌳 **Obstructions**: Fallen trees, debris, blockages

### Moderation & Safety
- **Spam Detection**: Flag inappropriate or irrelevant reports
- **Auto-Hide**: Reports flagged by multiple users are automatically hidden pending review
- **Admin Dashboard**: Comprehensive admin panel for issue and user management
- **Analytics**: Detailed insights into issue patterns and community engagement

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, SQLite
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Upload**: Multer with Sharp image optimization
- **Maps**: React Map GL with Mapbox integration
- **State Management**: React Query for server state, Context API for auth

### Project Structure
```
civictrack/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── database/       # Database setup and queries
│   │   └── server.js       # Main server file
│   ├── data/              # SQLite database files
│   ├── uploads/           # Uploaded images
│   └── package.json
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # Reusable React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and API client
│   │   └── types/         # TypeScript type definitions
│   └── package.json
└── package.json           # Root package.json for monorepo
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civictrack
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend environment
   cd backend
   cp env.example .env
   # Edit .env with your configuration
   
   # Frontend environment (optional)
   cd ../frontend
   # Create .env.local if needed
   ```

4. **Database Setup**
   ```bash
   cd backend
   npm run migrate
   npm run seed
   ```

5. **Start Development Servers**
   ```bash
   # From root directory
   npm run dev
   
   # Or start individually:
   # Backend: npm run dev:backend
   # Frontend: npm run dev:frontend
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

### Default Credentials
After seeding the database, you can use these test accounts:

**Admin Account:**
- Email: `admin@civictrack.com`
- Password: `admin123`

**Sample User Accounts:**
- Email: `john@example.com` / Password: `password123`
- Email: `jane@example.com` / Password: `password123`
- Email: `mike@example.com` / Password: `password123`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/verify` - Verify JWT token

### Issue Endpoints
- `GET /api/issues` - Get issues with filters
- `POST /api/issues` - Create new issue
- `GET /api/issues/:id` - Get specific issue
- `PUT /api/issues/:id/status` - Update issue status (admin)
- `POST /api/issues/:id/flag` - Flag issue
- `GET /api/issues/stats/overview` - Get issue statistics

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/issues` - Admin issue management
- `GET /api/admin/users` - User management
- `GET /api/admin/analytics` - Analytics data

### User Endpoints
- `GET /api/users/issues` - Get user's reported issues
- `GET /api/users/stats` - Get user statistics

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Database Management
The application uses SQLite for development. The database file is automatically created at `backend/data/civictrack.db`.

**Key Tables:**
- `users` - User accounts and profiles
- `issues` - Reported civic issues
- `issue_images` - Images attached to issues
- `issue_status_logs` - Status change history
- `issue_flags` - User flags for inappropriate content

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
DB_PATH=./data/civictrack.db
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### Mapbox Integration
For the map functionality, you'll need a Mapbox token:
1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Get your access token
3. Add it to your frontend environment variables

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Deployment

### Production Build
```bash
# Build both frontend and backend
npm run build

# Start production servers
npm run start
```

### Docker Deployment
```bash
# Build Docker images
docker build -t civictrack-backend ./backend
docker build -t civictrack-frontend ./frontend

# Run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Next.js and Express.js
- Styled with Tailwind CSS
- Icons from Lucide React
- Maps powered by Mapbox
- Database powered by SQLite

## 📞 Support

For support, email support@civictrack.com or create an issue in the repository.

---

**CivicTrack** - Empowering communities through transparent civic engagement. 🏛️✨ 
const mongoose = require('mongoose');

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 To fix this:');
    console.log('1. Go to https://cloud.mongodb.com');
    console.log('2. Select your cluster: cluster0.oggojey');
    console.log('3. Go to "Network Access" and add your IP: 165.225.124.223');
    console.log('4. Or click "Allow Access from Anywhere"');
    
    // For development, we'll continue without MongoDB connection
    console.log('⚠️  Continuing without MongoDB connection for testing...');
    console.log('⚠️  Some features may not work properly without database connection');
  }
};

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const issueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['reported', 'in_progress', 'resolved'], default: 'reported' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
  },
  reporter_id: { type: String, required: true },
  is_anonymous: { type: Boolean, default: false },
  flag_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const issueImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true },
  filename: { type: String, required: true },
  original_name: { type: String, required: true },
  mime_type: { type: String, required: true },
  size: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

const issueStatusLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true },
  status: { type: String, required: true },
  comment: { type: String },
  updated_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const issueFlagSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true },
  flagged_by: { type: String, required: true },
  reason: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Issue = mongoose.model('Issue', issueSchema);
const IssueImage = mongoose.model('IssueImage', issueImageSchema);
const IssueStatusLog = mongoose.model('IssueStatusLog', issueStatusLogSchema);
const IssueFlag = mongoose.model('IssueFlag', issueFlagSchema);

// Helper functions for database operations
const query = async (model, filter = {}, options = {}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return await model.find(filter, null, options).lean();
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

const queryOne = async (model, filter = {}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return await model.findOne(filter).lean();
  } catch (error) {
    console.error('Database queryOne error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

const run = async (model, data) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    const doc = new model(data);
    return await doc.save();
  } catch (error) {
    console.error('Database run error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

const deleteOne = async (model, filter = {}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return await model.deleteOne(filter);
  } catch (error) {
    console.error('Database deleteOne error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

const count = async (model, filter = {}) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return await model.countDocuments(filter);
  } catch (error) {
    console.error('Database count error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  User,
  Issue,
  IssueImage,
  IssueStatusLog,
  IssueFlag,
  query,
  queryOne,
  run,
  deleteOne,
  count
}; 
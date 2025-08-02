const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civictrack', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String },
  is_verified: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false },
  is_banned: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Issue Schema
const issueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['roads', 'lighting', 'water_supply', 'cleanliness', 'public_safety', 'obstructions']
  },
  status: { 
    type: String, 
    default: 'reported',
    enum: ['reported', 'in_progress', 'resolved']
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String },
  reporter_id: { type: String, ref: 'User' },
  is_anonymous: { type: Boolean, default: false },
  flag_count: { type: Number, default: 0 },
  is_hidden: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Issue Image Schema
const issueImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true, ref: 'Issue' },
  image_path: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

// Issue Status Log Schema
const issueStatusLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true, ref: 'Issue' },
  status: { 
    type: String, 
    required: true,
    enum: ['reported', 'in_progress', 'resolved']
  },
  comment: { type: String },
  updated_by: { type: String, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

// Issue Flag Schema
const issueFlagSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issue_id: { type: String, required: true, ref: 'Issue' },
  user_id: { type: String, required: true, ref: 'User' },
  reason: { type: String },
  created_at: { type: Date, default: Date.now }
});

// Create indexes for better performance
issueSchema.index({ latitude: 1, longitude: 1 });
issueSchema.index({ category: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ reporter_id: 1 });
issueSchema.index({ created_at: -1 });
userSchema.index({ email: 1 });

// Create models
const User = mongoose.model('User', userSchema);
const Issue = mongoose.model('Issue', issueSchema);
const IssueImage = mongoose.model('IssueImage', issueImageSchema);
const IssueStatusLog = mongoose.model('IssueStatusLog', issueStatusLogSchema);
const IssueFlag = mongoose.model('IssueFlag', issueFlagSchema);

// Database helper functions
const query = async (model, filter = {}, options = {}) => {
  try {
    return await model.find(filter, null, options);
  } catch (error) {
    throw error;
  }
};

const queryOne = async (model, filter = {}) => {
  try {
    return await model.findOne(filter);
  } catch (error) {
    throw error;
  }
};

const run = async (model, data) => {
  try {
    if (data._id) {
      // Update existing document
      return await model.findByIdAndUpdate(data._id, data, { new: true });
    } else {
      // Create new document
      const newDoc = new model(data);
      return await newDoc.save();
    }
  } catch (error) {
    throw error;
  }
};

const deleteOne = async (model, filter = {}) => {
  try {
    return await model.deleteOne(filter);
  } catch (error) {
    throw error;
  }
};

const count = async (model, filter = {}) => {
  try {
    return await model.countDocuments(filter);
  } catch (error) {
    throw error;
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
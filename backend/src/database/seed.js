const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { 
  connectDB, 
  User, 
  Issue, 
  IssueImage, 
  IssueStatusLog, 
  IssueFlag 
} = require('./database');

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    console.log('🗄️ Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Issue.deleteMany({});
    await IssueImage.deleteMany({});
    await IssueStatusLog.deleteMany({});
    await IssueFlag.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    
    const adminUser = new User({
      id: adminId,
      email: 'admin@civictrack.com',
      password_hash: adminPasswordHash,
      name: 'Admin User',
      phone: '+1234567890',
      is_verified: true,
      is_admin: true
    });
    await adminUser.save();

    // Create sample users
    const users = [
      {
        id: uuidv4(),
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
        phone: '+1234567891'
      },
      {
        id: uuidv4(),
        email: 'jane@example.com',
        password: 'password123',
        name: 'Jane Smith',
        phone: '+1234567892'
      },
      {
        id: uuidv4(),
        email: 'mike@example.com',
        password: 'password123',
        name: 'Mike Johnson',
        phone: '+1234567893'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const user = new User({
        id: userData.id,
        email: userData.email,
        password_hash: passwordHash,
        name: userData.name,
        phone: userData.phone,
        is_verified: true
      });
      await user.save();
      createdUsers.push(user);
    }

    // Sample issue categories and locations
    const sampleIssues = [
      {
        title: 'Large pothole on Main Street',
        description: 'There is a large pothole on Main Street near the intersection with Oak Avenue. It\'s causing traffic issues and could damage vehicles.',
        category: 'roads',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Main Street & Oak Avenue, New York, NY',
        reporter_id: createdUsers[0].id,
        status: 'reported'
      },
      {
        title: 'Broken street light on 5th Avenue',
        description: 'Street light number 5 on 5th Avenue has been flickering and then went out completely. It\'s very dark at night.',
        category: 'lighting',
        latitude: 40.7589,
        longitude: -73.9851,
        address: '5th Avenue, New York, NY',
        reporter_id: createdUsers[1].id,
        status: 'in_progress'
      },
      {
        title: 'Water leak from fire hydrant',
        description: 'There\'s a water leak from the fire hydrant on Broadway. Water is pooling on the sidewalk and street.',
        category: 'water_supply',
        latitude: 40.7505,
        longitude: -73.9934,
        address: 'Broadway, New York, NY',
        reporter_id: createdUsers[2].id,
        status: 'resolved'
      },
      {
        title: 'Overflowing garbage bin',
        description: 'The garbage bin on Park Avenue is overflowing with trash. It\'s attracting pests and creating a mess.',
        category: 'cleanliness',
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Park Avenue, New York, NY',
        reporter_id: createdUsers[0].id,
        status: 'reported'
      },
      {
        title: 'Open manhole cover',
        description: 'There\'s an open manhole cover on 3rd Street. This is a serious safety hazard for pedestrians and vehicles.',
        category: 'public_safety',
        latitude: 40.7308,
        longitude: -73.9973,
        address: '3rd Street, New York, NY',
        reporter_id: createdUsers[1].id,
        status: 'in_progress'
      },
      {
        title: 'Fallen tree branch blocking sidewalk',
        description: 'A large tree branch has fallen and is blocking the sidewalk on Madison Avenue. Pedestrians have to walk in the street.',
        category: 'obstructions',
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Madison Avenue, New York, NY',
        reporter_id: createdUsers[2].id,
        status: 'reported'
      }
    ];

    // Create sample issues
    const createdIssues = [];
    for (const issueData of sampleIssues) {
      const issueId = uuidv4();
      
      const issue = new Issue({
        id: issueId,
        title: issueData.title,
        description: issueData.description,
        category: issueData.category,
        latitude: issueData.latitude,
        longitude: issueData.longitude,
        address: issueData.address,
        reporter_id: issueData.reporter_id,
        status: issueData.status
      });
      await issue.save();
      createdIssues.push(issue);

      // Create status logs
      const statusLog = new IssueStatusLog({
        id: uuidv4(),
        issue_id: issueId,
        status: 'reported',
        comment: 'Issue reported',
        updated_by: issueData.reporter_id
      });
      await statusLog.save();

      // Add additional status logs for in-progress and resolved issues
      if (issueData.status === 'in_progress') {
        const inProgressLog = new IssueStatusLog({
          id: uuidv4(),
          issue_id: issueId,
          status: 'in_progress',
          comment: 'Work has begun on this issue',
          updated_by: adminId
        });
        await inProgressLog.save();
      }

      if (issueData.status === 'resolved') {
        const inProgressLog = new IssueStatusLog({
          id: uuidv4(),
          issue_id: issueId,
          status: 'in_progress',
          comment: 'Work has begun on this issue',
          updated_by: adminId
        });
        await inProgressLog.save();

        const resolvedLog = new IssueStatusLog({
          id: uuidv4(),
          issue_id: issueId,
          status: 'resolved',
          comment: 'Issue has been resolved',
          updated_by: adminId
        });
        await resolvedLog.save();
      }
    }

    // Add some flags to issues
    for (let i = 0; i < 2; i++) {
      const flag = new IssueFlag({
        id: uuidv4(),
        issue_id: createdIssues[i].id,
        user_id: createdUsers[0].id,
        reason: 'Sample flag for testing'
      });
      await flag.save();

      // Update flag count on issue
      await Issue.findOneAndUpdate(
        { id: createdIssues[i].id },
        { $inc: { flag_count: 1 } }
      );
    }

    console.log('✅ Database seeded successfully!');
    console.log('📧 Admin login: admin@civictrack.com / admin123');
    console.log('👤 Sample users: john@example.com, jane@example.com, mike@example.com / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase }; 
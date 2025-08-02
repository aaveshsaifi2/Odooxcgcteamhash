const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { run, queryOne, initializeTables } = require('./database');

/**
 * Seed the database with sample data
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize tables first and wait for completion
    console.log('🗄️ Initializing database tables...');
    await initializeTables();
    console.log('✅ Tables initialized successfully');

    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    
    await run(`
      INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, is_verified, is_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [adminId, 'admin@civictrack.com', adminPasswordHash, 'Admin User', '+1234567890', true, true]);

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

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      await run(`
        INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, is_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [user.id, user.email, passwordHash, user.name, user.phone, true]);
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
        reporter_id: users[0].id,
        status: 'reported'
      },
      {
        title: 'Broken street light on 5th Avenue',
        description: 'Street light number 5 on 5th Avenue has been flickering and then went out completely. It\'s very dark at night.',
        category: 'lighting',
        latitude: 40.7589,
        longitude: -73.9851,
        address: '5th Avenue, New York, NY',
        reporter_id: users[1].id,
        status: 'in_progress'
      },
      {
        title: 'Water leak from fire hydrant',
        description: 'There\'s a water leak from the fire hydrant on Broadway. Water is pooling on the sidewalk and street.',
        category: 'water_supply',
        latitude: 40.7505,
        longitude: -73.9934,
        address: 'Broadway, New York, NY',
        reporter_id: users[2].id,
        status: 'resolved'
      },
      {
        title: 'Overflowing garbage bin',
        description: 'The garbage bin on Park Avenue is overflowing with trash. It\'s attracting pests and creating a mess.',
        category: 'cleanliness',
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Park Avenue, New York, NY',
        reporter_id: users[0].id,
        status: 'reported'
      },
      {
        title: 'Open manhole cover',
        description: 'There\'s an open manhole cover on 3rd Street. This is a serious safety hazard for pedestrians and vehicles.',
        category: 'public_safety',
        latitude: 40.7308,
        longitude: -73.9973,
        address: '3rd Street, New York, NY',
        reporter_id: users[1].id,
        status: 'in_progress'
      },
      {
        title: 'Fallen tree branch blocking sidewalk',
        description: 'A large tree branch has fallen and is blocking the sidewalk on Madison Avenue. Pedestrians have to walk in the street.',
        category: 'obstructions',
        latitude: 40.7589,
        longitude: -73.9851,
        address: 'Madison Avenue, New York, NY',
        reporter_id: users[2].id,
        status: 'reported'
      }
    ];

    // Create sample issues
    for (const issueData of sampleIssues) {
      const issueId = uuidv4();
      
      await run(`
        INSERT OR IGNORE INTO issues (id, title, description, category, latitude, longitude, address, reporter_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        issueId,
        issueData.title,
        issueData.description,
        issueData.category,
        issueData.latitude,
        issueData.longitude,
        issueData.address,
        issueData.reporter_id,
        issueData.status
      ]);

      // Create status logs
      const statusLogId = uuidv4();
      await run(`
        INSERT OR IGNORE INTO issue_status_logs (id, issue_id, status, comment, updated_by)
        VALUES (?, ?, ?, ?, ?)
      `, [statusLogId, issueId, 'reported', 'Issue reported', issueData.reporter_id]);

      // Add additional status logs for in-progress and resolved issues
      if (issueData.status === 'in_progress') {
        const inProgressLogId = uuidv4();
        await run(`
          INSERT OR IGNORE INTO issue_status_logs (id, issue_id, status, comment, updated_by)
          VALUES (?, ?, ?, ?, ?)
        `, [inProgressLogId, issueId, 'in_progress', 'Work has begun on this issue', adminId]);
      }

      if (issueData.status === 'resolved') {
        const inProgressLogId = uuidv4();
        const resolvedLogId = uuidv4();
        
        await run(`
          INSERT OR IGNORE INTO issue_status_logs (id, issue_id, status, comment, updated_by)
          VALUES (?, ?, ?, ?, ?)
        `, [inProgressLogId, issueId, 'in_progress', 'Work has begun on this issue', adminId]);

        await run(`
          INSERT OR IGNORE INTO issue_status_logs (id, issue_id, status, comment, updated_by)
          VALUES (?, ?, ?, ?, ?)
        `, [resolvedLogId, issueId, 'resolved', 'Issue has been resolved', adminId]);
      }
    }

    // Add some flags to issues
    const flagIssues = await run('SELECT id FROM issues LIMIT 2');
    if (flagIssues && flagIssues.length > 0) {
      for (let i = 0; i < 2; i++) {
        const flagId = uuidv4();
        await run(`
          INSERT OR IGNORE INTO issue_flags (id, issue_id, user_id, reason)
          VALUES (?, ?, ?, ?)
        `, [flagId, flagIssues[i].id, users[0].id, 'Sample flag for testing']);
      }
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
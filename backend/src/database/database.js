const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../../data/civictrack.db');

// Create database directory if it doesn't exist
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

/**
 * Initialize database tables
 */
function initializeTables() {
  return new Promise((resolve, reject) => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_admin BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }

      // Issues table
      db.run(`
        CREATE TABLE IF NOT EXISTS issues (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          status TEXT DEFAULT 'reported',
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          address TEXT,
          reporter_id TEXT,
          is_anonymous BOOLEAN DEFAULT FALSE,
          flag_count INTEGER DEFAULT 0,
          is_hidden BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reporter_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating issues table:', err);
          reject(err);
          return;
        }

        // Issue images table
        db.run(`
          CREATE TABLE IF NOT EXISTS issue_images (
            id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Error creating issue_images table:', err);
            reject(err);
            return;
          }

          // Issue status logs table
          db.run(`
            CREATE TABLE IF NOT EXISTS issue_status_logs (
              id TEXT PRIMARY KEY,
              issue_id TEXT NOT NULL,
              status TEXT NOT NULL,
              comment TEXT,
              updated_by TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
              FOREIGN KEY (updated_by) REFERENCES users (id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating issue_status_logs table:', err);
              reject(err);
              return;
            }

            // Issue flags table
            db.run(`
              CREATE TABLE IF NOT EXISTS issue_flags (
                id TEXT PRIMARY KEY,
                issue_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(issue_id, user_id)
              )
            `, (err) => {
              if (err) {
                console.error('Error creating issue_flags table:', err);
                reject(err);
                return;
              }

              // Create indexes for better performance
              db.run('CREATE INDEX IF NOT EXISTS idx_issues_location ON issues(latitude, longitude)', (err) => {
                if (err) console.error('Error creating location index:', err);
              });
              db.run('CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category)', (err) => {
                if (err) console.error('Error creating category index:', err);
              });
              db.run('CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)', (err) => {
                if (err) console.error('Error creating status index:', err);
              });
              db.run('CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_id)', (err) => {
                if (err) console.error('Error creating reporter index:', err);
              });
              db.run('CREATE INDEX IF NOT EXISTS idx_issues_created ON issues(created_at)', (err) => {
                if (err) console.error('Error creating created index:', err);
              });
              db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', (err) => {
                if (err) console.error('Error creating email index:', err);
              });

              console.log('✅ Database tables initialized');
              resolve();
            });
          });
        });
      });
    });
  });
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the result
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Execute a single row query
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the result
 */
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Execute an insert/update/delete query
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the result
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

module.exports = {
  db,
  query,
  queryOne,
  run,
  initializeTables
}; 
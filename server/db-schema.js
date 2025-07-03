// Database schema creation functions

/**
 * Creates the users table if it doesn't exist
 * @param {Object} pool - PostgreSQL connection pool
 */
const createUsersTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Users table created or already exists');
};

/**
 * Creates all database tables
 * @param {Object} pool - PostgreSQL connection pool
 */
const createTables = async (pool) => {
  try {
    await createUsersTable(pool);
    console.log('All database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

module.exports = {
  createTables,
  createUsersTable
};
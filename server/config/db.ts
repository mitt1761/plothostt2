import mysql from 'mysql2/promise';

// Setup MySQL connection pool using dotenv variables
const isVercel = !!process.env.VERCEL;

// Smart SSL option: Enable SSL by default for non-localhost cloud connections unless DB_SSL is explicitly set to 'false'
const useSSL = process.env.DB_SSL === 'true' || 
               (process.env.DB_HOST && 
                process.env.DB_HOST !== 'localhost' && 
                process.env.DB_HOST !== '127.0.0.1' && 
                process.env.DB_SSL !== 'false');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'plottea_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  // Limit connection count on serverless Vercel to avoid reaching MySQL connection limits
  connectionLimit: isVercel ? 2 : 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
};

const pool = mysql.createPool(dbConfig);

console.log('Database: MySQL connection pool initialized using config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

// Auto-create tables for single-deploy convenience
(async () => {
  try {
    console.log('Database: Checking and auto-creating tables if they do not exist...');
    // Create users table (without email column, matching user's database configuration)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Create watchlists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        judul VARCHAR(255) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        genre VARCHAR(100),
        tahun_rilis INT,
        negara VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'To Watch',
        review TEXT,
        rating INT,
        poster_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Database: MySQL tables verified/initialized successfully.');
  } catch (tableErr) {
    console.error('Database: Error during auto-initialization of tables:', tableErr);
  }
})();

// Database operations adapters - STRICTLY MYSQL
export const db = {
  // Return true if currently using real MySQL
  isMySQL(): boolean {
    return true;
  },

  // USERS OPERATIONS
  async findUserByUsername(username: string): Promise<any | null> {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    return rows[0] || null;
  },

  async findUserByEmail(email: string): Promise<any | null> {
    // Since the email column has been removed from the database, we return null to avoid any SQL query errors
    return null;
  },

  async findUserById(id: number): Promise<any | null> {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async createUser(user: any): Promise<number> {
    const [result]: any = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [user.username, user.password]
    );
    return result.insertId;
  },

  // WATCHLIST OPERATIONS
  async getStats(userId: number): Promise<{ completed: number, toWatch: number, watching: number, total: number }> {
    const [rows]: any = await pool.query(
      'SELECT status, COUNT(*) as count FROM watchlists WHERE user_id = ? GROUP BY status',
      [userId]
    );
    
    let completed = 0;
    let toWatch = 0;
    let watching = 0;
    let total = 0;
    
    for (const row of rows) {
      const count = parseInt(row.count, 10) || 0;
      total += count;
      if (row.status === 'Completed') completed = count;
      else if (row.status === 'To Watch') toWatch = count;
      else if (row.status === 'Watching') watching = count;
    }
    
    return { completed, toWatch, watching, total };
  },

  async getWatchlist(userId: number, search?: string, statusFilter?: string, categoryFilter?: string): Promise<any[]> {
    let queryStr = 'SELECT * FROM watchlists WHERE user_id = ?';
    const params: any[] = [userId];

    if (search) {
      queryStr += ' AND (judul LIKE ? OR genre LIKE ? OR review LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (statusFilter && statusFilter !== 'All' && statusFilter !== 'Semua' && statusFilter.trim() !== '') {
      queryStr += ' AND status = ?';
      params.push(statusFilter);
    }
    if (categoryFilter && categoryFilter !== 'All' && categoryFilter !== 'Semua' && categoryFilter.trim() !== '') {
      queryStr += ' AND kategori = ?';
      params.push(categoryFilter);
    }

    queryStr += ' ORDER BY created_at DESC';
    const [rows]: any = await pool.query(queryStr, params);
    return rows;
  },

  async getWatchlistById(id: number): Promise<any | null> {
    const [rows]: any = await pool.query('SELECT * FROM watchlists WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async addWatchlist(item: any): Promise<number> {
    const [result]: any = await pool.query(
      `INSERT INTO watchlists (
        user_id, judul, kategori, genre, tahun_rilis, negara, status, review, rating, poster_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.user_id, item.judul, item.kategori, item.genre || null, item.tahun_rilis || null,
        item.negara || null, item.status || 'To Watch', item.review || null, item.rating || null,
        item.poster_path || null
      ]
    );
    return result.insertId;
  },

  async updateWatchlist(id: number, item: any): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE watchlists SET 
        judul = ?, kategori = ?, genre = ?, tahun_rilis = ?, negara = ?, 
        status = ?, review = ?, rating = ?, poster_path = ?
      WHERE id = ?`,
      [
        item.judul, item.kategori, item.genre || null, item.tahun_rilis || null,
        item.negara || null, item.status, item.review || null, item.rating || null,
        item.poster_path || null, id
      ]
    );
    return result.affectedRows > 0;
  },

  async deleteWatchlist(id: number): Promise<boolean> {
    const [result]: any = await pool.query('DELETE FROM watchlists WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

export default pool;

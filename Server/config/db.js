const mysql = require("mysql2/promise");
require("dotenv").config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "todo_app",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const connectDB = async () => {
  try {
    // Test connection
    const connection = await pool.getConnection();
    console.log("MySQL database connected successfully");
    
    // Create tables if they don't exist
    await createTables(connection);
    
    connection.release();
    console.log("Database tables created/verified successfully");
  } catch (error) {
    console.error("MySQL connection error:", error);
    process.exit(1);
  }
};

const createTables = async (connection) => {
  // Create Users table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      resetPasswordToken VARCHAR(255),
      resetPasswordExpire DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Create Todos table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Todos (
      id INT PRIMARY KEY AUTO_INCREMENT,
      todo VARCHAR(255) NOT NULL,
      description TEXT,
      date DATETIME NOT NULL,
      userId INT NOT NULL,
      status ENUM('pending', 'completed') DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  // Create Expenses table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Expenses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      amount DECIMAL(10, 2) NOT NULL,
      date DATETIME NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      userId INT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

  // Create Items (Folders/Files) table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS Items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      type ENUM('folder', 'file') NOT NULL,
      userId INT NOT NULL,
      parentId INT,
      extension VARCHAR(50),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES Items(id) ON DELETE CASCADE,
      INDEX idx_userId_parentId (userId, parentId),
      INDEX idx_userId_type (userId, type)
    )
  `);
};

module.exports = { pool, connectDB };

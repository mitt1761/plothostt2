-- schema.sql
-- Database Schema for PlotTea Watchlist Tracker

-- Create Database (Optional, uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS plottea_db;
-- USE plottea_db;

-- 1. Table users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  judul VARCHAR(255) NOT NULL,
  kategori VARCHAR(50) NOT NULL, -- e.g., 'Movie', 'Series'
  genre VARCHAR(100),
  tahun_rilis INT,
  negara VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'To Watch', -- e.g., 'To Watch', 'Watching', 'Completed', 'On Hold', 'Dropped'
  review TEXT,
  rating INT, -- rating 1 to 10
  poster_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_watchlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

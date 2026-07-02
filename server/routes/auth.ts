import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

const router = Router();

// 1. REGISTER
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username minimal harus 3 karakter!' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal harus 6 karakter!' });
    }

    // Cek duplikasi username
    const existingUserByName = await db.findUserByUsername(username);
    if (existingUserByName) {
      return res.status(400).json({ error: 'Username sudah digunakan!' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Simpan ke database
    const userId = await db.createUser({
      username,
      password: hashedPassword
    });

    // Otomatis login (set session)
    req.session.userId = userId;
    req.session.username = username;

    return res.status(201).json({
      message: 'Registrasi berhasil!',
      user: { id: userId, username }
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat registrasi.' });
  }
});

// 2. LOGIN
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi!' });
    }

    // Cari user berdasarkan username atau email
    let user = await db.findUserByUsername(username);
    if (!user) {
      // Coba cari lewat email jika username berupa format email
      user = await db.findUserByEmail(username);
    }

    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah!' });
    }

    // Bandingkan password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Username atau password salah!' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    return res.json({
      message: 'Login berhasil!',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat login.' });
  }
});

// 3. LOGOUT
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Gagal mengakhiri sesi.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Berhasil keluar (logout)!' });
  });
});

// 4. CHECK ME (GET CURRENT USER SESSION)
router.get('/me', async (req: Request, res: Response) => {
  if (req.session && req.session.userId) {
    try {
      const user = await db.findUserById(req.session.userId);
      if (user) {
        return res.json({
          user: { id: user.id, username: user.username, email: user.email }
        });
      }
    } catch (err) {
      console.error('Get current user error:', err);
    }
  }
  return res.status(401).json({ user: null, message: 'Belum masuk sesi.' });
});

export default router;

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Configure Multer storage for movie/series poster uploads
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure uploads folder exists in local environment
try {
  if (!isCloudinaryConfigured && !fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (fsErr) {
  console.warn('Warning: Could not create local uploads directory (read-only environment):', fsErr);
}

const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'poster-' + uniqueSuffix + ext);
      }
    });

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Format file harus berupa gambar (jpg, jpeg, png, webp, gif)!'));
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'plottea_posters' },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload returned empty result'));
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper function to extract Cloudinary public ID
const getCloudinaryPublicId = (url: string): string | null => {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathWithVersion = parts[1];
    const cleanPath = pathWithVersion.replace(/^v\d+\//, '');
    const dotIndex = cleanPath.lastIndexOf('.');
    if (dotIndex !== -1) {
      return cleanPath.substring(0, dotIndex);
    }
    return cleanPath;
  } catch (err) {
    return null;
  }
};

// 1. GET ALL WATCHLIST ITEMS (with optional filter / search)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { search, status, category } = req.query;

    const list = await db.getWatchlist(
      userId,
      search ? String(search) : undefined,
      status ? String(status) : undefined,
      category ? String(category) : undefined
    );

    return res.json({ watchlist: list });
  } catch (err: any) {
    console.error('Fetch watchlist error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server saat mengambil daftar tontonan.' });
  }
});

// 1.5 GET WATCHLIST STATISTICS
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const stats = await db.getStats(userId);
    return res.json({ stats });
  } catch (err: any) {
    console.error('Fetch watchlist stats error:', err);
    return res.status(500).json({ error: 'Gagal mengambil data statistik.' });
  }
});

// 2. GET SINGLE WATCHLIST ITEM BY ID
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await db.getWatchlistById(id);

    if (!item) {
      return res.status(404).json({ error: 'Data tontonan tidak ditemukan!' });
    }

    // Verify ownership
    if (item.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak akses ke data ini!' });
    }

    return res.json({ item });
  } catch (err: any) {
    console.error('Fetch single watchlist item error:', err);
    return res.status(500).json({ error: 'Gagal mengambil detail tontonan.' });
  }
});

// 3. CREATE NEW WATCHLIST ITEM (supports optional poster file upload)
router.post('/', requireAuth, upload.single('poster'), async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { judul, kategori, genre, tahun_rilis, negara, status, review, rating } = req.body;

    // Rule 2: Saat user nambah data, input judul, kategori, genre, tahun rilis, dan negara wajib diisi
    if (!judul || !kategori || !genre || !tahun_rilis || !negara) {
      return res.status(400).json({ error: 'Judul, Kategori, Genre, Tahun Rilis, dan Negara wajib diisi!' });
    }

    // Rule 3: Rating wajib diisi angka 1-10 jika statusnya 'finished' (Completed / Finished)
    const normalizedStatus = (status || '').toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'finished') {
      const parsedRating = parseInt(rating, 10);
      if (!rating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
        return res.status(400).json({ error: 'Rating wajib diisi angka antara 1 sampai 10 jika statusnya Selesai (Completed/Finished)!' });
      }
    }

    // poster_path is set only if a file is uploaded
    let poster_path = null;
    if (req.file) {
      if (isCloudinaryConfigured) {
        try {
          poster_path = await uploadToCloudinary(req.file.buffer);
        } catch (uploadErr: any) {
          console.error('Failed to upload poster to Cloudinary:', uploadErr);
          return res.status(500).json({ error: 'Gagal mengunggah gambar poster ke Cloudinary.' });
        }
      } else {
        poster_path = `/uploads/${(req.file as any).filename}`;
      }
    }

    const newItem = {
      user_id: userId,
      judul,
      kategori,
      genre: genre,
      tahun_rilis: tahun_rilis ? parseInt(tahun_rilis, 10) : null,
      negara: negara,
      status: status || 'To Watch',
      review: review || '',
      rating: rating ? parseInt(rating, 10) : null,
      poster_path
    };

    const insertedId = await db.addWatchlist(newItem);
    
    return res.status(201).json({
      message: 'Tontonan berhasil ditambahkan ke watchlist!',
      id: insertedId,
      item: { id: insertedId, ...newItem }
    });
  } catch (err: any) {
    console.error('Add watchlist item error:', err);
    return res.status(500).json({ error: err.message || 'Gagal menambahkan tontonan ke watchlist.' });
  }
});

// 4. UPDATE WATCHLIST ITEM
router.put('/:id', requireAuth, upload.single('poster'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await db.getWatchlistById(id);

    if (!item) {
      return res.status(404).json({ error: 'Data tontonan tidak ditemukan!' });
    }

    // Verify ownership
    if (item.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak akses ke data ini!' });
    }

    const { judul, kategori, genre, tahun_rilis, negara, status, review, rating } = req.body;

    // Rule 2: Saat user nambah/ubah data, input judul, kategori, genre, tahun rilis, dan negara wajib diisi
    if (!judul || !kategori || !genre || !tahun_rilis || !negara) {
      return res.status(400).json({ error: 'Judul, Kategori, Genre, Tahun Rilis, dan Negara wajib diisi!' });
    }

    // Rule 3: Rating wajib diisi angka 1-10 jika statusnya 'finished' (Completed / Finished)
    const normalizedStatus = (status || '').toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'finished') {
      const parsedRating = parseInt(rating, 10);
      if (!rating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 10) {
        return res.status(400).json({ error: 'Rating wajib diisi angka antara 1 sampai 10 jika statusnya Selesai (Completed/Finished)!' });
      }
    }

    let poster_path = item.poster_path;
    if (req.file) {
      if (isCloudinaryConfigured) {
        try {
          poster_path = await uploadToCloudinary(req.file.buffer);
        } catch (uploadErr: any) {
          console.error('Failed to upload poster to Cloudinary:', uploadErr);
          return res.status(500).json({ error: 'Gagal mengunggah gambar poster ke Cloudinary.' });
        }
      } else {
        poster_path = `/uploads/${(req.file as any).filename}`;
      }
    }

    const updatedData = {
      judul,
      kategori,
      genre: genre,
      tahun_rilis: tahun_rilis ? parseInt(tahun_rilis, 10) : null,
      negara: negara,
      status: status,
      review: review || '',
      rating: rating ? parseInt(rating, 10) : null,
      poster_path
    };

    const success = await db.updateWatchlist(id, updatedData);

    if (success) {
      return res.json({
        message: 'Tontonan berhasil diperbarui!',
        item: { id, ...updatedData }
      });
    } else {
      return res.status(500).json({ error: 'Gagal memperbarui tontonan di database.' });
    }
  } catch (err: any) {
    console.error('Update watchlist error:', err);
    return res.status(500).json({ error: err.message || 'Gagal memperbarui tontonan.' });
  }
});

// 5. DELETE WATCHLIST ITEM
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await db.getWatchlistById(id);

    if (!item) {
      return res.status(404).json({ error: 'Data tontonan tidak ditemukan!' });
    }

    // Verify ownership
    if (item.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak akses ke data ini!' });
    }

    // If there is an uploaded image, optionally delete the file
    if (item.poster_path) {
      if (item.poster_path.startsWith('/uploads/')) {
        const filename = item.poster_path.replace('/uploads/', '');
        const filepath = path.join(UPLOADS_DIR, filename);
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (fileErr) {
            console.error('Gagal menghapus file gambar poster:', fileErr);
          }
        }
      } else if (item.poster_path.includes('cloudinary.com') && isCloudinaryConfigured) {
        const publicId = getCloudinaryPublicId(item.poster_path);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryErr) {
            console.error('Gagal menghapus file gambar poster di Cloudinary:', cloudinaryErr);
          }
        }
      }
    }

    const success = await db.deleteWatchlist(id);

    if (success) {
      return res.json({ message: 'Tontonan berhasil dihapus dari watchlist!' });
    } else {
      return res.status(500).json({ error: 'Gagal menghapus tontonan.' });
    }
  } catch (err: any) {
    console.error('Delete watchlist error:', err);
    return res.status(500).json({ error: 'Gagal menghapus tontonan.' });
  }
});

export default router;

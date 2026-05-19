require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { db, initializeDatabase } = require('./database');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { error: 'Too many attempts' } });

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.users.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuidv4();
    await db.users.insert({
      _id: id, name, email, phone: phone || '', address: address || '',
      password_hash: bcrypt.hashSync(password, 12),
      role: 'guest', created_at: new Date().toISOString()
    });

    const { accessToken, refreshToken } = generateTokens(id);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ message: 'Registration successful', accessToken, user: { id, name, email, phone, role: 'guest' } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await db.users.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ message: 'Login successful', accessToken, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken } = generateTokens(decoded.userId);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken });
  } catch (err) { res.status(403).json({ error: 'Invalid refresh token' }); }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ══════════════════════════════════════
// ROOMS
// ══════════════════════════════════════

app.get('/api/rooms', async (req, res) => {
  try {
    const { minPrice, maxPrice, guests, facilities, checkin, checkout, sort } = req.query;
    let query = { is_active: true };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (guests) query.max_guests = { $gte: Number(guests) };

    let sortObj = { rating: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };

    let rooms = await db.rooms.find(query).sort(sortObj);

    // Filter by facilities
    if (facilities) {
      const reqFac = facilities.split(',').map(f => f.trim().toLowerCase());
      rooms = rooms.filter(room =>
        reqFac.every(f => room.facilities.some(rf => rf.toLowerCase() === f))
      );
    }

    // Filter by availability
    if (checkin && checkout) {
      const available = [];
      for (const room of rooms) {
        const booked = await db.bookings.count({
          room_id: room._id,
          status: { $ne: 'cancelled' },
          check_in: { $lt: checkout },
          check_out: { $gt: checkin }
        });
        if (booked < room.rooms_count) available.push(room);
      }
      rooms = available;
    }

    // Normalize _id to id
    rooms = rooms.map(r => ({ ...r, id: r._id }));
    res.json({ rooms, total: rooms.length });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await db.rooms.findOne({ _id: req.params.id });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    room.id = room._id;

    const reviews = await db.reviews.find({ room_id: req.params.id }).sort({ created_at: -1 }).limit(10);
    // Attach user names
    for (const r of reviews) {
      const u = await db.users.findOne({ _id: r.user_id });
      r.user_name = u ? u.name : 'Anonymous';
    }

    res.json({ room, reviews });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// ══════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { room_id, check_in, check_out, adults, children, special_requests } = req.body;
    if (!room_id || !check_in || !check_out) return res.status(400).json({ error: 'Room, check-in and check-out are required' });

    const checkinDate = new Date(check_in);
    const checkoutDate = new Date(check_out);
    if (checkoutDate <= checkinDate) return res.status(400).json({ error: 'Check-out must be after check-in' });

    const room = await db.rooms.findOne({ _id: room_id, is_active: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const booked = await db.bookings.count({
      room_id, status: { $ne: 'cancelled' },
      check_in: { $lt: check_out }, check_out: { $gt: check_in }
    });
    if (booked >= room.rooms_count) return res.status(409).json({ error: 'Room not available for selected dates' });

    const nights = Math.ceil((checkoutDate - checkinDate) / 86400000);
    const total_price = room.price * nights;
    const id = uuidv4();

    await db.bookings.insert({
      _id: id, user_id: req.user.id, room_id, check_in, check_out,
      adults: adults || 1, children: children || 0, total_price,
      special_requests: special_requests || '', status: 'confirmed',
      created_at: new Date().toISOString()
    });

    const booking = await db.bookings.findOne({ _id: id });
    booking.room_title = room.title;
    booking.room_image = room.image_url;
    booking.id = booking._id;

    res.status(201).json({ message: 'Booking confirmed!', booking });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Booking failed' });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await db.bookings.find({ user_id: req.user.id }).sort({ created_at: -1 });
    for (const b of bookings) {
      const room = await db.rooms.findOne({ _id: b.room_id });
      b.room_title = room ? room.title : 'Unknown';
      b.room_image = room ? room.image_url : '';
      b.room_price = room ? room.price : 0;
      b.id = b._id;
    }
    res.json({ bookings });
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await db.bookings.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
    if (['checked_in', 'checked_out'].includes(booking.status)) return res.status(400).json({ error: 'Cannot cancel after check-in' });

    await db.bookings.update({ _id: req.params.id }, { $set: { status: 'cancelled', cancelled_at: new Date().toISOString() } });
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// ══════════════════════════════════════
// REVIEWS
// ══════════════════════════════════════

app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { room_id, booking_id, rating, comment } = req.body;
    if (!room_id || !rating) return res.status(400).json({ error: 'Room and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    await db.reviews.insert({
      _id: uuidv4(), user_id: req.user.id, room_id,
      booking_id: booking_id || null, rating, comment: comment || '',
      created_at: new Date().toISOString()
    });

    const allReviews = await db.reviews.find({ room_id });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db.rooms.update({ _id: room_id }, { $set: { rating: Math.round(avg * 10) / 10, total_reviews: allReviews.length } });

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ══════════════════════════════════════
// CONTACT
// ══════════════════════════════════════

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message required' });
    await db.contacts.insert({ _id: uuidv4(), name, email, subject: subject || '', message, is_read: false, created_at: new Date().toISOString() });
    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ══════════════════════════════════════
// ADMIN
// ══════════════════════════════════════

app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRooms = await db.rooms.count({});
    const totalUsers = await db.users.count({ role: 'guest' });
    const totalBookings = await db.bookings.count({});
    const activeBookings = await db.bookings.count({ status: { $in: ['confirmed', 'checked_in'] } });

    const allBookings = await db.bookings.find({ status: { $ne: 'cancelled' } });
    const totalRevenue = allBookings.reduce((s, b) => s + b.total_price, 0);

    const recentBookings = await db.bookings.find({}).sort({ created_at: -1 }).limit(10);
    for (const b of recentBookings) {
      const u = await db.users.findOne({ _id: b.user_id });
      const r = await db.rooms.findOne({ _id: b.room_id });
      b.user_name = u ? u.name : 'Unknown';
      b.room_title = r ? r.title : 'Unknown';
      b.id = b._id;
    }

    const contacts = await db.contacts.find({}).sort({ created_at: -1 }).limit(10);
    res.json({ totalRooms, totalUsers, totalBookings, activeBookings, totalRevenue, recentBookings, contacts });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ══════════════════════════════════════
// STATIC PAGES FALLBACK
// ══════════════════════════════════════

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
(async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`\n🏨 ═══════════════════════════════════════`);
    console.log(`   BookMyHotel Server`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Admin: admin@bookmyhotel.com / admin123`);
    console.log(`   Demo:  demo@test.com / demo123`);
    console.log(`🏨 ═══════════════════════════════════════\n`);
  });
})();

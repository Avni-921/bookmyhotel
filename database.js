const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, 'data');

const db = {
  users: Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true }),
  rooms: Datastore.create({ filename: path.join(dataDir, 'rooms.db'), autoload: true }),
  bookings: Datastore.create({ filename: path.join(dataDir, 'bookings.db'), autoload: true }),
  reviews: Datastore.create({ filename: path.join(dataDir, 'reviews.db'), autoload: true }),
  contacts: Datastore.create({ filename: path.join(dataDir, 'contacts.db'), autoload: true }),
};

async function initializeDatabase() {
  // Create indexes
  await db.users.ensureIndex({ fieldName: 'email', unique: true });
  await db.bookings.ensureIndex({ fieldName: 'user_id' });
  await db.bookings.ensureIndex({ fieldName: 'room_id' });
  await db.reviews.ensureIndex({ fieldName: 'room_id' });

  // Seed if empty
  const roomCount = await db.rooms.count({});
  if (roomCount === 0) {
    await seedData();
  }
  console.log('✅ Database initialized');
}

async function seedData() {
  console.log('🌱 Seeding database...');

  // Admin user
  await db.users.insert({
    _id: uuidv4(),
    name: 'Admin',
    email: 'admin@bookmyhotel.com',
    phone: '+919090678945',
    address: 'Prayagraj, UP',
    password_hash: bcrypt.hashSync('admin123', 12),
    role: 'admin',
    created_at: new Date().toISOString()
  });

  // Demo guest user
  await db.users.insert({
    _id: uuidv4(),
    name: 'Demo User',
    email: 'demo@test.com',
    phone: '+919876543210',
    address: 'Delhi, India',
    password_hash: bcrypt.hashSync('demo123', 12),
    role: 'guest',
    created_at: new Date().toISOString()
  });

  // Rooms
  const rooms = [
    {
      _id: uuidv4(),
      title: 'Standard Room',
      description: 'A cozy and comfortable room perfect for solo travelers or couples. Features modern amenities and a calming ambiance for a restful stay.',
      price: 2000,
      image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
      rooms_count: 10, bathrooms: 1, balcony: 0, sofa: 1, max_guests: 2,
      facilities: ['Wifi', 'Television', 'AC', 'Room Service'],
      rating: 4.0, total_reviews: 45, is_active: true,
      created_at: new Date().toISOString()
    },
    {
      _id: uuidv4(),
      title: 'Deluxe Room',
      description: 'Spacious and elegantly furnished room with premium bedding, city views, and a dedicated work area. Ideal for business travelers.',
      price: 4000,
      image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80',
      rooms_count: 8, bathrooms: 2, balcony: 1, sofa: 2, max_guests: 3,
      facilities: ['Wifi', 'Television', 'AC', 'Room Heater', 'Mini Bar', 'Room Service'],
      rating: 4.5, total_reviews: 78, is_active: true,
      created_at: new Date().toISOString()
    },
    {
      _id: uuidv4(),
      title: 'Premium Suite',
      description: 'Luxurious suite with separate living area, premium bathroom with jacuzzi, panoramic views, and exclusive butler service.',
      price: 6000,
      image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
      rooms_count: 5, bathrooms: 2, balcony: 1, sofa: 3, max_guests: 4,
      facilities: ['Wifi', 'Television', 'AC', 'Room Heater', 'Mini Bar', 'Swimming Pool', 'Spa Access'],
      rating: 4.8, total_reviews: 120, is_active: true,
      created_at: new Date().toISOString()
    },
    {
      _id: uuidv4(),
      title: 'Royal Presidential Suite',
      description: 'The crown jewel — expansive suite with private terrace, personal chef service, luxury spa bathroom, and dedicated concierge.',
      price: 12000,
      image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
      rooms_count: 2, bathrooms: 3, balcony: 2, sofa: 4, max_guests: 6,
      facilities: ['Wifi', 'Television', 'AC', 'Room Heater', 'Mini Bar', 'Swimming Pool', 'Spa Access', 'Private Terrace', 'Butler Service'],
      rating: 4.9, total_reviews: 56, is_active: true,
      created_at: new Date().toISOString()
    },
    {
      _id: uuidv4(),
      title: 'Family Suite',
      description: 'Designed for families with connecting rooms, child-friendly amenities, entertainment options, and extra space for everyone.',
      price: 8000,
      image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
      rooms_count: 4, bathrooms: 2, balcony: 1, sofa: 3, max_guests: 5,
      facilities: ['Wifi', 'Television', 'AC', 'Room Heater', 'Kids Play Area', 'Room Service', 'Laundry'],
      rating: 4.6, total_reviews: 92, is_active: true,
      created_at: new Date().toISOString()
    },
    {
      _id: uuidv4(),
      title: 'Honeymoon Suite',
      description: 'A romantic retreat with king-size canopy bed, private jacuzzi, rose petal turndown service, and breathtaking sunset views.',
      price: 10000,
      image_url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
      rooms_count: 3, bathrooms: 2, balcony: 1, sofa: 2, max_guests: 2,
      facilities: ['Wifi', 'Television', 'AC', 'Mini Bar', 'Spa Access', 'Private Jacuzzi', 'Room Service', 'Breakfast Included'],
      rating: 4.9, total_reviews: 67, is_active: true,
      created_at: new Date().toISOString()
    }
  ];

  await db.rooms.insert(rooms);
  console.log(`✅ Seeded ${rooms.length} rooms, 1 admin, 1 demo user`);
}

module.exports = { db, initializeDatabase };

# 🏨 BookMyHotel — Premium Hotel Booking Platform

A full-stack hotel booking application built with **Node.js, Express, and NeDB** featuring a premium dark luxury UI with glassmorphism effects, JWT authentication, room booking with availability checking, and an admin dashboard.

## ✨ Features

- **🔐 JWT Authentication** — Register, Login, Refresh Tokens (HttpOnly cookies)
- **🛏️ Room Browsing** — 6 room types with images, ratings, facilities, and pricing
- **🔍 Advanced Filtering** — Filter by price, guests, facilities, dates, and sort order
- **📅 Booking System** — Real-time availability checking, price calculation with GST
- **⭐ Reviews** — Post and view reviews with star ratings
- **📧 Contact Form** — Message submissions stored in database
- **👨‍💼 Admin Dashboard** — Revenue stats, booking management, user count
- **🎨 Premium UI** — Dark luxury theme with gold accents, glassmorphism, animations
- **📱 Fully Responsive** — Mobile-first design for all screen sizes
- **🔒 Security** — Helmet, CORS, rate limiting, bcrypt password hashing

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 👨‍💼 Admin | `admin@bookmyhotel.com` | `admin123` |
| 👤 Guest | `demo@test.com` | `demo123` |

## 📁 Project Structure

```
bookmyhotel/
├── server.js              # Express server + all API routes
├── database.js            # NeDB database + seed data
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── public/                # Static frontend
│   ├── index.html         # Home page
│   ├── rooms.html         # Rooms with filters
│   ├── facilities.html    # Hotel facilities
│   ├── contact.html       # Contact form
│   ├── about.html         # About page
│   ├── bookings.html      # My Bookings
│   ├── admin.html         # Admin Dashboard
│   ├── css/style.css      # Premium design system
│   └── js/app.js          # Frontend JavaScript
├── data/                  # Auto-generated database files
├── package.json
└── .env
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | NeDB (embedded NoSQL) |
| **Auth** | JWT + bcrypt + HttpOnly cookies |
| **Frontend** | Vanilla HTML/CSS/JS |
| **Design** | Custom CSS with glassmorphism |
| **Security** | Helmet, CORS, Rate Limiting |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login (returns JWT)
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Get current user

### Rooms
- `GET /api/rooms` — List rooms (with filters)
- `GET /api/rooms/:id` — Room details + reviews

### Bookings
- `POST /api/bookings` — Create booking
- `GET /api/bookings` — User's bookings
- `PATCH /api/bookings/:id/cancel` — Cancel booking

### Other
- `POST /api/reviews` — Submit review
- `POST /api/contact` — Send message
- `GET /api/admin/dashboard` — Admin stats

## 📄 License

MIT

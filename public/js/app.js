// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BookMyHotel — Frontend Application
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API = '';
let currentUser = null;
let accessToken = localStorage.getItem('accessToken');

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initNavbar();
  initHeroSlider();
  setMinDates();
  const roomsGrid = document.getElementById('roomsGrid');
  if (roomsGrid) loadRooms();
  const roomsPage = document.getElementById('roomsPageGrid');
  if (roomsPage) loadRoomsPage();
  const bookingsPage = document.getElementById('bookingsList');
  if (bookingsPage) loadBookings();
  const adminPage = document.getElementById('adminDashboard');
  if (adminPage) loadAdminDashboard();
});

// ── Auth ──
async function checkAuth() {
  if (!accessToken) { updateAuthUI(); return; }
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
    } else {
      accessToken = null;
      localStorage.removeItem('accessToken');
    }
  } catch (e) { console.error(e); }
  updateAuthUI();
}

function updateAuthUI() {
  const authBtns = document.getElementById('authBtns');
  const userMenu = document.getElementById('userMenu');
  if (!authBtns || !userMenu) return;
  if (currentUser) {
    authBtns.style.display = 'none';
    userMenu.style.display = 'flex';
    userMenu.style.gap = '0.5rem';
    userMenu.style.alignItems = 'center';
    const adminLink = document.getElementById('adminLink');
    if (currentUser.role === 'admin') {
      if (!adminLink) {
        const a = document.createElement('a');
        a.href = '/admin.html'; a.className = 'btn btn-ghost btn-sm'; a.id = 'adminLink';
        a.innerHTML = '<i class="bi bi-speedometer2"></i> Admin';
        userMenu.insertBefore(a, userMenu.firstChild);
      }
    }
  } else {
    authBtns.style.display = 'flex';
    authBtns.style.gap = '0.5rem';
    userMenu.style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      accessToken = data.accessToken;
      localStorage.setItem('accessToken', accessToken);
      currentUser = data.user;
      closeModal('loginModal');
      updateAuthUI();
      showToast('Welcome back, ' + data.user.name + '!', 'success');
    } else { showToast(data.error, 'error'); }
  } catch (e) { showToast('Login failed', 'error'); }
}

async function handleRegister(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    address: document.getElementById('regAddress').value,
    password: document.getElementById('regPassword').value
  };
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      accessToken = data.accessToken;
      localStorage.setItem('accessToken', accessToken);
      currentUser = data.user;
      closeModal('registerModal');
      updateAuthUI();
      showToast('Welcome, ' + data.user.name + '!', 'success');
    } else { showToast(data.error, 'error'); }
  } catch (e) { showToast('Registration failed', 'error'); }
}

function logout() {
  fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  accessToken = null; currentUser = null;
  localStorage.removeItem('accessToken');
  updateAuthUI();
  showToast('Logged out', 'info');
  if (window.location.pathname !== '/') window.location.href = '/';
}

// ── Rooms ──
async function loadRooms() {
  const grid = document.getElementById('roomsGrid');
  try {
    const res = await fetch(`${API}/api/rooms?sort=rating`);
    const data = await res.json();
    grid.innerHTML = data.rooms.slice(0, 3).map(renderRoomCard).join('');
  } catch (e) { grid.innerHTML = '<p style="color:var(--danger)">Failed to load rooms</p>'; }
}

async function loadRoomsPage() {
  const grid = document.getElementById('roomsPageGrid');
  const params = new URLSearchParams(window.location.search);
  const query = params.toString() ? '?' + params.toString() : '?sort=rating';
  try {
    grid.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const res = await fetch(`${API}/api/rooms${query}`);
    const data = await res.json();
    if (data.rooms.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.5);padding:3rem;">No rooms found matching your filters. Try adjusting your search.</p>';
    } else {
      grid.innerHTML = data.rooms.map(renderRoomCard).join('');
    }
    document.getElementById('roomCount').textContent = data.total + ' rooms found';
  } catch (e) { grid.innerHTML = '<p style="color:var(--danger)">Failed to load rooms</p>'; }
}

function renderRoomCard(room) {
  const stars = '★'.repeat(Math.floor(room.rating)) + (room.rating % 1 >= 0.5 ? '½' : '');
  const facilities = (Array.isArray(room.facilities) ? room.facilities : JSON.parse(room.facilities || '[]')).slice(0, 4);
  return `
    <div class="room-card">
      <div class="room-card-img">
        <img src="${room.image_url}" alt="${room.title}" loading="lazy">
        <div class="room-card-price">₹${room.price.toLocaleString()}/night</div>
      </div>
      <div class="room-card-body">
        <h3>${room.title}</h3>
        <p>${room.description || ''}</p>
        <div class="room-features">
          <span class="tag"><i class="bi bi-door-open"></i> ${room.rooms_count} Rooms</span>
          <span class="tag"><i class="bi bi-droplet"></i> ${room.bathrooms} Bath</span>
          ${room.balcony ? '<span class="tag"><i class="bi bi-sun"></i> Balcony</span>' : ''}
          <span class="tag"><i class="bi bi-people"></i> ${room.max_guests} Guests</span>
        </div>
        <div class="room-features">${facilities.map(f => `<span class="tag">${f}</span>`).join('')}</div>
        <div class="room-rating">
          <span class="stars">${stars}</span>
          <span>${room.rating} (${room.total_reviews} reviews)</span>
        </div>
        <div class="room-card-footer">
          <button class="btn btn-primary btn-sm" onclick='openBooking(${JSON.stringify(room).replace(/'/g, "\\'")})'>Book Now</button>
          <button class="btn btn-outline btn-sm" onclick='viewRoom("${room.id}")'>Details</button>
        </div>
      </div>
    </div>`;
}

function searchRooms(e) {
  e.preventDefault();
  const checkin = document.getElementById('searchCheckin').value;
  const checkout = document.getElementById('searchCheckout').value;
  const guests = document.getElementById('searchGuests').value;
  const sort = document.getElementById('searchSort').value;
  window.location.href = `/rooms.html?checkin=${checkin}&checkout=${checkout}&guests=${guests}&sort=${sort}`;
}

function applyFilters() {
  const params = new URLSearchParams();
  const ci = document.getElementById('filterCheckin');
  const co = document.getElementById('filterCheckout');
  const minP = document.getElementById('filterMinPrice');
  const maxP = document.getElementById('filterMaxPrice');
  const guests = document.getElementById('filterGuests');
  const sort = document.getElementById('filterSort');
  if (ci && ci.value) params.set('checkin', ci.value);
  if (co && co.value) params.set('checkout', co.value);
  if (minP && minP.value) params.set('minPrice', minP.value);
  if (maxP && maxP.value) params.set('maxPrice', maxP.value);
  if (guests && guests.value) params.set('guests', guests.value);
  if (sort && sort.value) params.set('sort', sort.value);
  const facs = [];
  document.querySelectorAll('.facility-checkbox:checked').forEach(cb => facs.push(cb.value));
  if (facs.length) params.set('facilities', facs.join(','));
  window.history.replaceState({}, '', '?' + params.toString());
  loadRoomsPage();
}

// ── Booking ──
function openBooking(room) {
  if (!currentUser) { showToast('Please login to book a room', 'error'); openModal('loginModal'); return; }
  const body = document.getElementById('bookingModalBody');
  body.innerHTML = `
    <img src="${room.image_url}" class="room-detail-img" alt="${room.title}">
    <h4 style="color:#fff; margin-bottom:0.5rem;">${room.title}</h4>
    <p style="color:var(--accent); font-size:1.2rem; font-weight:700; margin-bottom:1.5rem;">₹${room.price.toLocaleString()} per night</p>
    <form onsubmit="confirmBooking(event, '${room.id}', ${room.price})">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div class="form-group"><label>Check-in</label><input type="date" id="bookCheckin" required></div>
        <div class="form-group"><label>Check-out</label><input type="date" id="bookCheckout" required></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div class="form-group"><label>Adults</label><input type="number" id="bookAdults" value="1" min="1" max="${room.max_guests}"></div>
        <div class="form-group"><label>Children</label><input type="number" id="bookChildren" value="0" min="0" max="3"></div>
      </div>
      <div class="form-group"><label>Special Requests</label><textarea id="bookRequests" placeholder="Any special requirements..."></textarea></div>
      <div id="priceBreakdown" style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:10px; margin-bottom:1rem;"></div>
      <button type="submit" class="btn btn-primary" style="width:100%">Confirm Booking <i class="bi bi-check-circle"></i></button>
    </form>`;
  const ci = document.getElementById('bookCheckin');
  const co = document.getElementById('bookCheckout');
  const today = new Date().toISOString().split('T')[0];
  ci.min = today;
  ci.addEventListener('change', () => { co.min = ci.value; updatePrice(room.price); });
  co.addEventListener('change', () => updatePrice(room.price));
  openModal('bookingModal');
}

function updatePrice(pricePerNight) {
  const ci = document.getElementById('bookCheckin').value;
  const co = document.getElementById('bookCheckout').value;
  const el = document.getElementById('priceBreakdown');
  if (!ci || !co) { el.innerHTML = ''; return; }
  const nights = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) { el.innerHTML = '<p style="color:var(--danger)">Check-out must be after check-in</p>'; return; }
  const subtotal = pricePerNight * nights;
  const tax = Math.round(subtotal * 0.18);
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; color:rgba(255,255,255,0.6); margin-bottom:0.5rem;"><span>₹${pricePerNight.toLocaleString()} × ${nights} night${nights>1?'s':''}</span><span>₹${subtotal.toLocaleString()}</span></div>
    <div style="display:flex; justify-content:space-between; color:rgba(255,255,255,0.6); margin-bottom:0.5rem;"><span>Taxes (18% GST)</span><span>₹${tax.toLocaleString()}</span></div>
    <hr style="border-color:var(--glass-border); margin:0.5rem 0;">
    <div style="display:flex; justify-content:space-between; color:var(--accent); font-weight:700; font-size:1.1rem;"><span>Total</span><span>₹${(subtotal + tax).toLocaleString()}</span></div>`;
}

async function confirmBooking(e, roomId, price) {
  e.preventDefault();
  const body = {
    room_id: roomId,
    check_in: document.getElementById('bookCheckin').value,
    check_out: document.getElementById('bookCheckout').value,
    adults: parseInt(document.getElementById('bookAdults').value),
    children: parseInt(document.getElementById('bookChildren').value),
    special_requests: document.getElementById('bookRequests').value
  };
  try {
    const res = await fetch(`${API}/api/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      closeModal('bookingModal');
      showToast('🎉 Booking confirmed! Check your bookings page.', 'success');
    } else { showToast(data.error, 'error'); }
  } catch (e) { showToast('Booking failed', 'error'); }
}

async function viewRoom(id) {
  try {
    const res = await fetch(`${API}/api/rooms/${id}`);
    const data = await res.json();
    const room = data.room;
    const body = document.getElementById('bookingModalBody');
    const facilities = Array.isArray(room.facilities) ? room.facilities : JSON.parse(room.facilities || '[]');
    body.innerHTML = `
      <img src="${room.image_url}" class="room-detail-img" alt="${room.title}">
      <h3 style="color:#fff; margin-bottom:0.5rem;">${room.title}</h3>
      <p style="color:var(--accent); font-weight:700; font-size:1.2rem; margin-bottom:1rem;">₹${room.price.toLocaleString()} per night</p>
      <p style="color:rgba(255,255,255,0.6); margin-bottom:1.5rem;">${room.description}</p>
      <div class="detail-grid">
        <div class="detail-item"><i class="bi bi-door-open" style="color:var(--accent)"></i> ${room.rooms_count} Rooms</div>
        <div class="detail-item"><i class="bi bi-droplet" style="color:var(--accent)"></i> ${room.bathrooms} Bathrooms</div>
        <div class="detail-item"><i class="bi bi-sun" style="color:var(--accent)"></i> ${room.balcony} Balcony</div>
        <div class="detail-item"><i class="bi bi-people" style="color:var(--accent)"></i> Max ${room.max_guests} Guests</div>
      </div>
      <h5 style="color:#fff; margin-bottom:0.8rem; font-family:'Inter',sans-serif;">Facilities</h5>
      <div class="room-features" style="margin-bottom:1.5rem;">${facilities.map(f => `<span class="tag">${f}</span>`).join('')}</div>
      <h5 style="color:#fff; margin-bottom:0.8rem; font-family:'Inter',sans-serif;">Reviews (${data.reviews.length})</h5>
      ${data.reviews.length ? data.reviews.map(r => `<div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:10px; margin-bottom:0.5rem;"><div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;"><strong style="color:#fff">${r.user_name}</strong><span style="color:var(--warning)">${'★'.repeat(r.rating)}</span></div><p style="color:rgba(255,255,255,0.5);font-size:0.9rem;">${r.comment || 'Great stay!'}</p></div>`).join('') : '<p style="color:rgba(255,255,255,0.4)">No reviews yet</p>'}
      <button class="btn btn-primary" style="width:100%; margin-top:1.5rem;" onclick='openBooking(${JSON.stringify(room).replace(/'/g, "\\'")})'>Book Now</button>`;
    openModal('bookingModal');
  } catch (e) { showToast('Failed to load room details', 'error'); }
}

// ── Bookings Page ──
async function loadBookings() {
  if (!currentUser) { window.location.href = '/'; return; }
  const list = document.getElementById('bookingsList');
  try {
    const res = await fetch(`${API}/api/bookings`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!data.bookings.length) {
      list.innerHTML = '<div style="text-align:center;padding:4rem;"><h3 style="color:#fff;margin-bottom:1rem;">No Bookings Yet</h3><p style="color:rgba(255,255,255,0.5);margin-bottom:2rem;">Start exploring our premium rooms!</p><a href="/rooms.html" class="btn btn-primary">Browse Rooms</a></div>';
      return;
    }
    list.innerHTML = data.bookings.map(b => `
      <div class="booking-card">
        <div class="booking-card-inner">
          <img src="${b.room_image}" alt="${b.room_title}">
          <div class="booking-info">
            <h4>${b.room_title}</h4>
            <p><i class="bi bi-calendar3"></i> ${new Date(b.check_in).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} → ${new Date(b.check_out).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
            <p><i class="bi bi-people"></i> ${b.adults} Adults${b.children ? ', '+b.children+' Children' : ''}</p>
            <p style="color:var(--accent); font-weight:700; margin-top:0.3rem;">₹${b.total_price.toLocaleString()}</p>
          </div>
          <div style="text-align:center;">
            <span class="booking-status status-${b.status}">${b.status}</span>
            ${b.status === 'confirmed' || b.status === 'pending' ? `<button class="btn btn-danger btn-sm" style="margin-top:0.8rem;" onclick="cancelBooking('${b.id}')">Cancel</button>` : ''}
          </div>
        </div>
      </div>`).join('');
  } catch (e) { list.innerHTML = '<p style="color:var(--danger)">Failed to load bookings</p>'; }
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    const res = await fetch(`${API}/api/bookings/${id}/cancel`, {
      method: 'PATCH', headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (res.ok) { showToast('Booking cancelled', 'info'); loadBookings(); }
    else { const d = await res.json(); showToast(d.error, 'error'); }
  } catch (e) { showToast('Failed to cancel', 'error'); }
}

// ── Contact ──
async function handleContact(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('contactName').value,
    email: document.getElementById('contactEmail').value,
    subject: document.getElementById('contactSubject').value,
    message: document.getElementById('contactMessage').value
  };
  try {
    const res = await fetch(`${API}/api/contact`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) { showToast('Message sent successfully!', 'success'); e.target.reset(); }
    else { const d = await res.json(); showToast(d.error, 'error'); }
  } catch (e) { showToast('Failed to send message', 'error'); }
}

// ── Admin ──
async function loadAdminDashboard() {
  if (!currentUser || currentUser.role !== 'admin') { window.location.href = '/'; return; }
  try {
    const res = await fetch(`${API}/api/admin/dashboard`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    const d = await res.json();
    document.getElementById('statRooms').textContent = d.totalRooms;
    document.getElementById('statUsers').textContent = d.totalUsers;
    document.getElementById('statBookings').textContent = d.totalBookings;
    document.getElementById('statRevenue').textContent = '₹' + d.totalRevenue.toLocaleString();
    const tbody = document.getElementById('adminBookingsTable');
    tbody.innerHTML = d.recentBookings.map(b => `
      <tr>
        <td>${b.id.slice(0, 8)}...</td><td>${b.user_name}</td><td>${b.room_title}</td>
        <td>${b.check_in}</td><td>${b.check_out}</td>
        <td>₹${b.total_price.toLocaleString()}</td>
        <td><span class="booking-status status-${b.status}">${b.status}</span></td>
      </tr>`).join('');
  } catch (e) { showToast('Failed to load dashboard', 'error'); }
}

// ── UI Helpers ──
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function switchModal(from, to) { closeModal(from); setTimeout(() => openModal(to), 200); }

function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
  t.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; setTimeout(() => t.remove(), 300); }, 3500);
}

function initNavbar() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleMobileMenu() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

// ── Hero Slider ──
let currentSlide = 0;
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 5000);
}
function goToSlide(n) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  if (slides[n]) slides[n].classList.add('active');
  if (dots[n]) dots[n].classList.add('active');
  currentSlide = n;
}

function setMinDates() {
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => { if (!el.min) el.min = today; });
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

const DB = {
  get(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

const SEED_DOCTORS = [
  {id:1, name:"dr. Anisa Putri, Sp.A", spec:"Spesialis Anak", exp:8, avail:"yes", img:"anisa.png"},
  {id:2, name:"dr. Bagas Santoso, Sp.PD", spec:"Spesialis Penyakit Dalam", exp:12, avail:"yes", img:"bagas.png"},
  {id:3, name:"dr. Citra Lestari, Sp.KK", spec:"Spesialis Kulit & Kelamin", exp:5, avail:"no", img:"citra.png"},
  {id:4, name:"dr. Dimas Pratama, Sp.JP", spec:"Spesialis Jantung", exp:15, avail:"yes", img:"dimas.png"},
];

// Seed data profil pasien utama bawaan jika localstorage kosong
const SEED_PROFILES = [
  {
    id: 1, name: "Naisya Putri Aulia", birth: "2005-09-15", gender: "Perempuan",
    phone: "081234567890", email: "naisya.putri@student.unpad.ac.id",
    nik: "3273012345670001", kk: "3273019876543210", passport: "", isMain: true
  }
];

let doctors  = DB.get('doctors', SEED_DOCTORS);
let profiles = DB.get('profiles', SEED_PROFILES);
let bookings = DB.get('bookings', []);
let currentActiveDoctorId = null;

function saveAll(){
  DB.set('doctors', doctors);
  DB.set('profiles', profiles);
  DB.set('bookings', bookings);
}

/* ---------- SYSTEM NAV ---------- */
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(btn => {
  btn.addEventListener('click', () => { goPage(btn.getAttribute('data-page')); });
});

function goPage(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + name);
  if(targetPage) targetPage.classList.add('active');
  navLinks.forEach(b => b.classList.toggle('active', b.getAttribute('data-page') === name));
  window.scrollTo({top:0, behavior:'smooth'});
}

function toast(msg){
  const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 2400);
}

function openConfirmModal(text, onConfirm){
  document.getElementById('confirm-text').textContent = text;
  document.getElementById('confirm-modal').classList.add('active');
  const btn = document.getElementById('confirm-delete-btn');
  const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', ()=>{ onConfirm(); closeConfirmModal(); });
}
function closeConfirmModal(){ document.getElementById('confirm-modal').classList.remove('active'); }

/* ---------- UTILITY: CALCULATE AGE FROM BIRTHDATE ---------- */
function getAge(birthDateString) {
  if(!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

/* =========================================================
   DOCTORS — LOGIC
   ========================================================= */
function renderDoctors(){
  const search = (document.getElementById('doctor-search').value || '').toLowerCase();
  const list = doctors.filter(d => d.name.toLowerCase().includes(search) || d.spec.toLowerCase().includes(search));
  const target = document.getElementById('doctor-list');
  
  if(list.length===0) target.innerHTML = `<div class="empty">Tidak ada dokter yang cocok.</div>`;
  else target.innerHTML = list.map(d => doctorCardHTML(d)).join('');

  const home = doctors.filter(d=>d.avail==='yes').slice(0,4);
  document.getElementById('home-doctors').innerHTML = home.length ? home.map(d=>doctorCardHTML(d)).join('') : `<div class="empty">Belum ada dokter tersedia.</div>`;

  const sel = document.getElementById('b-doctor'); const current = sel.value;
  sel.innerHTML = '<option value="">Pilih Dokter</option>' + doctors.filter(d=>d.avail==='yes').map(d=>`<option value="${d.id}">${esc(d.name)} — ${esc(d.spec)}</option>`).join('');
  if(current) sel.value = current;

  document.getElementById('stat-doctors').textContent = doctors.length;
  document.getElementById('stat-bookings').textContent = bookings.length;
  document.getElementById('stat-profiles').textContent = profiles.length;
}

function doctorCardHTML(d){
  const initials = d.name.replace('dr.','').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return `
    <div class="card doc-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div class="doc-avatar">${initials}</div>
        <span class="availability ${d.avail==='yes'?'avail-yes':'avail-no'}"><span class="avail-dot"></span>${d.avail==='yes'?'Tersedia':'Tidak'}</span>
      </div>
      <div class="doc-name">${esc(d.name)}</div><span class="badge">${esc(d.spec)}</span>
      <div class="doc-meta" style="margin-top:auto;">${d.exp} tahun pengalaman</div>
      <button class="btn btn-primary-chat btn-sm btn-block" style="margin-top: 8px;" onclick="openChatRoom(${d.id})">Chat Sekarang</button>
    </div>`;
}
document.getElementById('doctor-search').addEventListener('input', renderDoctors);

/* =========================================================
   CHATROOM SIMULATION SYSTEM
   ========================================================= */
function openChatRoom(doctorId) {
  const doc = doctors.find(d => d.id === doctorId); if (!doc) return;
  currentActiveDoctorId = doctorId;
  const initials = doc.name.replace('dr.','').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('chat-doc-avatar').textContent = initials;
  document.getElementById('chat-doc-name').textContent = doc.name;
  document.getElementById('chat-doc-spec').textContent = doc.spec;

  const container = document.getElementById('chat-messages-container');
  container.innerHTML = `<div class="msg-bubble msg-left">Halo, saya <strong>${esc(doc.name)}</strong>. Ada gejala medis apa yang sedang kamu atau keluarga rasakan? Ceritakan detailnya ya.</div>`;
  goPage('room-chat');
  document.getElementById('chat-input-message').focus();
}

function sendMessage() {
  const inputEl = document.getElementById('chat-input-message'); const messageText = inputEl.value.trim(); if (!messageText) return;
  const container = document.getElementById('chat-messages-container');
  const userBubble = document.createElement('div'); userBubble.className = 'msg-bubble msg-right'; userBubble.textContent = messageText;
  container.appendChild(userBubble); inputEl.value = ''; container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    const doctorBubble = document.createElement('div'); doctorBubble.className = 'msg-bubble msg-left';
    doctorBubble.innerHTML = `Baik, keluhan awal Anda sudah masuk rekam sistem Sehat.in. Untuk pemeriksaan komprehensif, resep obat digital, atau tindakan langsung di klinik, silakan ajukan janji di tab <a href="#" onclick="goPage('reservasi'); return false;" style="color:var(--primary); font-weight:700; text-decoration:underline;">Reservasi Baru</a> dengan memilih profil pasien yang sesuai ya.`;
    container.appendChild(doctorBubble); container.scrollTop = container.scrollHeight;
  }, 1100);
}
document.getElementById('chat-input-message')?.addEventListener('keypress', function(e) { if (e.key === 'Enter') sendMessage(); });


/* =========================================================
   🌟 PATIENT PROFILE MANAGEMENT SYSTEM 🌟
   ========================================================= */
function renderProfiles(){
  const grid = document.getElementById('profile-family-grid');
  const selectB = document.getElementById('b-profile-id');
  if(!grid) return;

  // 1. Render Kartu Manajemen Profil
  grid.innerHTML = profiles.map(p => {
    const initial = p.name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    return `
      <div class="card" style="position:relative; border-top:4px solid ${p.isMain?'var(--primary)':'var(--muted)'}; padding:20px; background:#fff;">
        ${p.isMain ? `<span class="profile-badge-main" style="margin-top:15px;">Profil Utama Akun</span>` : ''}
        <div style="display:flex; gap:14px; align-items:center; margin-bottom:12px;">
          <div style="width:46px; height:46px; border-radius:50%; background:#f0fdfa; color:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:1.1rem;">${initial}</div>
          <div>
            <h4 style="margin:0; font-size:1.1rem; color:var(--ink);">${esc(p.name)}</h4>
            <div style="display:flex; gap:5px; margin-top:2px; flex-wrap:wrap;">
              <span class="info-tag">${p.gender}</span>
              <span class="info-tag">${getAge(p.birth)} Tahun</span>
            </div>
          </div>
        </div>
        <div style="font-size:0.85rem; color:var(--ink); border-top:1px dashed var(--line); padding:4px; padding-top:20px; display:flex; flex-direction:column; gap:5px;">
          <div><strong>No. HP:</strong> ${esc(p.phone)}</div>
          <div><strong>Email:</strong> ${esc(p.email)}</div>
          <div style="background:#f9fafb; padding:4px; border-radius:6px; margin-top:4px; font-size:0.8rem; color:var(--muted);">
            <div><strong>NIK:</strong> ${esc(p.nik)}</div>
            <div><strong>No. KK:</strong> ${esc(p.kk)}</div>
            ${p.passport ? `<div><strong>Paspor:</strong> ${esc(p.passport)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px; padding-top:8px;">
          <button class="btn btn-outline-edit btn-sm" onclick="editProfileData(${p.id})">Edit Profil</button>
          ${!p.isMain ? `<button class="btn btn-danger btn-sm" onclick="deleteProfileData(${p.id})"></button>` : ''}
        </div>
      </div>`;
  }).join('');

  // 2. Sinkronkan Dropdown Pemilihan di Halaman Reservasi Baru
  selectB.innerHTML = '<option value="">Pilih Profil Pasien / Anggota Keluarga</option>' + 
    profiles.map(p => `<option value="${p.id}">${esc(p.name)} (${getAge(p.birth)} Th · NIK: ${p.nik.slice(0,4)}...)</option>`).join('');
}

function openProfileModal() {
  document.getElementById('profile-form').reset();
  document.getElementById('p-id').value = '';
  document.getElementById('profile-modal-title').textContent = "Tambah Profil Anggota Baru";
  clearErrors('profile-form');
  document.getElementById('profile-modal').classList.add('active');
}
function closeProfileModal() { document.getElementById('profile-modal').classList.remove('active'); }

function editProfileData(id) {
  const p = profiles.find(x => x.id === id); if(!p) return;
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-birth').value = p.birth;
  document.getElementById('p-gender').value = p.gender;
  document.getElementById('p-phone').value = p.phone;
  document.getElementById('p-email').value = p.email;
  document.getElementById('p-nik').value = p.nik;
  document.getElementById('p-kk').value = p.kk;
  document.getElementById('p-passport').value = p.passport || '';
  
  document.getElementById('profile-modal-title').textContent = "Edit Informasi Profil Pasien";
  clearErrors('profile-form');
  document.getElementById('profile-modal').classList.add('active');
}

function deleteProfileData(id) {
  openConfirmModal('Hapus profil anggota keluarga ini? Semua data identitas medis lama akan dilepas dari riwayat cetak.', () => {
    profiles = profiles.filter(x => x.id !== id);
    saveAll(); renderProfiles(); renderDoctors();
    toast('Profil anggota keluarga berhasil dihapus.');
  });
}

// SIMPAN / UPDATE PROFIL PASIEN VIA MODAL FORM
document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = document.getElementById('p-id').value;
  const name = document.getElementById('p-name').value.trim();
  const birth = document.getElementById('p-birth').value;
  const gender = document.getElementById('p-gender').value;
  const phone = document.getElementById('p-phone').value.trim();
  const email = document.getElementById('p-email').value.trim();
  const nik = document.getElementById('p-nik').value.trim();
  const kk = document.getElementById('p-kk').value.trim();
  const passport = document.getElementById('p-passport').value.trim();

  let valid = true;
  valid = validateField('fpr-name', name.length >= 3) && valid;
  valid = validateField('fpr-birth', birth !== '') && valid;
  valid = validateField('fpr-gender', gender !== '') && valid;
  valid = validateField('fpr-phone', /^[0-9]{10,14}$/.test(phone)) && valid;
  valid = validateField('fpr-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && valid;
  valid = validateField('fpr-nik', /^[0-9]{16}$/.test(nik)) && valid;
  valid = validateField('fpr-kk', /^[0-9]{16}$/.test(kk)) && valid;

  if(!valid) return;

  if(id) {
    const p = profiles.find(x => x.id == id);
    if(p) {
      p.name = name; p.birth = birth; p.gender = gender; p.phone = phone; p.email = email; p.nik = nik; p.kk = kk; p.passport = passport;
    }
    toast('Profil data rekam pasien berhasil di-update!');
  } else {
    const newId = profiles.length ? Math.max(...profiles.map(x=>x.id))+1 : 1;
    profiles.push({ id: newId, name, birth, gender, phone, email, nik, kk, passport, isMain: false });
    toast('Profil anggota keluarga baru berhasil didaftarkan!');
  }

  saveAll(); closeProfileModal(); renderProfiles(); renderDoctors();
});


/* =========================================================
   INTEGRATED RESERVATION & RIWAYAT LOGIC
   ========================================================= */
function renderIntegratedHistory() {
  const container = document.getElementById('integrated-history-list');
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = `<div class="card empty">Timeline riwayat rekam janji medis kamu masih kosong. Silakan ajukan jadwal konsultasi baru.</div>`;
    return;
  }

  container.innerHTML = bookings.slice().reverse().map(b => {
    const doc = doctors.find(d => d.id == b.doctorId);
    // Hubungkan riwayat booking ke database profile terbaru
    const prof = profiles.find(p => p.id == b.profileId);
    
    let statusClass = 'status-waiting';
    if (b.status === 'Terkonfirmasi') statusClass = 'status-confirmed';
    if (b.status === 'Selesai') statusClass = 'status-done';
    if (b.status === 'Dibatalkan') statusClass = 'status-cancelled';

    return `
      <div class="card" style="border-left: 5px solid var(--primary); padding: 24px; margin-bottom:20px; background:var(--surface); box-shadow:var(--shadow); border-radius:var(--radius);">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div>
            <span style="font-size:0.75rem; color:var(--muted); font-weight:600; letter-spacing:0.02em;">ID REGISTRASI: #SHT-${b.id}</span>
            <div class="doc-name" style="margin-top:2px; font-weight:700; color:var(--ink); font-size:1.1rem;">
              Pasien: ${prof ? esc(prof.name) : '<span class="muted">Profil Terhapus</span>'} 
              <span style="font-weight:400; font-size:0.88rem; color:var(--muted);">(${prof ? getAge(prof.birth) : b.fallbackAge} th · ${prof ? esc(prof.gender) : ''} ${b.temp ? `· ${b.temp}°C` : ''})</span>
            </div>
          </div>
          <span class="status-pill ${statusClass}">${b.status}</span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:20px; font-size:0.9rem;">
          <div style="background:var(--bg); padding:14px; border-radius:10px;">
            <strong style="color:var(--primary-dark); display:block; margin-bottom:6px;">Fasilitas & Agenda</strong>
            <div style="margin-bottom:2px;"><strong>Dokter:</strong> ${doc ? esc(doc.name) : '<span class="muted">Dokter dihapus</span>'}</div>
            <div style="margin-bottom:2px;"><strong>Spesialis:</strong> ${doc ? esc(doc.spec) : '-'}</div>
            <div style="margin-bottom:2px;"><strong>Lokasi RS Mitra:</strong> <span style="color:var(--primary); font-weight:600;">${esc(b.hospital)}</span></div>
            <div><strong>Jadwal:</strong> ${b.date} · Jam ${b.time}</div>
          </div>

          <div style="background:var(--bg); padding:14px; border-radius:10px;">
            <strong style="color:var(--primary-dark); display:block; margin-bottom:6px;">Dokumen Ringkasan Medis</strong>
            <div style="margin-bottom:4px; font-style:italic; color:var(--ink);">"${esc(b.symptom)}"</div>
            <div style="margin-bottom:4px;"><strong style="font-size:0.8rem; color:var(--muted);">Alergi/Riwayat:</strong> ${b.history ? esc(b.history) : '-'}</div>
            <div style="font-size:0.78rem; color:var(--muted); border-top:1px solid var(--line); padding-top:4px;">
              NIK Berkas: ${prof ? esc(prof.nik) : '-'} | KK: ${prof ? esc(prof.kk) : '-'}
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);">
          <button class="btn btn-outline btn-sm" onclick="editBooking(${b.id})">Edit Jadwal</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBooking(${b.id})">Hapus</button>
        </div>
      </div>`;
  }).join('');
}

function deleteBooking(id){
  openConfirmModal('Hapus rekam janji medis terintegrasi ini secara permanen dari sistem?', ()=>{
    bookings = bookings.filter(x=>x.id!==id); saveAll(); renderIntegratedHistory(); renderDoctors();
    toast('Data kunjungan berhasil dihapus.');
  });
}

function editBooking(id) {
  const b = bookings.find(x => x.id === id); if (!b) return;
  document.getElementById('b-profile-id').value = b.profileId;
  document.getElementById('b-doctor').value = b.doctorId;
  document.getElementById('b-hospital').value = b.hospital;
  document.getElementById('b-date').value = b.date;
  document.getElementById('b-time').value = b.time;
  document.getElementById('b-temp').value = b.temp || '';
  document.getElementById('b-symptom').value = b.symptom;
  document.getElementById('b-history').value = b.history || '';

  bookingForm.dataset.editId = b.id;
  clearErrors('booking-form');
  goPage('reservasi');
  toast('Data dimuat! Silakan ubah jadwal atau keluhan, lalu kirim ulang.');
}

/* ---------- RESERVATION SUBMIT ---------- */
const bookingForm = document.getElementById('booking-form');
const todayStr = new Date().toISOString().split('T')[0];
if(document.getElementById('b-date')) document.getElementById('b-date').setAttribute('min', todayStr);

bookingForm.addEventListener('submit', e=>{
  e.preventDefault();
  const profileId = document.getElementById('b-profile-id').value;
  const doctorId = document.getElementById('b-doctor').value;
  const hospital = document.getElementById('b-hospital').value;
  const date = document.getElementById('b-date').value;
  const time = document.getElementById('b-time').value;
  const temp = document.getElementById('b-temp').value;
  const symptom = document.getElementById('b-symptom').value.trim();
  const history = document.getElementById('b-history').value.trim();

  let valid = true;
  valid = validateField('fr-choose-profile', profileId !== '') && valid;
  valid = validateField('fr-doctor', doctorId !== '') && valid;
  valid = validateField('fr-hospital', hospital !== '') && valid;
  valid = validateField('fr-date', date !== '' && date >= todayStr) && valid;
  valid = validateField('fr-time', time !== '') && valid;
  valid = validateField('fr-temp', temp === '' || (temp >= 30 && temp <= 45)) && valid;
  valid = validateField('fr-symptom', symptom.length >= 10) && valid;

  if(!valid) return;

  const editId = bookingForm.dataset.editId;
  const activeProf = profiles.find(p => p.id == profileId);

  if (editId) {
    const b = bookings.find(x => x.id == editId);
    if (b) {
      b.profileId = profileId; b.doctorId = doctorId; b.hospital = hospital; b.date = date; b.time = time;
      b.temp = temp ? Number(temp) : null; b.symptom = symptom; b.history = history;
      b.fallbackAge = activeProf ? getAge(activeProf.birth) : 20;
    }
    delete bookingForm.dataset.editId;
    toast('Perubahan jadwal reservasi berhasil disimpan!');
  } else {
    const newId = bookings.length ? Math.max(...bookings.map(b=>b.id))+1 : 1;
    bookings.push({
      id: newId, profileId, doctorId, hospital, date, time,
      temp: temp ? Number(temp) : null, symptom, history, status: 'Menunggu',
      fallbackAge: activeProf ? getAge(activeProf.birth) : 20
    });
    toast('Booking Berhasil! Identitas otomatis tersinkronisasi.');
  }
  
  saveAll(); bookingForm.reset(); clearErrors('booking-form');
  renderIntegratedHistory(); renderDoctors(); goPage('riwayat-medis');
});

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */
function validateField(rowId, isValid){
  const row = document.getElementById(rowId);
  if(row) row.classList.toggle('invalid', !isValid);
  return isValid;
}
function clearErrors(formId){
  document.getElementById(formId).querySelectorAll('.form-row').forEach(r=>r.classList.remove('invalid'));
}
function esc(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------- INITIALIZER ---------- */
function init(){
  renderDoctors();
  renderProfiles();
  renderIntegratedHistory();
}
init();

document.addEventListener("DOMContentLoaded", function () {
  // 1. Mengisi tahun hak cipta secara dinamis
  const yearSpan = document.getElementById("footer-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // 2. Logika Tombol Back to Top
  const backToTopBtn = document.getElementById("back-to-top");
  
  if (backToTopBtn) {
    window.addEventListener("scroll", function () {
      // Tombol muncul jika halaman di-scroll lebih dari 400 piksel
      if (window.scrollY > 400) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    });

    backToTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth" // Efek gulir halus ke atas
      });
    });
  }
});
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve Care+.html, Care+.css, Care+.js dari folder yang sama

const toProfile = (row) => ({ ...row, isMain: !!row.isMain });

/* ===================== DOCTORS ===================== */
app.get('/api/doctors', (req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY id').all());
});

app.get('/api/doctors/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Dokter tidak ditemukan' });
  res.json(row);
});

app.post('/api/doctors', (req, res) => {
  const { name, spec, exp, avail, img } = req.body;
  if (!name || !spec) return res.status(400).json({ error: 'name & spec wajib diisi' });
  const info = db.prepare(
    'INSERT INTO doctors (name, spec, exp, avail, img) VALUES (?,?,?,?,?)'
  ).run(name, spec, exp || 0, avail || 'yes', img || null);
  res.status(201).json(db.prepare('SELECT * FROM doctors WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/doctors/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Dokter tidak ditemukan' });
  const { name, spec, exp, avail, img } = req.body;
  db.prepare('UPDATE doctors SET name=?, spec=?, exp=?, avail=?, img=? WHERE id=?')
    .run(name ?? existing.name, spec ?? existing.spec, exp ?? existing.exp,
         avail ?? existing.avail, img ?? existing.img, req.params.id);
  res.json(db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id));
});

app.delete('/api/doctors/:id', (req, res) => {
  const info = db.prepare('DELETE FROM doctors WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Dokter tidak ditemukan' });
  res.json({ success: true });
});

/* ===================== PROFILES ===================== */
app.get('/api/profiles', (req, res) => {
  res.json(db.prepare('SELECT * FROM profiles ORDER BY id').all().map(toProfile));
});

app.post('/api/profiles', (req, res) => {
  const { name, birth, gender, phone, email, nik, kk, passport } = req.body;
  if (!name || name.trim().length < 3) return res.status(400).json({ error: 'Nama minimal 3 karakter' });
  if (!/^[0-9]{10,14}$/.test(phone || '')) return res.status(400).json({ error: 'Nomor HP tidak valid' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Email tidak valid' });
  if (!/^[0-9]{16}$/.test(nik || '')) return res.status(400).json({ error: 'NIK harus 16 digit' });
  if (!/^[0-9]{16}$/.test(kk || '')) return res.status(400).json({ error: 'No. KK harus 16 digit' });

  const info = db.prepare(
    `INSERT INTO profiles (name, birth, gender, phone, email, nik, kk, passport, isMain)
     VALUES (?,?,?,?,?,?,?,?,0)`
  ).run(name.trim(), birth, gender, phone.trim(), email.trim(), nik.trim(), kk.trim(), (passport || '').trim());

  res.status(201).json(toProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(info.lastInsertRowid)));
});

app.put('/api/profiles/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Profil tidak ditemukan' });
  const { name, birth, gender, phone, email, nik, kk, passport } = req.body;
  db.prepare(
    `UPDATE profiles SET name=?, birth=?, gender=?, phone=?, email=?, nik=?, kk=?, passport=? WHERE id=?`
  ).run(name ?? existing.name, birth ?? existing.birth, gender ?? existing.gender,
        phone ?? existing.phone, email ?? existing.email, nik ?? existing.nik,
        kk ?? existing.kk, passport ?? existing.passport, req.params.id);
  res.json(toProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id)));
});

app.delete('/api/profiles/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Profil tidak ditemukan' });
  if (existing.isMain) return res.status(400).json({ error: 'Profil utama tidak boleh dihapus' });
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

/* ===================== BOOKINGS ===================== */
app.get('/api/bookings', (req, res) => {
  res.json(db.prepare('SELECT * FROM bookings ORDER BY id').all());
});

app.post('/api/bookings', (req, res) => {
  const { profileId, doctorId, hospital, date, time, temp, symptom, history, fallbackAge } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (!profileId) return res.status(400).json({ error: 'Profil pasien wajib dipilih' });
  if (!doctorId) return res.status(400).json({ error: 'Dokter wajib dipilih' });
  if (!hospital) return res.status(400).json({ error: 'Rumah sakit wajib dipilih' });
  if (!date || date < today) return res.status(400).json({ error: 'Tanggal tidak valid' });
  if (!time) return res.status(400).json({ error: 'Jam wajib dipilih' });
  if (temp !== null && temp !== undefined && temp !== '' && (temp < 30 || temp > 45))
    return res.status(400).json({ error: 'Suhu harus antara 30–45°C' });
  if (!symptom || symptom.trim().length < 10) return res.status(400).json({ error: 'Keluhan minimal 10 karakter' });

  const info = db.prepare(
    `INSERT INTO bookings (profileId, doctorId, hospital, date, time, temp, symptom, history, status, fallbackAge)
     VALUES (?,?,?,?,?,?,?,?, 'Menunggu', ?)`
  ).run(profileId, doctorId, hospital, date, time, temp || null, symptom.trim(), (history || '').trim(), fallbackAge || null);

  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/bookings/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  const { profileId, doctorId, hospital, date, time, temp, symptom, history, status, fallbackAge } = req.body;
  db.prepare(
    `UPDATE bookings SET profileId=?, doctorId=?, hospital=?, date=?, time=?, temp=?, symptom=?, history=?, status=?, fallbackAge=? WHERE id=?`
  ).run(profileId ?? existing.profileId, doctorId ?? existing.doctorId, hospital ?? existing.hospital,
        date ?? existing.date, time ?? existing.time, temp ?? existing.temp,
        symptom ?? existing.symptom, history ?? existing.history, status ?? existing.status,
        fallbackAge ?? existing.fallbackAge, req.params.id);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

app.delete('/api/bookings/:id', (req, res) => {
  const info = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Booking tidak ditemukan' });
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Server Care+ berjalan di http://localhost:${PORT}`);
});

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'careplus.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    spec TEXT NOT NULL,
    exp INTEGER DEFAULT 0,
    avail TEXT DEFAULT 'yes',
    img TEXT
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth TEXT,
    gender TEXT,
    phone TEXT,
    email TEXT,
    nik TEXT,
    kk TEXT,
    passport TEXT,
    isMain INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profileId INTEGER,
    doctorId INTEGER,
    hospital TEXT,
    date TEXT,
    time TEXT,
    temp REAL,
    symptom TEXT,
    history TEXT,
    status TEXT DEFAULT 'Menunggu',
    fallbackAge INTEGER,
    FOREIGN KEY(profileId) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY(doctorId) REFERENCES doctors(id) ON DELETE SET NULL
  );
`);

// Seed dokter default (TANPA foto dulu — foto dimigrasi terpisah, lihat migrate-doctor-images.js)
const doctorCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
if (doctorCount === 0) {
  const insertDoctor = db.prepare(
    'INSERT INTO doctors (name, spec, exp, avail, img) VALUES (?,?,?,?,?)'
  );
  const seedDoctors = [
  { name: "dr. Anisa Putri, Sp.A", spec: "Spesialis Anak", exp: 8, avail: "yes", img: "anisa.jpg" },
  { name: "dr. Bagas Santoso, Sp.PD", spec: "Spesialis Penyakit Dalam", exp: 12, avail: "yes", img: "bagas.jpg" },
  { name: "dr. Citra Lestari, Sp.KK", spec: "Spesialis Kulit & Kelamin", exp: 5, avail: "no", img: "citra.jpg" },
  { name: "dr. Dimas Pratama, Sp.JP", spec: "Spesialis Jantung", exp: 15, avail: "yes", img: "dimas.jpg" },
];

const insertMany = db.transaction((rows) => {
  for (const d of rows) {
    // Pastikan urutannya benar (sesuai urutan di tabel)
    insertDoctor.run(d.name, d.spec, d.exp, d.avail, d.img);
  }
});
insertMany(seedDoctors);
}

// Seed profil utama default
const profileCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get().c;
if (profileCount === 0) {
  db.prepare(
    `INSERT INTO profiles (name, birth, gender, phone, email, nik, kk, passport, isMain)
     VALUES (?,?,?,?,?,?,?,?,1)`
  ).run(
    "Naisya Putri Aulia", "2005-09-15", "Perempuan",
    "081234567890", "naisya.putri@student.unpad.ac.id",
    "3273012345670001", "3273019876543210", ""
  );
}

module.exports = db;
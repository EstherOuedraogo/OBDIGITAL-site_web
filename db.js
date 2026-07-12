const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'obdigital.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  type_inscription TEXT NOT NULL DEFAULT 'contact',
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau',
  date_creation TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  offre TEXT NOT NULL,
  montant INTEGER NOT NULL,
  statut_paiement TEXT NOT NULL DEFAULT 'en_attente',
  date_creation TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS temoignages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  photo TEXT,
  texte TEXT NOT NULL,
  resultat TEXT,
  publie INTEGER NOT NULL DEFAULT 1,
  date_creation TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Seed testimonials on first run only
const count = db.prepare('SELECT COUNT(*) AS n FROM temoignages').get().n;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO temoignages (nom, photo, texte, resultat) VALUES (?, ?, ?, ?)'
  );
  const seed = db.transaction((rows) => {
    for (const r of rows) insert.run(r.nom, r.photo, r.texte, r.resultat);
  });
  seed([
    { nom: 'Salma A.', photo: 'SA', texte: "En quatre semaines, j'ai publié plus de contenu qu'en un an tout seul. La méthode change tout.", resultat: '+2 400 abonnés en 60 jours' },
    { nom: 'Youssef M.', photo: 'YM', texte: "Je ne savais pas monter une vidéo. Aujourd'hui je produis seul tout le contenu de ma marque.", resultat: 'Studio vidéo personnel lancé' },
    { nom: 'Imane K.', photo: 'IK', texte: "L'accompagnement après la formation a fait toute la différence pour rester régulier.", resultat: '+100k vues cumulées' }
  ]);
}

module.exports = db;

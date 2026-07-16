const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'obdigital9@gmail.com';

let transporter = null;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
} else {
  console.warn('⚠️  GMAIL_USER / GMAIL_APP_PASSWORD non configurés — les notifications email sont désactivées.');
}

/**
 * Envoie une notification email à l'admin quand un nouveau lead arrive.
 * N'échoue jamais bruyamment : si l'email ne part pas, on logue l'erreur
 * mais on ne bloque jamais l'inscription du visiteur.
 */
async function notifyNewLead({ type, prenom, email, telephone, message, offre, montant }) {
  if (!transporter) return;

  const typeLabels = {
    masterclass: 'Masterclass Gratuite',
    programme: 'Programme Content IA Starter',
    contact: 'Formulaire de contact'
  };

  const subject = `🔔 Nouvelle inscription — ${typeLabels[type] || type} — ${prenom}`;

  const lines = [
    `Nouvelle inscription reçue sur OBDIGITAL`,
    ``,
    `Type : ${typeLabels[type] || type}`,
    `Prénom : ${prenom}`,
    `Email : ${email}`,
    telephone ? `Téléphone : ${telephone}` : null,
    offre ? `Offre choisie : ${offre}` : null,
    montant ? `Montant : ${montant} FCFA` : null,
    message ? `Message : ${message}` : null,
    ``,
    `Voir dans le tableau de bord : https://obdigital-site-web.onrender.com/admin.html`
  ].filter(Boolean);

  try {
    await transporter.sendMail({
      from: `OBDIGITAL <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      subject,
      text: lines.join('\n')
    });
  } catch (err) {
    console.error('❌ Échec envoi email de notification :', err.message);
  }
}

module.exports = { notifyNewLead };

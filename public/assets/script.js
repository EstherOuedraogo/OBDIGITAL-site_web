// ---------- Mobile nav ----------
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.textContent = links.classList.contains('open') ? '✕' : '☰';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.textContent = '☰';
    }));
  }

  // ---------- Render-grid signature generator ----------
  document.querySelectorAll('.render-grid').forEach(grid => {
    const cols = 24, rows = 10;
    const total = cols * rows;
    const litCount = Math.floor(total * 0.09);
    const litIndices = new Set();
    while (litIndices.size < litCount) {
      litIndices.add(Math.floor(Math.random() * total));
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('span');
      if (litIndices.has(i)) {
        cell.classList.add('lit');
        cell.style.setProperty('--d', (Math.random() * 3.6).toFixed(2));
      }
      frag.appendChild(cell);
    }
    grid.appendChild(frag);
  });

  // ---------- Forms (submit to real backend API) ----------
  document.querySelectorAll('form[data-obd-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const endpoint = form.getAttribute('data-endpoint');
      const card = form.closest('.form-card');
      const success = card ? card.querySelector('.form-success') : null;
      const errorBox = card ? card.querySelector('.form-error') : null;
      const submitBtn = form.querySelector('button[type="submit"]');

      const payload = {};
      new FormData(form).forEach((value, key) => { payload[key] = value; });

      if (errorBox) errorBox.style.display = 'none';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = 'Envoi en cours…'; }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Une erreur est survenue. Réessayez.");
        }

        form.style.display = 'none';
        if (success) success.style.display = 'block';

        const redirect = form.getAttribute('data-redirect');
        if (redirect) {
          setTimeout(() => { window.location.href = redirect; }, 900);
        }
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || "Impossible d'envoyer le formulaire. Vérifiez votre connexion.";
          errorBox.style.display = 'block';
        } else {
          alert(err.message || "Impossible d'envoyer le formulaire.");
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
      }
    });
  });

  // ---------- Dynamic testimonials (homepage) ----------
  const testiMount = document.getElementById('testi-grid-dynamic');
  if (testiMount) {
    fetch('/api/temoignages')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(rows => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        testiMount.innerHTML = rows.map(t => `
          <div class="testi-card">
            <p class="testi-quote">"${escapeHtml(t.texte)}"</p>
            <div class="testi-person">
              <div class="testi-avatar">${escapeHtml(t.photo || t.nom.slice(0,2))}</div>
              <div>
                <div class="testi-name">${escapeHtml(t.nom)}</div>
                <div class="testi-result">${escapeHtml(t.resultat || '')}</div>
              </div>
            </div>
          </div>`).join('');
      })
      .catch(() => { /* keep static fallback markup already in the page */ });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
});

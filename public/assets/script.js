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

  // ---------- Scroll reveal: groups fade in/out together ----------
  const groups = document.querySelectorAll('.reveal-group');
  if (groups.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    groups.forEach(g => io.observe(g));
  } else {
    groups.forEach(g => g.classList.add('in-view'));
  }

  // ---------- Animated stat counters (play once, when visible) ----------
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length && 'IntersectionObserver' in window) {
    const counterIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    statNumbers.forEach(el => counterIO.observe(el));
  }

  function animateCount(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/([+-]?)([\d\s]+)(.*)/);
    if (!match) return;
    const sign = match[1] || '';
    const digits = parseInt(match[2].replace(/\s/g, ''), 10);
    const suffix = match[3] || '';
    if (isNaN(digits)) return;

    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(digits * eased);
      el.textContent = sign + current.toLocaleString('fr-FR') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = raw;
    }
    requestAnimationFrame(tick);
  }

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

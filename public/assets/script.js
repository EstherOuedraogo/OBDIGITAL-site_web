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

  // ---------- Hero title: split into words for staggered reveal ----------
  document.querySelectorAll('[data-split]').forEach(el => {
    const walk = (node) => {
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          const parts = child.textContent.split(/(\s+)/);
          parts.forEach((part, i) => {
            if (part.trim() === '') { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            span.style.animationDelay = (0.08 * wordIndex++) + 's';
            frag.appendChild(span);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    let wordIndex = 0;
    walk(el);
  });

  // ---------- Ambient hero particles ----------
  document.querySelectorAll('.particles').forEach(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w, h, particles;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    }
    function init() {
      const count = Math.min(46, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.18 - 0.04,
        a: Math.random() * 0.5 + 0.15
      }));
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,200,126,${p.a})`;
        ctx.fill();
      });
      if (!reduceMotion) requestAnimationFrame(tick);
    }
    resize();
    init();
    if (!reduceMotion) requestAnimationFrame(tick);
    else tick();
    window.addEventListener('resize', () => { resize(); init(); });
  });

  // ---------- Magnetic button (follows cursor slightly) ----------
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });

  // ---------- Sticky CTA bar (appears after scrolling past hero) ----------
  const stickyCta = document.getElementById('stickyCta');
  const heroEl = document.querySelector('.hero');
  if (stickyCta && heroEl) {
    const onScroll = () => {
      const past = window.scrollY > heroEl.offsetHeight * 0.9;
      stickyCta.classList.toggle('visible', past);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Interactive before/after compare slider ----------
  document.querySelectorAll('[data-compare]').forEach(slider => {
    const before = slider.querySelector('.compare-before');
    const handle = slider.querySelector('.compare-handle');
    const beforeImg = before.querySelector('img');

    function setPos(pct) {
      pct = Math.max(4, Math.min(96, pct));
      before.style.width = pct + '%';
      handle.style.left = pct + '%';
      beforeImg.style.width = (slider.offsetWidth) + 'px';
    }
    function posFromEvent(e) {
      const rect = slider.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      return ((clientX - rect.left) / rect.width) * 100;
    }
    let dragging = false;
    slider.addEventListener('mousedown', (e) => { dragging = true; setPos(posFromEvent(e)); });
    window.addEventListener('mousemove', (e) => { if (dragging) setPos(posFromEvent(e)); });
    window.addEventListener('mouseup', () => { dragging = false; });
    slider.addEventListener('touchstart', (e) => { dragging = true; setPos(posFromEvent(e)); }, { passive: true });
    slider.addEventListener('touchmove', (e) => { if (dragging) setPos(posFromEvent(e)); }, { passive: true });
    slider.addEventListener('touchend', () => { dragging = false; });
    window.addEventListener('resize', () => setPos(parseFloat(before.style.width) || 50));
    setPos(50);
  });

  // ---------- Subtle 3D tilt on result/testimonial cards ----------
  document.querySelectorAll('.results-gallery figure, .testi-card, .showcase-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateX(${-py * 8}deg) rotateY(${px * 8}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

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

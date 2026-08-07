/**
 * MallPark — Shared UI polish (all pages)
 * Clock, magnetic buttons, scroll spy, ambient parallax, stagger reveals.
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderClock();
  initMagneticButtons();
  initNavScrollSpy();
  initAmbientParallax();
  initStaggerChildren();
  enhanceLoadingScreen();
  initHeaderScrollShadow();
});

function initHeaderScrollShadow() {
  const header = document.querySelector('.main-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Header clock & date ---------- */
function initHeaderClock() {
  const timeEl = document.getElementById('headerTime');
  const dateEl = document.getElementById('headerDate');
  if (!timeEl && !dateEl) return;

  const tick = () => {
    const now = new Date();
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
      });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
    }
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Magnetic hover on primary buttons ---------- */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn-ripple, .welcome-submit, .reserve-slot-btn');
  buttons.forEach((btn) => {
    btn.classList.add('btn-magnetic');
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/* ---------- Nav active state on scroll ---------- */
function initNavScrollSpy() {
  const links = document.querySelectorAll('.main-header nav a[data-section]');
  if (!links.length) return;

  const sections = [...links]
    .map((l) => document.getElementById(l.dataset.section))
    .filter(Boolean);

  if (!sections.length) return;
  if (!('IntersectionObserver' in window)) {
    const firstId = sections[0]?.id;
    if (firstId) {
      links.forEach((l) => l.classList.toggle('active', l.dataset.section === firstId));
    }
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      links.forEach((l) => l.classList.toggle('active', l.dataset.section === id));
    });
  }, { rootMargin: '-20% 0px -60% 0px', threshold: 0.05 });

  sections.forEach((s) => observer.observe(s));
}

/* ---------- Subtle parallax on ambient layers ---------- */
function initAmbientParallax() {
  const mesh = document.querySelector('.ambient-mesh');
  const rays = document.querySelector('.ambient-rays');
  if (!mesh && !rays) return;

  let raf = null;
  document.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 14;
      if (mesh) mesh.style.transform = `translate(${x}px, ${y}px)`;
      if (rays) rays.style.transform = `translate(${-x * 0.5}px, ${-y * 0.5}px)`;
      raf = null;
    });
  });
}

/* ---------- Stagger reveal for card grids ---------- */
function initStaggerChildren() {
  const grids = document.querySelectorAll('.kpi-grid, .statistics-section, .floor-occupancy-grid, .charts-grid');
  grids.forEach((grid) => {
    [...grid.children].forEach((child, i) => {
      child.classList.add('stagger-item');
      child.style.animationDelay = `${i * 0.06}s`;
    });
  });
}

/* ---------- Loading screen status text ---------- */
function enhanceLoadingScreen() {
  const screen = document.getElementById('loadingScreen');
  if (!screen || screen.querySelector('.loading-status')) return;

  const status = document.createElement('p');
  status.className = 'loading-status';
  status.textContent = 'Initializing systems…';
  screen.appendChild(status);

  const steps = ['Syncing parking data…', 'Loading live map…', 'Ready'];
  let i = 0;
  const interval = setInterval(() => {
    if (screen.classList.contains('hide') || !screen.isConnected) {
      clearInterval(interval);
      return;
    }
    status.textContent = steps[Math.min(i, steps.length - 1)];
    i++;
  }, 400);
}
/**
 * MallPark — Entry Screen
 * Single Customer Portal entry: collect vehicle details, save locally, go to dashboard.
 * No authentication required.
 */

document.addEventListener('DOMContentLoaded', () => {
  const THEME_KEY = 'mallpark-theme';
  const CUSTOMER_PLATE_KEY = 'mallpark-customer-plate';
  const VEHICLE_TYPE_KEY = 'mallpark-vehicle-type';
  const VEHICLE_EV_KEY = 'mallpark-vehicle-ev';

  const loadingScreen = document.getElementById('loadingScreen');
  const particles = document.getElementById('particles');
  const mouseGlow = document.getElementById('mouseGlow');
  const form = document.getElementById('vehicleEntryForm');
  const vehicleNumberInput = document.getElementById('vehicleNumberInput');
  const vehicleTypeSelector = document.getElementById('vehicleTypeSelector');
  const evToggle = document.getElementById('evToggle');
  const startBtn = document.getElementById('startJourneyBtn');

  let isEV = false;
  let vehicleType = 'Four-Wheeler';

  /* Restore theme preference */
  if (localStorage.getItem(THEME_KEY) === 'light') {
    document.body.classList.add('light-mode');
  }

  /* Pre-fill from a previous visit, if any */
  const savedPlate = localStorage.getItem(CUSTOMER_PLATE_KEY);
  if (savedPlate && vehicleNumberInput) vehicleNumberInput.value = savedPlate;

  /* ---------- Loading screen ---------- */
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hide');
        setTimeout(() => loadingScreen.remove(), 600);
      }
    }, 900);
  });

  /* ---------- Floating particles ---------- */
  function spawnParticles(count = 36) {
    if (!particles) return;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('span');
      dot.className = 'particle';
      const size = 2 + Math.random() * 4;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${Math.random() * 100}%`;
      dot.style.top = `${Math.random() * 100}%`;
      dot.style.animationDuration = `${8 + Math.random() * 14}s`;
      dot.style.animationDelay = `${Math.random() * 6}s`;
      particles.appendChild(dot);
    }
  }

  /* ---------- Mouse glow ---------- */
  function initMouseGlow() {
    if (!mouseGlow) return;
    document.addEventListener('mousemove', (e) => {
      mouseGlow.style.left = `${e.clientX}px`;
      mouseGlow.style.top = `${e.clientY}px`;
    });
  }

  /* ---------- Ripple buttons ---------- */
  function initRipples() {
    document.querySelectorAll('.btn-ripple').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  /* ---------- EV / Normal toggle ---------- */
  function initEvToggle() {
    if (!evToggle) return;
    const savedEV = localStorage.getItem(VEHICLE_EV_KEY);
    isEV = savedEV === 'true';
    updateEvToggleUI();

    evToggle.querySelectorAll('.ev-toggle-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        isEV = btn.dataset.ev === 'true';
        updateEvToggleUI();
      });
    });
  }

  function updateEvToggleUI() {
    if (!evToggle) return;
    evToggle.setAttribute('aria-pressed', String(isEV));
    evToggle.querySelectorAll('.ev-toggle-option').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.ev === 'true') === isEV);
    });
  }

  /* ---------- Vehicle Type selector (Two-Wheeler / Four-Wheeler) ---------- */
  function initVehicleTypeSelector() {
    if (!vehicleTypeSelector) return;
    const savedType = localStorage.getItem(VEHICLE_TYPE_KEY);
    vehicleType = savedType === 'Two-Wheeler' ? 'Two-Wheeler' : 'Four-Wheeler';
    updateVehicleTypeUI();

    vehicleTypeSelector.querySelectorAll('.vehicle-type-card').forEach((card) => {
      card.addEventListener('click', () => {
        vehicleType = card.dataset.vehicleType === 'Two-Wheeler' ? 'Two-Wheeler' : 'Four-Wheeler';
        updateVehicleTypeUI();
      });
    });
  }

  function updateVehicleTypeUI() {
    if (!vehicleTypeSelector) return;
    vehicleTypeSelector.querySelectorAll('.vehicle-type-card').forEach((card) => {
      const active = card.dataset.vehicleType === vehicleType;
      card.classList.toggle('active', active);
      card.setAttribute('aria-checked', String(active));
    });
  }

  /* ---------- Form submit ---------- */
  function normalizePlate(value) {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const plate = normalizePlate(vehicleNumberInput?.value);
      if (!plate) {
        vehicleNumberInput?.focus();
        return;
      }
      localStorage.setItem(CUSTOMER_PLATE_KEY, plate);
      localStorage.setItem(VEHICLE_TYPE_KEY, vehicleType);
      localStorage.setItem(VEHICLE_EV_KEY, String(isEV));

      document.body.classList.add('page-exit');
      setTimeout(() => {
        window.location.href = 'customer.html';
      }, 380);
    });
  }

  spawnParticles();
  initMouseGlow();
  initVehicleTypeSelector();
  initEvToggle();
  initRipples();
});
/**
 * MallPark — Customer Portal
 * Customer-facing parking: map, reserve, session, receipt, find own vehicle.
 * Privacy: no activity feed, no other users' data, search limited to own plate.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ========================================================================
     CONSTANTS & STATE
     ======================================================================== */

  const RATE_PER_HOUR = 40;
  const CHARGING_RATE_PER_HOUR = 50;
  const THEME_KEY = 'mallpark-theme';
  const DEFAULT_VEHICLE = 'MH12AB4587';
  const GST_RATE = 0.05;
  const CUSTOMER_PLATE_KEY = 'mallpark-customer-plate';

  const FLOOR_DATA = {
    B2:     { free: 24, full: false, zone: 'North Wing' },
    B1:     { free: 31, full: false, zone: 'South Wing' },
    Ground: { free: 0,  full: true,  zone: 'Main Plaza' },
    L1:     { free: 42, full: false, zone: 'East Wing' },
    L2:     { free: 86, full: false, zone: 'West Wing' }
  };

  const SLOT_DISTANCES = {
    A01: 12, A02: 18, A03: 24, A04: 30, A05: 36, A06: 42, A07: 48, A08: 54,
    B01: 20, B02: 26, B03: 32, B04: 38, B05: 44, B06: 50, B07: 56, B08: 62,
    C01: 28, C02: 34, C03: 40, C04: 46, C05: 52, C06: 58, C07: 64, C08: 70,
    D01: 36, D02: 42, D03: 48, D04: 54, D05: 60, D06: 66, D07: 72, D08: 78
  };

  const myPlate = normalizePlate(localStorage.getItem(CUSTOMER_PLATE_KEY) || DEFAULT_VEHICLE);

  const VEHICLE_EV_KEY = 'mallpark-vehicle-ev';
  const wantsEV = localStorage.getItem(VEHICLE_EV_KEY) === 'true';
  const VEHICLE_TYPE_KEY = 'mallpark-vehicle-type';
  const myVehicleType = localStorage.getItem(VEHICLE_TYPE_KEY) === 'Two-Wheeler' ? 'Two-Wheeler' : 'Four-Wheeler';
  const AVG_SLOT_DISTANCE = Math.round(
    Object.values(SLOT_DISTANCES).reduce((sum, d) => sum + d, 0) / Object.values(SLOT_DISTANCES).length
  );
  const ROW_ORDER = { A: 0, B: 1, C: 2, D: 3 };

  const state = {
    currentFloor: 'B2',
    selectedSlot: null,
    selectedSlotEl: null,
    floorFree: 24,
    evChargersFree: 8,
    session: null,
    lastReceipt: null,
    timerId: null,
    /** Only the customer's own vehicle is searchable */
    myVehicle: null,
    /** AI Smart Parking Assistant */
    aiRecommendation: null
  };

  /* ========================================================================
     DOM CACHE
     ======================================================================== */

  const dom = {
    navLinks: document.querySelectorAll('.main-header nav a'),
    themeBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.querySelector('#themeToggleBtn i'),
    searchInput: document.getElementById('globalSearchInput'),
    searchBtn: document.getElementById('globalSearchBtn'),
    heroPrimaryCta: document.getElementById('heroPrimaryCta'),
    statFloorFree: document.getElementById('statFloorFree'),
    statEV: document.getElementById('statEV'),
    statFee: document.getElementById('statFee'),
    statMyStatus: document.getElementById('statMyStatus'),
    floorButtons: document.querySelectorAll('.floor-buttons button'),
    currentFloorDisplay: document.getElementById('current-floor-display'),
    mapContainer: document.querySelector('.parking-map-container'),
    mapSlots: document.querySelectorAll('.parking-map-container .parking-slot'),
    selectedSlot: document.getElementById('selected-slot'),
    slotStatus: document.getElementById('slot-status'),
    slotFloor: document.getElementById('slot-floor'),
    slotVehicleType: document.getElementById('slot-vehicle-type'),
    slotDistance: document.getElementById('slot-distance'),
    reserveBtn: document.getElementById('reserveSlotBtn'),
    vehicleNumber: document.getElementById('vehicleNumber'),
    currentSlot: document.getElementById('currentSlot'),
    entryTime: document.getElementById('entryTime'),
    parkingDuration: document.getElementById('parkingDuration'),
    parkingStatus: document.getElementById('parkingStatus'),
    parkingFee: document.getElementById('parkingFee'),
    chargingFee: document.getElementById('chargingFee'),
    chargingFeeRow: document.getElementById('chargingFeeRow'),
    chargingRateRow: document.getElementById('chargingRateRow'),
    estimatedCharge: document.getElementById('estimatedCharge'),
    paymentStatus: document.getElementById('paymentStatus'),
    exitBtn: document.getElementById('exitParkingBtn'),
    receiptStatus: document.getElementById('receiptStatus'),
    receiptID: document.getElementById('receiptID'),
    receiptVehicle: document.getElementById('receiptVehicle'),
    receiptSlot: document.getElementById('receiptSlot'),
    receiptEntry: document.getElementById('receiptEntry'),
    receiptExit: document.getElementById('receiptExit'),
    receiptDuration: document.getElementById('receiptDuration'),
    receiptAmount: document.getElementById('receiptAmount'),
    summaryTotalTime: document.getElementById('summaryTotalTime'),
    summaryGST: document.getElementById('summaryGST'),
    totalPaid: document.getElementById('totalPaid'),
    paymentBadgeText: document.getElementById('paymentBadgeText'),
    downloadReceiptBtn: document.getElementById('downloadReceiptBtn'),
    vehicleSearchInput: document.getElementById('vehicleSearchInput'),
    vehicleSearchBtn: document.getElementById('vehicleSearchBtn'),
    foundVehicle: document.getElementById('foundVehicle'),
    foundFloor: document.getElementById('foundFloor'),
    foundSlot: document.getElementById('foundSlot'),
    foundZone: document.getElementById('foundZone'),
    walkingDistance: document.getElementById('walkingDistance'),
    walkingTime: document.getElementById('walkingTime'),
    showRouteBtn: document.getElementById('showRouteBtn'),
    findVehicleSection: document.getElementById('find-vehicle'),
    loadingScreen: document.getElementById('loadingScreen'),
    particles: document.getElementById('particles'),
    mouseGlow: document.getElementById('mouseGlow'),
    sections: {
      dashboard: document.getElementById('dashboard'),
      'parking-map': document.getElementById('parking-map'),
      'find-vehicle': document.getElementById('find-vehicle'),
      session: document.getElementById('session'),
      'ai-insights': document.getElementById('ai-insights')
    },
    // AI Smart Parking Assistant
    aiCard: document.getElementById('aiAssistantCard'),
    aiCardToggle: document.getElementById('aiCardToggle'),
    aiCardBody: document.getElementById('aiCardBody'),
    aiRecommendedSlot: document.getElementById('aiRecommendedSlot'),
    aiRecommendedScore: document.getElementById('aiRecommendedScore'),
    aiReasonsList: document.getElementById('aiReasonsList'),
    aiAcceptBtn: document.getElementById('aiAcceptBtn'),
    aiStatusText: document.getElementById('aiStatusText'),
    // Parking Insights
    insightBestExit: document.getElementById('insightBestExit'),
    insightCongestion: document.getElementById('insightCongestion'),
    insightWalkTime: document.getElementById('insightWalkTime'),
    insightChargingCard: document.getElementById('insightChargingCard'),
    insightChargingQueue: document.getElementById('insightChargingQueue'),
    insightCO2: document.getElementById('insightCO2'),
    insightEfficiency: document.getElementById('insightEfficiency')
  };

  /* ========================================================================
     HELPERS
     ======================================================================== */

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
  }

  function formatDurationWords(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h} Hour${h !== 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} Minute${m !== 1 ? 's' : ''}`);
    if (h === 0 && m === 0) parts.push(`${s} Second${s !== 1 ? 's' : ''}`);
    return parts.join(' ') || '0 Seconds';
  }

  function formatDurationShort(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${totalSeconds % 60}s`;
  }

  function calculateCharge(elapsedSeconds) {
    if (elapsedSeconds <= 0) return 0;
    return Math.ceil((elapsedSeconds / 3600) * RATE_PER_HOUR);
  }

  function calculateChargingFee(elapsedSeconds, isEV) {
    if (!isEV || elapsedSeconds <= 0) return 0;
    return Math.ceil((elapsedSeconds / 3600) * CHARGING_RATE_PER_HOUR);
  }

  function generateReceiptId() {
    const now = new Date();
    const stamp = [
      now.getFullYear().toString().slice(2),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(Math.floor(Math.random() * 9000) + 1000)
    ].join('');
    return `MP${stamp}`;
  }

  function normalizePlate(value) {
    return String(value || '').replace(/\s+/g, '').toUpperCase();
  }

  function estimateWalkTime(metres) {
    const minutes = Math.max(1, Math.round(metres / 50));
    return minutes === 1 ? '1 Minute' : `${minutes} Minutes`;
  }

  function isOccupied(el) { return el.classList.contains('slot-occupied'); }
  function isEV(el) { return el.classList.contains('slot-ev'); }

  function getSlotStatusLabel(el) {
    if (isOccupied(el)) return 'Occupied';
    if (isEV(el)) return 'EV Available';
    return 'Available';
  }

  function getVehicleType(el) {
    return isEV(el) ? `EV / ${myVehicleType}` : myVehicleType;
  }

  function vehicleTypeIconClass() {
    return myVehicleType === 'Two-Wheeler' ? 'fa-motorcycle' : 'fa-car';
  }

  function renderVehicleType(el) {
    if (!dom.slotVehicleType) return;
    const label = el ? getVehicleType(el) : myVehicleType;
    dom.slotVehicleType.innerHTML = `<i class="fa-solid ${vehicleTypeIconClass()}"></i> ${label}`;
  }

  function animateClick(el) {
    if (!el) return;
    el.classList.add('js-btn-press');
    setTimeout(() => el.classList.remove('js-btn-press'), 180);
  }

  function flashHighlight(el, className = 'js-search-highlight', duration = 1800) {
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), duration);
  }

  function animateCounter(el, nextValue) {
    if (!el) return;
    el.classList.add('js-counter-bump');
    el.textContent = nextValue;
    setTimeout(() => el.classList.remove('js-counter-bump'), 320);
  }

  function showToast(message, type = 'info') {
    let toast = document.querySelector('.js-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'js-toast';
      document.body.appendChild(toast);
    }
    toast.className = `js-toast ${type}`;
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }


  function findMapSlot(slotId) {
    return dom.mapContainer?.querySelector(`.parking-slot[data-slot="${slotId}"]`);
  }

  function updateTooltip(slot) {
    const id = slot.dataset.slot;
    slot.dataset.tooltip = `${id} · ${getSlotStatusLabel(slot)}`;
  }

  function countFloorFree() {
    return [...dom.mapSlots].filter((s) => !isOccupied(s)).length;
  }

  function countEVFree() {
    return [...dom.mapSlots].filter((s) => isEV(s) && !isOccupied(s)).length;
  }

  /* ========================================================================
     AMBIENCE — loading, particles, glow, ripples
     ======================================================================== */

  function initAmbience() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (dom.loadingScreen) {
          dom.loadingScreen.classList.add('hide');
          setTimeout(() => dom.loadingScreen.remove(), 600);
        }
      }, 700);
    });

    if (dom.particles) {
      for (let i = 0; i < 28; i++) {
        const dot = document.createElement('span');
        dot.className = 'particle';
        const size = 2 + Math.random() * 3;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.animationDuration = `${10 + Math.random() * 12}s`;
        dot.style.animationDelay = `${Math.random() * 5}s`;
        dom.particles.appendChild(dot);
      }
    }

    if (dom.mouseGlow) {
      document.addEventListener('mousemove', (e) => {
        dom.mouseGlow.style.left = `${e.clientX}px`;
        dom.mouseGlow.style.top = `${e.clientY}px`;
      });
    }

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

  /* ========================================================================
     NAVIGATION & THEME
     ======================================================================== */

  function initNavigation() {
    dom.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        animateClick(link);
        dom.navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
        const target = dom.sections[link.dataset.section];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-mode', isLight);
    if (dom.themeIcon) {
      dom.themeIcon.classList.toggle('fa-moon', !isLight);
      dom.themeIcon.classList.toggle('fa-sun', isLight);
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    if (!dom.themeBtn) return;
    dom.themeBtn.addEventListener('click', () => {
      animateClick(dom.themeBtn);
      applyTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });
  }

  /* ========================================================================
     CUSTOMER STATS (no internal mall-wide occupancy of other users)
     ======================================================================== */

  function updateStatistics() {
    state.floorFree = countFloorFree();
    state.evChargersFree = countEVFree();
    animateCounter(dom.statFloorFree, state.floorFree);
    animateCounter(dom.statEV, String(state.evChargersFree).padStart(2, '0'));
    if (dom.statFee) dom.statFee.textContent = `₹${RATE_PER_HOUR}/hr`;
    if (dom.statMyStatus) {
      dom.statMyStatus.textContent = state.session?.active ? 'Parked' : 'Idle';
    }

    // Hero floating metrics
    const heroAvail = document.getElementById('heroAvailCount');
    const heroOcc = document.getElementById('heroOccupancyPct');
    const heroVisualOcc = document.getElementById('heroVisualOccupancy');
    const heroRing = document.getElementById('heroRingFill');
    const totalSlots = dom.mapSlots.length || 32;
    const occupied = [...dom.mapSlots].filter((s) => isOccupied(s)).length;
    const occPct = Math.round((occupied / totalSlots) * 100);

    if (heroAvail) heroAvail.textContent = state.floorFree;
    if (heroOcc) heroOcc.textContent = `${occPct}%`;
    if (heroVisualOcc) heroVisualOcc.textContent = `${occPct}%`;
    if (heroRing) {
      const circ = 97.4;
      heroRing.style.strokeDasharray = `${circ}`;
      heroRing.style.strokeDashoffset = `${circ - (occPct / 100) * circ}`;
    }

    updateHeroFloorGlance();

    // AI Smart Parking Assistant + Insights — recompute whenever availability changes
    renderAIAssistant();
    updateParkingInsights(occPct);
  }

  function updateHeroFloorGlance() {
    const rows = document.querySelectorAll('#heroFloorGlanceList .floor-glance-row');
    if (!rows.length) return;
    const maxFree = Math.max(90, ...Object.values(FLOOR_DATA).map((f) => f.free));

    rows.forEach((row) => {
      const floorName = row.dataset.floorMini;
      const info = FLOOR_DATA[floorName];
      if (!info) return;
      const fill = row.querySelector('.floor-glance-fill');
      const count = row.querySelector('.floor-glance-count');
      const isFull = info.full || info.free === 0;

      row.classList.toggle('is-full', isFull);
      row.classList.toggle('is-active', floorName === state.currentFloor);
      if (fill) fill.style.width = `${isFull ? 100 : Math.round((info.free / maxFree) * 100)}%`;
      if (count) count.textContent = isFull ? 'Full' : `${info.free} free`;
    });

    const activeChip = document.getElementById('heroActiveFloorChip');
    if (activeChip) {
      activeChip.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${state.currentFloor} active`;
    }
  }

  /* ========================================================================
     FLOOR SELECTION
     ======================================================================== */

  function updateFloorFreeLabel(btn, free, full) {
    const span = btn.querySelector('span');
    if (!span) return;
    span.textContent = full || free === 0 ? 'FULL' : `${free} Free`;
  }

  function reshuffleFloorSlots(floorName) {
    const reservedId = state.session?.slotId || null;
    const seed = floorName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    dom.mapSlots.forEach((slot, index) => {
      const id = slot.dataset.slot;
      if (id === reservedId) return;
      if (slot.dataset.wasEV === undefined) {
        slot.dataset.wasEV = isEV(slot) ? '1' : '0';
      }
      const wasEV = slot.dataset.wasEV === '1';
      const pattern = (seed + index * 7) % 5;
      const occupy = floorName === 'Ground' || pattern === 0 || pattern === 3;

      slot.classList.remove('slot-available', 'slot-occupied', 'slot-ev', 'selected');
      if (occupy) slot.classList.add('slot-occupied');
      else if (wasEV) slot.classList.add('slot-ev');
      else slot.classList.add('slot-available');

      updateTooltip(slot);
    });

    const freeCount = countFloorFree();
    const activeBtn = [...dom.floorButtons].find((b) => b.dataset.floor === floorName);
    if (activeBtn) {
      const full = floorName === 'Ground' || freeCount === 0;
      updateFloorFreeLabel(activeBtn, freeCount, full);
      if (FLOOR_DATA[floorName]) {
        FLOOR_DATA[floorName].free = full && floorName === 'Ground' ? 0 : freeCount;
        FLOOR_DATA[floorName].full = full;
      }
    }
    updateStatistics();
  }

  function clearSlotSelection() {
    if (state.selectedSlotEl) state.selectedSlotEl.classList.remove('selected');
    state.selectedSlot = null;
    state.selectedSlotEl = null;
    if (dom.selectedSlot) dom.selectedSlot.textContent = '--';
    if (dom.slotStatus) dom.slotStatus.textContent = 'Select a Slot';
    if (dom.slotDistance) dom.slotDistance.textContent = '--';
    renderVehicleType();
    if (dom.reserveBtn) {
      dom.reserveBtn.disabled = false;
      dom.reserveBtn.textContent = 'Reserve Parking Spot';
    }
  }

  function selectFloor(floorName, btn) {
    state.currentFloor = floorName;
    dom.floorButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    animateClick(btn);
    if (dom.currentFloorDisplay) dom.currentFloorDisplay.textContent = floorName;
    if (dom.slotFloor) dom.slotFloor.textContent = floorName;
    clearSlotSelection();
    reshuffleFloorSlots(floorName);
    const info = FLOOR_DATA[floorName];
    showToast(
      info?.full ? `${floorName} is currently FULL.` : `Switched to ${floorName} — ${info?.free ?? 0} spaces free.`,
      info?.full ? 'error' : 'success'
    );
  }

  function initFloorSelection() {
    dom.floorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectFloor(btn.dataset.floor || btn.childNodes[0].textContent.trim(), btn);
      });
    });
  }

  /* ========================================================================
     PARKING SLOTS
     ======================================================================== */

  function updateSlotDetails(slotEl) {
    const id = slotEl.dataset.slot;
    const distance = SLOT_DISTANCES[id] ?? '--';
    if (dom.selectedSlot) dom.selectedSlot.textContent = id;
    if (dom.slotStatus) dom.slotStatus.textContent = getSlotStatusLabel(slotEl);
    if (dom.slotFloor) dom.slotFloor.textContent = state.currentFloor;
    renderVehicleType(slotEl);
    if (dom.slotDistance) {
      dom.slotDistance.textContent = typeof distance === 'number' ? `${distance} meters` : distance;
    }
    const alreadyReserved = state.session?.active && state.session.slotId === id;
    if (dom.reserveBtn) {
      if (isOccupied(slotEl) || alreadyReserved) {
        dom.reserveBtn.disabled = true;
        dom.reserveBtn.textContent = alreadyReserved ? 'Already Reserved' : 'Slot Occupied';
      } else {
        dom.reserveBtn.disabled = false;
        dom.reserveBtn.textContent = 'Reserve Parking Spot';
      }
    }
  }

  function selectSlot(slotEl) {
    if (isOccupied(slotEl)) {
      showToast(`Slot ${slotEl.dataset.slot} is occupied.`, 'error');
      return;
    }
    if (state.selectedSlotEl) state.selectedSlotEl.classList.remove('selected');
    state.selectedSlotEl = slotEl;
    state.selectedSlot = slotEl.dataset.slot;
    slotEl.classList.add('selected');
    updateSlotDetails(slotEl);
  }

  function markSlotOccupied(slotEl, isEVSlot) {
    slotEl.classList.remove('slot-available', 'slot-ev', 'selected');
    slotEl.classList.add('slot-occupied', 'reserved-flash');
    updateTooltip(slotEl);
    setTimeout(() => slotEl.classList.remove('reserved-flash'), 700);
  }

  function markSlotAvailable(slotEl, restoreEV) {
    slotEl.classList.remove('slot-occupied', 'selected');
    slotEl.classList.add(restoreEV ? 'slot-ev' : 'slot-available');
    updateTooltip(slotEl);
  }

  function initParkingSlots() {
    dom.mapSlots.forEach((slot) => {
      slot.dataset.wasEV = isEV(slot) ? '1' : '0';
      updateTooltip(slot);
      slot.addEventListener('click', () => selectSlot(slot));
    });
  }

  /* ========================================================================
     AI SMART PARKING ASSISTANT — scoring, recommendation, insights
     ======================================================================== */

  function computeSlotFactors(slotEl, allFloorSlots) {
    const id = slotEl.dataset.slot;
    const row = id[0];
    const col = parseInt(id.slice(1), 10);
    const distance = SLOT_DISTANCES[id] || 40;
    const maxDistance = 80;
    const walkScore = Math.max(0, Math.min(100, ((maxDistance - distance) / maxDistance) * 100));
    const evAvail = isEV(slotEl);
    const evScore = evAvail ? 100 : 0;
    const rowIndex = ROW_ORDER[row] ?? 0;
    const exitScore = (rowIndex / 3) * 100;

    // Occupancy nearby / crowd density — look at same-row neighbors
    const rowSlots = [...allFloorSlots].filter((s) => s.dataset.slot[0] === row);
    const idx = rowSlots.findIndex((s) => s.dataset.slot === id);
    let occupiedNeighbors = 0;
    let neighborCount = 0;
    [idx - 1, idx + 1].forEach((i) => {
      if (rowSlots[i]) {
        neighborCount++;
        if (isOccupied(rowSlots[i])) occupiedNeighbors++;
      }
    });
    const crowdScore = neighborCount ? Math.max(0, 100 - (occupiedNeighbors / neighborCount) * 100) : 100;

    // Future availability — light simulated trend, refreshes every ~30s
    const bucket = Math.floor(Date.now() / 30000);
    const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + bucket;
    const futureScore = Math.max(10, Math.min(90, 50 + Math.round(Math.sin(seed) * 40)));

    const nearElevator = col === 4 || col === 5;

    return { id, row, col, distance, walkScore, evAvail, evScore, exitScore, crowdScore, futureScore, nearElevator, rowIndex };
  }

  function computeSmartScore(factors, evPreferred) {
    const w = evPreferred
      ? { walk: 0.25, ev: 0.25, crowd: 0.18, exit: 0.18, future: 0.14 }
      : { walk: 0.30, ev: 0.05, crowd: 0.22, exit: 0.23, future: 0.20 };
    return (
      factors.walkScore * w.walk +
      factors.evScore * w.ev +
      factors.crowdScore * w.crowd +
      factors.exitScore * w.exit +
      factors.futureScore * w.future
    );
  }

  function buildReasons(factors, evPreferred) {
    const reasons = [];
    if (factors.rowIndex >= 2) {
      const minutesSaved = Math.max(0.5, Math.round(factors.rowIndex * 0.7 * 2) / 2);
      reasons.push(`${minutesSaved} min${minutesSaved === 1 ? '' : 's'} closer to exit`);
    }
    if (factors.crowdScore >= 70) reasons.push('Less crowded area');
    if (factors.nearElevator) reasons.push('Near elevator');
    if (factors.evAvail) reasons.push(evPreferred ? 'EV charger available — matches your vehicle' : 'EV charger available');
    if (factors.rowIndex === 3 && factors.crowdScore >= 60) reasons.push('Faster exit after shopping');
    if (!reasons.length) reasons.push('Best overall balance of distance and availability');
    return reasons.slice(0, 4);
  }

  function computeAIRecommendation() {
    const available = [...dom.mapSlots].filter((s) => !isOccupied(s));
    if (!available.length) return null;
    const scored = available.map((slotEl) => {
      const factors = computeSlotFactors(slotEl, dom.mapSlots);
      const score = computeSmartScore(factors, wantsEV);
      return { slotEl, factors, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  function renderAIAssistant() {
    if (!dom.aiCard) return;
    const best = computeAIRecommendation();
    state.aiRecommendation = best;

    if (!best) {
      if (dom.aiRecommendedSlot) dom.aiRecommendedSlot.textContent = 'Floor Full';
      if (dom.aiRecommendedScore) dom.aiRecommendedScore.textContent = '--';
      if (dom.aiReasonsList) dom.aiReasonsList.innerHTML = '<li>No available slots on this floor right now.</li>';
      if (dom.aiAcceptBtn) dom.aiAcceptBtn.disabled = true;
      if (dom.aiStatusText) dom.aiStatusText.textContent = 'No slots free';
      return;
    }

    const alreadyReserved = state.session?.active && state.session.slotId === best.factors.id;
    const reasons = buildReasons(best.factors, wantsEV);

    if (dom.aiRecommendedSlot) dom.aiRecommendedSlot.textContent = `${state.currentFloor} • ${best.factors.id}`;
    if (dom.aiRecommendedScore) dom.aiRecommendedScore.textContent = `${Math.round(best.score)}/100`;
    if (dom.aiReasonsList) {
      dom.aiReasonsList.innerHTML = reasons.map((r) => `<li><i class="fa-solid fa-check"></i> ${r}</li>`).join('');
    }
    if (dom.aiAcceptBtn) {
      dom.aiAcceptBtn.disabled = !!(state.session?.active);
      dom.aiAcceptBtn.innerHTML = alreadyReserved
        ? '<i class="fa-solid fa-check-double"></i> Already Reserved'
        : '<i class="fa-solid fa-wand-magic-sparkles"></i> Accept AI Recommendation';
    }
    if (dom.aiStatusText) dom.aiStatusText.textContent = 'Live';
  }

  function acceptAIRecommendation() {
    animateClick(dom.aiAcceptBtn);
    const rec = state.aiRecommendation;
    if (!rec) {
      showToast('No AI recommendation available.', 'error');
      return;
    }
    if (state.session?.active) {
      showToast('You already have an active session. Exit first.', 'error');
      return;
    }
    const slotEl = findMapSlot(rec.factors.id);
    if (!slotEl || isOccupied(slotEl)) {
      showToast('Recommended slot is no longer available. Recalculating…', 'error');
      renderAIAssistant();
      return;
    }
    selectSlot(slotEl);
    flashHighlight(slotEl, 'js-search-highlight', 1600);
    document.getElementById('parking-map')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      slotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => reserveSelectedSlot(), 420);
    }, 300);
  }

  function initAIAssistant() {
    if (!dom.aiCard) return;
    dom.aiAcceptBtn?.addEventListener('click', acceptAIRecommendation);
    dom.aiCardToggle?.addEventListener('click', () => {
      const collapsed = dom.aiCard.classList.toggle('ai-collapsed');
      const icon = dom.aiCardToggle.querySelector('i');
      if (icon) icon.classList.toggle('fa-chevron-down', !collapsed);
      if (icon) icon.classList.toggle('fa-chevron-up', collapsed);
    });
    renderAIAssistant();
  }

  /* ========================================================================
     PARKING INSIGHTS — live, simulated, recomputed with AI recommendation
     ======================================================================== */

  function updateParkingInsights(occPct) {
    if (!dom.insightBestExit) return;

    // Best time to exit
    let bestExit;
    if (occPct < 35) bestExit = 'Now — low traffic';
    else if (occPct < 65) bestExit = 'In ~15 minutes';
    else bestExit = 'After 6:00 PM (peak hours)';
    dom.insightBestExit.textContent = bestExit;

    // Estimated congestion
    let congestionLabel = 'Low';
    if (occPct >= 65) congestionLabel = 'High';
    else if (occPct >= 35) congestionLabel = 'Moderate';
    if (dom.insightCongestion) dom.insightCongestion.textContent = `${congestionLabel} (${occPct}%)`;

    // Walking time — based on the AI-recommended slot, if any
    const rec = state.aiRecommendation;
    const recDistance = rec ? rec.factors.distance : AVG_SLOT_DISTANCE;
    if (dom.insightWalkTime) dom.insightWalkTime.textContent = estimateWalkTime(recDistance);

    // Charging queue estimate — EV only
    if (dom.insightChargingCard) dom.insightChargingCard.hidden = !wantsEV;
    if (wantsEV && dom.insightChargingQueue) {
      const evSlots = [...dom.mapSlots].filter((s) => isEV(s));
      const occupiedEV = evSlots.filter((s) => isOccupied(s)).length;
      const queueMinutes = occupiedEV === 0 ? 0 : Math.min(20, occupiedEV * 3);
      dom.insightChargingQueue.textContent = queueMinutes === 0 ? 'No wait' : `~${queueMinutes} min wait`;
    }

    // CO2 saved by choosing the recommended slot vs an average slot
    if (dom.insightCO2) {
      const metresSaved = Math.max(0, AVG_SLOT_DISTANCE - recDistance);
      const co2Saved = (metresSaved * 0.012).toFixed(1);
      dom.insightCO2.textContent = `${co2Saved} kg`;
    }

    // Parking efficiency score — blend of recommendation quality and free capacity
    if (dom.insightEfficiency) {
      const recScore = rec ? rec.score : 50;
      const efficiency = Math.round((recScore + (100 - occPct)) / 2);
      dom.insightEfficiency.textContent = `${Math.max(0, Math.min(100, efficiency))}/100`;
    }
  }

  /* ========================================================================
     SEARCH — own vehicle or slot numbers only
     ======================================================================== */

  function isOwnPlate(plate) {
    const p = normalizePlate(plate);
    if (p === myPlate) return true;
    if (state.session?.active && normalizePlate(state.session.vehicle) === p) return true;
    if (state.myVehicle && normalizePlate(state.myVehicle.plate) === p) return true;
    return false;
  }

  function searchParking(query) {
    const q = query.trim();
    if (!q) {
      showToast('Enter your vehicle number or a slot ID.', 'error');
      return;
    }
    const upper = q.toUpperCase();
    const plate = normalizePlate(q);

    // Own vehicle only
    if (isOwnPlate(plate) && state.myVehicle) {
      showToast(`Your vehicle found at ${state.myVehicle.floor} • ${state.myVehicle.slot}`, 'success');
      displayVehicleLocation(plate, state.myVehicle);
      scrollToAndHighlightSlot(state.myVehicle.slot, state.myVehicle.floor);
      return;
    }
    if (/^[A-Z]{2}\d/.test(plate) || plate.length >= 6) {
      if (!isOwnPlate(plate)) {
        showToast('Privacy: you can only search for your own vehicle.', 'error');
        return;
      }
      if (!state.myVehicle) {
        showToast('Your vehicle is not currently parked.', 'error');
        displayVehicleNotFound();
        return;
      }
    }

    // Floor
    const floorNames = Object.keys(FLOOR_DATA);
    const matchedFloor = floorNames.find(
      (f) => f.toUpperCase() === upper || f.toUpperCase().startsWith(upper)
    );
    if (matchedFloor) {
      const btn = [...dom.floorButtons].find((b) => b.dataset.floor === matchedFloor);
      if (btn) selectFloor(matchedFloor, btn);
      document.getElementById('parking-map')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Slot
    const slotId = upper.replace(/[^A-Z0-9]/g, '');
    const mapSlot = findMapSlot(slotId);
    if (mapSlot) {
      mapSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashHighlight(mapSlot);
      if (!isOccupied(mapSlot)) selectSlot(mapSlot);
      showToast(`Found slot ${slotId}.`, 'success');
      return;
    }

    showToast('Nothing found.', 'error');
    alert('No matching slot or your vehicle was found.');
  }

  function scrollToAndHighlightSlot(slotId, floor) {
    if (floor && floor !== state.currentFloor) {
      const btn = [...dom.floorButtons].find((b) => b.dataset.floor === floor);
      if (btn) selectFloor(floor, btn);
    }
    document.getElementById('parking-map')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const el = findMapSlot(slotId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlight(el);
      }
    }, 350);
  }

  function initSearch() {
    dom.searchBtn?.addEventListener('click', () => {
      animateClick(dom.searchBtn);
      searchParking(dom.searchInput.value);
    });
    dom.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchParking(dom.searchInput.value);
    });
    dom.heroPrimaryCta?.addEventListener('click', () => {
      animateClick(dom.heroPrimaryCta);
      document.getElementById('parking-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ========================================================================
     RESERVE / TIMER / EXIT / RECEIPT
     ======================================================================== */

  function updateFeeFields(elapsedSeconds, isEV) {
    const parkingFee = calculateCharge(elapsedSeconds);
    const chargingFee = calculateChargingFee(elapsedSeconds, isEV);
    if (dom.parkingFee) dom.parkingFee.textContent = `₹${parkingFee}`;
    if (dom.chargingFeeRow) dom.chargingFeeRow.hidden = !isEV;
    if (dom.chargingRateRow) dom.chargingRateRow.hidden = !isEV;
    if (dom.chargingFee) dom.chargingFee.textContent = `₹${chargingFee}`;
    if (dom.estimatedCharge) dom.estimatedCharge.textContent = `₹${parkingFee + chargingFee}`;
  }

  function updateActiveSessionUI() {
    const s = state.session;
    if (!s) return;
    if (dom.vehicleNumber) dom.vehicleNumber.textContent = s.vehicle;
    if (dom.currentSlot) dom.currentSlot.textContent = `${s.floor} • ${s.slotId}`;
    if (dom.entryTime) dom.entryTime.textContent = s.entryTimeLabel;
    if (dom.parkingStatus) dom.parkingStatus.textContent = 'Currently Parked';
    if (dom.parkingDuration) dom.parkingDuration.textContent = formatDuration(s.elapsedSeconds);
    updateFeeFields(s.elapsedSeconds, s.wasEV);
    updateStatistics();
  }

  function tickSession() {
    if (!state.session?.active) return;
    state.session.elapsedSeconds += 1;
    const elapsed = state.session.elapsedSeconds;
    if (dom.parkingDuration) dom.parkingDuration.textContent = formatDuration(elapsed);
    updateFeeFields(elapsed, state.session.wasEV);
  }

  function startSessionTimer() {
    stopSessionTimer();
    state.timerId = setInterval(tickSession, 1000);
  }

  function stopSessionTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function reserveSelectedSlot() {
    animateClick(dom.reserveBtn);
    if (!state.selectedSlot || !state.selectedSlotEl) {
      showToast('Please select an available parking slot first.', 'error');
      return;
    }
    if (state.session?.active) {
      showToast('You already have an active session. Exit first.', 'error');
      return;
    }
    const slotEl = state.selectedSlotEl;
    const slotId = state.selectedSlot;
    if (isOccupied(slotEl)) {
      showToast('That slot is no longer available.', 'error');
      return;
    }

    const wasEV = slotEl.dataset.wasEV === '1' || isEV(slotEl);
    const entryDate = new Date();
    const vehicle = myPlate;

    markSlotOccupied(slotEl, wasEV);

    state.session = {
      active: true,
      vehicle,
      floor: state.currentFloor,
      slotId,
      wasEV,
      entryDate,
      entryTimeLabel: formatTime(entryDate),
      elapsedSeconds: 0,
      receiptId: generateReceiptId()
    };

    state.myVehicle = {
      plate: vehicle,
      floor: state.currentFloor,
      slot: slotId,
      distance: SLOT_DISTANCES[slotId] || 40
    };
    localStorage.setItem(CUSTOMER_PLATE_KEY, vehicle);

    const floorInfo = FLOOR_DATA[state.currentFloor];
    if (floorInfo && floorInfo.free > 0) {
      floorInfo.free -= 1;
      const btn = [...dom.floorButtons].find((b) => b.dataset.floor === state.currentFloor);
      if (btn) updateFloorFreeLabel(btn, floorInfo.free, floorInfo.free === 0);
    }

    updateActiveSessionUI();
    startSessionTimer();

    if (dom.reserveBtn) {
      dom.reserveBtn.disabled = true;
      dom.reserveBtn.textContent = 'Already Reserved';
    }
    if (dom.paymentStatus) {
      dom.paymentStatus.textContent = 'Pending';
      dom.paymentStatus.style.color = 'var(--occupied)';
    }

    showToast(`Slot ${slotId} reserved successfully.`, 'success');
    document.querySelector('.parking-session-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  function updateReceiptUI(receipt) {
    if (!receipt) return;
    if (dom.receiptStatus) dom.receiptStatus.textContent = 'Payment Successful';
    if (dom.receiptID) dom.receiptID.textContent = receipt.receiptId;
    if (dom.receiptVehicle) dom.receiptVehicle.textContent = receipt.vehicle;
    if (dom.receiptSlot) dom.receiptSlot.textContent = receipt.slot;
    if (dom.receiptEntry) dom.receiptEntry.textContent = receipt.entryTime;
    if (dom.receiptExit) dom.receiptExit.textContent = receipt.exitTime;
    if (dom.receiptDuration) dom.receiptDuration.textContent = receipt.durationWords;
    if (dom.receiptAmount) dom.receiptAmount.textContent = `₹${receipt.amount}`;
    if (dom.summaryTotalTime) dom.summaryTotalTime.textContent = receipt.durationShort;
    if (dom.summaryGST) dom.summaryGST.textContent = `₹${receipt.gst}`;
    if (dom.totalPaid) dom.totalPaid.textContent = `₹${receipt.total}`;
    if (dom.paymentBadgeText) dom.paymentBadgeText.textContent = 'Payment Completed';
  }

  function exitParking() {
    animateClick(dom.exitBtn);
    if (!state.session?.active) {
      showToast('No active parking session to exit.', 'error');
      return;
    }
    stopSessionTimer();
    const s = state.session;
    const exitDate = new Date();
    const elapsed = s.elapsedSeconds;
    const parkingFee = calculateCharge(elapsed);
    const chargingFee = calculateChargingFee(elapsed, s.wasEV);
    const charge = parkingFee + chargingFee;
    const gst = Math.round(charge * GST_RATE);
    const total = charge + gst;

    const slotEl = findMapSlot(s.slotId);
    if (slotEl) markSlotAvailable(slotEl, s.wasEV);

    const floorInfo = FLOOR_DATA[s.floor];
    if (floorInfo) {
      floorInfo.free += 1;
      floorInfo.full = false;
      const btn = [...dom.floorButtons].find((b) => b.dataset.floor === s.floor);
      if (btn) updateFloorFreeLabel(btn, floorInfo.free, false);
    }

    state.myVehicle = null;

    state.lastReceipt = {
      receiptId: s.receiptId,
      vehicle: s.vehicle,
      slot: `${s.floor} • ${s.slotId}`,
      entryTime: s.entryTimeLabel,
      exitTime: formatTime(exitDate),
      durationWords: formatDurationWords(elapsed),
      durationShort: formatDurationShort(elapsed),
      amount: charge,
      gst,
      total
    };

    if (dom.parkingStatus) dom.parkingStatus.textContent = 'Exited';
    if (dom.paymentStatus) {
      dom.paymentStatus.textContent = 'Paid';
      dom.paymentStatus.style.color = 'var(--available)';
    }
    if (dom.estimatedCharge) dom.estimatedCharge.textContent = `₹${charge}`;

    updateReceiptUI(state.lastReceipt);
    state.session = null;
    updateStatistics();

    if (state.selectedSlotEl && !isOccupied(state.selectedSlotEl)) {
      updateSlotDetails(state.selectedSlotEl);
    } else {
      clearSlotSelection();
    }

    showToast(`Parking ended. Total paid ₹${total}.`, 'success');
    document.querySelector('.receipt-section')?.scrollIntoView({ behavior: 'smooth' });
  }

  function downloadReceipt() {
    animateClick(dom.downloadReceiptBtn);
    if (!state.lastReceipt) {
      showToast('No receipt available. Complete a parking session first.', 'error');
      return;
    }
    const r = state.lastReceipt;
    const text = [
      '========================================',
      '       MALLPARK DIGITAL RECEIPT',
      '========================================',
      `Receipt ID     : ${r.receiptId}`,
      `Vehicle        : ${r.vehicle}`,
      `Slot           : ${r.slot}`,
      `Entry Time     : ${r.entryTime}`,
      `Exit Time      : ${r.exitTime}`,
      `Total Duration : ${r.durationWords}`,
      `Parking Charge : ₹${r.amount}`,
      `GST            : ₹${r.gst}`,
      `Total Amount   : ₹${r.total}`,
      `Payment Method : UPI`,
      '========================================',
      'Thank you for parking with MallPark.',
      '========================================'
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MallPark-Receipt-${r.receiptId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Receipt downloaded.', 'success');
  }

  /* ========================================================================
     FIND MY VEHICLE — own plate only
     ======================================================================== */

  function displayVehicleLocation(plate, info) {
    const zone = FLOOR_DATA[info.floor]?.zone || 'North Wing';
    const distance = info.distance || SLOT_DISTANCES[info.slot] || 40;
    if (dom.foundVehicle) dom.foundVehicle.textContent = plate;
    if (dom.foundFloor) dom.foundFloor.textContent = info.floor;
    if (dom.foundSlot) dom.foundSlot.textContent = info.slot;
    if (dom.foundZone) dom.foundZone.textContent = zone;
    if (dom.walkingDistance) dom.walkingDistance.textContent = `${distance} meters`;
    if (dom.walkingTime) dom.walkingTime.textContent = estimateWalkTime(distance);
  }

  function displayVehicleNotFound() {
    if (dom.foundVehicle) dom.foundVehicle.textContent = 'Vehicle Not Found';
    ['foundFloor', 'foundSlot', 'foundZone', 'walkingDistance', 'walkingTime'].forEach((id) => {
      if (dom[id]) dom[id].textContent = '—';
    });
  }

  function findMyVehicle() {
    animateClick(dom.vehicleSearchBtn);
    const plate = normalizePlate(dom.vehicleSearchInput?.value);
    if (!plate) {
      showToast('Enter your vehicle number.', 'error');
      return;
    }
    if (!isOwnPlate(plate)) {
      showToast('Privacy: you can only search for your own vehicle.', 'error');
      displayVehicleNotFound();
      return;
    }
    if (state.myVehicle) {
      displayVehicleLocation(plate, state.myVehicle);
      showToast(`Found at ${state.myVehicle.floor} • ${state.myVehicle.slot}.`, 'success');
      scrollToAndHighlightSlot(state.myVehicle.slot, state.myVehicle.floor);
    } else {
      displayVehicleNotFound();
      showToast('Vehicle Not Found. Reserve a slot first.', 'error');
    }
  }


  /* ========================================================================
     BOOTSTRAP
     ======================================================================== */

  function init() {
    initAmbience();
    initNavigation();
    initTheme();
    initFloorSelection();
    initParkingSlots();
    initSearch();
    initAIAssistant();

    dom.reserveBtn?.addEventListener('click', reserveSelectedSlot);
    dom.exitBtn?.addEventListener('click', exitParking);
    dom.downloadReceiptBtn?.addEventListener('click', downloadReceipt);
    dom.vehicleSearchBtn?.addEventListener('click', findMyVehicle);
    dom.vehicleSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') findMyVehicle();
    });
    dom.showRouteBtn?.addEventListener('click', () => {
      animateClick(dom.showRouteBtn);
      if (!state.myVehicle) {
        showToast('Search for your vehicle first.', 'error');
        return;
      }
      scrollToAndHighlightSlot(state.myVehicle.slot, state.myVehicle.floor);
      showToast('Route highlighted on the map.', 'success');
    });

    updateStatistics();
  }

  init();
});

/* ==========================================================================
   MallPark Showcase — premium animated hero card (Phoenix Marketcity)
   Self-contained: does not touch any other dashboard logic.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const stage = document.getElementById('showcaseStage');
  if (!stage) return;

  const slides = [...stage.querySelectorAll('.showcase-slide')];
  const dotsWrap = document.getElementById('showcaseDots');
  const progressFill = document.getElementById('showcaseProgressFill');
  const prevBtn = document.getElementById('showcasePrevBtn');
  const nextBtn = document.getElementById('showcaseNextBtn');
  const playBtn = document.getElementById('showcasePlayBtn');
  const previewCards = [...document.querySelectorAll('#showcasePreviews .preview-card')];
  const showcaseRoot = document.getElementById('mallShowcase');

  if (!slides.length) return;

  const AUTOPLAY_MS = 4000;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let activeIndex = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
  if (activeIndex === -1) activeIndex = 0;
  let autoplayTimer = null;
  let progressRaf = null;
  let progressStart = 0;
  let isPaused = false;

  /* ---------- Build dots ---------- */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = [...dotsWrap.querySelectorAll('.dot')];

  /* ---------- Broken image fallback (progressive check, in case onerror fired before listeners attached) ---------- */
  document.querySelectorAll('.showcase-slide-media img, .preview-card-media img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      img.style.display = 'none';
      img.parentElement.classList.add('media-fallback');
    }
  });

  /* ---------- Render active state ---------- */
  function render() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === activeIndex);
    });
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeIndex));
  }

  function goTo(index, { restart = true } = {}) {
    activeIndex = (index + slides.length) % slides.length;
    render();
    if (restart) restartAutoplay();
  }

  function next() { goTo(activeIndex + 1); }
  function prev() { goTo(activeIndex - 1); }

  /* ---------- Autoplay + progress bar ---------- */
  function startProgress() {
    if (!progressFill) return;
    cancelAnimationFrame(progressRaf);
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
    // force reflow so the width reset takes effect before animating
    void progressFill.offsetWidth;
    progressFill.style.transition = `width ${AUTOPLAY_MS}ms linear`;
    requestAnimationFrame(() => {
      progressFill.style.width = '100%';
    });
  }

  function stopProgress() {
    if (!progressFill) return;
    const currentWidth = getComputedStyle(progressFill).width;
    progressFill.style.transition = 'none';
    progressFill.style.width = currentWidth;
  }

  function startAutoplay() {
    if (prefersReducedMotion || isPaused) return;
    clearTimeout(autoplayTimer);
    startProgress();
    autoplayTimer = setTimeout(next, AUTOPLAY_MS);
  }

  function restartAutoplay() {
    clearTimeout(autoplayTimer);
    startAutoplay();
  }

  function pauseAutoplay() {
    isPaused = true;
    clearTimeout(autoplayTimer);
    stopProgress();
  }

  function resumeAutoplay() {
    if (!isPaused) return;
    isPaused = false;
    startAutoplay();
  }

  /* ---------- Controls ---------- */
  prevBtn?.addEventListener('click', () => { prev(); });
  nextBtn?.addEventListener('click', () => { next(); });

  previewCards.forEach((card) => {
    card.addEventListener('click', () => {
      const target = parseInt(card.dataset.goto, 10);
      if (!Number.isNaN(target)) goTo(target);
    });
  });

  /* ---------- Pause on hover ---------- */
  showcaseRoot?.addEventListener('mouseenter', pauseAutoplay);
  showcaseRoot?.addEventListener('mouseleave', resumeAutoplay);

  /* ---------- Keyboard support ---------- */
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const rect = showcaseRoot?.getBoundingClientRect();
    if (!rect) return;
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inViewport) return;
    if (e.key === 'ArrowLeft') { prev(); }
    if (e.key === 'ArrowRight') { next(); }
  });

  /* ---------- Touch swipe ---------- */
  let touchStartX = 0;
  let touchDeltaX = 0;
  stage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
    pauseAutoplay();
  }, { passive: true });
  stage.addEventListener('touchmove', (e) => {
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }, { passive: true });
  stage.addEventListener('touchend', () => {
    if (touchDeltaX > 40) prev();
    else if (touchDeltaX < -40) next();
    resumeAutoplay();
  });

  /* ---------- Mouse parallax on stage ---------- */
  if (!prefersReducedMotion) {
    let parallaxRaf = null;
    stage.addEventListener('mousemove', (e) => {
      if (parallaxRaf) return;
      parallaxRaf = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        const activeMedia = slides[activeIndex]?.querySelector('.showcase-slide-media img');
        if (activeMedia) {
          activeMedia.style.transform = `scale(1.14) translate(${px * -10}px, ${py * -8}px)`;
        }
        if (previewCards.length) {
          previewCards.forEach((card, i) => {
            const depth = (i + 1) * 3;
            card.style.setProperty('--parallax-x', `${px * depth}px`);
            card.style.setProperty('--parallax-y', `${py * depth}px`);
          });
        }
        parallaxRaf = null;
      });
    });
    stage.addEventListener('mouseleave', () => {
      const activeMedia = slides[activeIndex]?.querySelector('.showcase-slide-media img');
      if (activeMedia) activeMedia.style.transform = '';
    });
  }

  /* ---------- Decorative play button ripple ---------- */
  playBtn?.addEventListener('click', () => {
    playBtn.classList.remove('is-rippling');
    void playBtn.offsetWidth;
    playBtn.classList.add('is-rippling');
    setTimeout(() => playBtn.classList.remove('is-rippling'), 650);
  });

  render();
  startAutoplay();
});
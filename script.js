// -------------------------------
//  Portfolio Lightbox / Grid JS
//  IG-style vertical nav (newest -> oldest)
// -------------------------------

// 1) GLOBAL GESTURE GUARDS (keep pinch-zoom, block double-tap zoom)
(function () {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
})();

// 2) CONSTANTS
const SWIPE = {
  H_THRESHOLD: 40,   // px horizontal to switch photos
  V_THRESHOLD: 140,  // px vertical to switch albums
  V_SLOPE: 2
};
const REVEAL_CHUNK = 9;
const IO_ROOT_MARGIN = '400px 0px';

// 3) STATE
const state = {
  tiles: [],              // DOM order: newest -> oldest
  openerTile: null,
  albumImages: [],
  currentIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  swiping: false,
  cachedVisualTiles: null,
  cachedCols: 3
};

// 4) DOM REFS
const refs = {};
function $$initRefs() {
  refs.year     = document.getElementById('year');
  refs.grid     = document.getElementById('grid');
  refs.lb       = document.getElementById('lightbox');
  refs.lbImg    = document.getElementById('lbImg');
  refs.lbPrev   = document.getElementById('lbPrev');
  refs.lbNext   = document.getElementById('lbNext');
  refs.lbClose  = document.getElementById('lbClose');
  refs.lbDots   = document.getElementById('lbDots');
  refs.sentinel = document.getElementById('sentinel');
}

// 5) UTIL: SCROLL LOCK
const preventTouchMove = (e) => { e.preventDefault(); };
function lockScroll() {
  document.documentElement.classList.add('no-scroll');
  document.body.classList.add('no-scroll');
  document.addEventListener('touchmove', preventTouchMove, { passive: false });
}
function unlockScroll() {
  document.documentElement.classList.remove('no-scroll');
  document.body.classList.remove('no-scroll');
  document.removeEventListener('touchmove', preventTouchMove, { passive: false });
}

// 6) UTIL: VISUAL GRID INFO (used elsewhere)
function visibleTiles() {
  return state.tiles.filter(t => t.offsetParent !== null);
}
function computeVisualTiles() {
  const arr = visibleTiles().slice();
  arr.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const dy = ra.top - rb.top;
    if (Math.abs(dy) > 2) return dy;
    return ra.left - rb.left;
  });
  state.cachedVisualTiles = arr;
}
function getCols() {
  try {
    const cols = getComputedStyle(refs.grid).gridTemplateColumns;
    state.cachedCols = (cols && cols.split(' ').length) || 3;
  } catch {
    state.cachedCols = 3;
  }
}

// 7) LIGHTBOX UI
function buildDots() {
  if (!refs.lbDots) return;
  refs.lbDots.innerHTML = '';
  state.albumImages.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'lb-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to image ${i + 1}`);
    dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); });
    refs.lbDots.appendChild(dot);
  });
}

function setHash() {
  const params = new URLSearchParams();
  const album = state.openerTile?.dataset?.album || state.openerTile?.getAttribute('data-album') || '';
  if (album) params.set('album', album);
  params.set('index', String(state.currentIndex));
  history.replaceState(null, '', '#' + params.toString());
}

function parseHashAndOpenIfAny() {
  if (!location.hash) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const album = params.get('album');
  const idxStr = params.get('index');
  if (!album) return;

  const tile = state.tiles.find(t => (t.dataset.album || t.getAttribute('data-album') || '') === album);
  if (!tile) return;

  let idx = Number(idxStr);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;

  let imgs = [];
  try { imgs = JSON.parse(tile.getAttribute('data-images') || '[]'); } catch {}
  idx = Math.min(idx, Math.max(0, imgs.length - 1));

  openAlbum(tile, idx, false);
}

function preloadNeighbor(i) {
  const path = state.albumImages[i];
  if (!path) return;
  const img = new Image();
  img.src = path;
}

function updateUI() {
  if (!state.albumImages.length) return;
  const imgPath = state.albumImages[state.currentIndex];

  refs.lbImg.classList.add('loading');
  refs.lbImg.onerror = () => {
    refs.lbImg.removeAttribute('srcset');
    refs.lbImg.alt = 'Image failed to load.';
    refs.lbImg.classList.remove('portrait', 'loading');
  };

  refs.lbImg.removeAttribute('srcset');
  refs.lbImg.removeAttribute('sizes');
  refs.lbImg.setAttribute('src', imgPath);
  refs.lbImg.alt = '';

  const onLoaded = () => {
    refs.lbImg.classList.remove('loading');
    const isPortrait = (refs.lbImg.naturalHeight || 0) > (refs.lbImg.naturalWidth || 0);
    refs.lbImg.classList.toggle('portrait', isPortrait);
  };
  if (refs.lbImg.complete) onLoaded();
  else refs.lbImg.addEventListener('load', onLoaded, { once: true });

  if (refs.lbPrev) refs.lbPrev.disabled = state.currentIndex === 0;
  if (refs.lbNext) refs.lbNext.disabled = state.currentIndex === state.albumImages.length - 1;

  if (refs.lbDots) {
    const dots = Array.from(refs.lbDots.querySelectorAll('.lb-dot'));
    dots.forEach((d, i) => d.classList.toggle('active', i === state.currentIndex));
  }

  preloadNeighbor(state.currentIndex + 1);
  preloadNeighbor(state.currentIndex - 1);

  setHash();
}

// 8) LIGHTBOX NAV
function goTo(i) {
  if (i < 0 || i > state.albumImages.length - 1) return;
  state.currentIndex = i;
  updateUI();
}
const prevPhoto = () => { if (state.currentIndex > 0) goTo(state.currentIndex - 1); };
const nextPhoto = () => { if (state.currentIndex < state.albumImages.length - 1) goTo(state.currentIndex + 1); };

// IG-style vertical album navigation using DOM order (newest -> oldest)
function openAlbumNewer() { // move toward more recent
  if (!state.openerTile) return;
  const linear = state.tiles; // newest -> oldest
  const idx = linear.indexOf(state.openerTile);
  if (idx <= 0) return; // already at most recent
  openAlbum(linear[idx - 1], 0);
}
function openAlbumOlder() { // move toward older
  if (!state.openerTile) return;
  const linear = state.tiles; // newest -> oldest
  const idx = linear.indexOf(state.openerTile);
  if (idx < 0 || idx >= linear.length - 1) return; // already at oldest
  openAlbum(linear[idx + 1], 0);
}

function openAlbum(tile, startIndex = 0, focusTrap = true) {
  state.openerTile = tile;
  try {
    state.albumImages = JSON.parse(tile.getAttribute('data-images') || '[]');
  } catch {
    state.albumImages = [];
  }
  buildDots();
  state.currentIndex = Math.min(Math.max(0, startIndex), state.albumImages.length - 1);
  updateUI();

  refs.lb.classList.add('open');
  refs.lb.setAttribute('aria-hidden', 'false');
  lockScroll();
  if (focusTrap) (refs.lbClose || refs.lbNext || refs.lbPrev || refs.lbImg)?.focus?.();
}

function closeLB() {
  refs.lb.classList.remove('open');
  refs.lb.setAttribute('aria-hidden', 'true');
  refs.lbImg.removeAttribute('src');
  refs.lbImg.removeAttribute('srcset');
  unlockScroll();
  history.replaceState(null, '', location.pathname + location.search);
  state.openerTile?.focus?.();
  state.openerTile = null;
}

// 9) INIT
document.addEventListener('DOMContentLoaded', () => {
  $$initRefs();

  if (refs.year) refs.year.textContent = new Date().getFullYear();

  // Capture tiles in DOM order — newest -> oldest
  state.tiles = refs.grid ? Array.from(refs.grid.querySelectorAll('.tile')) : [];

  // Blur-up for grid thumbs
  document.querySelectorAll('.thumb.loading').forEach(img => {
    if (img.complete) img.classList.remove('loading');
    else img.addEventListener('load', () => img.classList.remove('loading'), { once: true });
  });

  // Visual info (still useful for other layout bits)
  computeVisualTiles();
  getCols();
  window.addEventListener('resize', () => { computeVisualTiles(); getCols(); });
  window.addEventListener('orientationchange', () => { computeVisualTiles(); getCols(); });

  // Tile events
  state.tiles.forEach(tile => {
    tile.setAttribute('tabindex', '0');
    tile.addEventListener('click', () => openAlbum(tile));
    tile.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAlbum(tile); }
    });
  });

  // Lightbox controls
  refs.lbPrev?.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });
  refs.lbNext?.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
  refs.lbClose?.addEventListener('click', (e) => { e.stopPropagation(); closeLB(); });
  refs.lb?.addEventListener('click', (e) => { if (e.target === refs.lb) closeLB(); });
  refs.lbImg?.addEventListener('click', (e) => e.stopPropagation());

  // SWIPES
  if (refs.lb) {
    refs.lb.addEventListener('touchstart', (e) => {
      if (e.touches?.length !== 1) return;
      state.swiping = true;
      state.touchStartX = e.touches[0].clientX;
      state.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    refs.lb.addEventListener('touchmove', (e) => {
      if (!state.swiping || e.touches?.length !== 1) return;
      const dx = e.touches[0].clientX - state.touchStartX;
      if (dx < -20) preloadNeighbor(state.currentIndex + 1);
      if (dx >  20) preloadNeighbor(state.currentIndex - 1);
      e.preventDefault();
    }, { passive: false });

    refs.lb.addEventListener('touchend', (e) => {
      if (!state.swiping) return;
      state.swiping = false;

      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - state.touchStartX;
      const dy = touch.clientY - state.touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal: left = next photo, right = previous photo
      if (absX > SWIPE.H_THRESHOLD && absX > absY) {
        if (dx < 0) nextPhoto(); else prevPhoto();
        return;
      }
      // Vertical (IG-style):
      // swipe DOWN -> older post, swipe UP -> newer post
      if (absY > SWIPE.V_THRESHOLD && absY > absX * SWIPE.V_SLOPE) {
        if (dy > 0) openAlbumOlder();  // down = next older
        else       openAlbumNewer();   // up   = previous newer
      }
    }, { passive: true });
  }

  // Keyboard mirrors swipe logic
  document.addEventListener('keydown', (e) => {
    if (!refs.lb.classList.contains('open')) {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('tile')) {
        e.preventDefault();
        openAlbum(document.activeElement);
      }
      return;
    }

    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (arrowKeys.includes(e.key)) e.preventDefault();

    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prevPhoto();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowUp') openAlbumNewer();  // newer
    if (e.key === 'ArrowDown') openAlbumOlder(); // older

    if (e.key === 'Tab') {
      const focusables = [refs.lbPrev, refs.lbNext, refs.lbClose, refs.lbImg].filter(Boolean);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Infinite reveal
  const allTiles = Array.from(document.querySelectorAll('.grid .tile'));
  let shown = 0;
  function hideBeyondInitial() {
    shown = Math.min(REVEAL_CHUNK, allTiles.length);
    allTiles.forEach((t, i) => { t.style.display = i < shown ? '' : 'none'; });
    computeVisualTiles();
  }
  function revealMore() {
    const nextShown = Math.min(shown + REVEAL_CHUNK, allTiles.length);
    for (let i = shown; i < nextShown; i++) allTiles[i].style.display = '';
    shown = nextShown;
    computeVisualTiles();
  }
  hideBeyondInitial();
  if (refs.sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          revealMore();
          if (shown >= allTiles.length) io.disconnect();
        }
      }
    }, { rootMargin: IO_ROOT_MARGIN });
    io.observe(refs.sentinel);
  }

  // Deep links
  window.addEventListener('hashchange', parseHashAndOpenIfAny);
  parseHashAndOpenIfAny();
});

// Disable double-tap zoom but keep pinch-zoom
(function () {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
})();

document.addEventListener('DOMContentLoaded', () => {
  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const grid = document.getElementById('grid');
  const tiles = grid ? Array.from(grid.querySelectorAll('.tile')) : [];

  // Lightbox elements
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbClose = document.getElementById('lbClose');
  const lbDots = document.getElementById('lbDots'); // make sure this exists in index.html

  // State
  let albumImages = [];
  let currentIndex = 0;
  let openerTile = null; // the tile/album currently open
  let touchStartX = 0, touchStartY = 0, swiping = false;

  // Helpers
  const lockScroll = () => { document.documentElement.style.overflow = 'hidden'; };
  const unlockScroll = () => { document.documentElement.style.overflow = ''; };

  function albumTitleOf(tile) { return tile?.getAttribute('data-album') || ''; }
  function tileIndex(tile) { return tiles.indexOf(tile); }

  function buildDots() {
    if (!lbDots) return;
    lbDots.innerHTML = '';
    albumImages.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'lb-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to image ${i + 1}`);
      dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); });
      lbDots.appendChild(dot);
    });
  }

  function setHash() {
    const params = new URLSearchParams();
    const album = albumTitleOf(openerTile);
    if (album) params.set('album', album);
    params.set('index', String(currentIndex));
    history.replaceState(null, '', '#' + params.toString());
  }

  function parseHashAndOpenIfAny() {
    if (!location.hash) return;
    const params = new URLSearchParams(location.hash.slice(1));
    const album = params.get('album');
    const idxStr = params.get('index');
    if (!album) return;
    const tile = tiles.find(t => (t.getAttribute('data-album') || '') === album);
    if (!tile) return;
    openAlbum(tile, Number(idxStr ?? 0) || 0, false);
  }

  function preloadNeighbor(i) {
    const path = albumImages[i];
    if (!path) return;
    const img = new Image();
    img.src = path;
  }

  function updateUI() {
    if (!albumImages.length) return;
    const imgPath = albumImages[currentIndex];

    lbImg.onerror = () => {
      lbImg.removeAttribute('srcset');
      lbImg.alt = 'Image failed to load.';
    };
    lbImg.setAttribute('src', imgPath);
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');
    lbImg.alt = '';

    // Disable arrows at ends (no loop)
    if (lbPrev) lbPrev.disabled = currentIndex === 0;
    if (lbNext) lbNext.disabled = currentIndex === albumImages.length - 1;

    // Update dots active state
    if (lbDots) {
      const dots = Array.from(lbDots.querySelectorAll('.lb-dot'));
      dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
    }

    // Preload neighbors
    preloadNeighbor(currentIndex + 1);
    preloadNeighbor(currentIndex - 1);

    // Update deep link
    setHash();
  }

  function goTo(i) {
    if (i < 0 || i > albumImages.length - 1) return;
    currentIndex = i;
    updateUI();
  }

  function prev() { if (currentIndex > 0) goTo(currentIndex - 1); }
  function next() { if (currentIndex < albumImages.length - 1) goTo(currentIndex + 1); }

  // ===== Album-to-album navigation (vertical) =====
  function openAdjacentAlbum(offset) {
    if (!openerTile) return;
    const idx = tileIndex(openerTile);
    if (idx < 0) return;
    const target = tiles[idx + offset];
    if (!target) return; // at top/bottom, do nothing
    openAlbum(target, 0); // start each album at its first image
  }

  function openPrevAlbum() { openAdjacentAlbum(-1); }
  function openNextAlbum() { openAdjacentAlbum(+1); }

  // ===============================================

  function openAlbum(tile, startIndex = 0, focusTrap = true) {
    openerTile = tile;
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]'); // cover not added
    buildDots();
    currentIndex = Math.min(Math.max(0, startIndex), albumImages.length - 1);
    updateUI();

    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    lockScroll();

    if (focusTrap) { (lbClose || lbNext || lbPrev || lbImg)?.focus?.(); }
  }

  function closeLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('srcset');
    unlockScroll();
    history.replaceState(null, '', ' ');
    openerTile?.focus?.(); // restore focus
    openerTile = null;
  }

  // Tile events
  tiles.forEach(tile => {
    tile.setAttribute('tabindex', '0');
    tile.addEventListener('click', () => openAlbum(tile));
    tile.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAlbum(tile); }
    });
  });

  // Lightbox controls
  if (lbPrev) lbPrev.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  if (lbNext) lbNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  if (lbClose) lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLB(); });

  // Close on background click
  if (lb) {
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
  }
  if (lbImg) lbImg.addEventListener('click', (e) => e.stopPropagation());

  // Swipe gestures (tuned for fewer accidental vertical triggers)
if (lb) {
  lb.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    swiping = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  lb.addEventListener('touchmove', (e) => {
    if (!swiping || !e.touches || e.touches.length !== 1) return;
    // Prevent background scroll while swiping horizontally
    e.preventDefault();
  }, { passive: false });

  lb.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Horizontal swipe (photo-to-photo) stays the same
    if (absX > 40 && absX > absY) {
      if (dx < 0) next(); else prev();
      return;
    }

    // Vertical swipe (album-to-album) now requires stronger motion
    // Minimum 120px distance and at least 1.8× stronger than horizontal
    if (absY > 120 && absY > absX * 1.8) {
      if (dy < 0) openNextAlbum();   // swipe up → next album
      else openPrevAlbum();          // swipe down → previous album
    }
  }, { passive: true });
}

    lb.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal: photo in album
      if (absX > 40 && absX > absY) {
        if (dx < 0) next(); else prev();
        return;
      }
      // Vertical: album-to-album (up = next album, down = previous)
      if (absY > 60 && absY > absX) {
        if (dy < 0) openNextAlbum();   // swipe up
        else openPrevAlbum();          // swipe down
      }
    }, { passive: true });
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('tile')) {
        e.preventDefault();
        openAlbum(document.activeElement);
      }
      return;
    }

    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowUp') openNextAlbum();     // up = next album (consistent with swipe up)
    if (e.key === 'ArrowDown') openPrevAlbum();   // down = previous album

    // Basic focus trap
    if (e.key === 'Tab') {
      const focusables = [lbPrev, lbNext, lbClose, lbImg].filter(Boolean);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Open from deep link if present
  window.addEventListener('hashchange', parseHashAndOpenIfAny);
  parseHashAndOpenIfAny();
});

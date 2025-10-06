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
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const grid = document.getElementById('grid');
  const tiles = grid ? Array.from(grid.querySelectorAll('.tile')) : [];

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbClose = document.getElementById('lbClose');
  const lbDots = document.getElementById('lbDots');
  const sentinel = document.getElementById('sentinel');

  let albumImages = [];
  let currentIndex = 0;
  let openerTile = null;
  let touchStartX = 0, touchStartY = 0, swiping = false;

  // Strong scroll lock to block vertical page scroll and pull-to-refresh while lightbox is open
  const preventTouchMove = (e) => { e.preventDefault(); };
  const lockScroll = () => {
    document.documentElement.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
  };
  const unlockScroll = () => {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
    document.removeEventListener('touchmove', preventTouchMove, { passive: false });
  };

  const albumTitleOf = (tile) => tile?.getAttribute('data-album') || '';

  // Remove blur on grid thumbs once they load
  document.querySelectorAll('.thumb.loading').forEach(img => {
    if (img.complete) img.classList.remove('loading');
    else img.addEventListener('load', () => img.classList.remove('loading'), { once: true });
  });

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

    // Lightbox fade/blur-in
    lbImg.classList.add('loading');
    lbImg.onerror = () => {
      lbImg.removeAttribute('srcset');
      lbImg.alt = 'Image failed to load.';
      lbImg.classList.remove('portrait');
      lbImg.classList.remove('loading');
    };
    lbImg.setAttribute('src', imgPath);
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');
    lbImg.alt = '';

    // Decide portrait vs landscape after load
    const onLoaded = () => {
      lbImg.classList.remove('loading');
      const isPortrait = (lbImg.naturalHeight || 0) > (lbImg.naturalWidth || 0);
      lbImg.classList.toggle('portrait', isPortrait);
    };
    if (lbImg.complete) onLoaded();
    else lbImg.addEventListener('load', onLoaded, { once: true });

    if (lbPrev) lbPrev.disabled = currentIndex === 0;
    if (lbNext) lbNext.disabled = currentIndex === albumImages.length - 1;

    if (lbDots) {
      const dots = Array.from(lbDots.querySelectorAll('.lb-dot'));
      dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
    }

    preloadNeighbor(currentIndex + 1);
    preloadNeighbor(currentIndex - 1);

    setHash();
  }

  function goTo(i) {
    if (i < 0 || i > albumImages.length - 1) return;
    currentIndex = i;
    updateUI();
  }

  const prev = () => { if (currentIndex > 0) goTo(currentIndex - 1); };
  const next = () => { if (currentIndex < albumImages.length - 1) goTo(currentIndex + 1); };

  // Visual order helpers: navigate by on-screen position, not DOM index
  const visualTiles = () => {
    const arr = tiles.slice();
    arr.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (ra.top !== rb.top) return ra.top - rb.top;
      return ra.left - rb.left;
    });
    return arr;
  };

  function openAdjacentAlbum(offset) {
    if (!openerTile) return;
    const vt = visualTiles();
    const idx = vt.indexOf(openerTile);
    if (idx < 0) return;
    const target = vt[idx + offset];
    if (!target) return;
    openAlbum(target, 0);
  }
  const openPrevAlbum = () => openAdjacentAlbum(-1); // go to album above on screen (previous/newer)
  const openNextAlbum = () => openAdjacentAlbum(+1); // go to album below on screen (next/older)

  function openAlbum(tile, startIndex = 0, focusTrap = true) {
    openerTile = tile;
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]');
    buildDots();
    currentIndex = Math.min(Math.max(0, startIndex), albumImages.length - 1);
    updateUI();

    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    lockScroll();
    if (focusTrap) (lbClose || lbNext || lbPrev || lbImg)?.focus?.();
  }

  function closeLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('srcset');
    unlockScroll();
    history.replaceState(null, '', ' ');
    openerTile?.focus?.();
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
  lbPrev?.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  lbNext?.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  lbClose?.addEventListener('click', (e) => { e.stopPropagation(); closeLB(); });
  lb?.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
  lbImg?.addEventListener('click', (e) => e.stopPropagation());

  // Swipe gestures
  if (lb) {
    lb.addEventListener('touchstart', (e) => {
      if (e.touches?.length !== 1) return;
      swiping = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lb.addEventListener('touchmove', (e) => {
      if (!swiping || e.touches?.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      // Directional preload during gesture
      if (dx < -20) preloadNeighbor(currentIndex + 1);
      if (dx > 20)  preloadNeighbor(currentIndex - 1);
      // Block default to stop vertical page scroll and pull-to-refresh
      e.preventDefault();
    }, { passive: false });

    lb.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal swipe: left = next photo, right = previous photo
      if (absX > 40 && absX > absY) {
        if (dx < 0) next(); else prev();
        return;
      }
      // Vertical swipe: down = album below (next/older), up = album above (previous/newer)
      if (absY > 140 && absY > absX * 2) {
        if (dy < 0) openPrevAlbum();  // swipe up
        else openNextAlbum();         // swipe down
      }
    }, { passive: true });
  }

  // Keyboard: Left prev photo, Right next photo, Up previous album, Down next album
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
    if (e.key === 'ArrowUp') openPrevAlbum();
    if (e.key === 'ArrowDown') openNextAlbum();

    // Simple focus trap
    if (e.key === 'Tab') {
      const focusables = [lbPrev, lbNext, lbClose, lbImg].filter(Boolean);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Infinite reveal for many albums: show in chunks without filenames
  const CHUNK = 9;
  const allTiles = Array.from(document.querySelectorAll('.grid .tile'));
  let shown = 0;
  function hideBeyondInitial() {
    shown = Math.min(CHUNK, allTiles.length);
    allTiles.forEach((t, i) => {
      t.style.display = i < shown ? '' : 'none';
    });
  }
  function revealMore() {
    const nextShown = Math.min(shown + CHUNK, allTiles.length);
    for (let i = shown; i < nextShown; i++) {
      allTiles[i].style.display = '';
    }
    shown = nextShown;
  }
  hideBeyondInitial();
  if (sentinel) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          revealMore();
          if (shown >= allTiles.length) io.disconnect();
        }
      }
    }, { rootMargin: '400px 0px' });
    io.observe(sentinel);
  }

  // Deep link support
  window.addEventListener('hashchange', parseHashAndOpenIfAny);
  parseHashAndOpenIfAny();
});

// Disable double-tap zoom but keep pinch-zoom
(function () {
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault(); // block second tap zoom
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Some browsers also zoom on dblclick
  document.addEventListener('dblclick', function (e) {
    e.preventDefault();
  }, { passive: false });
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

  let albumImages = [];
  let currentIndex = 0;

  function openAlbum(tile) {
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]'); // cover not added
    buildDots();
    currentIndex = 0;
    updateUI();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  function updateUI() {
    if (!albumImages.length) return;
    const imgPath = albumImages[currentIndex];
    lbImg.setAttribute('src', imgPath);
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');

    // Disable arrows at ends (no infinite loop)
    if (lbPrev) lbPrev.disabled = currentIndex === 0;
    if (lbNext) lbNext.disabled = currentIndex === albumImages.length - 1;

    // Update dots
    if (lbDots) {
      const dots = Array.from(lbDots.querySelectorAll('.lb-dot'));
      dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
    }
  }

  function buildDots() {
    if (!lbDots) return;
    lbDots.innerHTML = '';
    albumImages.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'lb-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to image ${i + 1}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        currentIndex = i;
        updateUI();
      });
      lbDots.appendChild(dot);
    });
  }

  function closeLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('srcset');
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateUI();
    }
  }

  function next() {
    if (currentIndex < albumImages.length - 1) {
      currentIndex += 1;
      updateUI();
    }
  }

  // Tile events
  tiles.forEach(tile => {
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
    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLB();
    });
  }
  if (lbImg) lbImg.addEventListener('click', (e) => e.stopPropagation());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
});

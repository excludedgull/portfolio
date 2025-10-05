document.addEventListener('DOMContentLoaded', () => {
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

  let albumImages = [];
  let currentIndex = 0;

  function openAlbum(tile) {
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]'); // cover not added
    currentIndex = 0;
    renderCurrent();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  function renderCurrent() {
    if (!albumImages.length) return;
    const imgPath = albumImages[currentIndex];
    lbImg.setAttribute('src', imgPath);
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');
  }

  function closeLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('srcset');
  }

  function prev() {
    if (!albumImages.length) return;
    currentIndex = (currentIndex - 1 + albumImages.length) % albumImages.length;
    renderCurrent();
  }

  function next() {
    if (!albumImages.length) return;
    currentIndex = (currentIndex + 1) % albumImages.length;
    renderCurrent();
  }

  // Tile events
  tiles.forEach(tile => {
    // Auto-set count text from data-images
    const countEl = tile.querySelector('.overlay .count');
    if (countEl) {
      try {
        const imgs = JSON.parse(tile.getAttribute('data-images') || '[]');
        countEl.textContent = String(imgs.length);
      } catch {}
    }
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
  // Prevent image click from closing
  if (lbImg) lbImg.addEventListener('click', (e) => e.stopPropagation());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
});

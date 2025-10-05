/* Lightbox and albums */
document.addEventListener('DOMContentLoaded', () => {
  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const grid = document.getElementById('grid');
  if (!grid) return;

  const tiles = Array.from(grid.querySelectorAll('.tile'));

  // Lightbox elements
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const lbClose = document.getElementById('lbClose');
  const lbAlbum = document.getElementById('lbAlbum');
  const lbIndex = document.getElementById('lbIndex');

  let albumImages = [];
  let albumTitle = '';
  let currentIndex = 0;

  // Open album without adding cover to slides
  function openAlbum(tile) {
    albumTitle = tile.getAttribute('data-album') || '';
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]');
    currentIndex = 0;
    renderCurrent();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  function renderCurrent() {
    const imgPath = albumImages[currentIndex];
    lbImg.setAttribute('src', imgPath);
    // Provide a simple srcset for browsers that want a hint
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');
    if (lbAlbum) lbAlbum.textContent = albumTitle;
    if (lbIndex) lbIndex.textContent = `${currentIndex + 1} / ${albumImages.length}`;
  }

  function closeLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lbImg.removeAttribute('src');
    lbImg.removeAttribute('srcset');
  }

  function prev() {
    currentIndex = (currentIndex - 1 + albumImages.length) % albumImages.length;
    renderCurrent();
  }

  function next() {
    currentIndex = (currentIndex + 1) % albumImages.length;
    renderCurrent();
  }

  // Tile clicks and keyboard
  tiles.forEach(tile => {
    // Auto set the visible count from data-images
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
  if (lbPrev) lbPrev.addEventListener('click', prev);
  if (lbNext) lbNext.addEventListener('click', next);
  if (lbClose) lbClose.addEventListener('click', closeLB);

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
});

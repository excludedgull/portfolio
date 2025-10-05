document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const grid = document.getElementById('grid');
  const tiles = Array.from(grid.querySelectorAll('.tile'));
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

  function openAlbum(tile) {
    albumTitle = tile.getAttribute('data-album') || '';
    const cover = tile.getAttribute('data-cover');
    albumImages = JSON.parse(tile.getAttribute('data-images') || '[]');
    if (cover && (!albumImages.length || albumImages[0] !== cover)) {
      albumImages = [cover, ...albumImages];
    }
    currentIndex = 0;
    renderCurrent();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  function renderCurrent() {
    const imgPath = albumImages[currentIndex];
    lbImg.setAttribute('src', imgPath);
    lbImg.setAttribute('srcset', `${imgPath} 2048w`);
    lbImg.setAttribute('sizes', '92vw');
    lbAlbum.textContent = albumTitle;
    lbIndex.textContent = `${currentIndex + 1} / ${albumImages.length}`;
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

  tiles.forEach(tile => {
    tile.addEventListener('click', () => openAlbum(tile));
    tile.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAlbum(tile); }
    });
  });

  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);
  lbClose.addEventListener('click', closeLB);

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  const nav = document.querySelector('.site-nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('.nav-link');
      if (!link) return;
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.removeAttribute('aria-current'));
      link.setAttribute('aria-current', 'page');
      const filter = link.getAttribute('data-filter');
      tiles.forEach(t => {
        const cat = t.getAttribute('data-category') || 'all';
        t.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
      });
    });
  }
});
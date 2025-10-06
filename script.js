// Minimal, fast lightbox with dots and arrow keys

document.addEventListener('DOMContentLoaded', () => {
  const year    = document.getElementById('year');
  const grid    = document.getElementById('grid');
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lbImg');
  const lbPrev  = document.getElementById('lbPrev');
  const lbNext  = document.getElementById('lbNext');
  const lbClose = document.getElementById('lbClose');
  const lbDots  = document.getElementById('lbDots');

  if (year) year.textContent = new Date().getFullYear();

  // State
  let currentImages = [];
  let currentIndex = 0;

  function buildDots() {
    lbDots.innerHTML = '';
    currentImages.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'lb-dot';
      b.type = 'button';
      b.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); });
      lbDots.appendChild(b);
    });
  }

  function updateDots() {
    const dots = lbDots.querySelectorAll('.lb-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
  }

  function updateImage() {
    if (!currentImages.length) return;
    lbImg.src = currentImages[currentIndex];
    lbPrev.disabled = currentIndex === 0;
    lbNext.disabled = currentIndex === currentImages.length - 1;
    updateDots();
  }

  function goTo(i) {
    if (i < 0 || i >= currentImages.length) return;
    currentIndex = i;
    updateImage();
  }

  function openAlbum(tile) {
    try {
      currentImages = JSON.parse(tile.getAttribute('data-images') || '[]');
    } catch { currentImages = []; }
    currentIndex = 0;
    buildDots();
    updateImage();
    lb.classList.add('open');
  }

  function closeLB() {
    lb.classList.remove('open');
    lbImg.removeAttribute('src');
    currentImages = [];
    currentIndex = 0;
  }

  // Tile clicks
  const tiles = Array.from(grid.querySelectorAll('.tile'));
  tiles.forEach(tile => {
    tile.addEventListener('click', () => openAlbum(tile));
    tile.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAlbum(tile); }
    });
  });

  // Controls
  lbPrev.addEventListener('click', (e) => { e.stopPropagation(); goTo(currentIndex - 1); });
  lbNext.addEventListener('click', (e) => { e.stopPropagation(); goTo(currentIndex + 1); });
  lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLB(); });

  // Click outside image closes
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target === lbDots) closeLB();
  });
  lbImg.addEventListener('click', (e) => e.stopPropagation());

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
    if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
  });
});

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Toggle contraseña ──────────────────────────────── */
  const toggleBtn = document.querySelector('.input-password-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap  = toggleBtn.closest('.input-password-wrap');
      const input = wrap.querySelector('input');
      const icon  = wrap.querySelector('svg');
      const show  = input.getAttribute('type') === 'password';
      input.setAttribute('type', show ? 'text' : 'password');
      icon.innerHTML = show
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>';
    });
  }

  initCollage();
});

function initCollage() {
  const BASE     = '../../assets/images/login/';
  const INTERVAL = 5000;

  const POOLS = [
    /* celda 1 */
    ['taxi driver.webp', 'la llegada.webp', 'el resplandor.webp', 'zombies party.webp', 'el graduado.webp'],
    /* celda 2 */
    ['blade runner.webp', 'her.webp', 'carrie.webp', 'olvidate de mi.webp', 'lost in translation.webp'],
    /* celda 3 */
    ['reservoir dogs.webp', 'oppenheimer.webp', 'memories of a murder.webp', 'tiburon.webp', 'la milla verde.webp'],
    /* celda 4 */
    ['zodiac.webp', 'alien.webp', 'old boy.webp', 'gran hotel budapest.webp', 'antes del amanecer.webp'],
    /* celda 5 */
    ['fargo.webp', 'una batalla tras otra.webp', 'la historia interminable.webp', 'la vida de brian.webp', 'in the mood for love.webp'],
    /* celda 6 */
    ['trainspotting.webp', 'la la land.webp', 'salvar al soldado ryan.webp', 'y tu mama tambien.webp', 'la peor persona del mundo.webp'],
    /* celda 7 */
    ['apocalipsis now.webp', 'pozos de ambicion.webp', 'el retorno del rey.webp', 'no es pais para viejos.webp', 'retrato de una mujer en llamas.webp'],
  ];

  const KB = [
    'kb-zoom-in 6s ease forwards',
    'kb-zoom-out 6s ease forwards',
    'kb-pan-right 6s ease forwards',
    'kb-pan-left 6s ease forwards',
    'kb-pan-up 6s ease forwards',
  ];

  function randomKB() {
    return KB[Math.floor(Math.random() * KB.length)];
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickNext(current, length) {
    if (length <= 1) return 0;
    let n;
    do { n = Math.floor(Math.random() * length); } while (n === current);
    return n;
  }

  document.querySelectorAll('.collage__item').forEach((item, i) => {
    const pool = POOLS[i];
    if (!pool) return;

    const shuffled = shuffle(pool);
    item.innerHTML = '';
  const POSITION = {
    'gran hotel budapest.webp': 'top',
  };

    shuffled.forEach((src, j) => {
      const img = document.createElement('img');
      img.src = BASE + src;
      img.alt = '';
      img.className = 'collage-slide' + (j === 0 ? ' active' : '');
      img.style.objectPosition = POSITION[src] || 'center';
      if (j === 0) img.style.animation = randomKB();
      item.appendChild(img);
    });

    let current = 0;
    const slides = Array.from(item.querySelectorAll('.collage-slide'));

    const tick = () => {
      slides[current].classList.remove('active');
      current = pickNext(current, slides.length);
      const slide = slides[current];
      slide.style.animation = 'none';
      void slide.offsetWidth;
      slide.style.animation = randomKB();
      slide.classList.add('active');
    };

    setTimeout(() => {
      tick();
      setInterval(tick, INTERVAL);
    }, Math.random() * 3000);
  });
}

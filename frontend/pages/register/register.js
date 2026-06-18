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


  const PROVINCES = {
    AR: [
      'Buenos Aires','Catamarca','Chaco','Chubut',
      'Ciudad Autónoma de Buenos Aires','Córdoba','Corrientes','Entre Ríos',
      'Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones',
      'Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz',
      'Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán',
    ],
    BO: [
      'Beni','Chuquisaca','Cochabamba','La Paz','Oruro',
      'Pando','Potosí','Santa Cruz','Tarija',
    ],
    CL: [
      'Antofagasta','Arica y Parinacota','Atacama','Aysén',
      'Biobío','Coquimbo','La Araucanía','Los Lagos','Los Ríos',
      'Magallanes','Maule','Ñuble','O\'Higgins',
      'Región Metropolitana de Santiago','Tarapacá','Valparaíso',
    ],
    CO: [
      'Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá',
      'Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba',
      'Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena',
      'Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda',
      'San Andrés y Providencia','Santander','Sucre','Tolima',
      'Valle del Cauca','Vaupés','Vichada',
    ],
    CR: [
      'Alajuela','Cartago','Guanacaste','Heredia',
      'Limón','Puntarenas','San José',
    ],
    CU: [
      'Artemisa','Camagüey','Ciego de Ávila','Cienfuegos','Granma',
      'Guantánamo','Holguín','Isla de la Juventud','La Habana','Las Tunas',
      'Matanzas','Mayabeque','Pinar del Río','Sancti Spíritus',
      'Santiago de Cuba','Villa Clara',
    ],
    EC: [
      'Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi',
      'El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja',
      'Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza',
      'Pichincha','Santa Elena','Santo Domingo de los Tsáchilas',
      'Sucumbíos','Tungurahua','Zamora Chinchipe',
    ],
    SV: [
      'Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad',
      'La Paz','La Unión','Morazán','San Miguel','San Salvador',
      'San Vicente','Santa Ana','Sonsonate','Usulután',
    ],
    ES: [
      'Álava','Albacete','Alicante','Almería','Asturias','Ávila',
      'Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria',
      'Castellón','Ceuta','Ciudad Real','Córdoba','A Coruña','Cuenca',
      'Girona','Granada','Guadalajara','Gipuzkoa','Huelva','Huesca',
      'Illes Balears','Jaén','León','Lleida','La Rioja','Lugo',
      'Madrid','Málaga','Melilla','Murcia','Navarra','Ourense',
      'Palencia','Las Palmas','Pontevedra','Salamanca',
      'Santa Cruz de Tenerife','Segovia','Sevilla','Soria',
      'Tarragona','Teruel','Toledo','Valencia','Valladolid',
      'Bizkaia','Zamora','Zaragoza',
    ],
    GQ: [
      'Annobón','Bioko Norte','Bioko Sur','Centro Sur',
      'Djibloho','Kié-Ntem','Litoral','Wele-Nzas',
    ],
    GT: [
      'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula',
      'El Progreso','Escuintla','Guatemala','Huehuetenango','Izabal',
      'Jalapa','Jutiapa','Petén','Quetzaltenango','Quiché',
      'Retalhuleu','Sacatepéquez','San Marcos','Santa Rosa',
      'Sololá','Suchitepéquez','Totonicapán','Zacapa',
    ],
    HN: [
      'Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés',
      'El Paraíso','Francisco Morazán','Gracias a Dios','Intibucá',
      'Islas de la Bahía','La Paz','Lempira','Ocotepeque',
      'Olancho','Santa Bárbara','Valle','Yoro',
    ],
    MX: [
      'Aguascalientes','Baja California','Baja California Sur',
      'Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila',
      'Colima','Durango','Guanajuato','Guerrero','Hidalgo','Jalisco',
      'Estado de México','Michoacán','Morelos','Nayarit','Nuevo León',
      'Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
      'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
      'Veracruz','Yucatán','Zacatecas',
    ],
    NI: [
      'Boaco','Carazo','Chinandega','Chontales','Costa Caribe Norte',
      'Costa Caribe Sur','Estelí','Granada','Jinotega','León',
      'Madriz','Managua','Masaya','Matagalpa',
      'Nueva Segovia','Río San Juan','Rivas',
    ],
    PA: [
      'Bocas del Toro','Chiriquí','Coclé','Colón','Darién',
      'Emberá','Guna Yala','Herrera','Los Santos',
      'Ngäbe-Buglé','Panamá','Panamá Oeste','Veraguas',
    ],
    PY: [
      'Alto Paraguay','Alto Paraná','Amambay','Asunción','Boquerón',
      'Caaguazú','Caazapá','Canindeyú','Central','Concepción',
      'Cordillera','Guairá','Itapúa','Misiones','Ñeembucú',
      'Paraguarí','Presidente Hayes','San Pedro',
    ],
    PE: [
      'Amazonas','Áncash','Apurímac','Arequipa','Ayacucho',
      'Cajamarca','Callao','Cusco','Huancavelica','Huánuco',
      'Ica','Junín','La Libertad','Lambayeque','Lima','Loreto',
      'Madre de Dios','Moquegua','Pasco','Piura','Puno',
      'San Martín','Tacna','Tumbes','Ucayali',
    ],
    PR: [
      'Aguada','Aguadilla','Aguas Buenas','Aibonito','Añasco',
      'Arecibo','Arroyo','Barceloneta','Barranquitas','Bayamón',
      'Cabo Rojo','Caguas','Camuy','Canóvanas','Carolina',
      'Cataño','Cayey','Ceiba','Ciales','Cidra','Coamo',
      'Comerío','Corozal','Culebra','Dorado','Fajardo',
      'Guánica','Guayama','Guayanilla','Guaynabo','Gurabo',
      'Hatillo','Hormigueros','Humacao','Isabela','Jayuya',
      'Juana Díaz','Juncos','Lajas','Lares','Las Marías',
      'Las Piedras','Loíza','Luquillo','Manatí','Maricao',
      'Maunabo','Mayagüez','Moca','Morovis','Naguabo','Naranjito',
      'Orocovis','Patillas','Peñuelas','Ponce','Quebradillas',
      'Rincón','Río Grande','Sabana Grande','Salinas','San Germán',
      'San Juan','San Lorenzo','San Sebastián','Santa Isabel',
      'Toa Alta','Toa Baja','Trujillo Alto','Utuado',
      'Vega Alta','Vega Baja','Vieques','Villalba','Yabucoa','Yauco',
    ],
    DO: [
      'Azua','Bahoruco','Barahona','Dajabón','Distrito Nacional',
      'Duarte','El Seibo','Elías Piña','Espaillat','Hato Mayor',
      'Hermanas Mirabal','Independencia','La Altagracia','La Romana',
      'La Vega','María Trinidad Sánchez','Monseñor Nouel',
      'Monte Cristi','Monte Plata','Pedernales','Peravia',
      'Puerto Plata','Samaná','San Cristóbal','San José de Ocoa',
      'San Juan','San Pedro de Macorís','Sánchez Ramírez',
      'Santiago','Santiago Rodríguez','Santo Domingo','Valverde',
    ],
    UY: [
      'Artigas','Canelones','Cerro Largo','Colonia','Durazno',
      'Flores','Florida','Lavalleja','Maldonado','Montevideo',
      'Paysandú','Río Negro','Rivera','Rocha','Salto',
      'San José','Soriano','Tacuarembó','Treinta y Tres',
    ],
    VE: [
      'Amazonas','Anzoátegui','Apure','Aragua','Barinas',
      'Bolívar','Carabobo','Cojedes','Delta Amacuro',
      'Dependencias Federales','Distrito Capital','Falcón',
      'Guárico','La Guaira','Lara','Mérida','Miranda',
      'Monagas','Nueva Esparta','Portuguesa','Sucre',
      'Táchira','Trujillo','Yaracuy','Zulia',
    ],
  };

  function makeDropdown(containerId, hiddenInputId, placeholderText, onSelect) {
    const container   = document.getElementById(containerId);
    if (!container) return null;
    const trigger     = container.querySelector('.country-select__trigger');
    const label       = container.querySelector('.country-select__label');
    const list        = container.querySelector('.country-select__list');
    const hiddenInput = document.getElementById(hiddenInputId);

    function open() {
      if (trigger.disabled) return;
      list.style.display = 'block';
      container.classList.add('is-open');
    }
    function close() {
      list.style.display = 'none';
      container.classList.remove('is-open');
      jumpBuffer = '';
    }

    trigger.addEventListener('click', () => {
      list.style.display === 'block' ? close() : open();
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) close();
    });

    // Navegación por teclado
    let jumpBuffer = '';
    let jumpTimer  = null;

    function normalize(str) {
      return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    document.addEventListener('keydown', (e) => {
      if (!container.classList.contains('is-open')) return;
      if (e.key.length !== 1) return;

      clearTimeout(jumpTimer);
      jumpBuffer += normalize(e.key);
      jumpTimer = setTimeout(() => { jumpBuffer = ''; }, 600);

      const items = Array.from(list.querySelectorAll('.country-select__item'));
      const match = items.find(item => normalize(item.textContent).startsWith(jumpBuffer));
      if (!match) return;

      items.forEach(i => i.classList.remove('is-jump'));
      match.classList.add('is-jump');
      match.scrollIntoView({ block: 'nearest' });
    });

    function bindItems() {
      list.querySelectorAll('.country-select__item').forEach(item => {
        item.addEventListener('click', () => {
          hiddenInput.value = item.dataset.value;
          label.textContent = item.textContent;
          label.classList.add('has-value');
          list.querySelectorAll('.country-select__item').forEach(i => i.classList.remove('is-selected', 'is-jump'));
          item.classList.add('is-selected');
          close();
          if (onSelect) onSelect(item.dataset.value);
        });
      });
    }

    bindItems();
    return { trigger, label, list, hiddenInput, bindItems, close, placeholderText };
  }

  const provinceDropdown = makeDropdown('city-select', 'reg-city', 'Selecciona tu provincia', null);

  makeDropdown('country-select', 'reg-country', null, (countryCode) => {
    if (!provinceDropdown) return;

    const provinces = (PROVINCES[countryCode] || []).slice().sort((a, b) => a.localeCompare(b, 'es'));
    provinceDropdown.list.innerHTML = '';
    provinceDropdown.hiddenInput.value = '';
    provinceDropdown.label.textContent = 'Selecciona tu provincia';
    provinceDropdown.label.classList.remove('has-value');
    provinceDropdown.close();

    provinces.forEach(prov => {
      const li = document.createElement('li');
      li.className = 'country-select__item';
      li.dataset.value = prov;
      li.textContent = prov;
      provinceDropdown.list.appendChild(li);
    });

    provinceDropdown.trigger.disabled = provinces.length === 0;
    provinceDropdown.bindItems();
  });

  initCollage();
  initFilmGrain();
});

function initFilmGrain() {
  const canvas = document.getElementById('film-grain');
  const ctx = canvas.getContext('2d');
  const SIZE = 200;
  canvas.width = SIZE;
  canvas.height = SIZE;

  const INTERVAL = 1000 / 24;
  let last = 0;

  function frame(ts) {
    requestAnimationFrame(frame);
    if (ts - last < INTERVAL) return;
    last = ts;
    const img = ctx.createImageData(SIZE, SIZE);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 22;
    }
    ctx.putImageData(img, 0, 0);
  }
  requestAnimationFrame(frame);
}

function initCollage() {
  const BASE     = '../../assets/images/register/';
  const INTERVAL = 5000;

  const POOLS = [
    /* celda 1 — Hollywood clásico/romance */
    ['casablanca.webp', 'lo que el viento se llevo.webp', 'sombrero de copa.webp',
     'mago de oz.webp', 'cantando bajo la lluvia.webp', 'vacaciones en roma.webp'],
    /* celda 2 — Film noir / drama americano */
    ['kane.webp', 'el halcon maltes.webp', 'psicosis.webp',
     'solo ante el peligro.webp', 'red river.webp', 'el crepusculo de los dioses.webp'],
    /* celda 3 — Terror expresionista (blanco y negro) */
    ['nosferatu.webp', 'frankenstein.webp', 'el golem.webp',
     'hombre invisible.webp', 'metropolis.webp'],
    /* celda 4 — Glamour / estrellas */
    ['marilyn.webp', 'lolita.webp', 'matar a un ruiseñor.webp',
     '8 y medio.webp', 'el angel azul.webp'],
    /* celda 5 — Nouvelle Vague / cine de autor */
    ['apartamento.webp', 'los 400 golpes.webp', 'un perro andaluz.webp',
     'el septimo sello.webp', 'viaje a la luna.webp'],
    /* celda 6 — Aventura / cine mundial */
    ['mosca.webp', 'toro salvaje.webp', 'los siete samurais.webp',
     'potemkin.webp', 'king kong.webp'],
    /* celda 7 — Comedia / cine mudo */
    ['dictador.webp', 'tiempos modernos.webp', 'sherlock jr.webp',
     'el ladron de bicicletas.webp', 'manhattan.webp'],
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

  const POSITION = {
    'king kong.webp':          'top',
    'sherlock jr.webp':        'top',
    'los siete samurais.webp': 'top',
    'el angel azul.webp':      'top',
    'el ladron de bicicletas.webp': 'top',
  };

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

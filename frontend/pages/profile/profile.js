/* ─── PERFIL DE USUARIO ──────────────────────────────────────────────────────── */

async function initProfile() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '../login/login.html';
    return;
  }

  await loadProfileData();
  initProfileForm();
}

/* ─── CARGA DE DATOS ────────────────────────────────────────────────────────── */
async function loadProfileData() {
  try {
    const data = await AuthAPI.me();
    renderProfileCard(data);
    fillProfileForm(data);
  } catch {
    showToast('No se pudo cargar el perfil.', 'error');
  }
}


/* ─── RENDER ────────────────────────────────────────────────────────────────── */
function renderProfileCard(data) {
  const wrap = document.getElementById('profile-card');
  if (!wrap) return;

  const { username, full_name, date_joined, avatar } = data;
  const displayName = full_name || username;
  const memberSince = date_joined
    ? new Date(date_joined).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  wrap.innerHTML = `
    <div class="profile-card">
      <div class="profile-card__name">${displayName}</div>
      <div class="profile-card__username">@${username}</div>
      <div class="profile-card__avatar-wrap">
        ${avatar
          ? `<img class="profile-card__avatar-img" src="${avatar}" alt="${displayName}" />`
          : `<div class="profile-card__avatar-initials">${getInitial(username)}</div>`
        }
        <label class="profile-card__avatar-edit" for="avatar-upload" title="Cambiar foto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </label>
        <input id="avatar-upload" type="file" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)" />
      </div>
      <button class="btn btn-primary btn-sm profile-card__upload-btn" onclick="document.getElementById('avatar-upload').click()">
        Subir foto
      </button>
      <p class="profile-card__upload-hint">La imagen se redimensionará automáticamente.<br>Tamaño máximo: 2 MB</p>
      ${memberSince ? `<div class="profile-card__since">Miembro desde: <strong>${memberSince}</strong></div>` : ''}
    </div>
  `;
}

function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('La imagen no puede superar 2 MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const wrap = document.querySelector('.profile-card__avatar-wrap');
    let img = wrap.querySelector('.profile-card__avatar-img');
    if (!img) {
      wrap.querySelector('.profile-card__avatar-initials')?.remove();
      img = document.createElement('img');
      img.className = 'profile-card__avatar-img';
      img.alt = '';
      wrap.prepend(img);
    }
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}



/* ─── DESPLEGABLES PAÍS / PROVINCIA ─────────────────────────────────────────── */
const PROVINCES = {
  AR: ['Buenos Aires','Catamarca','Chaco','Chubut','Ciudad Autónoma de Buenos Aires','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'],
  BO: ['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'],
  CL: ['Antofagasta','Arica y Parinacota','Atacama','Aysén','Biobío','Coquimbo','La Araucanía','Los Lagos','Los Ríos','Magallanes','Maule','Ñuble',"O'Higgins",'Región Metropolitana de Santiago','Tarapacá','Valparaíso'],
  CO: ['Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'],
  CR: ['Alajuela','Cartago','Guanacaste','Heredia','Limón','Puntarenas','San José'],
  CU: ['Artemisa','Camagüey','Ciego de Ávila','Cienfuegos','Granma','Guantánamo','Holguín','Isla de la Juventud','La Habana','Las Tunas','Matanzas','Mayabeque','Pinar del Río','Sancti Spíritus','Santiago de Cuba','Villa Clara'],
  EC: ['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'],
  SV: ['Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad','La Paz','La Unión','Morazán','San Miguel','San Salvador','San Vicente','Santa Ana','Sonsonate','Usulután'],
  ES: ['Álava','Albacete','Alicante','Almería','Asturias','Ávila','Badajoz','Barcelona','Burgos','Cáceres','Cádiz','Cantabria','Castellón','Ceuta','Ciudad Real','Córdoba','A Coruña','Cuenca','Girona','Granada','Guadalajara','Gipuzkoa','Huelva','Huesca','Illes Balears','Jaén','León','Lleida','La Rioja','Lugo','Madrid','Málaga','Melilla','Murcia','Navarra','Ourense','Palencia','Las Palmas','Pontevedra','Salamanca','Santa Cruz de Tenerife','Segovia','Sevilla','Soria','Tarragona','Teruel','Toledo','Valencia','Valladolid','Bizkaia','Zamora','Zaragoza'],
  GQ: ['Annobón','Bioko Norte','Bioko Sur','Centro Sur','Djibloho','Kié-Ntem','Litoral','Wele-Nzas'],
  GT: ['Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso','Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa','Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez','San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'],
  HN: ['Atlántida','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso','Francisco Morazán','Gracias a Dios','Intibucá','Islas de la Bahía','La Paz','Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro'],
  MX: ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Guanajuato','Guerrero','Hidalgo','Jalisco','Estado de México','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'],
  NI: ['Boaco','Carazo','Chinandega','Chontales','Costa Caribe Norte','Costa Caribe Sur','Estelí','Granada','Jinotega','León','Madriz','Managua','Masaya','Matagalpa','Nueva Segovia','Río San Juan','Rivas'],
  PA: ['Bocas del Toro','Chiriquí','Coclé','Colón','Darién','Emberá','Guna Yala','Herrera','Los Santos','Ngäbe-Buglé','Panamá','Panamá Oeste','Veraguas'],
  PY: ['Alto Paraguay','Alto Paraná','Amambay','Asunción','Boquerón','Caaguazú','Caazapá','Canindeyú','Central','Concepción','Cordillera','Guairá','Itapúa','Misiones','Ñeembucú','Paraguarí','Presidente Hayes','San Pedro'],
  PE: ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali'],
  PR: ['Aguada','Aguadilla','Aguas Buenas','Aibonito','Añasco','Arecibo','Arroyo','Barceloneta','Barranquitas','Bayamón','Cabo Rojo','Caguas','Camuy','Canóvanas','Carolina','Cataño','Cayey','Ceiba','Ciales','Cidra','Coamo','Comerío','Corozal','Culebra','Dorado','Fajardo','Guánica','Guayama','Guayanilla','Guaynabo','Gurabo','Hatillo','Hormigueros','Humacao','Isabela','Jayuya','Juana Díaz','Juncos','Lajas','Lares','Las Marías','Las Piedras','Loíza','Luquillo','Manatí','Maricao','Maunabo','Mayagüez','Moca','Morovis','Naguabo','Naranjito','Orocovis','Patillas','Peñuelas','Ponce','Quebradillas','Rincón','Río Grande','Sabana Grande','Salinas','San Germán','San Juan','San Lorenzo','San Sebastián','Santa Isabel','Toa Alta','Toa Baja','Trujillo Alto','Utuado','Vega Alta','Vega Baja','Vieques','Villalba','Yabucoa','Yauco'],
  DO: ['Azua','Bahoruco','Barahona','Dajabón','Distrito Nacional','Duarte','El Seibo','Elías Piña','Espaillat','Hato Mayor','Hermanas Mirabal','Independencia','La Altagracia','La Romana','La Vega','María Trinidad Sánchez','Monseñor Nouel','Monte Cristi','Monte Plata','Pedernales','Peravia','Puerto Plata','Samaná','San Cristóbal','San José de Ocoa','San Juan','San Pedro de Macorís','Sánchez Ramírez','Santiago','Santiago Rodríguez','Santo Domingo','Valverde'],
  UY: ['Artigas','Canelones','Cerro Largo','Colonia','Durazno','Flores','Florida','Lavalleja','Maldonado','Montevideo','Paysandú','Río Negro','Rivera','Rocha','Salto','San José','Soriano','Tacuarembó','Treinta y Tres'],
  VE: ['Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Dependencias Federales','Distrito Capital','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'],
};

let _cityDropdown = null;

function initLocationDropdowns() {
  _cityDropdown = makeProfileDropdown('profile-city-select', 'profile-city', 'Selecciona tu provincia', null);
  makeProfileDropdown('profile-country-select', 'profile-country', null, (code) => {
    if (!_cityDropdown) return;
    const provinces = (PROVINCES[code] || []).slice().sort((a, b) => a.localeCompare(b, 'es'));
    _cityDropdown.list.innerHTML = '';
    _cityDropdown.hiddenInput.value = '';
    _cityDropdown.label.textContent = 'Selecciona tu provincia';
    _cityDropdown.label.classList.remove('has-value');
    _cityDropdown.close();
    provinces.forEach(prov => {
      const li = document.createElement('li');
      li.className = 'country-select__item';
      li.dataset.value = prov;
      li.textContent = prov;
      _cityDropdown.list.appendChild(li);
    });
    _cityDropdown.trigger.disabled = provinces.length === 0;
    _cityDropdown.bindItems();
  });
}

function makeProfileDropdown(containerId, hiddenInputId, placeholderText, onSelect) {
  const container   = document.getElementById(containerId);
  if (!container) return null;
  const trigger     = container.querySelector('.country-select__trigger');
  const label       = container.querySelector('.country-select__label');
  const list        = container.querySelector('.country-select__list');
  const hiddenInput = document.getElementById(hiddenInputId);

  function open()  { if (trigger.disabled) return; list.style.display = 'block'; container.classList.add('is-open'); }
  function close() { list.style.display = 'none'; container.classList.remove('is-open'); jumpBuffer = ''; }

  trigger.addEventListener('click', () => list.style.display === 'block' ? close() : open());
  document.addEventListener('click', (e) => { if (!container.contains(e.target)) close(); });

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
  return { trigger, label, list, hiddenInput, bindItems, close };
}

/* ─── FORMULARIO DE EDICIÓN ─────────────────────────────────────────────────── */
let _pendingProfileData = null;

function fillProfileForm(data) {
  const textFields = ['username', 'full_name', 'email'];
  textFields.forEach(f => {
    const el = document.getElementById(`profile-${f}`);
    if (el) el.value = data[f] || '';
  });
  _pendingProfileData = data;
}

function _preselectLocation(data) {
  if (!data) return;
  if (data.country) {
    const countryItem = document.querySelector(`#profile-country-select .country-select__item[data-value="${data.country}"]`);
    if (countryItem) countryItem.click();
  }
  if (data.city && _cityDropdown) {
    setTimeout(() => {
      const cityItem = _cityDropdown.list.querySelector(`.country-select__item[data-value="${data.city}"]`);
      if (cityItem) cityItem.click();
    }, 50);
  }
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;
  initLocationDropdowns();
  _preselectLocation(_pendingProfileData);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
      username:  document.getElementById('profile-username')?.value.trim(),
      full_name: document.getElementById('profile-full_name')?.value.trim(),
      email:     document.getElementById('profile-email')?.value.trim(),
      city:      document.getElementById('profile-city')?.value.trim(),
      country:   document.getElementById('profile-country')?.value.trim(),
    };

    try {
      const data = await AuthAPI.updateMe(body);
      // Update stored user
      const stored = Auth.getUser();
      Auth.saveSession({ ...stored, username: data.username }, localStorage.getItem(CONFIG.STORAGE_KEYS?.ACCESS_TOKEN || CONFIG.ACCESS_TOKEN_KEY));
      renderProfileCard(data);
      openSuccessModal();
    } catch (err) {
      if (err instanceof APIError) showFieldErrors(form, err.data);
      openErrorModal(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  });

  const changePassBtn = document.getElementById('change-password-btn');
  if (changePassBtn) changePassBtn.addEventListener('click', openChangePassword);

}

/* ─── COLAGE LATERAL ────────────────────────────────────────────────────────── */
function initProfileCollage() {
  const BASE     = '../../assets/images/profile/';
  const INTERVAL = 5000;

  const POOLS = [
    /* columna izquierda — celda 1 */
    ['antes del atardecer.webp', 'malditos bastardos.webp', 'el club de la lucha.webp', 'encuentros en la tercera fase.webp', '2001 odisea en el espacio.webp'],
    /* columna izquierda — celda 2 */
    ['el padrino.webp', 'la naranja mecanica.webp', 'el secreto de sus ojos.webp', 'todo sobre mi madre.webp', 'hijos de los hombres.webp'],
    /* columna izquierda — celda 3 */
    ['el silencio de los corderos.webp', 'interstellar.webp', 'el imperio contrataca.webp', 'american psycho.webp'],
    /* columna izquierda — celda 4 */
    ['el caballero oscuro.webp', 'paris, texas.webp', 'whiplash.webp', 'cisne negro.webp', 'en busca del arca perdida.webp'],
    /* columna derecha — celda 1 */
    ['pequeña miss sunshine.webp', 'parasitos.webp', 'call me by your name.webp', 'mad max.webp', 'perdida.webp'],
    /* columna derecha — celda 2 */
    ['birdman.webp', 'mullholland drive.webp', 'boyhood.webp', 'los que se quedan.webp', 'el lobo de wall street.webp'],
    /* columna derecha — celda 3 */
    ['terminator 2.webp', 'puñales por la espalda.webp', 'la muerte tenia un precio.webp', 'gremlins.webp', 'los intocables de elliot ness.webp'],
    /* columna derecha — celda 4 */
    ['el laberinto del fauno.webp', 'la matanza de texas.webp', 'rocky.webp', 'supersalidos.webp', 'aterriza como puedas.webp', 'gran lebowski.webp'],
  ];

  const KB = [
    'kb-zoom-in 6s ease forwards',
    'kb-zoom-out 6s ease forwards',
    'kb-pan-right 6s ease forwards',
    'kb-pan-left 6s ease forwards',
    'kb-pan-up 6s ease forwards',
  ];

  function randomKB() { return KB[Math.floor(Math.random() * KB.length)]; }

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

  document.querySelectorAll('.profile-collage__cell').forEach((cell, i) => {
    const pool = POOLS[i];
    if (!pool) return;

    const shuffled = shuffle(pool);
    cell.innerHTML = '';
    shuffled.forEach((src, j) => {
      const img = document.createElement('img');
      img.src = BASE + src;
      img.alt = '';
      img.className = 'collage-slide' + (j === 0 ? ' active' : '');
      if (j === 0) img.style.animation = randomKB();
      cell.appendChild(img);
    });

    let current = 0;
    const slides = Array.from(cell.querySelectorAll('.collage-slide'));

    const tick = () => {
      slides[current].classList.remove('active');
      current = pickNext(current, slides.length);
      const slide = slides[current];
      slide.style.animation = 'none';
      void slide.offsetWidth;
      slide.style.animation = randomKB();
      slide.classList.add('active');
    };

    setTimeout(() => { tick(); setInterval(tick, INTERVAL); }, Math.random() * 3000);
  });
}

/* ─── MODAL ÉXITO ───────────────────────────────────────────────────────────── */
function openSuccessModal() {
  document.getElementById('success-modal')?.classList.remove('hidden');
}

function closeSuccessModal() {
  document.getElementById('success-modal')?.classList.add('hidden');
}

function openErrorModal(err) {
  let msg;
  if (err instanceof APIError) {
    const d = err.data;
    if (typeof d === 'object' && d !== null && !d.error && !d.detail) {
      msg = Object.entries(d)
        .map(([field, val]) => {
          const errors = Array.isArray(val) ? val.join(' ') : val;
          return `<strong>${field}:</strong> ${errors}`;
        })
        .join('<br>');
    } else {
      msg = err.firstMessage();
    }
  } else {
    msg = err?.message || 'Error inesperado. Inténtalo de nuevo.';
  }
  document.getElementById('error-modal')?.classList.remove('hidden');
}

function closeErrorModal() {
  document.getElementById('error-modal')?.classList.add('hidden');
}

/* ─── CAMBIO DE CONTRASEÑA ───────────────────────────────────────────────────── */
function openChangePassword() {
  const modal = document.getElementById('password-modal');
  if (modal) {
    modal.classList.remove('hidden');
    document.getElementById('pw-current')?.focus();
  }
}

function closeChangePassword() {
  const modal = document.getElementById('password-modal');
  if (modal) modal.classList.add('hidden');
  ['pw-current', 'pw-new', 'pw-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function submitChangePassword() {
  const current = document.getElementById('pw-current')?.value;
  const newPw   = document.getElementById('pw-new')?.value;
  const confirm = document.getElementById('pw-confirm')?.value;

  if (!current || !newPw || !confirm) {
    showToast('Rellena todos los campos.', 'error'); return;
  }
  if (newPw !== confirm) {
    showToast('Las contraseñas no coinciden.', 'error'); return;
  }
  if (newPw.length < 8) {
    showToast('La contraseña debe tener al menos 8 caracteres.', 'error'); return;
  }

  const btn = document.getElementById('pw-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  try {
    await AuthAPI.changePassword({ current_password: current, new_password: newPw });
    closeChangePassword();
    openSuccessModal();
  } catch (err) {
    openErrorModal(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Cambiar'; }
  }
}


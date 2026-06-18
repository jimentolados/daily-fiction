/* ─── RANKING ───────────────────────────────────────────────────────────────── */

let rankingPage = 1;
let rankingFilters = {};
let rankingTotal = 0;

const PROVINCES = {
  AR: ['Buenos Aires','Catamarca','Chaco','Chubut','Ciudad Autónoma de Buenos Aires','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'],
  BO: ['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'],
  CL: ['Antofagasta','Arica y Parinacota','Atacama','Aysén','Biobío','Coquimbo','La Araucanía','Los Lagos','Los Ríos','Magallanes','Maule','Ñuble','O\'Higgins','Región Metropolitana de Santiago','Tarapacá','Valparaíso'],
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

async function initRanking() {
  await loadSummary();
  await loadFullRanking();

  const countrySelect = document.getElementById('filter-country');
  const citySelect    = document.getElementById('filter-city');

  countrySelect?.addEventListener('change', () => {
    const code = countrySelect.value;
    citySelect.innerHTML = '';
    if (code && PROVINCES[code]) {
      citySelect.appendChild(new Option('Todas las provincias', ''));
      PROVINCES[code].slice().sort((a, b) => a.localeCompare(b, 'es')).forEach(p => {
        citySelect.appendChild(new Option(p, p));
      });
      citySelect.disabled = false;
    } else {
      citySelect.appendChild(new Option('Primero elige un país', ''));
      citySelect.disabled = true;
    }
    applyFilters();
  });

  citySelect?.addEventListener('change', applyFilters);
}

async function loadSummary() {
  const wrap = document.getElementById('ranking-summary');
  if (!wrap) return;

  try {
    const data = await RankingAPI.summary(rankingFilters);
    renderSummary(data, wrap);
  } catch {
    wrap.innerHTML = '<p class="text-muted text-center">No hay datos de ranking este mes.</p>';
  }
}

function renderSummary(data, wrap) {
  const { user_position, total_players } = data;

  const userHTML = user_position ? `
    <div class="ranking-row ranking-row--me" style="border-radius:var(--radius-md);margin-top:var(--sp-4)">
      <div class="ranking-row__pos">${user_position.rank}</div>
      <div class="ranking-row__user">
        <div class="ranking-row__avatar">${getInitial(user_position.username)}</div>
        <div><div class="ranking-row__name">${user_position.username} (tú)</div>
        <div class="ranking-row__location">${user_position.city || ''} ${user_position.country || ''}</div></div>
      </div>
      <div class="ranking-row__score">${user_position.total_score}</div>
      <div class="ranking-row__games">${user_position.games_played}</div>
      <div class="ranking-row__pct">${pct(user_position)}%</div>
    </div>` : '';

  wrap.innerHTML = `
    <p class="text-center text-muted text-sm">${total_players} jugadores este mes</p>
    ${userHTML}
  `;
}

async function loadFullRanking(page = 1) {
  const wrap = document.getElementById('ranking-full');
  if (!wrap) return;

  try {
    const data = await RankingAPI.full({ ...rankingFilters, page });
    rankingTotal = data.count;
    rankingPage  = page;
    renderTable(data.results, wrap);
    renderPagination(data.count, page);
  } catch {
    wrap.innerHTML = '<p class="text-muted text-center mt-8">No hay datos disponibles.</p>';
  }
}

function renderTable(rows, wrap) {
  const meId = Auth.getUser()?.id;
  const medals = { 1: 'gold', 2: 'silver', 3: 'bronze' };
  const offset = (rankingPage - 1) * 20;

  wrap.innerHTML = `
    <div class="ranking-table">
      <div class="ranking-table__header">
        <span>#</span><span>Jugador</span>
        <span>Puntos</span><span>Partidas</span><span>% Acierto</span>
      </div>
      ${rows.map((entry, i) => {
        const pos = offset + i + 1;
        const isMe = entry.username === Auth.getUser()?.username;
        const posClass = medals[pos] || '';
        return `
          <div class="ranking-row ${isMe ? 'ranking-row--me' : ''}">
            <div class="ranking-row__pos ${posClass}">${pos}</div>
            <div class="ranking-row__user">
              <div class="ranking-row__avatar">${getInitial(entry.username)}</div>
              <div>
                <div class="ranking-row__name">${entry.username}${isMe ? ' (tú)' : ''}</div>
                <div class="ranking-row__location">${[entry.city, entry.country].filter(Boolean).join(', ')}</div>
              </div>
            </div>
            <div class="ranking-row__score">${entry.total_score.toLocaleString()}</div>
            <div class="ranking-row__games">${entry.games_played}</div>
            <div class="ranking-row__pct">${pct(entry)}%</div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderPagination(total, currentPage) {
  const wrap = document.getElementById('ranking-pagination');
  if (!wrap) return;

  const totalPages = Math.ceil(total / 20);
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  wrap.innerHTML = `
    <div class="pagination">
      <button class="pagination__btn" onclick="loadFullRanking(${currentPage - 1})"
        ${currentPage === 1 ? 'disabled' : ''}>‹</button>
      ${pages.map(p => p === '…'
        ? `<span class="pagination__btn" style="cursor:default">…</span>`
        : `<button class="pagination__btn ${p === currentPage ? 'active' : ''}" onclick="loadFullRanking(${p})">${p}</button>`
      ).join('')}
      <button class="pagination__btn" onclick="loadFullRanking(${currentPage + 1})"
        ${currentPage === totalPages ? 'disabled' : ''}>›</button>
    </div>`;
}

function applyFilters() {
  rankingFilters = {};
  const country = document.getElementById('filter-country')?.value;
  const city    = document.getElementById('filter-city')?.value.trim();
  if (country) rankingFilters.country = country;
  if (city)    rankingFilters.city    = city;
  rankingPage = 1;
  loadSummary();
  loadFullRanking(1);
}

function pct(entry) {
  if (!entry.games_played) return 0;
  return Math.round((entry.correct_guesses / entry.games_played) * 100);
}

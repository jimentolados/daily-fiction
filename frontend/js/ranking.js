/* ─── RANKING ───────────────────────────────────────────────────────────────── */

let rankingPage = 1;
let rankingFilters = {};
let rankingTotal = 0;

async function initRanking() {
  await loadSummary();
  await loadFullRanking();

  document.getElementById('filter-country')?.addEventListener('change', applyFilters);
  document.getElementById('filter-city')?.addEventListener('input',    applyFilters);
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
  const { top3, user_position, total_players } = data;
  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = ['var(--color-gold)', '#b8b8b8', '#cd7f32'];

  const podiumHTML = top3.map((entry, i) => `
    <div class="podium__entry">
      <div class="podium__medal">${medals[i]}</div>
      <div class="podium__avatar" style="border-color:${medalColors[i]}">${getInitial(entry.username)}</div>
      <div class="podium__name">${entry.username}</div>
      <div class="podium__score">${entry.total_score.toLocaleString()}</div>
      <div class="podium__pedestal"><div class="podium__rank">${i + 1}</div></div>
    </div>
  `).join('');

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
    <div class="podium">${podiumHTML}</div>
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

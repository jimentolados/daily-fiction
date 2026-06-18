/* ═══════════════════════════════════════════════════════════════════════════════
   home.js — Lógica de la página de inicio
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ─── AUTOCOMPLETADO DE TÍTULOS ─────────────────────────────────────────────── */

class Autocomplete {
  constructor(inputId, listId, onSelect) {
    this.input = document.getElementById(inputId);
    this.list  = document.getElementById(listId);
    this.onSelect = onSelect;
    this.debounceTimer = null;
    this.selectedIndex = -1;
    this.items = [];

    if (!this.input || !this.list) return;
    this.init();
  }

  init() {
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.list.contains(e.target)) {
        this.hide();
      }
    });
  }

  handleInput() {
    clearTimeout(this.debounceTimer);
    const q = this.input.value.trim();
    if (q.length < 2) { this.hide(); return; }
    this.debounceTimer = setTimeout(() => this.fetchSuggestions(q), 250);
  }

  async fetchSuggestions(q) {
    try {
      this.items = await MoviesAPI.search(q) || [];
      this.render();
    } catch { this.hide(); }
  }

  render() {
    if (!this.items.length) { this.hide(); return; }
    this.selectedIndex = -1;
    this.list.innerHTML = this.items.map((m, i) => `
      <div class="autocomplete-item" data-idx="${i}" data-title="${m.title}">
        ${m.poster_url
          ? `<img class="autocomplete-poster" src="${m.poster_url}" alt="${m.title}">`
          : `<div class="autocomplete-poster" style="background:var(--color-bg-3)"></div>`}
        <div class="autocomplete-info">
          <div class="autocomplete-title">${m.title}</div>
          <div class="autocomplete-year">${m.year || ''}</div>
        </div>
      </div>
    `).join('');

    this.list.querySelectorAll('.autocomplete-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx);
        this.select(idx);
      });
    });

    this.list.classList.remove('hidden');
  }

  select(idx) {
    const movie = this.items[idx];
    if (!movie) return;
    this.input.value = movie.title;
    this.hide();
    if (this.onSelect) this.onSelect(movie.title);
  }

  handleKeydown(e) {
    const items = this.list.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    } else if (e.key === 'Enter' && this.selectedIndex >= 0) {
      e.preventDefault();
      this.select(this.selectedIndex);
      return;
    } else if (e.key === 'Escape') {
      this.hide(); return;
    } else { return; }

    items.forEach((el, i) => el.classList.toggle('selected', i === this.selectedIndex));
    if (items[this.selectedIndex]) {
      this.input.value = items[this.selectedIndex].dataset.title;
    }
  }

  hide() {
    this.list.classList.add('hidden');
    this.list.innerHTML = '';
    this.items = [];
  }
}

/* ─── LÓGICA DEL QUIZ ───────────────────────────────────────────────────────── */

let quizState = null;
let autocomplete = null;

async function initQuiz() {
  const wrapper = document.getElementById('quiz-wrapper');
  if (!wrapper) return;

  showLoading(wrapper);

  try {
    const data = await QuizAPI.today();
    if (!data) { showError(wrapper, 'No se pudo cargar el test.'); return; }
    quizState = data.session;
    renderQuiz(wrapper);
  } catch (err) {
    const msg = err instanceof APIError ? err.firstMessage() : 'No hay test disponible hoy.';
    showError(wrapper, msg);
  }
}

/* ─── RENDER PRINCIPAL ──────────────────────────────────────────────────────── */
function renderQuiz(wrapper) {
  if (!quizState) return;

  if (quizState.is_completed) {
    renderResult(wrapper);
    return;
  }

  const { clues_revealed, revealed_clues, remaining_final_attempts } = quizState;
  const inFinalPhase = clues_revealed === 4 && remaining_final_attempts !== null;

  wrapper.innerHTML = `
    <!-- Progreso -->
    <div class="clue-progress">
      <div class="clue-progress__steps">
        ${[1,2,3,4].map(n => `
          <div class="clue-progress__step ${n < clues_revealed ? 'revealed' : n === clues_revealed ? 'current' : ''}"></div>
        `).join('')}
      </div>
      <span class="clue-progress__label">Pista ${clues_revealed} de 4</span>
    </div>

    <!-- Pistas anteriores (mini) -->
    <div class="prev-clues" id="prev-clues"></div>

    <!-- Pista actual -->
    <div id="current-clue-wrap" class="mb-6"></div>

    <!-- Input de respuesta -->
    <div class="guess-section">
      <div class="guess-section__title">
        ${inFinalPhase ? `Últimos intentos — ${remaining_final_attempts} restante${remaining_final_attempts !== 1 ? 's' : ''}` : '¿Cuál es la película?'}
      </div>
      <div class="guess-input-wrap">
        <input
          id="guess-input"
          class="guess-input"
          type="text"
          placeholder="Escribe el título de la película..."
          autocomplete="off"
        />
        <div id="autocomplete-list" class="autocomplete-list hidden"></div>
        <button id="guess-submit" class="btn btn-primary">Responder</button>
      </div>
      <div id="guess-feedback" class="guess-feedback hidden"></div>
      ${inFinalPhase ? renderFinalAttemptsDots(remaining_final_attempts) : ''}
    </div>
  `;

  // Renderizar pistas anteriores y actual
  renderPrevClues(revealed_clues);
  renderCurrentClue(revealed_clues[revealed_clues.length - 1]);

  // Inicializar autocompletado y submit
  autocomplete = new Autocomplete('guess-input', 'autocomplete-list', (title) => {
    document.getElementById('guess-input').value = title;
  });

  document.getElementById('guess-submit').addEventListener('click', submitGuess);
  document.getElementById('guess-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitGuess();
  });

  document.getElementById('guess-input').focus();
}

function renderFinalAttemptsDots(remaining) {
  const total = 4;
  const used = total - remaining;
  const dots = Array.from({ length: total }, (_, i) =>
    `<div class="attempt-dot ${i < used ? 'wrong' : ''}"></div>`
  ).join('');
  return `<div class="attempts-indicator">${dots} <span>${remaining} intento${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}</span></div>`;
}

/* ─── PISTAS ────────────────────────────────────────────────────────────────── */
function renderPrevClues(clues) {
  const container = document.getElementById('prev-clues');
  if (!container || clues.length <= 1) return;

  const prev = clues.slice(0, -1);
  container.innerHTML = prev.map(clue => `
    <div class="prev-clue">
      <span class="prev-clue__num">${clue.order}</span>
      <span class="prev-clue__type">${getClueIcon(clue.clue_type)} ${clue.clue_type_display}</span>
      <span class="prev-clue__value">${clueContentText(clue)}</span>
    </div>
  `).join('');
}

function renderCurrentClue(clue) {
  if (!clue) return;
  const wrap = document.getElementById('current-clue-wrap');
  if (!wrap) return;

  const isNew = quizState.clues_revealed > 1;

  wrap.innerHTML = `
    <div class="clue-card ${isNew ? 'clue-card--new' : ''}">
      <div class="clue-card__header">
        <div class="clue-card__number">${clue.order}</div>
        <span class="clue-card__type-icon">${getClueIcon(clue.clue_type)}</span>
        <div class="clue-card__meta">
          <div class="clue-card__type-name">${clue.clue_type_display}</div>
        </div>
      </div>
      <div class="clue-card__body" id="clue-body"></div>
    </div>
  `;

  renderClueContent(clue, document.getElementById('clue-body'));
}

function renderClueContent(clue, body) {
  if (!body) return;
  const { clue_type, content_text, content_image } = clue;

  if (clue_type === 'IMAGE' && content_image) {
    body.innerHTML = `
      <div class="clue-image-wrap">
        <img class="clue-image" src="${content_image}" alt="Fotograma de la película" loading="lazy">
      </div>`;
    return;
  }

  if (clue_type === 'ICONIC_QUOTE') {
    body.innerHTML = `<blockquote class="clue-quote">"${content_text}"</blockquote>`;
    return;
  }

  if (['YEAR', 'OSCARS', 'LETTERBOXD', 'DURATION'].includes(clue_type)) {
    body.innerHTML = `<div class="clue-text clue-text--large">${content_text}</div>`;
    return;
  }

  body.innerHTML = `<div class="clue-text">${content_text}</div>`;
}

function clueContentText(clue) {
  if (clue.clue_type === 'IMAGE') return '📷 Fotograma';
  return clue.content_text || '—';
}

/* ─── ENVIAR INTENTO ────────────────────────────────────────────────────────── */
async function submitGuess() {
  const input = document.getElementById('guess-input');
  const btn = document.getElementById('guess-submit');
  const feedback = document.getElementById('guess-feedback');
  const attempt = input.value.trim();

  if (!attempt) { input.focus(); return; }

  btn.disabled = true;
  btn.textContent = '...';
  feedback.classList.add('hidden');

  try {
    const res = await QuizAPI.guess(attempt);

    if (res.correct) {
      // ── ACIERTO ──────────────────────────────────────────────────
      quizState.is_completed = true;
      quizState.movie_guessed = true;
      quizState.final_score = res.score;
      quizState.movie = res.movie;
      renderResult(document.getElementById('quiz-wrapper'));

    } else if (res.game_over) {
      // ── FIN DE JUEGO ──────────────────────────────────────────────
      quizState.is_completed = true;
      quizState.movie_guessed = false;
      quizState.movie = res.movie;
      renderResult(document.getElementById('quiz-wrapper'));

    } else if (res.next_clue) {
      // ── NUEVA PISTA ───────────────────────────────────────────────
      quizState.clues_revealed = res.clues_revealed;
      quizState.revealed_clues = [...(quizState.revealed_clues || []), res.next_clue];
      quizState.remaining_final_attempts = null;

      showWrongFeedback(feedback, input, attempt);
      setTimeout(() => {
        input.value = '';
        renderQuiz(document.getElementById('quiz-wrapper'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 900);

    } else if (res.all_clues_shown) {
      // ── FASE FINAL ────────────────────────────────────────────────
      quizState.remaining_final_attempts = res.remaining_final_attempts;
      showWrongFeedback(feedback, input, attempt);
      btn.disabled = false;
      btn.textContent = 'Responder';
      input.value = '';

      // Actualizar dots
      const dotsSection = document.querySelector('.attempts-indicator');
      if (dotsSection) dotsSection.outerHTML = renderFinalAttemptsDots(res.remaining_final_attempts);

      // Actualizar título
      const guessTitle = document.querySelector('.guess-section__title');
      if (guessTitle) guessTitle.textContent =
        `Últimos intentos — ${res.remaining_final_attempts} restante${res.remaining_final_attempts !== 1 ? 's' : ''}`;
    }

  } catch (err) {
    const msg = err instanceof APIError ? err.firstMessage() : 'Error de conexión.';
    showToast(msg, 'error');
    btn.disabled = false;
    btn.textContent = 'Responder';
  }
}

function showWrongFeedback(feedbackEl, input, attempt) {
  feedbackEl.className = 'guess-feedback guess-feedback--wrong';
  feedbackEl.innerHTML = `✗ "${attempt}" — Incorrecto`;
  feedbackEl.classList.remove('hidden');
  input.classList.add('incorrect');
  setTimeout(() => input.classList.remove('incorrect'), 500);
}

/* ─── PANTALLA DE RESULTADO ─────────────────────────────────────────────────── */
function renderResult(wrapper) {
  const { movie_guessed, final_score, movie, guessed_at_clue } = quizState;
  const poster = movie?.poster_url || '';
  const icon = movie_guessed ? '🎉' : '😔';
  const titleText = movie_guessed ? '¡Correcto!' : 'Sin suerte';
  const titleClass = movie_guessed ? 'success' : 'fail';
  const clueText = movie_guessed && guessed_at_clue
    ? `Acertaste en la pista ${guessed_at_clue}` : '';

  wrapper.innerHTML = `
    <div class="animate-scale" style="text-align:center">

      <div style="font-size:80px; margin-bottom:var(--sp-4)">${icon}</div>

      <div class="display" style="font-size:var(--size-5xl); color:var(--color-${movie_guessed ? 'green' : 'red'}); margin-bottom:var(--sp-2)">
        ${titleText}
      </div>

      ${movie_guessed ? `
        <div style="font-family:var(--font-display);font-size:var(--size-6xl);color:var(--color-gold);line-height:1;margin-bottom:var(--sp-2)">
          ${final_score}
        </div>
        <div style="font-size:var(--size-sm);color:var(--color-text-3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:var(--sp-6)">
          puntos ${clueText ? '· ' + clueText : ''}
        </div>
      ` : `<p style="color:var(--color-text-2);margin-bottom:var(--sp-6)">La película era:</p>`}

      ${movie ? `
        <div class="card" style="display:flex;gap:var(--sp-5);text-align:left;max-width:480px;margin:0 auto var(--sp-8)">
          ${poster ? `<img src="${poster}" alt="${movie.title}" style="width:80px;border-radius:var(--radius-md);object-fit:cover;flex-shrink:0">` : ''}
          <div>
            <div style="font-size:var(--size-xl);font-weight:700;margin-bottom:var(--sp-1)">${movie.title}</div>
            <div style="font-size:var(--size-sm);color:var(--color-text-2);line-height:2">
              ${movie.year ? `📅 ${movie.year}` : ''} ${movie.director ? `· 🎬 ${movie.director}` : ''}
              ${movie.oscar_wins ? `<br>🏆 ${movie.oscar_wins} Óscar${movie.oscar_wins > 1 ? 's' : ''}` : ''}
              ${movie.letterboxd_score ? `· ⭐ ${movie.letterboxd_score} en Letterboxd` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <div style="display:flex;gap:var(--sp-4);justify-content:center;flex-wrap:wrap">
        ${Auth.isLoggedIn() ? '' : `<a href="../register/register.html" class="btn btn-primary">Crear cuenta para el ranking</a>`}
        <button class="btn btn-outline" onclick="shareResult(${final_score}, ${movie_guessed})">
          Compartir resultado
        </button>
      </div>

      <div id="countdown" style="margin-top:var(--sp-12)">
        <div class="countdown__label">Próximo test en</div>
        <div class="countdown__timer">
          <div class="countdown__unit"><span class="countdown__num" id="cd-hours">--</span><div class="countdown__unit-label">horas</div></div>
          <div class="countdown__sep">:</div>
          <div class="countdown__unit"><span class="countdown__num" id="cd-minutes">--</span><div class="countdown__unit-label">min</div></div>
          <div class="countdown__sep">:</div>
          <div class="countdown__unit"><span class="countdown__num" id="cd-seconds">--</span><div class="countdown__unit-label">seg</div></div>
        </div>
      </div>
    </div>
  `;

  startCountdown();
}

/* ─── COMPARTIR ─────────────────────────────────────────────────────────────── */
function shareResult(score, guessed) {
  const text = guessed
    ? `¡He adivinado la película de Daily Fiction y he conseguido ${score} puntos! 🎬🏆 ¿Puedes superarlo? dailyfiction.es`
    : `No he conseguido adivinar la película de hoy en Daily Fiction 😅 ¿Tú podrías? dailyfiction.es`;

  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Resultado copiado al portapapeles', 'success'))
      .catch(() => showToast('No se pudo copiar', 'error'));
  }
}

/* ─── HELPERS ───────────────────────────────────────────────────────────────── */
function showLoading(wrapper) {
  wrapper.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      <div class="skeleton" style="height:8px;border-radius:4px"></div>
      <div class="skeleton" style="height:220px"></div>
      <div class="skeleton" style="height:60px"></div>
    </div>`;
}

function showError(wrapper, message) {
  wrapper.innerHTML = `
    <div style="text-align:center;padding:var(--sp-16) 0;color:var(--color-text-2)">
      <div style="font-size:64px;margin-bottom:var(--sp-4)">🎬</div>
      <div style="font-size:var(--size-xl);font-weight:600;margin-bottom:var(--sp-2)">${message}</div>
      <p class="text-muted">Vuelve mañana para un nuevo test.</p>
    </div>`;
}

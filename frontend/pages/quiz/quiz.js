/* ═══════════════════════════════════════════════════════════════════════════════
   quiz.js — Lógica del test diario
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ─── REPRODUCTOR DE AUDIO ───────────────────────────────────────────────────── */

class AudioPlayer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.audio = null;
    this.playing = false;
  }

  render(audioUrl, title = 'Fragmento de banda sonora') {
    if (!this.container) return;

    const bars = Array.from({ length: 48 }, () => {
      const h = 15 + Math.random() * 85;
      return `<div class="ap__bar" style="height:${h}%"></div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="ap" id="ap-inner">
        <button class="ap__btn" id="ap-play" title="Reproducir/Pausar" aria-label="Reproducir">
          <svg id="ap-icon-play" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>
          <svg id="ap-icon-pause" viewBox="0 0 24 24" fill="currentColor" width="22" height="22" style="display:none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <div class="ap__info">
          <div class="ap__label">🎵 ${title}</div>
          <div class="ap__wave" id="ap-wave">
            <div class="ap__progress" id="ap-progress"></div>
            <div class="ap__bars">${bars}</div>
          </div>
          <div class="ap__time" id="ap-time">0:00 / 0:30</div>
        </div>
      </div>
    `;

    this.audio = new Audio(audioUrl);
    this.audio.preload = 'metadata';

    document.getElementById('ap-play').addEventListener('click', () => this.toggle());
    document.getElementById('ap-wave').addEventListener('click', (e) => this.seek(e));
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('loadedmetadata', () => this.updateTime());
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  play() {
    if (!this.audio) return;
    this.audio.play().catch(() => showToast('No se pudo reproducir el audio.', 'error'));
    this.playing = true;
    document.getElementById('ap-inner')?.classList.add('is-playing');
    document.getElementById('ap-icon-play') && (document.getElementById('ap-icon-play').style.display = 'none');
    document.getElementById('ap-icon-pause') && (document.getElementById('ap-icon-pause').style.display = '');
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
    this.playing = false;
    document.getElementById('ap-inner')?.classList.remove('is-playing');
    document.getElementById('ap-icon-play') && (document.getElementById('ap-icon-play').style.display = '');
    document.getElementById('ap-icon-pause') && (document.getElementById('ap-icon-pause').style.display = 'none');
  }

  seek(e) {
    if (!this.audio?.duration) return;
    const rect = document.getElementById('ap-wave').getBoundingClientRect();
    this.audio.currentTime = ((e.clientX - rect.left) / rect.width) * this.audio.duration;
  }

  updateProgress() {
    if (!this.audio?.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    const prog = document.getElementById('ap-progress');
    if (prog) prog.style.width = `${pct}%`;
    this.updateTime();
    const bars = document.querySelectorAll('.ap__bar');
    const active = Math.floor((pct / 100) * bars.length);
    bars.forEach((b, i) => b.classList.toggle('is-active', i < active));
  }

  updateTime() {
    const el = document.getElementById('ap-time');
    if (!el || !this.audio) return;
    el.textContent = `${formatTime(this.audio.currentTime || 0)} / ${formatTime(this.audio.duration || 30)}`;
  }

  onEnded() {
    this.playing = false;
    document.getElementById('ap-inner')?.classList.remove('is-playing');
    document.getElementById('ap-icon-play') && (document.getElementById('ap-icon-play').style.display = '');
    document.getElementById('ap-icon-pause') && (document.getElementById('ap-icon-pause').style.display = 'none');
  }

  destroy() { this.audio?.pause(); this.audio = null; }
}

/* ─── AUTOCOMPLETADO ─────────────────────────────────────────────────────────── */

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
      if (!this.input.contains(e.target) && !this.list.contains(e.target)) this.hide();
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
      <div class="ac-item" data-idx="${i}" data-title="${m.title}">
        ${m.poster_url
          ? `<img class="ac-item__poster" src="${m.poster_url}" alt="${m.title}">`
          : `<div class="ac-item__poster ac-item__poster--empty"></div>`}
        <div class="ac-item__info">
          <div class="ac-item__title">${m.title}</div>
          <div class="ac-item__year">${m.year || ''}</div>
        </div>
      </div>
    `).join('');

    this.list.querySelectorAll('.ac-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.select(parseInt(el.dataset.idx));
      });
    });
    this.list.classList.remove('hidden');
  }

  select(idx) {
    const movie = this.items[idx];
    if (!movie) return;
    this.input.value = movie.title;
    this.hide();
    this.onSelect?.(movie.title);
  }

  handleKeydown(e) {
    const items = this.list.querySelectorAll('.ac-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.selectedIndex = Math.max(this.selectedIndex - 1, 0); }
    else if (e.key === 'Enter' && this.selectedIndex >= 0) { e.preventDefault(); this.select(this.selectedIndex); return; }
    else if (e.key === 'Escape') { this.hide(); return; }
    else return;
    items.forEach((el, i) => el.classList.toggle('is-selected', i === this.selectedIndex));
    if (items[this.selectedIndex]) this.input.value = items[this.selectedIndex].dataset.title;
  }

  hide() {
    this.list.classList.add('hidden');
    this.list.innerHTML = '';
    this.items = [];
  }
}

/* ─── ESTADO GLOBAL ─────────────────────────────────────────────────────────── */

let quizState = null;
let audioPlayer = null;
let autocomplete = null;

/* ─── INICIALIZAR QUIZ ───────────────────────────────────────────────────────── */

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
  if (quizState.is_completed) { renderResult(wrapper); return; }

  const { clues_revealed, revealed_clues, remaining_final_attempts } = quizState;
  const inFinalPhase = clues_revealed === 4 && remaining_final_attempts !== null;

  wrapper.innerHTML = `
    <!-- Progreso: fotogramas de cuenta atrás -->
    <div class="q-progress">
      <div class="q-progress__frames">
        ${[1,2,3,4].map(n => `
          <div class="q-progress__frame ${n < clues_revealed ? 'is-done' : n === clues_revealed ? 'is-current' : ''}">
            <div class="q-film__ring">
              <div class="q-film__tick"></div>
              <div class="q-film__dot"></div>
              <span class="q-film__num">${n}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Pistas anteriores -->
    <div class="prev-clues" id="prev-clues"></div>

    <!-- Pista actual -->
    <div id="current-clue-wrap"></div>

    <!-- Input de respuesta -->
    <div class="guess-box ${inFinalPhase ? 'guess-box--final' : ''}">
      <div class="guess-box__top">
        <div class="guess-box__label">
          ${inFinalPhase
            ? `<span class="guess-box__label-icon">⚠</span> Últimos intentos — ${remaining_final_attempts} restante${remaining_final_attempts !== 1 ? 's' : ''}`
            : '<span class="guess-box__label-icon">🎬</span> ¿Cuál es la película?'}
        </div>
        ${inFinalPhase ? renderFinalDots(remaining_final_attempts) : ''}
      </div>
      <div class="guess-box__input-row">
        <div class="guess-box__input-wrap">
          <input
            id="guess-input"
            class="guess-input"
            type="text"
            placeholder="Escribe el título..."
            autocomplete="off"
            spellcheck="false"
          />
          <div id="autocomplete-list" class="ac-list hidden"></div>
        </div>
        <button id="guess-submit" class="guess-btn">
          Responder
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
      <div id="guess-feedback" class="guess-feedback hidden"></div>
    </div>
  `;

  renderPrevClues(revealed_clues);
  renderCurrentClue(revealed_clues[revealed_clues.length - 1]);

  autocomplete = new Autocomplete('guess-input', 'autocomplete-list', (title) => {
    document.getElementById('guess-input').value = title;
  });

  document.getElementById('guess-submit').addEventListener('click', submitGuess);
  document.getElementById('guess-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitGuess();
  });

  document.getElementById('guess-input').focus();
}

function renderFinalDots(remaining) {
  const total = 4;
  const used = total - remaining;
  const dots = Array.from({ length: total }, (_, i) =>
    `<div class="final-dot ${i < used ? 'is-wrong' : ''}"></div>`
  ).join('');
  return `<div class="final-dots">${dots}<span>${remaining} intento${remaining !== 1 ? 's' : ''}</span></div>`;
}

/* ─── PISTAS ────────────────────────────────────────────────────────────────── */

function renderPrevClues(clues) {
  const container = document.getElementById('prev-clues');
  if (!container || clues.length <= 1) return;
  container.innerHTML = clues.slice(0, -1).map(clue => `
    <div class="prev-clue">
      <span class="prev-clue__icon">${getClueIcon(clue.clue_type)}</span>
      <span class="prev-clue__type">${clue.clue_type_display}</span>
      <span class="prev-clue__sep">·</span>
      <span class="prev-clue__val">${clueContentText(clue)}</span>
      <svg class="prev-clue__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
  `).join('');
}

function renderCurrentClue(clue) {
  if (!clue) return;
  const wrap = document.getElementById('current-clue-wrap');
  if (!wrap) return;
  const isNew = quizState.clues_revealed > 1;
  const numPadded = String(clue.order).padStart(2, '0');

  const showTitle = clue.clue_type !== 'IMAGE';

  wrap.innerHTML = `
    <div class="clue-card ${isNew ? 'clue-card--new' : ''}" data-type="${clue.clue_type}">
      <div class="clue-card__ghost-num">${numPadded}</div>
      ${showTitle ? `
      <div class="clue-card__title">
        <span class="clue-card__title-icon">${getClueIcon(clue.clue_type)}</span>
        <span class="clue-card__title-text">${clue.clue_type_display}</span>
      </div>
      <div class="clue-card__title-line"></div>` : ''}
      <div class="clue-card__body" id="clue-body"></div>
    </div>
  `;

  renderClueContent(clue, document.getElementById('clue-body'));
}

function renderClueContent(clue, body) {
  if (!body) return;
  const { clue_type, content_text, content_image, content_audio } = clue;

  if (clue_type === 'IMAGE') {
    const imgSrc = content_image || content_text;
    if (imgSrc) {
      body.innerHTML = `
        <div class="clue-image-wrap">
          <img class="clue-image" src="${imgSrc}" alt="Fotograma de la película" loading="lazy">
          <div class="clue-image__vignette"></div>
        </div>`;
      return;
    }
  }

  if (clue_type === 'AUDIO' && content_audio) {
    body.innerHTML = `<div id="audio-player-mount" class="clue-audio-mount"></div>`;
    if (audioPlayer) audioPlayer.destroy();
    audioPlayer = new AudioPlayer('audio-player-mount');
    audioPlayer.render(content_audio);
    return;
  }

  if (clue_type === 'ICONIC_QUOTE') {
    body.innerHTML = `
      <div class="clue-quote-wrap">
        <div class="clue-quote__mark">"</div>
        <blockquote class="clue-quote">${content_text}</blockquote>
        <div class="clue-quote__mark clue-quote__mark--close">"</div>
      </div>`;
    return;
  }

  if (['YEAR', 'OSCARS', 'ROTTEN_TOMATOES', 'DURATION'].includes(clue_type)) {
    body.innerHTML = `<div class="clue-stat">${content_text}</div>`;
    return;
  }

  body.innerHTML = `<div class="clue-text">${content_text}</div>`;
}

function clueContentText(clue) {
  if (clue.clue_type === 'IMAGE') return 'Fotograma';
  if (clue.clue_type === 'AUDIO') return 'Banda sonora';
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
  btn.innerHTML = '<span class="spinner"></span>';
  feedback.classList.add('hidden');

  try {
    const res = await QuizAPI.guess(attempt);

    if (res.correct) {
      quizState = { ...quizState, is_completed: true, movie_guessed: true, final_score: res.score, movie: res.movie };
      renderResult(document.getElementById('quiz-wrapper'));

    } else if (res.game_over) {
      quizState = { ...quizState, is_completed: true, movie_guessed: false, movie: res.movie };
      renderResult(document.getElementById('quiz-wrapper'));

    } else if (res.next_clue) {
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
      quizState.remaining_final_attempts = res.remaining_final_attempts;
      showWrongFeedback(feedback, input, attempt);
      btn.disabled = false;
      resetBtn(btn);
      input.value = '';

      const dots = document.querySelector('.final-dots');
      if (dots) dots.outerHTML = renderFinalDots(res.remaining_final_attempts);
      const label = document.querySelector('.guess-box__label');
      if (label) label.innerHTML = `<span class="guess-box__label-icon">⚠</span> Últimos intentos — ${res.remaining_final_attempts} restante${res.remaining_final_attempts !== 1 ? 's' : ''}`;
    }

  } catch (err) {
    const msg = err instanceof APIError ? err.firstMessage() : 'Error de conexión.';
    showToast(msg, 'error');
    btn.disabled = false;
    resetBtn(btn);
  }
}

function resetBtn(btn) {
  btn.className = 'guess-btn';
  btn.innerHTML = `Responder <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
}

function showWrongFeedback(feedbackEl, input, attempt) {
  feedbackEl.className = 'guess-feedback guess-feedback--wrong';
  feedbackEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> "${attempt}" — Incorrecto`;
  feedbackEl.classList.remove('hidden');
  input.classList.add('is-wrong');
  setTimeout(() => input.classList.remove('is-wrong'), 500);
}

/* ─── PANTALLA DE RESULTADO ─────────────────────────────────────────────────── */

function renderResult(wrapper) {
  const { movie_guessed, final_score, movie, guessed_at_clue } = quizState;
  const poster = movie?.poster_url || '';
  const isWin = !!movie_guessed;

  wrapper.innerHTML = `
    <div class="result-screen animate-fade">
      <div class="result-top">
        <div class="result-icon">${isWin ? '🏆' : '🎬'}</div>
        <div class="result-verdict ${isWin ? 'result-verdict--win' : 'result-verdict--loss'}">
          ${isWin ? '¡Correcto!' : 'Sin suerte'}
        </div>
        ${isWin ? `
          <div class="result-score">
            <span class="result-score__num">${final_score}</span>
            <span class="result-score__label">puntos${guessed_at_clue ? ` · pista ${guessed_at_clue}` : ''}</span>
          </div>
        ` : `
          <p class="result-subtitle">La película era:</p>
        `}
      </div>

      ${movie ? `
        <div class="result-movie">
          ${poster ? `<img class="result-movie__poster" src="${poster}" alt="${movie.title}">` : ''}
          <div class="result-movie__info">
            <div class="result-movie__title">${movie.title}</div>
            <div class="result-movie__meta">
              ${movie.year ? `<span>📅 ${movie.year}</span>` : ''}
              ${movie.director ? `<span>🎬 ${movie.director}</span>` : ''}
              ${movie.oscar_wins ? `<span>🏅 ${movie.oscar_wins} Óscar${movie.oscar_wins > 1 ? 's' : ''}</span>` : ''}
              ${movie.rt_score ? `<span>🍅 ${movie.rt_score}%</span>` : ''}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="result-actions">
        ${!Auth.isLoggedIn() ? `<a href="../register/register.html" class="btn btn-primary">Crear cuenta</a>` : ''}
        <button class="btn btn-outline" onclick="shareResult(${final_score}, ${isWin})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Compartir
        </button>
      </div>

    </div>
  `;
}

/* ─── COMPARTIR ─────────────────────────────────────────────────────────────── */

function shareResult(score, guessed) {
  const text = guessed
    ? `¡He adivinado la película de Daily Fiction y he conseguido ${score} puntos! 🎬🏆 ¿Puedes superarlo? ${CONFIG.APP_URL}`
    : `No he conseguido adivinar la película de hoy en Daily Fiction 😅 ¿Tú podrías? ${CONFIG.APP_URL}`;
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
    <div class="loading-state">
      <div class="loading-frames">
        ${[1,2,3,4].map(() => `<div class="loading-frame skeleton"></div>`).join('')}
      </div>
      <div class="skeleton" style="height:280px;border-radius:12px;margin-bottom:var(--sp-4)"></div>
      <div class="skeleton" style="height:72px;border-radius:12px"></div>
    </div>`;
}

function showError(wrapper, message) {
  wrapper.innerHTML = `
    <div class="error-state">
      <div class="error-state__icon">🎬</div>
      <div class="error-state__title">${message}</div>
      <p class="error-state__sub">Vuelve mañana para un nuevo test.</p>
    </div>`;
}

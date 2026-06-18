/* ─── REPRODUCTOR DE AUDIO PERSONALIZADO ────────────────────────────────────── */

class AudioPlayer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.audio = null;
    this.playing = false;
    this.trackUrl = null;
  }

  render(audioUrl, title = 'Fragmento de banda sonora') {
    if (!this.container) return;
    this.trackUrl = audioUrl;

    // Generar barras de onda aleatorias (decorativas)
    const bars = Array.from({ length: 40 }, (_, i) => {
      const h = 20 + Math.random() * 80;
      return `<div class="audio-player__bar" style="height:${h}%" data-idx="${i}"></div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="audio-player" id="audio-player-inner">
        <button class="audio-player__play-btn" id="audio-play-btn" title="Reproducir/Pausar">
          ▶
        </button>
        <div class="audio-player__info">
          <div class="audio-player__title">🎵 ${title}</div>
          <div class="audio-player__waveform" id="audio-waveform">
            <div class="audio-player__progress" id="audio-progress" style="width:0%"></div>
            <div class="audio-player__bars">${bars}</div>
          </div>
          <div class="audio-player__time" id="audio-time">0:00 / 0:30</div>
        </div>
      </div>
    `;

    this.audio = new Audio(audioUrl);
    this.audio.preload = 'metadata';

    document.getElementById('audio-play-btn').addEventListener('click', () => this.toggle());
    document.getElementById('audio-waveform').addEventListener('click', (e) => this.seek(e));

    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('loadedmetadata', () => this.updateTime());
  }

  toggle() {
    if (!this.audio) return;
    this.playing ? this.pause() : this.play();
  }

  play() {
    this.audio.play().catch(() => showToast('No se pudo reproducir el audio.', 'error'));
    this.playing = true;
    const inner = document.getElementById('audio-player-inner');
    const btn = document.getElementById('audio-play-btn');
    if (inner) inner.classList.add('playing');
    if (btn) { btn.textContent = '⏸'; btn.classList.add('playing'); }
  }

  pause() {
    this.audio.pause();
    this.playing = false;
    const inner = document.getElementById('audio-player-inner');
    const btn = document.getElementById('audio-play-btn');
    if (inner) inner.classList.remove('playing');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
  }

  seek(e) {
    if (!this.audio || !this.audio.duration) return;
    const waveform = document.getElementById('audio-waveform');
    const rect = waveform.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = pct * this.audio.duration;
  }

  updateProgress() {
    if (!this.audio || !this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    const prog = document.getElementById('audio-progress');
    if (prog) prog.style.width = `${pct}%`;
    this.updateTime();

    // Colorear barras activas
    const bars = document.querySelectorAll('.audio-player__bar');
    const activeCount = Math.floor((pct / 100) * bars.length);
    bars.forEach((bar, i) => bar.classList.toggle('active', i < activeCount));
  }

  updateTime() {
    const timeEl = document.getElementById('audio-time');
    if (!timeEl || !this.audio) return;
    const cur = formatTime(this.audio.currentTime || 0);
    const dur = formatTime(this.audio.duration || 30);
    timeEl.textContent = `${cur} / ${dur}`;
  }

  onEnded() {
    this.playing = false;
    const inner = document.getElementById('audio-player-inner');
    const btn = document.getElementById('audio-play-btn');
    if (inner) inner.classList.remove('playing');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
  }

  destroy() {
    if (this.audio) { this.audio.pause(); this.audio = null; }
  }
}

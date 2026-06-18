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

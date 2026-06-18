/* backdrop_picker.js
   - Cuando clue_type = IMAGE: muestra cuadrícula de fotogramas clicables.
   - Para el resto de tipos: autorellena content_text con el dato de la película.
*/
(function () {
  'use strict';

  var BACKDROPS_URL  = '/admin/movies/dailytest/backdrops/';
  var MOVIE_DATA_URL = '/admin/movies/dailytest/movie-data/';

  var backdropCache = {};
  var movieDataCache = {};

  // ── Helpers de fetch ────────────────────────────────────────────────────────

  function fetchBackdrops(movieId, callback) {
    if (backdropCache[movieId]) { callback(backdropCache[movieId]); return; }
    fetch(BACKDROPS_URL + movieId + '/')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        backdropCache[movieId] = data.backdrops || [];
        callback(backdropCache[movieId]);
      })
      .catch(function () { callback([]); });
  }

  function fetchMovieData(movieId, callback) {
    if (movieDataCache[movieId]) { callback(movieDataCache[movieId]); return; }
    fetch(MOVIE_DATA_URL + movieId + '/')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        movieDataCache[movieId] = data;
        callback(data);
      })
      .catch(function () { callback({}); });
  }

  function getMovieId() {
    var sel = document.getElementById('id_movie');
    return sel ? sel.value : null;
  }

  // ── Picker de fotogramas (IMAGE) ─────────────────────────────────────────────

  function renderPicker(inlineRow, backdrops) {
    var existing = inlineRow.querySelector('.df-backdrop-picker');
    if (existing) existing.remove();
    if (!backdrops.length) return;

    var textField = inlineRow.querySelector('textarea[name*="content_text"], input[name*="content_text"]');
    if (!textField) return;

    var picker = document.createElement('div');
    picker.className = 'df-backdrop-picker';
    picker.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;';

    backdrops.forEach(function (b, i) {
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;cursor:pointer;';

      var img = document.createElement('img');
      img.src = b.url;
      img.alt = 'Fotograma ' + (i + 1);
      img.style.cssText = [
        'height:72px', 'width:128px', 'object-fit:cover',
        'border-radius:3px', 'border:3px solid transparent',
        'transition:border-color .15s', 'display:block',
      ].join(';');

      if (b.vote_average > 0) {
        var badge = document.createElement('span');
        badge.textContent = b.vote_average.toFixed(1);
        badge.style.cssText = [
          'position:absolute', 'bottom:4px', 'right:4px',
          'background:rgba(0,0,0,.65)', 'color:#fff',
          'font-size:10px', 'padding:1px 4px', 'border-radius:3px',
        ].join(';');
        wrapper.appendChild(badge);
      }

      if (textField.value && textField.value.trim() === b.url) {
        img.style.borderColor = '#447e9b';
      }

      wrapper.addEventListener('click', function () {
        picker.querySelectorAll('img').forEach(function (im) {
          im.style.borderColor = 'transparent';
        });
        img.style.borderColor = '#447e9b';
        textField.value = b.url;
      });

      wrapper.appendChild(img);
      picker.appendChild(wrapper);
    });

    var parent = textField.closest('.form-row') || textField.parentElement;
    parent.appendChild(picker);
  }

  // ── Autorelleno para el resto de tipos ───────────────────────────────────────

  var AUTO_FILL_TYPES = ['DIRECTOR', 'ACTOR', 'YEAR', 'ROTTEN_TOMATOES', 'OSCARS',
                         'OSCAR_CATEGORIES', 'ICONIC_QUOTE', 'GENRE', 'DURATION',
                         'COUNTRY', 'SCREENWRITER'];

  function autoFillText(inlineRow, clueType) {
    var movieId = getMovieId();
    if (!movieId) return;

    var textField = inlineRow.querySelector('textarea[name*="content_text"], input[name*="content_text"]');
    if (!textField) return;

    fetchMovieData(movieId, function (data) {
      var value = data[clueType];
      if (value !== undefined && value !== '') {
        // Solo rellenar si el campo está vacío o tiene el valor anterior autorellenado
        textField.value = value;
      }
    });
  }

  // ── Lógica principal por fila ────────────────────────────────────────────────

  function updateRow(inlineRow) {
    var clueTypeSelect = inlineRow.querySelector('select[name*="clue_type"]');
    if (!clueTypeSelect) return;

    var type = clueTypeSelect.value;

    // Limpiar picker si existía
    var existingPicker = inlineRow.querySelector('.df-backdrop-picker');
    if (existingPicker) existingPicker.remove();

    if (type === 'IMAGE') {
      var movieId = getMovieId();
      if (!movieId) return;
      fetchBackdrops(movieId, function (backdrops) {
        renderPicker(inlineRow, backdrops);
      });
    } else if (AUTO_FILL_TYPES.indexOf(type) !== -1) {
      autoFillText(inlineRow, type);
    }
  }

  function initRow(inlineRow) {
    var clueTypeSelect = inlineRow.querySelector('select[name*="clue_type"]');
    if (!clueTypeSelect) return;

    clueTypeSelect.addEventListener('change', function () { updateRow(inlineRow); });
    updateRow(inlineRow);
  }

  function onMovieChange() {
    backdropCache = {};
    movieDataCache = {};
    document.querySelectorAll('.inline-related').forEach(function (row) {
      var existingPicker = row.querySelector('.df-backdrop-picker');
      if (existingPicker) existingPicker.remove();
      updateRow(row);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    var movieSelect = document.getElementById('id_movie');
    if (movieSelect) {
      movieSelect.addEventListener('change', onMovieChange);
    }

    document.querySelectorAll('.inline-related').forEach(initRow);

    var inlineGroup = document.querySelector('.inline-group');
    if (inlineGroup) {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              if (node.classList.contains('inline-related')) {
                initRow(node);
              } else {
                node.querySelectorAll && node.querySelectorAll('.inline-related').forEach(initRow);
              }
            }
          });
        });
      });
      observer.observe(inlineGroup, { childList: true, subtree: true });
    }
  });
})();

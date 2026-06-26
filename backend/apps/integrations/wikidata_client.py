"""
WikidataClient — consulta la API SPARQL de Wikidata (gratuita, sin clave).
Obtiene categorías de Oscar ganadas y nominadas para una película,
buscando tanto premios vinculados a la película como a las personas
que trabajaron en ella (actores, director, guionistas...).
"""
import logging
import requests

logger = logging.getLogger(__name__)

SPARQL_URL = 'https://query.wikidata.org/sparql'

# QIDs reales de Wikidata para categorías de Oscar (verificados)
OSCAR_LABELS_ES = {
    'Q102427':   'Mejor Película',
    'Q103360':   'Mejor Director',
    'Q105776':   'Mejor Actor',
    'Q106278':   'Mejor Actriz',
    'Q106291':   'Mejor Actor de Reparto',
    'Q106306':   'Mejor Actor de Reparto',
    'Q106301':   'Mejor Actriz de Reparto',
    'Q106343':   'Mejor Actriz de Reparto',
    'Q41417':    'Mejor Guion Original',
    'Q103916':   'Mejor Guion Original',
    'Q107258':   'Mejor Guion Adaptado',
    'Q103917':   'Mejor Guion Adaptado',
    'Q131520':   'Mejor Fotografía',
    'Q104107':   'Mejor Fotografía',
    'Q281939':   'Mejor Montaje',
    'Q104150':   'Mejor Montaje',
    'Q488651':   'Mejor Banda Sonora Original',
    'Q104228':   'Mejor Banda Sonora Original',
    'Q104288':   'Mejor Canción Original',
    'Q277751':   'Mejor Diseño de Producción',
    'Q104415':   'Mejor Diseño de Producción',
    'Q104555':   'Mejor Vestuario',
    'Q104791':   'Mejor Maquillaje y Peluquería',
    'Q104880':   'Mejor Efectos Visuales',
    'Q105555':   'Mejor Película de Animación',
    'Q104792':   'Mejor Película Internacional',
    'Q105304':   'Mejor Película Internacional',
    'Q830079':   'Mejor Sonido',
    'Q104416':   'Mejor Mezcla de Sonido',
    'Q104556':   'Mejor Edición de Sonido',
    'Q1549130':  'Mejor Documental',
    'Q1549139':  'Mejor Cortometraje de Animación',
    'Q1548943':  'Mejor Cortometraje Documental',
    'Q104793':   'Mejor Cortometraje de Imagen Real',
    # Categorías históricas blanco y negro / color
    'Q1361341':  'Mejor Fotografía',
    'Q1361342':  'Mejor Fotografía',
    'Q1361479':  'Mejor Dirección de Arte',
    'Q1361480':  'Mejor Dirección de Arte',
    'Q1361588':  'Mejor Vestuario',
    'Q1361589':  'Mejor Vestuario',
    'Q1361576':  'Mejor Banda Sonora',
    'Q1361577':  'Mejor Banda Sonora',
    'Q1361578':  'Mejor Banda Sonora',
    'Q1361620':  'Mejor Efectos Especiales',
}

# Categorías ignoradas (premios de honor, técnicos menores, casting...)
IGNORE_QIDS = {'Q137423654', 'Q106091', 'Q1361671'}

QUERY_TEMPLATE = """
SELECT DISTINCT ?award ?awardLabel ?won WHERE {{
  VALUES ?imdbId {{ "{imdb_id}" }}
  ?film wdt:P345 ?imdbId.
  {{
    {{ ?film wdt:P166 ?award. BIND(true AS ?won) }}
    UNION
    {{ ?film wdt:P1411 ?award. BIND(false AS ?won) }}
    UNION
    {{
      ?statement pq:P805 ?film.
      ?nominee p:P166 ?statement.
      ?statement ps:P166 ?award.
      BIND(true AS ?won)
    }}
    UNION
    {{
      ?statement pq:P805 ?film.
      ?nominee p:P1411 ?statement.
      ?statement ps:P1411 ?award.
      BIND(false AS ?won)
    }}
  }}
  ?award wdt:P31/wdt:P279* wd:Q19020.
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }}
}}
"""


def _translate_label(raw):
    """Traduce labels en inglés no mapeados."""
    if not raw or raw.startswith('Q'):
        return None
    if 'Best Picture' in raw:                                          return 'Mejor Película'
    if 'Best Director' in raw:                                         return 'Mejor Director'
    if 'Supporting Actor' in raw:                                      return 'Mejor Actor de Reparto'
    if 'Supporting Actress' in raw:                                    return 'Mejor Actriz de Reparto'
    if 'Best Actor' in raw:                                            return 'Mejor Actor'
    if 'Best Actress' in raw:                                          return 'Mejor Actriz'
    if 'Original Screenplay' in raw or 'Story and Screenplay' in raw: return 'Mejor Guion Original'
    if 'Adapted Screenplay' in raw or 'Screenplay' in raw:            return 'Mejor Guion Adaptado'
    if 'Cinematography' in raw or 'Photog' in raw:                    return 'Mejor Fotografía'
    if 'Film Editing' in raw or 'Editing' in raw:                     return 'Mejor Montaje'
    if 'Original Song' in raw:                                         return 'Mejor Canción Original'
    if 'Original Score' in raw or 'Scoring' in raw:                   return 'Mejor Banda Sonora'
    if 'Production Design' in raw or 'Art Direction' in raw:          return 'Mejor Diseño de Producción'
    if 'Costume' in raw:                                               return 'Mejor Vestuario'
    if 'Makeup' in raw or 'Hairstyling' in raw:                       return 'Mejor Maquillaje'
    if 'Visual Effects' in raw or 'Special Effects' in raw:           return 'Mejor Efectos Visuales'
    if 'Animated Feature' in raw:                                      return 'Mejor Película de Animación'
    if 'International' in raw or 'Foreign' in raw:                    return 'Mejor Película Internacional'
    if 'Documentary' in raw:                                           return 'Mejor Documental'
    if 'Sound' in raw:                                                 return 'Mejor Sonido'
    if 'Academy Award' in raw:
        return raw.replace('Academy Award for Best ', 'Mejor ').replace('Academy Award for ', '')
    return None


class WikidataClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'DailyFictionBot/1.0 (TFG project; educational use)',
            'Accept': 'application/sparql-results+json',
        })

    def get_oscar_categories(self, imdb_id):
        """
        Devuelve dict con categorías de Oscar ganadas y nominadas.
        Busca premios vinculados a la película Y a las personas que trabajaron en ella.
        {
          'won':       ['Mejor Película', 'Mejor Director', ...],
          'nominated': ['Mejor Actor', 'Mejor Fotografía', ...],
        }
        """
        if not imdb_id or not imdb_id.startswith('tt'):
            return {'won': [], 'nominated': []}

        query = QUERY_TEMPLATE.format(imdb_id=imdb_id)
        for attempt in range(2):
            try:
                r = self.session.get(
                    SPARQL_URL,
                    params={'query': query, 'format': 'json'},
                    timeout=8,
                )
                r.raise_for_status()
                results = r.json().get('results', {}).get('bindings', [])
                break
            except requests.RequestException as e:
                logger.warning(f'Wikidata error para {imdb_id} (intento {attempt+1}): {e}')
                if attempt < 1:
                    import time
                    time.sleep(1)
                else:
                    return {'won': [], 'nominated': []}

        won = []
        nominated = []

        for row in results:
            award_uri = row.get('award', {}).get('value', '')
            qid = award_uri.split('/')[-1]

            if qid in IGNORE_QIDS:
                continue

            if qid in OSCAR_LABELS_ES:
                label = OSCAR_LABELS_ES[qid]
            else:
                label = _translate_label(row.get('awardLabel', {}).get('value', ''))
                if not label:
                    continue

            is_won = row.get('won', {}).get('value', 'false') == 'true'

            if is_won:
                if label not in won:
                    won.append(label)
                # Si ganó, quitar de nominadas (es redundante mostrarlo en ambos)
                if label in nominated:
                    nominated.remove(label)
            else:
                if label not in nominated and label not in won:
                    nominated.append(label)

        return {'won': won, 'nominated': nominated}

"""Conservative citation checks: a valid link is not proof of a generated claim."""
import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

from .contracts import Source, safe_url

CITATION = re.compile(r'\[([A-Za-z0-9_-]{1,100})\]')
NUMBER = re.compile(r'(?<![\w])\d[\d,]*(?:\.\d+)?%?')


def supports(source):
    return bool(source.get('excerpt', '').strip()) and source.get('kind') != 'alpha_reference'


def normalize_results(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get('results'), list):
        raise ValueError('invalid search response')
    sources = []
    for item in payload['results'][:10]:
        if not isinstance(item, dict):
            continue
        try:
            url = safe_url(item.get('url', ''))
            excerpt = item.get('snippet', '')
            if not isinstance(excerpt, str) or not excerpt.strip():
                continue
            source = Source(id='src_' + hashlib.sha256(url.encode()).hexdigest()[:24],
                            title=str(item.get('title', 'Untitled'))[:500], url=url,
                            excerpt=excerpt[:12000], kind='search_snippet',
                            retrievedAt=datetime.now(timezone.utc).isoformat(),
                            publishedAt=item.get('date') if isinstance(item.get('date'), str) else None)
            sources.append(source.model_dump(exclude_none=True))
        except (ValueError, TypeError):
            continue
    return sources


def merge_sources(existing, incoming):
    by_url = {s['url']: s for s in existing}
    ids = {s['id'] for s in existing}
    for source in incoming:
        prior = by_url.get(source['url'])
        if prior:
            if (not supports(prior) and supports(source)) or (source.get('kind') == 'page_extract' and prior.get('kind') != 'page_extract'):
                # Retain Alpha's verified timing but upgrade support only with retrieved text.
                by_url[source['url']] = {**prior, **source, 'id': prior['id']}
            continue
        if source['id'] in ids:
            raise ValueError('source ID collision')
        if len(by_url) < 80:
            by_url[source['url']] = source
            ids.add(source['id'])
    return list(by_url.values())


def numeric_warnings(text, cited):
    warnings = []
    for number in set(NUMBER.findall(CITATION.sub('', text))):
        matches = [s for s in cited if number in NUMBER.findall(s['excerpt'])]
        # Publisher/domain and copied text are conservative independence proxies, not proof.
        publishers = {(s.get('publisher') or urlsplit(s['url']).hostname).lower() for s in matches}
        extracts = {re.sub(r'\W+', '', s['excerpt'].lower()) for s in matches}
        if len(publishers) < 2 or len(extracts) < 2:
            warnings.append('Numeric claim unverified: fewer than two independent supporting extracts.')
        else:
            warnings.append('Numeric cross-check candidate only: verify units, period, geography, definition and publisher independence; matching numbers are not proof.')
    return list(dict.fromkeys(warnings))


def validate_report(text, sources):
    if not isinstance(text, str) or not text.strip() or len(text) > 24000:
        raise ValueError('invalid report')
    usable = {s['id']: s for s in sources if supports(s)}
    warnings = []
    # Links/HTML from a model are not part of the evidence contract.
    text = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1 [unverified]', text)
    text = re.sub(r'<[^>]*>', '', text)
    text = re.sub(r'https?://\S+', '[unverified link]', text)
    def citation(match):
        if match[1] in usable:
            return match[0]
        warnings.append('Unsupported citation removed.')
        return '[unverified]'
    text = CITATION.sub(citation, text)
    paragraphs = []
    for paragraph in re.split(r'\n\s*\n', text.strip()):
        cited = [usable[s] for s in CITATION.findall(paragraph) if s in usable]
        warnings.extend(numeric_warnings(paragraph, cited))
        # shortcut: semantic entailment needs editorial review; valid IDs never certify prose.
        paragraphs.append(paragraph)
    warnings.append('Generated claims require editorial verification against retained extracts.')
    return '\n\n'.join(paragraphs), list(dict.fromkeys(warnings))


def byte_slice(text, budget):
    return text.encode('utf-8')[:budget].decode('utf-8', errors='ignore')


def select_context(sources, query, char_budget=28000):
    """Retain full extracts in SQLite, send bounded verbatim slices with unchanged IDs."""
    terms = set(re.findall(r'\w{3,}', query.lower()))
    ranked = sorted((s for s in sources if supports(s)), key=lambda s: len(
        terms & set(re.findall(r'\w{3,}', (s['title'] + ' ' + s['excerpt']).lower()))), reverse=True)
    selected = []
    for source in ranked:
        if char_budget < 300:
            break
        candidate = {k: v for k, v in source.items()
                     if k in ('id', 'title', 'url', 'kind', 'publishedAt')}
        available = char_budget - len(json.dumps(candidate, ensure_ascii=False).encode()) - 30
        if available < 300:
            continue
        candidate['excerpt'] = byte_slice(source['excerpt'], min(3500, available))
        size = len(json.dumps(candidate, ensure_ascii=False).encode())
        if size > char_budget:
            continue
        selected.append(candidate)
        char_budget -= size
    return selected


def compact_sections(sections):
    return [{'key': s['key'], 'content': byte_slice(s['content'], 1500)} for s in sections]


def number_comparison(text, sources, assessments):
    """Check proposed numeric metadata against literal quotes, then compare per claim."""
    usable = {s['id']: s for s in sources if supports(s)}
    blocks, warnings = [], []
    seen = set()
    for assessment in assessments[:12]:
        if not isinstance(assessment, dict):
            continue
        claim = assessment.get('claim', '')
        if not isinstance(claim, str) or not claim or claim not in text or not NUMBER.search(claim):
            continue
        seen.update(NUMBER.findall(CITATION.sub('', claim)))
        rows = []
        for evidence in assessment.get('evidence', [])[:6]:
            if not isinstance(evidence, dict):
                continue
            source = usable.get(evidence.get('sourceId'))
            quote = evidence.get('quote')
            if not source or not isinstance(quote, str) or not quote or quote not in source['excerpt']:
                continue
            values = {}
            for field in ('value', 'unit', 'period', 'geography', 'definition'):
                value = evidence.get(field)
                values[field] = value if isinstance(value, str) and value and value.lower() in quote.lower() else 'not established'
            rows.append((source, quote[:800], values))
        fields = ('value', 'unit', 'period', 'geography', 'definition')
        complete = [r for r in rows if all(v != 'not established' for v in r[2].values())]
        disagreement = any(len({r[2][f].casefold() for r in complete}) > 1 for f in fields)
        publishers = {urlsplit(r[0]['url']).hostname for r in complete}
        unique_quotes = {re.sub(r'\W+', '', r[1].lower()) for r in complete}
        if disagreement:
            verdict = 'Unverified: sources disagree on value, units, period, geography or definition.'
        elif len(publishers) >= 2 and len(unique_quotes) >= 2:
            verdict = 'Unverified: extracts agree; original publisher independence and claim meaning need editorial confirmation.'
        else:
            verdict = 'Unverified: insufficient independent extracts with matching measurement context.'
        warnings.append(verdict)
        def cell(value):
            return re.sub(r'[<>\[\]|\n\r]', ' ', value)[:800]
        block = ['**Numeric claim:** ' + cell(claim), verdict,
                 '| Source | Value | Unit | Period | Geography | Definition | Retained quote |',
                 '| --- | --- | --- | --- | --- | --- | --- |']
        for source, quote, values in rows:
            block.append('| [' + source['id'] + '] | ' + ' | '.join(cell(values[f]) for f in fields)
                         + ' | ' + cell(quote) + ' |')
        if not rows:
            block.append('| None | not established | not established | not established | not established | not established | No supporting quote |')
        blocks.append('\n'.join(block))
    for paragraph in re.split(r'\n\s*\n', text):
        missing = set(NUMBER.findall(CITATION.sub('', paragraph))) - seen
        if missing:
            label = 'Unverified numeric claim: ' + paragraph[:500]
            blocks.append(label + '\nValue(s): ' + ', '.join(sorted(missing))
                          + '; unit, period, geography, definition and independent supporting quotes not established.')
            warnings.append('Some numeric claims lack a complete evidence comparison.')
            seen.update(missing)
    return '\n\n'.join(blocks), list(dict.fromkeys(warnings))

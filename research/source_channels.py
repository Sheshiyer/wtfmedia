"""Code-owned read-only source channels; platform and retrieval method are separate."""
import hashlib
import re
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlsplit

from .contracts import Source, safe_url, utf16_slice
from .scope import filter_sources, scoped_query

CHANNELS = ('web', 'linkedin', 'youtube', 'instagram', 'reddit', 'x')
SOURCE_PAGE_SIZE = 20
DOMAINS = {'linkedin': ('linkedin.com',), 'youtube': ('youtube.com', 'youtu.be', 'youtube-nocookie.com'),
           'instagram': ('instagram.com',), 'reddit': ('reddit.com', 'redd.it'),
           'x': ('x.com', 'twitter.com')}
TOOLS = {
    'linkedin': ('anyapi.linkedin.search.posts', 'POST', 2000),
    'youtube': ('youtube.youtube.search.videos', 'GET', 0),
    'instagram': ('anyapi.instagram.hashtag.posts', 'POST', 2000),
    'reddit': ('scrapecreators.reddit.search.posts', 'GET', 1880),
    'x': ('anyapi.x.search.posts', 'POST', 750),
}


def platform_for_url(url):
    host = (urlsplit(url).hostname or '').lower().rstrip('.')
    return next((channel for channel, domains in DOMAINS.items()
                 if any(host == d or host.endswith('.' + d) for d in domains)), 'web')


def public_subject(body):
    fields = body.get('researchInput')
    if fields:
        return '; '.join(label + ': ' + fields[name] for name, label in
                         [('guestName', 'Guest'), ('companyName', 'company'), ('industry', 'industry')] if fields.get(name))
    return body['title']


def channel_query(channel, body):
    subject = public_subject(body)
    if channel == 'web':
        return scoped_query(subject + ' public background official reports global context and relevance to India', body.get('searchScope', {}))
    domains = ' OR '.join('site:' + domain for domain in DOMAINS[channel])
    return scoped_query(f'{subject} ({domains})', body.get('searchScope', {}))


def dedicated_input(channel, body):
    fields = body.get('researchInput')
    # Social query engines AND bare words: keep focused queries rather than feeding instructions.
    company = (fields.get('companyName') or fields.get('industry') or fields.get('guestName')) if fields else body['title'][:120]
    guest = fields.get('guestName', '') if fields and fields.get('guestName') != company else ''
    scope = body.get('searchScope', {})
    focus = scope.get('focus', '')
    start, end = scope.get('dateFrom'), scope.get('dateTo')
    # Broad native windows are followed by exact publication-date filtering.
    recent_days = (datetime.now(timezone.utc).date() - date.fromisoformat(start)).days if start else None
    recent = next((name for days, name in [(1, 'day'), (7, 'week'), (31, 'month'), (366, 'year')]
                   if recent_days is not None and 0 <= recent_days <= days), None)
    if channel == 'instagram':
        return {'hashtag': re.sub(r'\W', '', company, flags=re.UNICODE)[:80], 'mediaType': 'all'}
    if channel == 'youtube':
        return {'q': f'{guest} {company} {focus or "interview"}'.strip(), 'part': 'snippet', 'type': 'video', 'maxResults': SOURCE_PAGE_SIZE,
                **({'publishedAfter': start + 'T00:00:00Z'} if start else {})}
    if channel == 'reddit':
        return {'query': f'{company} {focus}'.strip(), 'sort': 'relevance', 'filter': 'posts', 'timeframe': recent or 'all', 'trim': 'true'}
    if channel == 'x':
        query = '"' + company.replace('"', '') + '"' + (' ' + focus if focus else '')
        if start: query += ' since:' + start
        if end: query += ' until:' + (date.fromisoformat(end) + timedelta(days=1)).isoformat()
        return {'query': query, 'limit': SOURCE_PAGE_SIZE, 'queryType': 'Top'}
    return {'query': f'{guest} {company} {focus}'.strip(), **({'datePosted': 'last-' + recent} if recent else {})}


def normalize_social(channel, payload):
    """Accept observed list envelopes only; an unknown schema is an error, not an empty search."""
    if not isinstance(payload, (dict, list)):
        raise ValueError('invalid social response')
    if isinstance(payload, dict) and (payload.get('success') is False or payload.get('error')):
        raise ValueError('social search failed')
    def rows(value, depth=0):
        if isinstance(value, list):
            return value
        if not isinstance(value, dict) or depth > 3:
            return None
        for key in ('posts', 'items', 'results', 'tweets', 'children', 'data', 'output', 'videos'):
            if key in value:
                found = rows(value[key], depth + 1)
                if found is not None:
                    return found
        return None
    items = rows(payload)
    if items is None:
        raise ValueError('unknown social response schema')
    sources = []
    for item in items:
        if not isinstance(item, dict):
            continue
        row = item.get('data', item)
        if not isinstance(row, dict):
            continue
        if row.get('isPrivate') is True or row.get('is_private') is True or row.get('visibility') in ('private', 'restricted'):
            continue
        snippet = row.get('snippet', {})
        snippet = snippet if isinstance(snippet, dict) else {}
        url = next((row.get(k) for k in ('postUrl', 'post_url', 'permalink', 'url', 'link', 'tweet_url')
                    if isinstance(row.get(k), str)), '')
        if channel == 'youtube':
            ident = row.get('id', {})
            ident = ident.get('videoId') if isinstance(ident, dict) else row.get('videoId', ident)
            if isinstance(ident, str) and re.fullmatch(r'[A-Za-z0-9_-]{11}', ident):
                url = 'https://www.youtube.com/watch?v=' + ident
        if channel == 'reddit' and url.startswith('/r/'):
            url = 'https://www.reddit.com' + url
        if channel == 'reddit' and platform_for_url(url) != channel:
            ident = str(row.get('id', '')).removeprefix('t3_')
            if re.fullmatch(r'[a-z0-9]{4,12}', ident) and isinstance(row.get('subreddit'), str):
                url = 'https://www.reddit.com/comments/' + ident
        text = next((row.get(k) for k in ('text', 'selftext', 'content', 'description', 'caption', 'full_text')
                     if isinstance(row.get(k), str) and row[k].strip()), '')
        if channel == 'youtube':
            text = snippet.get('description', text)
        actual_title = snippet.get('title') or row.get('title')
        content = [x for x in (actual_title, text) if isinstance(x, str) and x.strip()
                   and x.strip().lower() not in ('[deleted]', '[removed]')]
        if not content:
            continue
        title = actual_title or row.get('authorName') or f'{channel.title()} public post'
        # Display labels and account names are not evidence of a post's content.
        excerpt = '\n'.join(content)
        date = snippet.get('publishedAt') or row.get('publishedAt') or row.get('published_at') or row.get('created_at') or row.get('timestamp') or row.get('taken_at')
        if not isinstance(date, str):
            stamp = date if type(date) in (int, float) else row.get('createdUtc', row.get('created_utc'))
            if type(stamp) in (int, float) and 0 <= stamp <= 253402300799:
                date = datetime.fromtimestamp(stamp, tz=timezone.utc).isoformat()
        try:
            url = safe_url(url)
            if platform_for_url(url) != channel or not excerpt.strip():
                continue
            kind = 'video_metadata' if channel == 'youtube' else 'post'
            sources.append(Source(
                id='src_' + hashlib.sha256(url.encode()).hexdigest()[:24],
                title=utf16_slice(str(title), 500), url=url, excerpt=utf16_slice(excerpt, 12000), kind=kind,
                platform=channel, retrievedVia=TOOLS[channel][0], evidenceType=kind,
                retrievedAt=datetime.now(timezone.utc).isoformat(),
                publishedAt=utf16_slice(date, 80) if isinstance(date, str) else None,
            ).model_dump(exclude_none=True))
        except (ValueError, TypeError):
            continue
    if items and not sources:
        raise ValueError('social response has no usable records')
    return sources


def initial_coverage():
    return [dict(channel=channel, status='pending', sourceCount=0,
                 method='web_search' if channel == 'web' else 'dedicated_tool') for channel in CHANNELS]


def collect_channel(channel, body, calls):
    from .providers import ProviderError
    from .store import BudgetExceeded
    from .diagnostics import emit, failure
    method = 'dedicated_tool'
    try:
        if channel == 'web' or not hasattr(calls, 'social_search'):
            method = 'web_search'
            found = calls.search(channel_query(channel, body))
        else:
            try:
                found = calls.social_search(channel, body)
            except (ProviderError, ValueError) as error:
                emit(dict(stage='discovery', channel=channel, status='failed', code=failure(error, 'discovery')['code']))
                method = 'web_search'
                found = calls.search(channel_query(channel, body))
        scope = body.get('searchScope', {})
        found = filter_sources(found, scope)
        if channel != 'web':
            found = [s for s in found if platform_for_url(s['url']) == channel]
        if channel != 'web' and method == 'dedicated_tool' and (not found or (channel == 'instagram' and scope.get('focus'))):
            try:
                supplemental = filter_sources(calls.search(channel_query(channel, body)), scope)
                supplemental = [s for s in supplemental if platform_for_url(s['url']) == channel]
                if supplemental:
                    method = 'web_search'
                found = list({s['url']: s for s in found + supplemental}.values())
            except (ProviderError, ValueError, BudgetExceeded) as error:
                if isinstance(error, BudgetExceeded):
                    calls.discovery_error = error
                if not found:
                    raise
                emit(dict(status='failed', channel=channel, **failure(error, 'discovery')))
        if channel != 'web':
            found = [s for s in found if platform_for_url(s['url']) == channel]
        return found, dict(channel=channel, status='found' if found else 'no_results',
                           sourceCount=len(found), method=method)
    except BudgetExceeded as error:
        calls.discovery_error = error
        emit(dict(stage='discovery', channel=channel, status='failed', code='budget_exhausted'))
        return [], dict(channel=channel, status='budget_limited', sourceCount=0, method=method)
    except (ProviderError, ValueError) as error:
        emit(dict(stage='discovery', channel=channel, status='failed', code=failure(error, 'discovery')['code']))
        status = 'unavailable' if getattr(error, 'code', None) == 'authentication' else 'failed'
        return [], dict(channel=channel, status=status, sourceCount=0, method=method)

"""Bounded, attributed source images. No arbitrary model URL or remote browser asset."""
import base64
import http.client
import hashlib
from html.parser import HTMLParser
from datetime import datetime, timezone
import io
import ipaddress
import re
import socket
import time
import ssl
from urllib.parse import urlsplit, urljoin

from .contracts import safe_url
from .visuals import normalized

LICENSES = ('CC BY-SA', 'CC BY', 'CC0', 'Public domain')


def caption_license(caption):
    if re.search(r'\b(?:not|unlicensed|without permission|all rights reserved)\b', caption, re.I):
        return None
    return next((name for name in LICENSES if re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', caption, re.I)), None)


def image_url(value):
    try:
        u = urlsplit(safe_url(value))
        return u.scheme == 'https' and not u.port and not u.fragment
    except (ValueError, TypeError): return False


class PinnedHTTPS(http.client.HTTPSConnection):
    def connect(self):
        addresses = socket.getaddrinfo(self.host, 443, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(row[4][0]).is_global for row in addresses):
            raise ValueError('image host is not public')
        # Pin the resolved public address, while still verifying the original TLS hostname.
        sock = socket.create_connection((addresses[0][4][0], 443), timeout=10)
        try: self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except Exception:
            sock.close(); raise


def fetch_public(url, allowed, maximum):
    deadline = time.monotonic() + 25
    for _ in range(3):
        if time.monotonic() >= deadline: raise ValueError('image deadline')
        if not image_url(url): raise ValueError('unsafe image URL')
        u = urlsplit(url)
        connection = PinnedHTTPS(u.hostname, timeout=10, context=ssl.create_default_context())
        try:
            connection.request('GET', (u.path or '/') + ('?' + u.query if u.query else ''), headers={
                'User-Agent': 'WTFResearch/1.0', 'Accept': ','.join(allowed), 'Accept-Encoding': 'identity'})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                url = urljoin(url, response.getheader('Location', '')); continue
            if response.status != 200 or response.getheader('Content-Type', '').split(';')[0] not in allowed:
                raise ValueError('unsupported source image')
            chunks, length = [], 0
            while length <= maximum:
                remaining = deadline - time.monotonic()
                if remaining <= 0: raise ValueError('image deadline')
                if connection.sock: connection.sock.settimeout(min(10, remaining))
                chunk = response.read1(min(32768, maximum + 1 - length))
                if not chunk: break
                chunks.append(chunk); length += len(chunk)
            data = b''.join(chunks)
            if len(data) > maximum: raise ValueError('image too large')
            return data
        finally: connection.close()
    raise ValueError('image redirect limit')


def fetch_image(url):
    return fetch_public(url, ('image/png', 'image/jpeg', 'image/webp'), 2_000_000)


class LicensedFigures(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.figure = None
        self.caption = False
        self.records = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'figure': self.figure = {'images': [], 'caption': ''}
        if self.figure is None: return
        if tag == 'figcaption': self.caption = True
        if tag == 'img' and attrs.get('src') and attrs.get('alt'):
            self.figure['images'].append((attrs['src'], attrs['alt']))
    def handle_data(self, data):
        if self.figure is not None and self.caption: self.figure['caption'] += data + ' '
    def handle_endtag(self, tag):
        if tag == 'figcaption': self.caption = False
        if tag == 'figure' and self.figure is not None:
            self.records.append(self.figure)
            self.figure = None
            self.caption = False


def retain_licensed_captions(sources, goal):
    """Read only already-retained public pages; image-specific captions are separate evidence."""
    terms = set(re.findall(r'\w{4,}', goal.lower()))
    pages = sorted([s for s in sources if s.get('evidenceType') == 'page_extract' and image_url(s['url'])],
                   key=lambda s: len(terms & set(re.findall(r'\w{4,}', (s['title'] + s['excerpt']).lower()))), reverse=True)
    for source in pages[:2]:
        try:
            html = fetch_public(source['url'], ('text/html', 'application/xhtml+xml'), 500_000)
            parser = LicensedFigures(); parser.feed(html.decode('utf-8', errors='replace'))
            for record in parser.records[:20]:
                caption = ' '.join(record['caption'].split())
                if not 20 <= len(caption) <= 400 or not caption_license(caption): continue
                for url, alt in record['images'][:1]:
                    url = urljoin(source['url'], url)
                    alt = ' '.join(alt.split())
                    if not image_url(url) or not 1 <= len(alt) <= 180: continue
                    ident = 'src_img_' + hashlib.sha256((source['url'] + url).encode()).hexdigest()[:20]
                    if any(s['id'] == ident for s in sources): continue
                    if len(sources) >= 128: return
                    # Only this figure's own caption carries its license; no site-wide rights inference.
                    sources.append(dict(id=ident, title=alt, url=source['url'],
                        excerpt=f'![{alt}]({url}) Image credit: {caption}',
                        retrievedAt=datetime.now(timezone.utc).isoformat(), evidenceType='page_extract',
                        kind='page_extract', platform=source.get('platform', 'web')))
        except (ValueError, OSError, http.client.HTTPException): continue


def normalized_png(data):
    from PIL import Image, ImageOps
    with Image.open(io.BytesIO(data)) as original:
        if original.width * original.height > 12_000_000 or original.format not in ('PNG', 'JPEG', 'WEBP'):
            raise ValueError('unsupported image dimensions')
        original.seek(0)
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((1000, 750))
        # Re-encode pixels, stripping EXIF, scripts, animation and remote references.
        for size in (1000, 800, 640):
            image.thumbnail((size, size))
            out = io.BytesIO()
            image.quantize(colors=96).save(out, format='PNG', optimize=True)
            if len(out.getvalue()) <= 65000:
                return out.getvalue(), image.width, image.height
    raise ValueError('image exceeds report allowance')


def validate_asset(a, sources):
    if not isinstance(a, dict) or set(a) != {'dataUrl','width','height','originalUrl','sourceUrl','attribution','license','licenseQuote','sourceId'}: return False
    s = next((s for s in sources if s['id'] == a['sourceId']), None)
    if not s or s['url'] != a['sourceUrl'] or a.get('license') not in LICENSES or not image_url(a['originalUrl']) or not image_url(a['sourceUrl']): return False
    if not isinstance(a['licenseQuote'], str) or not 1 <= len(a['licenseQuote']) <= 500 or caption_license(a['licenseQuote']) != a['license'] or normalized(a['licenseQuote']) not in normalized(s['excerpt']) or a['originalUrl'] not in s['excerpt']: return False
    if not isinstance(a['attribution'], str) or not 1 <= len(a['attribution']) <= 250 or any(type(a[k]) is not int or not 1 <= a[k] <= 1200 for k in ('width', 'height')): return False
    try:
        prefix = 'data:image/png;base64,'
        if not isinstance(a['dataUrl'], str) or not a['dataUrl'].startswith(prefix) or len(a['dataUrl']) > 90000: return False
        data = base64.b64decode(a['dataUrl'][len(prefix):], validate=True)
        from PIL import Image
        with Image.open(io.BytesIO(data)) as im:
            if im.format != 'PNG' or im.size != (a['width'], a['height']): return False
            im.verify()
        return True
    except (ValueError, OSError): return False


def collect_image_figure(sources, goal):
    """Only image-specific licensed captions in retained extracts authorize copying.

    A site footer license or a model assertion is not evidence of image reuse rights.
    Missing permissions yields an explicit image_unavailable figure, not hotlinking.
    """
    from .figures import validate_figure, eligible
    retain_licensed_captions(sources, goal)
    candidates = []
    terms = set(re.findall(r'\w{4,}', goal.lower()))
    for s in sources:
        if not eligible(s): continue
        for match in re.finditer(r'!\[([^\]\n]{1,180})\]\((https://[^\s)]+)\)([^\n]{0,450})', s['excerpt']):
            alt, url, caption = match.groups()
            license_name = caption_license(caption)
            if not license_name or not image_url(url) or not re.search(r'image|photo|figure|credit|©|attribution', caption, re.I): continue
            score = len(terms & set(re.findall(r'\w{4,}', (alt + caption + s['title']).lower())))
            if score: candidates.append((score, s, alt, url, caption, license_name))
    for _, s, alt, url, caption, license_name in sorted(candidates, key=lambda x: x[0], reverse=True)[:2]:
        try:
            png, width, height = normalized_png(fetch_image(url))
            asset = dict(dataUrl='data:image/png;base64,' + base64.b64encode(png).decode(), width=width, height=height,
                originalUrl=url, sourceUrl=s['url'], sourceId=s['id'], license=license_name,
                licenseQuote=caption.strip()[:500], attribution=caption.strip()[:250])
            figure = dict(version=2, kind='image', title='Source image', takeaway=alt,
                caveat='Reproduced from the cited source; the caption is attributed to that source.',
                evidence=[dict(sourceId=s['id'], quote=caption.strip())],
                items=[], edges=[], columns=[], metric=dict(unit='', period='', geography='', definition=''), asset=asset)
            valid = validate_figure(figure, sources)
            if valid: return valid
        except (ValueError, OSError, http.client.HTTPException): continue
    return None


def match_quote(excerpt, url):
    line = next((line for line in excerpt.splitlines() if url in line), '')
    return ' '.join(line.split())[:900]

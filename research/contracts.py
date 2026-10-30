"""Bounded service DTOs. Sources are evidence data, never instructions."""
from .subjects import names, display
import ipaddress
import re
from typing import Literal
from urllib.parse import parse_qsl, urlsplit, urlunsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Tier = Literal['snacks', 'appetizers', 'main', 'desserts']
TIERS = {
    'snacks': ('Guest profile', 'Who the guest is: expanded background, career, major decisions, public views and documented leadership traits. Do not invent personality judgments.'),
    'appetizers': ('Company and industry', 'Company strategy, products, competitors, industry economics, market size and GDP contribution where supported, related industries, regulation and barriers. Distinguish global and Indian figures.'),
    'main': ('Industry positioning and opportunities', 'Competitive positioning, market gaps, skills, employment and supply chains. Explain realistic opportunities for a 20–24-year-old in India, requirements, risks and constraints without assuming the company will create local jobs.'),
    'desserts': ('Takeaways and interview preparation', 'Biggest takeaway, outlook, and a thematic sequence of 12–18 proposed interview questions when evidence supports that depth, with follow-ups grounded in the full report. Cover guest decisions, company and industry, and relevant gaps, jobs and entrepreneurship for Indian listeners.'),
}


def utf16_slice(value: str, limit: int) -> str:
    # Match JavaScript contract limits without splitting an emoji/surrogate pair.
    return value.encode('utf-16-le')[:limit * 2].decode('utf-16-le', errors='ignore')


def safe_url(value: str) -> str:
    if len(value.encode('utf-16-le')) > 4096 or re.search(r'[\s\\\x00-\x1f]', value):
        raise ValueError('unsafe source URL')
    u = urlsplit(value)
    host = (u.hostname or '').lower().rstrip('.')
    if u.scheme not in ('http', 'https') or u.username or u.password or u.port not in (None, 80, 443):
        raise ValueError('unsafe source URL')
    if not host or '.' not in host or host.endswith(('.local', '.localhost', '.internal', '.test', '.invalid')):
        raise ValueError('unsafe source host')
    if any(re.search(r'token|secret|password|signature|credential|api.?key|authorization', key, re.I)
           for key, _ in parse_qsl(u.query)):
        raise ValueError('credential-bearing source URL')
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if not re.fullmatch(r'[a-z0-9.-]+', host) or host.replace('.', '').isdigit():
            raise ValueError('unsafe source host')
    else:
        if not address.is_global:
            raise ValueError('private source address')
    # No source URL is fetched locally. Timing is separate verified metadata, not a fragment.
    return urlunsplit((u.scheme, u.netloc.lower(), u.path or '/', u.query, ''))


class DTO(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    @field_validator('*')
    @classmethod
    def wire_string_limit(cls, value, info):
        if isinstance(value, str):
            for bound in cls.model_fields[info.field_name].metadata:
                maximum = getattr(bound, 'max_length', None)
                if maximum is not None and len(value.encode('utf-16-le')) > maximum * 2:
                    raise ValueError('text exceeds wire contract limit')
        return value

Channel = Literal['web', 'linkedin', 'youtube', 'instagram', 'reddit', 'x']
ToolId = Literal['perplexity.web.search', 'exa.web.contents.get', 'anyapi.linkedin.search.posts',
                 'youtube.youtube.search.videos', 'anyapi.instagram.hashtag.posts',
                 'scrapecreators.reddit.search.posts', 'anyapi.x.search.posts']


class ResearchInput(DTO):
    guestName: str = Field(default='', max_length=604)
    companyName: str = Field(default='', max_length=604)
    industry: str = Field(default='', max_length=604)
    audienceCountry: Literal['IN'] = 'IN'

    @field_validator('guestName', 'companyName', 'industry', mode='before')
    @classmethod
    def trim(cls, value):
        if isinstance(value, str) and len(value.encode('utf-16-le')) > 1208:
            raise ValueError('research names exceed input limit')
        return '\n'.join(names(value)) if isinstance(value, str) else value

    @model_validator(mode='after')
    def supplied_scope(self):
        values = (self.guestName, self.companyName, self.industry)
        lists = [names(value) for value in values]
        if (not any(values) or sum(map(len, lists)) > 10 or any(len(items) > 5 for items in lists)
                or any(not 4 <= len(name.encode('utf-16-le')) <= 240 for items in lists for name in items)):
            raise ValueError('enter a guest, company or industry; populated fields need 2–120 characters')
        return self


class ResearchLimit(DTO):
    kind: Literal['stage_calls', 'job_reservation', 'call_retries', 'provider_cost_overrun']
    phase: str
    used: int | None = Field(default=None, ge=0, le=1_000_000_000_000, strict=True)
    maximum: int | None = Field(default=None, ge=0, le=1_000_000_000_000, strict=True)

    @field_validator('phase')
    @classmethod
    def valid_phase(cls, value):
        from .budget import PHASES
        if value not in PHASES:
            raise ValueError('invalid budget phase')
        return value


class Failure(DTO):
    limit: ResearchLimit | None = None
    stage: Literal['resolve', 'discovery', 'snacks', 'appetizers', 'main', 'desserts', 'storage', 'runner']
    code: Literal['timeout', 'rate_limit', 'authentication', 'budget_exhausted', 'output_truncated',
                  'empty_output', 'invalid_output', 'storage_failure', 'provider_unavailable', 'internal_error']
    retryable: bool
    reason: Literal['http_error', 'transport_error', 'connect_timeout', 'read_timeout', 'deadline',
                    'stream_error', 'stream_incomplete', 'stream_invalid', 'response_too_large',
                    'context_limit', 'no_matching_sources', 'invalid_json', 'invalid_schema', 'output_truncated', 'empty_output'] | None = None
    provider: Literal['treg', 'anthropic', 'omniroute', 'openrouter', 'runner'] | None = None
    operation: Literal['catalog', 'search', 'social_search', 'extract', 'model'] | None = None
    httpStatus: int | None = Field(default=None, ge=100, le=599)

    @model_validator(mode='after')
    def consistent_limit(self):
        if self.limit is not None and self.code != 'budget_exhausted':
            raise ValueError('limit requires budget failure')
        return self


class Source(DTO):
    id: str = Field(pattern=r'^[A-Za-z0-9_-]{1,100}$')
    title: str = Field(max_length=500)
    url: str
    excerpt: str = Field(default='', max_length=12000)
    publisher: str | None = Field(default=None, max_length=200)
    publishedAt: str | None = Field(default=None, max_length=80)
    retrievedAt: str = Field(max_length=80)
    kind: str | None = Field(default=None, max_length=50)
    timestampSeconds: float | int | None = Field(default=None, ge=0, le=604800)
    platform: Channel | None = None
    retrievedVia: ToolId | None = None
    evidenceType: Literal['page_extract', 'search_snippet', 'post', 'transcript', 'video_metadata'] | None = None

    _url = field_validator('url')(safe_url)


class Section(DTO):
    key: Tier
    title: str = Field(max_length=200)
    content: str = Field(max_length=24000)
    status: Literal['queued', 'running', 'completed', 'partial', 'failed', 'cancelled', 'skipped'] = 'completed'
    failure: Failure | None = None

    @model_validator(mode='after')
    def skipped_is_empty(self):
        if self.status == 'skipped' and (self.content != '' or self.failure is not None):
            raise ValueError('skipped sections must have empty content and no failure')
        return self


class HistoricalSource(Source):
    citationNumber: int = Field(ge=1, le=100)
    kind: Literal['alpha_reference'] = 'alpha_reference'
    excerpt: Literal[''] = ''

    @model_validator(mode='after')
    def alpha_reference(self):
        if not re.fullmatch(r'https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}', self.url):
            raise ValueError('expected canonical Alpha episode reference')
        if self.evidenceType is not None:
            raise ValueError('historical synthesis is not transcript evidence')
        return self


class HistoricalContext(DTO):
    status: Literal['available', 'unavailable']
    summary: str = Field(max_length=6000)
    sources: list[HistoricalSource] = Field(max_length=12)

    @model_validator(mode='after')
    def consistent(self):
        if self.status == 'available' and (not self.summary.strip() or not self.sources):
            raise ValueError('historical context requires public citations')
        if self.status == 'unavailable' and (self.summary or self.sources):
            raise ValueError('unavailable context must be empty')
        if len({s.id for s in self.sources}) != len(self.sources) or len({s.citationNumber for s in self.sources}) != len(self.sources):
            raise ValueError('duplicate historical citation')
        return self


class Context(DTO):
    researchInput: ResearchInput | None = None
    notes: str = Field(default='', max_length=12000)
    notesApproved: bool = False
    sections: list[Section] = Field(default_factory=list, max_length=4)
    sources: list[Source] = Field(default_factory=list)

    @model_validator(mode='after')
    def unique(self):
        if len({s.id for s in self.sources}) != len(self.sources):
            raise ValueError('duplicate source ID')
        if len({s.key for s in self.sections}) != len(self.sections):
            raise ValueError('duplicate section key')
        return self


class JobInput(Context):
    visualPolicyVersion: Literal[2] | None = None
    mode: Literal['full', 'visuals'] | None = None
    figures: list[dict] | None = Field(default=None, max_length=8)
    coverage: list[dict] | None = Field(default=None, max_length=6)
    budgetPolicyVersion: Literal[1] | None = None
    historicalContext: HistoricalContext | None = None
    schemaVersion: Literal[2] | None = None
    id: str
    title: str = Field(min_length=2, max_length=400)
    section: Tier | None = None
    clarification: str | None = Field(default=None, max_length=2000)
    skipClarification: bool = False
    budgetMicro: int = Field(default=5000000, ge=0, le=5000000)

    @model_validator(mode='after')
    def structured_request(self):
        if self.schemaVersion == 2 and self.researchInput is None:
            raise ValueError('structured research input required')
        if self.mode == 'visuals':
            if self.visualPolicyVersion != 2 or not self.sections or not self.sources or self.notes or self.notesApproved:
                raise ValueError('visual retry needs retained report evidence only')
            from .figures import validate_figure
            for slot in self.figures or []:
                if slot.get('status') == 'ready' and not validate_figure(slot.get('figure'), [s.model_dump(exclude_none=True) for s in self.sources]):
                    raise ValueError('invalid retained figure')
        return self

    @field_validator('id')
    @classmethod
    def job_id(cls, value):
        if not value.startswith('rrun_') or str(UUID(value[5:])) != value[5:]:
            raise ValueError('expected rrun_UUID')
        return value


class Message(DTO):
    role: Literal['user', 'assistant']
    content: str = Field(max_length=6000)


class ChatInput(Context):
    question: str = Field(min_length=1, max_length=2000)
    messages: list[Message] = Field(default_factory=list, max_length=12)


def section_spec(body, key):
    """Every valid starting subject gets all four sections; inferred connections need evidence."""
    if body.get('mode') == 'visuals' and any(section['key'] == key and section.get('status') == 'skipped' for section in body.get('sections', [])):
        return None  # Preserve the written scope of legacy visual-only repairs.
    fields = body.get('researchInput')
    if not fields:
        return TIERS[key]
    guest, company, industry = (utf16_slice(display(fields.get(n, '')), 150) for n in ('guestName', 'companyName', 'industry'))
    if key == 'snacks':
        if guest:
            return (f'Guest profile: {guest}', TIERS[key][1])
        return (f'People and leadership: {company or industry}',
                'Identify founders, leaders and influential people with documented links to the supplied company or industry. '
                'Explain their roles and relevant backgrounds with citations. These are researched people, not confirmed interview guests.')
    if key == 'appetizers':
        if company:
            return (f'Company and industry: {company}' if industry else f'Company: {company}', TIERS[key][1])
        if industry:
            return (f'Industry: {industry}', 'Research industry economics, representative companies, market structure, '
                    'value chains, regulation and barriers. Distinguish global and Indian figures. Cite why each company is relevant.')
        return (f'Companies and industries: {guest}', 'Discover companies the supplied guest founded, led or has a documented '
                'material connection to, then research their business models, financials, competitors and industries. '
                'Distinguish founder, executive, investor and commentator roles and current from past associations. Cite each connection.')
    if key == 'main':
        return TIERS[key]
    return (TIERS[key][0], 'Takeaways, outlook and proposed interview questions covering the supplied subjects and their '
            'evidence-backed company, industry and people connections. If no guest was supplied, identify question themes '
            'or potential informed respondents without presenting them as confirmed guests.')


def validate_section_subject(body, key, content):
    if body.get('researchInput') and key in ('snacks', 'appetizers'):
        spec = section_spec(body, key)
        # Require the requested identity in the lead heading before accepting person/company claims.
        expected = '# ' + spec[0] if spec else None
        if expected is None or content.splitlines()[0].strip().casefold() != expected.casefold():
            raise ValueError('section identity does not match requested scope')

"""Bounded service DTOs. Sources are evidence data, never instructions."""
import ipaddress
import re
from typing import Literal
from urllib.parse import parse_qsl, urlsplit, urlunsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Tier = Literal['snacks', 'appetizers', 'main', 'desserts']
TIERS = {
    'snacks': ('Snacks', 'Background, biography, decisions and prior podcast appearances'),
    'appetizers': ('Appetizers', 'Industry structure, primary statistics, competitors and debates'),
    'main': ('Main course', 'Practical opportunities, barriers and skills for young Indians'),
    'desserts': ('Desserts', 'Takeaways, uncertainties, outlook and useful interview questions'),
}


def safe_url(value: str) -> str:
    if len(value) > 2048 or re.search(r'[\s\\\x00-\x1f]', value):
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

    _url = field_validator('url')(safe_url)


class Section(DTO):
    key: Tier
    title: str = Field(max_length=200)
    content: str = Field(max_length=24000)
    status: Literal['queued', 'running', 'completed', 'partial', 'failed', 'cancelled'] = 'completed'


class Context(DTO):
    notes: str = Field(default='', max_length=12000)
    notesApproved: bool = False
    sections: list[Section] = Field(default_factory=list, max_length=4)
    sources: list[Source] = Field(default_factory=list, max_length=80)

    @model_validator(mode='after')
    def unique(self):
        if len({s.id for s in self.sources}) != len(self.sources):
            raise ValueError('duplicate source ID')
        if len({s.key for s in self.sections}) != len(self.sections):
            raise ValueError('duplicate section key')
        return self


class JobInput(Context):
    id: str
    title: str = Field(min_length=2, max_length=400)
    section: Tier | None = None
    clarification: str | None = Field(default=None, max_length=2000)
    budgetMicro: int = Field(default=5000000, ge=0, le=5000000)

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

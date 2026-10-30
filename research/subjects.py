"""Bounded, backward-compatible multiple subjects; commas are part of a name."""
import unicodedata

FIELDS = ('guestName', 'companyName', 'industry')


def names(value):
    result, seen = [], set()
    for raw in value.split('\n'):
        name = unicodedata.normalize('NFC', raw.strip())
        if name and name.lower() not in seen:
            seen.add(name.lower())
            result.append(name)
    return result


def subjects(body):
    fields = body.get('researchInput') or {}
    return [name for field in FIELDS for name in names(fields.get(field, ''))]


def display(value):
    return ', '.join(names(value))

"""Editorial dossier structure and bounded coverage; historical synthesis is not evidence."""
import re

from .subjects import names
from .scope import scoped_query
from .source_channels import public_subject

DOSSIER = {
    'snacks': 'Build a dossier for each supplied guest or, when none was supplied, people with documented leadership or industry roles: background and education, '
              'career timeline and turning points, businesses/boards/investments, documented anecdotes and '
              'public positions. Connect sourced details to a specific opening question and follow-ups. '
              'Include an editorial sensitivities note only when supported or explicitly supplied; do not invent controversies.',
    'appetizers': 'Build an industry primer: short history, value chain and who earns what, business/ownership '
                  'models, company and competitor map, and a global-versus-India market table. Include unit economics '
                  'and comparable operating metrics with definition, geography, period and source per row. '
                  'Explain where numbers cannot be compared. Distinguish company revenue from total market size.',
    'main': 'Develop thematic deep dives: distribution and customer behaviour; regulation and structural '
            'constraints; technology/AI and changing economics; market gaps and realistic employment or business '
            'opportunities for young Indian listeners. For each theme provide evidence, a tension or trade-off, '
            'a counterargument, and a question worth discussing. Use tables where useful, not filler.',
    'desserts': 'Build a runnable interview sequence: opening and personal story; industry fundamentals; '
                'economics and trade-offs; future and opportunities; closing round. Aim for 12–18 substantive '
                'questions when supported, grouped into themes with a short evidence-based setup, who to ask '
                '(only named supplied guests), follow-ups, and panel hand-offs only when multiple guests are supplied. '
                'Mark all new questions as proposed. Include historical continuity: what earlier discussions '
                'covered, what to avoid repeating, and what to revisit or challenge with newer evidence. '
                'Include only material unresolved limitations, specifying what this run could not verify. Never include an editorial verification checklist or ask the reader to finish the research.',
}


def dossier_queries(body):
    """One bounded pass over report needs, not a target number of hits per platform."""
    topics = ['industry history value chain business models official reports',
              'global India market size operating metrics unit economics annual report',
              'competition distribution consumer behaviour regulation primary sources',
              'technology future employment entrepreneurship risks research']
    fields = body.get('researchInput') or {}
    targeted = []
    for guest in names(fields.get('guestName', '')):
        targeted.append(guest + ' official biography career milestones decisions interviews')
    for company in names(fields.get('companyName', '')):
        targeted.append(company + ' official investor relations annual report audited financial statements revenue profit operating metrics latest')
    for industry in names(fields.get('industry', '')):
        targeted.append(industry + ' global India market size operating metrics industry statistics primary sources')
    # Search direct inputs first, then establish their people/company/industry connections.
    for guest in names(fields.get('guestName', '')):
        targeted.append(guest + ' companies founded executive investor roles industries official biography')
    for industry in names(fields.get('industry', '')):
        targeted.append(industry + ' leading companies founders leaders business models primary sources')
    for company in names(fields.get('companyName', '')):
        targeted.append(company + ' founders leadership history industry competitors financial results latest reporting period')
    subject = public_subject(body)
    queries = targeted + [subject + ' ' + topic for topic in topics]
    return [scoped_query(query, body.get('searchScope', {})) for query in queries[:12]]



def historical_sources(context):
    return [{k: v for k, v in s.items() if k != 'citationNumber'} for s in (context or {}).get('sources', [])]


def historical_appendix(context):
    if not context or context.get('status') != 'available':
        return ('\n\n## Earlier episode references\n\nHistorical question context was unavailable for this run. '
                'This does not mean the topic was never discussed. No earlier question or host attribution is assumed.')
    refs = {s['citationNumber']: s['id'] for s in context['sources']}
    summary = re.sub(r'<[^>]*>', '', context['summary'])
    summary = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', summary)
    summary = re.sub(r'https?://\S+', '(see episode references)', summary)
    def markers(match):
        numbers = []
        for part in re.split(r'[,;]', match[1]):
            ends = re.split(r'[-–]', part.strip())
            numbers.extend(range(int(ends[0]), min(int(ends[-1]), 100) + 1))
        return ' '.join('[' + refs[n] + ']' for n in numbers if n in refs)
    summary = re.sub(r'\[(\d+(?:\s*[-–,;]\s*\d+)*)\]', markers, summary)
    return ('\n\n## Earlier episode references\n\n'
            '**Alpha discussion summary — editorial context, not a verbatim question transcript.** '
            'Check the linked episode before quoting a question or attributing it to Nikhil. '
            'These historical references do not establish current facts.\n\n' + summary + '\n\n' +
            'Episode references: ' + ' '.join('[' + s['id'] + ']' for s in context['sources']))

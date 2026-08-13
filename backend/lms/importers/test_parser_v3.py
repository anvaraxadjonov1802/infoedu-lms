import re

from . import test_parser as base


INLINE_OPTION_RE = re.compile(r'(?<!\w)([A-Ha-h])\s*[\).:]\s*')


def collect_table_answer_key(document):
    """Read every numeric/letter pair from answer-key tables.

    Supports both 2-column tables:
      Test | Javob
    and repeated pairs across the same row:
      Test | Javob | Test | Javob | Test | Javob
    """
    answer_key = {}
    for table in document.tables:
        rows = table.rows
        if not rows:
            continue

        header = [base.clean_text(cell.text) for cell in rows[0].cells]
        header_text = ' '.join(header).casefold()
        looks_like_key = (
            ('javob' in header_text or 'answer' in header_text or 'kalit' in header_text)
            and ('test' in header_text or 'savol' in header_text or '№' in header_text)
        )

        for row_index, row in enumerate(rows):
            cells = [base.clean_text(cell.text) for cell in row.cells]
            # Parse each adjacent pair: [number, answer], [number, answer], ...
            for pair_start in range(0, len(cells) - 1, 2):
                first = cells[pair_start].strip(' .:;№#-–—')
                second = cells[pair_start + 1].strip(' .:;()[]-–—')
                if not re.fullmatch(r'\d{1,3}', first):
                    continue
                if not re.fullmatch(r'[A-Ha-h]', second):
                    continue
                if looks_like_key or row_index > 0:
                    answer_key[int(first)] = second.lower()
    return answer_key


def collect_answer_key(document, lines):
    answer_key = base.collect_paragraph_answer_key(lines)
    answer_key.update(collect_table_answer_key(document))
    return answer_key


def split_inline_options(question_body):
    """Split `Question A) ... B) ... C) ... D) ...` stored in one paragraph."""
    text = base.clean_text(question_body)
    matches = list(INLINE_OPTION_RE.finditer(text))
    if len(matches) < 2:
        return text, []

    question_text = base.clean_text(text[:matches[0].start()])
    options = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        option_text = base.clean_text(text[start:end])
        if option_text:
            options.append({'id': match.group(1).lower(), 'text': option_text})

    if not question_text or len(options) < 2:
        return text, []
    return question_text, options


def parse_explicit_questions(lines, answer_key):
    parsed = []
    current = None

    def finish():
        nonlocal current
        if not current:
            return
        number = current['number']
        correct = current.get('correct') or answer_key.get(number)
        options = current.get('options', [])
        ids = {item['id'] for item in options}
        if current.get('text') and len(options) >= 2 and correct in ids:
            parsed.append({
                'number': number,
                'question_text': current['text'],
                'options': options,
                'correct_answer': correct,
            })
        current = None

    for item in lines:
        line = item['text']
        question = base.match_question(line)
        if question:
            finish()
            number, body = question
            question_text, inline_options = split_inline_options(body)
            current = {
                'number': number,
                'text': question_text,
                'options': inline_options,
                'correct': None,
            }
            continue

        if not current:
            continue

        answer = base.ANSWER_RE.match(line)
        if answer:
            current['correct'] = answer.group(1).lower()
            continue

        # If options were already embedded in the question paragraph, do not
        # append unrelated following lines as extra options.
        if current['options']:
            continue

        option = base.OPTION_RE.match(line)
        if option:
            current['options'].append({
                'id': option.group(1).lower(),
                'text': base.clean_text(option.group(2)),
            })
            continue

        if len(line) < 600:
            current['text'] = base.clean_text(f"{current['text']} {line}")

    finish()
    return parsed


def parse_test_questions_document(document):
    lines = base.extract_paragraph_lines(document)
    answer_key = collect_answer_key(document, lines)
    candidates = [
        base.parse_table_questions(document),
        parse_explicit_questions(lines, answer_key),
        base.parse_numbered_list_questions(lines, answer_key),
        base.parse_grouped_questions(lines, answer_key),
    ]
    return max(candidates, key=len) if candidates else []


def inspect_document(document, limit=80):
    output = [
        line for line in base.inspect_document(document, limit=limit)
        if not line.startswith('ANSWER KEY:')
    ]
    answer_key = collect_answer_key(document, base.extract_paragraph_lines(document))
    if answer_key:
        preview = ', '.join(
            f'{number}-{letter.upper()}'
            for number, letter in sorted(answer_key.items())[:40]
        )
        output.append(f'ANSWER KEY: {preview}')
    return output

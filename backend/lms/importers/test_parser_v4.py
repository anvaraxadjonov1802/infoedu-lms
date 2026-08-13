import re

from . import test_parser as base

INLINE_OPTION_RE = re.compile(r'(?<!\w)([A-Ha-h])\s*[\).:]\s*')


def collect_table_answer_key(document):
    result = {}
    for table in document.tables:
        if not table.rows:
            continue
        header_text = ' '.join(base.clean_text(c.text) for c in table.rows[0].cells).casefold()
        looks_like_key = (
            ('javob' in header_text or 'answer' in header_text or 'kalit' in header_text)
            and ('test' in header_text or 'savol' in header_text or '№' in header_text)
        )
        for row_index, row in enumerate(table.rows):
            cells = [base.clean_text(cell.text) for cell in row.cells]
            for start in range(0, len(cells) - 1, 2):
                number = cells[start].strip(' .:;№#-–—')
                letter = cells[start + 1].strip(' .:;()[]-–—')
                if re.fullmatch(r'\d{1,3}', number) and re.fullmatch(r'[A-Ha-h]', letter):
                    if looks_like_key or row_index > 0:
                        result[int(number)] = letter.lower()
    return result


def collect_answer_key(document, lines):
    result = base.collect_paragraph_answer_key(lines)
    result.update(collect_table_answer_key(document))
    return result


def split_inline_options(body):
    text = base.clean_text(body)
    matches = list(INLINE_OPTION_RE.finditer(text))
    if len(matches) < 2:
        return text, []
    question_text = base.clean_text(text[:matches[0].start()])
    options = []
    for i, match in enumerate(matches):
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        value = base.clean_text(text[start:end])
        if value:
            options.append({'id': match.group(1).lower(), 'text': value})
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
        correct = current.get('correct') or answer_key.get(current['number'])
        option_ids = {item['id'] for item in current['options']}
        if current['text'] and len(current['options']) >= 2 and correct in option_ids:
            parsed.append({
                'number': current['number'],
                'question_text': current['text'],
                'options': current['options'],
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
                'inline_options': bool(inline_options),
            }
            continue

        if not current:
            continue

        answer = base.ANSWER_RE.match(line)
        if answer:
            current['correct'] = answer.group(1).lower()
            continue

        if current['inline_options']:
            continue

        option = base.OPTION_RE.match(line)
        if option:
            current['options'].append({
                'id': option.group(1).lower(),
                'text': base.clean_text(option.group(2)),
            })
            continue

        if not current['options'] and len(line) < 600:
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

import re


QUESTION_PATTERNS = [
    re.compile(
        r'^\s*(?:№\s*)?(?:savol|test)\s*(\d{1,3})\s*[\).:\-–—]?\s*(.+)$',
        re.IGNORECASE,
    ),
    re.compile(
        r'^\s*(\d{1,3})\s*[-–—]?\s*(?:savol|test)\s*[\).:\-–—]?\s*(.+)$',
        re.IGNORECASE,
    ),
    re.compile(r'^\s*(\d{1,3})\s*[\).:]\s*(.+)$'),
]
OPTION_RE = re.compile(r'^\s*([A-Ha-h])\s*[\).:\-–—]?\s*(.+)$')
ANSWER_RE = re.compile(
    r'^\s*(?:to[‘\'`]?g[‘\'`]?ri\s+javob|javobi?|answer|kalit)\s*[:\-–—]?\s*([A-Ha-h])\b',
    re.IGNORECASE,
)
ANSWER_PAIR_RE = re.compile(r'(?<!\d)(\d{1,3})\s*[-:.)=]?\s*([A-Ha-h])\b')


def clean_text(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def match_question(value):
    text = clean_text(value)
    for pattern in QUESTION_PATTERNS:
        match = pattern.match(text)
        if match:
            return int(match.group(1)), clean_text(match.group(2))
    return None


def paragraph_meta(paragraph):
    text = clean_text(paragraph.text)
    style = (paragraph.style.name or '') if paragraph.style else ''
    num_id = None
    level = None
    ppr = paragraph._p.pPr
    if ppr is not None and ppr.numPr is not None:
        if ppr.numPr.numId is not None:
            num_id = str(ppr.numPr.numId.val)
        if ppr.numPr.ilvl is not None:
            level = int(ppr.numPr.ilvl.val)
    marked = False
    for run in paragraph.runs:
        if not clean_text(run.text):
            continue
        if run.bold or run.underline or run.font.highlight_color is not None:
            marked = True
            break
    return {
        'text': text,
        'style': style,
        'num_id': num_id,
        'level': level,
        'marked': marked,
    }


def cell_marked(cell):
    for paragraph in cell.paragraphs:
        if paragraph_meta(paragraph)['marked']:
            return True
    return False


def normalize_option_text(value):
    text = clean_text(value)
    match = OPTION_RE.match(text)
    return clean_text(match.group(2)) if match else text


def normalize_answer(value, options):
    raw = clean_text(value).strip(' .:;-–—()[]').lower()
    if len(raw) == 1 and raw in 'abcdefgh':
        return raw
    match = ANSWER_RE.match(clean_text(value))
    if match:
        return match.group(1).lower()
    for option in options:
        if clean_text(option['text']).casefold() == clean_text(value).casefold():
            return option['id']
    return None


def parse_table_questions(document):
    parsed = []
    sequence = 1
    for table in document.tables:
        for row in table.rows:
            cells = [clean_text(cell.text) for cell in row.cells]
            if not any(cells):
                continue
            joined = ' '.join(cells).casefold()
            if 'savol' in joined and ('javob' in joined or 'variant' in joined) and len(cells) <= 8:
                continue

            nonempty = [(idx, text) for idx, text in enumerate(cells) if text]
            if len(nonempty) < 5:
                continue

            values = [text for _, text in nonempty]
            number = sequence
            if re.fullmatch(r'\d{1,3}[.)]?', values[0]):
                number = int(re.sub(r'\D', '', values[0]))
                values = values[1:]

            if len(values) < 5:
                continue

            question_text = values[0]
            option_values = values[1:5]
            options = [
                {'id': chr(ord('a') + idx), 'text': normalize_option_text(text)}
                for idx, text in enumerate(option_values)
            ]

            correct = None
            if len(values) >= 6:
                correct = normalize_answer(values[5], options)

            if not correct:
                marked_ids = []
                option_cell_indexes = [idx for idx, _ in nonempty][1:5]
                for option_idx, cell_idx in enumerate(option_cell_indexes):
                    if cell_marked(row.cells[cell_idx]):
                        marked_ids.append(chr(ord('a') + option_idx))
                if len(marked_ids) == 1:
                    correct = marked_ids[0]

            if question_text and all(item['text'] for item in options) and correct:
                parsed.append({
                    'number': number,
                    'question_text': question_text,
                    'options': options,
                    'correct_answer': correct,
                })
                sequence = max(sequence, number + 1)
    return parsed


def extract_paragraph_lines(document):
    return [paragraph_meta(p) for p in document.paragraphs if clean_text(p.text)]


def collect_paragraph_answer_key(lines):
    answer_key = {}
    for item in lines:
        text = item['text']
        lower = text.casefold()
        if 'javob' in lower or 'answer' in lower or 'kalit' in lower:
            for number, letter in ANSWER_PAIR_RE.findall(text):
                answer_key[int(number)] = letter.lower()
    return answer_key


def collect_table_answer_key(document):
    answer_key = {}
    for table in document.tables:
        rows = table.rows
        if not rows:
            continue

        header_text = ' '.join(clean_text(cell.text) for cell in rows[0].cells).casefold()
        looks_like_key = (
            ('javob' in header_text or 'answer' in header_text or 'kalit' in header_text)
            and ('test' in header_text or 'savol' in header_text or '№' in header_text)
        )

        for row_index, row in enumerate(rows):
            cells = [clean_text(cell.text) for cell in row.cells]
            nonempty = [cell for cell in cells if cell]
            if len(nonempty) < 2:
                continue

            first = nonempty[0].strip(' .:;№#-–—')
            second = nonempty[1].strip(' .:;()[]-–—')
            if not re.fullmatch(r'\d{1,3}', first):
                continue
            if not re.fullmatch(r'[A-Ha-h]', second):
                continue

            # A two-column numeric/letter table is very likely an answer key.
            # If there is a descriptive header, trust it immediately; otherwise
            # require the row to be after the first row to avoid accidental matches.
            if looks_like_key or row_index > 0 or len(nonempty) == 2:
                answer_key[int(first)] = second.lower()
    return answer_key


def collect_answer_key(document, lines):
    answer_key = collect_paragraph_answer_key(lines)
    answer_key.update(collect_table_answer_key(document))
    return answer_key


def parse_explicit_questions(lines, answer_key=None):
    answer_key = answer_key or collect_paragraph_answer_key(lines)
    parsed = []
    current = None

    def finish():
        nonlocal current
        if not current:
            return
        number = current['number']
        correct = current.get('correct') or answer_key.get(number)
        if not correct and len(current.get('marked_options', [])) == 1:
            correct = current['marked_options'][0]
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
        question = match_question(line)
        if question:
            finish()
            number, question_text = question
            current = {
                'number': number,
                'text': question_text,
                'options': [],
                'correct': None,
                'marked_options': [],
            }
            continue

        if not current:
            continue

        answer = ANSWER_RE.match(line)
        if answer:
            current['correct'] = answer.group(1).lower()
            continue

        option = OPTION_RE.match(line)
        if option:
            option_id = option.group(1).lower()
            current['options'].append({
                'id': option_id,
                'text': clean_text(option.group(2)),
            })
            if item['marked']:
                current['marked_options'].append(option_id)
            continue

        if not current['options'] and len(line) < 600:
            current['text'] = clean_text(f"{current['text']} {line}")

    finish()
    return parsed


def parse_numbered_list_questions(lines, answer_key=None):
    answer_key = answer_key or collect_paragraph_answer_key(lines)
    usable = [
        item for item in lines
        if not any(word in item['text'].casefold() for word in ('javoblar', 'javob kaliti', 'answer key'))
    ]

    parsed = []
    question_candidates = []
    for idx, item in enumerate(usable):
        if item['num_id'] is not None and item['text']:
            question_candidates.append((idx, item))

    if not question_candidates:
        return parsed

    starts = []
    previous_level = None
    for idx, item in question_candidates:
        level = item['level'] if item['level'] is not None else 0
        if previous_level is None or level <= previous_level:
            starts.append(idx)
        previous_level = level

    starts = sorted(set(starts))
    if len(starts) < 2 and not answer_key:
        return parsed

    for pos, start in enumerate(starts):
        end = starts[pos + 1] if pos + 1 < len(starts) else len(usable)
        block = usable[start:end]
        if len(block) < 3:
            continue
        question = block[0]['text']
        option_items = [item for item in block[1:] if item['text']][:8]
        if len(option_items) < 2:
            continue
        options = [
            {'id': chr(ord('a') + idx), 'text': normalize_option_text(item['text'])}
            for idx, item in enumerate(option_items[:4])
        ]
        number = pos + 1
        correct = answer_key.get(number)
        if not correct:
            marked = [
                chr(ord('a') + idx)
                for idx, item in enumerate(option_items[:4])
                if item['marked']
            ]
            if len(marked) == 1:
                correct = marked[0]
        if question and len(options) >= 2 and correct:
            parsed.append({
                'number': number,
                'question_text': question,
                'options': options,
                'correct_answer': correct,
            })
    return parsed


def parse_grouped_questions(lines, answer_key=None):
    answer_key = answer_key or collect_paragraph_answer_key(lines)
    if not answer_key:
        return []

    filtered = []
    for item in lines:
        text = item['text']
        lower = text.casefold()
        if ('javob' in lower or 'answer' in lower or 'kalit' in lower) and ANSWER_PAIR_RE.search(text):
            continue
        if len(text) < 2:
            continue
        filtered.append(item)

    expected = len(answer_key)
    if expected == 0 or len(filtered) < expected * 3:
        return []

    for option_count in (4, 3, 5):
        group_size = option_count + 1
        if len(filtered) < expected * group_size:
            continue
        parsed = []
        cursor = 0
        for number in sorted(answer_key):
            block = filtered[cursor:cursor + group_size]
            cursor += group_size
            if len(block) < group_size:
                parsed = []
                break
            question = block[0]['text']
            options = [
                {'id': chr(ord('a') + idx), 'text': normalize_option_text(item['text'])}
                for idx, item in enumerate(block[1:])
            ]
            correct = answer_key[number]
            if correct not in {item['id'] for item in options}:
                parsed = []
                break
            parsed.append({
                'number': number,
                'question_text': question,
                'options': options,
                'correct_answer': correct,
            })
        if parsed:
            return parsed
    return []


def parse_test_questions_document(document):
    table_parsed = parse_table_questions(document)
    lines = extract_paragraph_lines(document)
    answer_key = collect_answer_key(document, lines)
    candidates = [
        table_parsed,
        parse_explicit_questions(lines, answer_key),
        parse_numbered_list_questions(lines, answer_key),
        parse_grouped_questions(lines, answer_key),
    ]
    return max(candidates, key=len) if candidates else []


def inspect_document(document, limit=80):
    output = []
    for idx, paragraph in enumerate(document.paragraphs[:limit], start=1):
        meta = paragraph_meta(paragraph)
        if not meta['text']:
            continue
        output.append(
            f"P{idx:03d} style={meta['style']!r} num={meta['num_id']!r} "
            f"level={meta['level']!r} marked={meta['marked']} :: {meta['text']}"
        )
    for table_index, table in enumerate(document.tables[:5], start=1):
        output.append(f'TABLE {table_index}: rows={len(table.rows)} cols={len(table.columns)}')
        for row_index, row in enumerate(table.rows[:20], start=1):
            cells = []
            for cell_index, cell in enumerate(row.cells, start=1):
                text = clean_text(cell.text)
                if text:
                    cells.append(f"C{cell_index} marked={cell_marked(cell)}:{text}")
            if cells:
                output.append(f"  R{row_index:02d} | " + ' || '.join(cells))
    answer_key = collect_answer_key(document, extract_paragraph_lines(document))
    if answer_key:
        preview = ', '.join(f'{number}-{letter.upper()}' for number, letter in sorted(answer_key.items())[:30])
        output.append(f'ANSWER KEY: {preview}')
    return output

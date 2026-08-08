from django.test import SimpleTestCase
from docx import Document

from lms.importers.test_parser import parse_test_questions_document


class RobustTestParserTests(SimpleTestCase):
    def test_explicit_question_format(self):
        document = Document()
        document.add_paragraph('1. Python nima?')
        document.add_paragraph('A) Dasturlash tili')
        document.add_paragraph('B) Operatsion tizim')
        document.add_paragraph('C) Brauzer')
        document.add_paragraph('D) Ma’lumotlar bazasi')
        document.add_paragraph('Javob: A')

        parsed = parse_test_questions_document(document)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]['correct_answer'], 'a')
        self.assertEqual(parsed[0]['options'][0]['text'], 'Dasturlash tili')

    def test_table_question_format(self):
        document = Document()
        table = document.add_table(rows=2, cols=7)
        headers = ['№', 'Savol', 'A', 'B', 'C', 'D', 'Javob']
        values = ['1', 'Python nima?', 'Til', 'OS', 'Brauzer', 'DB', 'A']
        for idx, value in enumerate(headers):
            table.rows[0].cells[idx].text = value
        for idx, value in enumerate(values):
            table.rows[1].cells[idx].text = value

        parsed = parse_test_questions_document(document)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]['question_text'], 'Python nima?')
        self.assertEqual(parsed[0]['correct_answer'], 'a')

    def test_table_can_use_marked_correct_option(self):
        document = Document()
        table = document.add_table(rows=1, cols=5)
        values = ['Python nima?', 'Til', 'OS', 'Brauzer', 'DB']
        for idx, value in enumerate(values):
            paragraph = table.rows[0].cells[idx].paragraphs[0]
            run = paragraph.add_run(value)
            if idx == 1:
                run.bold = True

        parsed = parse_test_questions_document(document)
        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]['correct_answer'], 'a')

    def test_number_test_heading_with_separate_answer_key_table(self):
        document = Document()
        document.add_paragraph('1-MODUL. ALGORITMLASH ASOSLARI')
        document.add_paragraph('1-MAVZU. ALGORITM TUSHUNCHASI')
        document.add_paragraph('TEST TOPSHIRIQLARI')
        document.add_paragraph('1-test Algoritm nima?')
        document.add_paragraph('A) Kompyuter dasturi')
        document.add_paragraph('B) Buyruqlar va qadamlar ketma-ketligi')
        document.add_paragraph('C) Elektron qurilma')
        document.add_paragraph('D) Matn muharriri')
        document.add_paragraph('2-test Algoritmning bir bosqichi nima deyiladi?')
        document.add_paragraph('A) Natija')
        document.add_paragraph('B) Buyruq')
        document.add_paragraph('C) Qadam')
        document.add_paragraph('D) Dastur')

        table = document.add_table(rows=3, cols=2)
        table.rows[0].cells[0].text = 'Test №'
        table.rows[0].cells[1].text = 'To‘g‘ri javob'
        table.rows[1].cells[0].text = '1'
        table.rows[1].cells[1].text = 'B'
        table.rows[2].cells[0].text = '2'
        table.rows[2].cells[1].text = 'C'

        parsed = parse_test_questions_document(document)
        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]['question_text'], 'Algoritm nima?')
        self.assertEqual(parsed[0]['correct_answer'], 'b')
        self.assertEqual(parsed[1]['correct_answer'], 'c')

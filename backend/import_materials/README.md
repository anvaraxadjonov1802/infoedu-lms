# InfoEdu bulk material import

Bu papka real DOCX materiallarni bir martalik/bulk import qilish uchun ishlatiladi.
Materiallarning o‘zi `.gitignore` orqali GitHubga push qilinmaydi.

## Papka tuzilmasi

Arxivlarni extract qilib taxminan shu ko‘rinishda joylashtiring:

```text
backend/import_materials/
├─ Nazariy qism/
│  ├─ 1-MAVZU.docx
│  ├─ 2-MAVZU.docx
│  ├─ ...
│  ├─ 20-MAVZU.docx
│  └─ DASTURLASH MUNDARIJA.docx
├─ Testlar/
│  ├─ 1-mavzu.docx
│  ├─ ...
│  └─ 20-mavzu.docx
├─ AMALIY/
│  ├─ 1-MODUL.docx
│  ├─ 2-MODUL.docx
│  ├─ 3-Modul.docx
│  └─ 4-Modul.docx
└─ Mustaqil ish/
   ├─ I MODUL.docx
   ├─ II MODUL.docx
   ├─ III MODUL.docx
   └─ IV MODUL.docx
```

Hozirgi material to‘plamida `4-MAVZU.docx` nazariya fayli yo‘q. Importer buni warning sifatida chiqaradi va qolgan materiallarni davom ettiradi.

## 1. Lokal kodni yangilash

```powershell
cd C:\Users\Anvar\Desktop\infoedu-lms
git pull origin main
```

## 2. Backend environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Agar original DOCX fayllarni Supabase Storagega ham yuklash kerak bo‘lsa, `.env`da quyidagilar bo‘lishi kerak:

```text
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_STORAGE_BUCKET=infoedu-materials
```

Secret keyni GitHubga push qilmang.

## 3. Avval dry-run

```powershell
python manage.py import_course_materials --root import_materials --dry-run
```

Natijada importer nechta nazariya/test/amaliy/mustaqil fayl topganini va har testdan nechta savol avtomatik aniqlanganini ko‘rsatadi.

Kutiladigan inventar:

- Nazariya: 19 ta (4-mavzu yo‘q)
- Test: 20 ta
- Amaliy: 4 ta
- Mustaqil ish: 4 ta

## 4. Draft kursga real import

```powershell
python manage.py import_course_materials --root import_materials --course-code DAST-101 --course-title "Dasturlash"
```

Bu kursni `Draft` holatda yaratadi/yangilaydi. Admin panelda tekshirib chiqish uchun xavfsiz variant.

## 5. DOCX fayllarni Supabase Storagega ham yuklash

```powershell
python manage.py import_course_materials --root import_materials --course-code DAST-101 --course-title "Dasturlash" --upload-files
```

Original DOCX linklari Matnli materiallardagi Attachmentsga avtomatik yoziladi.

## 6. Tayyor bo‘lgach Published qilish

Admin paneldan Course statusini `Published` qiling yoki tekshiruvdan keyin:

```powershell
python manage.py import_course_materials --root import_materials --course-code DAST-101 --course-title "Dasturlash" --upload-files --publish
```

Published kurslar ro‘yxatdan o‘tgan barcha studentlarga avtomatik beriladi.

## Test DOCX formati

Importer birinchi navbatda quyidagiga o‘xshash single-choice formatni avtomatik taniydi:

```text
1. Python nima?
A) Operatsion tizim
B) Dasturlash tili
C) Brauzer
Javob: B
```

Yoki hujjat oxiridagi javob kaliti:

```text
Javoblar: 1-B, 2-A, 3-C
```

Agar `--dry-run`da biror mavzuda `0 ta aniqlangan savol` chiqsa, o‘sha DOCX formatini importerga alohida moslash kerak bo‘ladi.

import json
import mimetypes
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, ValidationError


MAX_UPLOAD_BYTES = int(getattr(settings, 'SUPABASE_STORAGE_MAX_FILE_SIZE', 50 * 1024 * 1024))


def _config():
    base_url = (getattr(settings, 'SUPABASE_URL', '') or '').rstrip('/')
    service_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '') or ''
    bucket = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'infoedu-materials') or 'infoedu-materials'
    if not base_url or not service_key:
        raise ImproperlyConfigured(
            'Supabase Storage sozlanmagan. SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY ni Render Environment ga kiriting.'
        )
    return base_url, service_key, bucket


def _headers(service_key, **extra):
    headers = {
        'Authorization': f'Bearer {service_key}',
        'apikey': service_key,
    }
    headers.update(extra)
    return headers


def _safe_filename(name):
    original = Path(name or 'material').name
    stem = re.sub(r'[^A-Za-z0-9._-]+', '-', Path(original).stem).strip('-._') or 'material'
    suffix = re.sub(r'[^A-Za-z0-9.]', '', Path(original).suffix.lower())[:12]
    return f'{stem[:70]}-{uuid4().hex[:10]}{suffix}'


def ensure_public_bucket():
    base_url, service_key, bucket = _config()
    payload = json.dumps({
        'id': bucket,
        'name': bucket,
        'public': True,
        'file_size_limit': MAX_UPLOAD_BYTES,
    }).encode('utf-8')
    request = Request(
        f'{base_url}/storage/v1/bucket',
        data=payload,
        method='POST',
        headers=_headers(service_key, **{'Content-Type': 'application/json'}),
    )
    try:
        with urlopen(request, timeout=20):
            return bucket
    except HTTPError as exc:
        # Existing bucket is expected after the first upload.
        if exc.code in (400, 409):
            return bucket
        detail = exc.read().decode('utf-8', errors='replace')
        raise ValidationError(f'Supabase bucket yaratilmadi: {detail or exc.reason}') from exc
    except URLError as exc:
        raise ValidationError(f'Supabase Storage bilan bog‘lanib bo‘lmadi: {exc.reason}') from exc


def upload_admin_file(uploaded_file, folder='materials'):
    if not uploaded_file:
        return None
    size = int(getattr(uploaded_file, 'size', 0) or 0)
    if size <= 0:
        raise ValidationError('Bo‘sh fayl yuklab bo‘lmaydi.')
    if size > MAX_UPLOAD_BYTES:
        raise ValidationError(f'Fayl hajmi {MAX_UPLOAD_BYTES // (1024 * 1024)} MB dan katta bo‘lmasligi kerak.')

    base_url, service_key, bucket = _config()
    ensure_public_bucket()

    safe_folder = re.sub(r'[^A-Za-z0-9/_-]+', '-', folder or 'materials').strip('/') or 'materials'
    filename = _safe_filename(getattr(uploaded_file, 'name', 'material'))
    object_path = f'{safe_folder}/{filename}'
    body = uploaded_file.read()
    content_type = getattr(uploaded_file, 'content_type', '') or mimetypes.guess_type(filename)[0] or 'application/octet-stream'

    endpoint_path = quote(object_path, safe='/')
    request = Request(
        f'{base_url}/storage/v1/object/{quote(bucket, safe="")}/{endpoint_path}',
        data=body,
        method='POST',
        headers=_headers(
            service_key,
            **{
                'Content-Type': content_type,
                'Cache-Control': '3600',
                'x-upsert': 'false',
            },
        ),
    )
    try:
        with urlopen(request, timeout=90):
            pass
    except HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='replace')
        raise ValidationError(f'Fayl Supabase Storage ga yuklanmadi: {detail or exc.reason}') from exc
    except URLError as exc:
        raise ValidationError(f'Supabase Storage bilan bog‘lanib bo‘lmadi: {exc.reason}') from exc

    public_url = f'{base_url}/storage/v1/object/public/{quote(bucket, safe="")}/{endpoint_path}'
    return {
        'url': public_url,
        'path': object_path,
        'name': getattr(uploaded_file, 'name', filename),
        'size': size,
        'sizeLabel': format_file_size(size),
        'contentType': content_type,
        'extension': Path(filename).suffix.lstrip('.').lower() or 'file',
    }


def format_file_size(size):
    value = float(size)
    for unit in ('B', 'KB', 'MB', 'GB'):
        if value < 1024 or unit == 'GB':
            return f'{value:.0f} {unit}' if unit == 'B' else f'{value:.1f} {unit}'
        value /= 1024
    return f'{size} B'

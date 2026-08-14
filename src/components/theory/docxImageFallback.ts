import JSZip from 'jszip';

const EMU_PER_PX = 9525;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

interface RelationshipInfo {
  target: string;
  external: boolean;
}

interface ImageReference {
  relationshipId: string;
  widthPx?: number;
  heightPx?: number;
}

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function normalizeTarget(target: string) {
  const clean = target.replace(/\\/g, '/').replace(/^\/+/, '');
  if (clean.startsWith('word/')) return clean;
  if (clean.startsWith('../')) return clean.replace(/^\.\.\//, '');
  return `word/${clean}`;
}

function imageMime(path: string) {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || '';
}

function relationshipMap(xml: Document) {
  const map = new Map<string, RelationshipInfo>();
  const relationships = Array.from(xml.getElementsByTagName('Relationship'));
  relationships.forEach((relationship) => {
    const id = relationship.getAttribute('Id');
    const target = relationship.getAttribute('Target');
    if (!id || !target) return;
    map.set(id, {
      target: normalizeTarget(target),
      external: relationship.getAttribute('TargetMode') === 'External',
    });
  });
  return map;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function paragraphImageReferences(paragraph: Element): ImageReference[] {
  const relationshipIds = unique([
    ...Array.from(paragraph.getElementsByTagName('a:blip'))
      .map((node) => node.getAttribute('r:embed') || node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')),
    ...Array.from(paragraph.getElementsByTagName('v:imagedata'))
      .map((node) => node.getAttribute('r:id') || node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')),
  ].filter(Boolean) as string[]);

  if (!relationshipIds.length) return [];

  const extent = paragraph.getElementsByTagName('wp:extent')[0]
    || paragraph.getElementsByTagName('a:ext')[0];
  const cx = Number(extent?.getAttribute('cx') || 0);
  const cy = Number(extent?.getAttribute('cy') || 0);
  const widthPx = cx > 0 ? Math.round(cx / EMU_PER_PX) : undefined;
  const heightPx = cy > 0 ? Math.round(cy / EMU_PER_PX) : undefined;

  return relationshipIds.map((relationshipId) => ({ relationshipId, widthPx, heightPx }));
}

function hasWorkingRenderedImage(paragraph: HTMLElement) {
  return Array.from(paragraph.querySelectorAll('img')).some((image) => {
    const src = image.getAttribute('src') || '';
    return Boolean(src && src !== '#' && !src.startsWith('data:,'));
  }) || Array.from(paragraph.querySelectorAll('image')).some((image) => Boolean(image.getAttribute('href') || image.getAttribute('xlink:href')));
}

async function dataUrlFor(zip: JSZip, path: string) {
  const file = zip.file(path);
  const mime = imageMime(path);
  if (!file || !mime) return null;
  const base64 = await file.async('base64');
  return `data:${mime};base64,${base64}`;
}

/**
 * docx-preview handles most DrawingML images. Some real Word files contain
 * relationship/layout combinations that are silently omitted by the renderer.
 * This pass reads the OOXML package directly and restores missing standard web
 * image formats into the same rendered paragraph.
 */
export async function restoreMissingDocxImages(blob: Blob, root: HTMLElement) {
  const zip = await JSZip.loadAsync(blob);
  const documentFile = zip.file('word/document.xml');
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!documentFile || !relsFile) return { restored: 0, unsupported: 0, media: 0 };

  const [documentText, relsText] = await Promise.all([
    documentFile.async('text'),
    relsFile.async('text'),
  ]);
  const documentXml = parseXml(documentText);
  const rels = relationshipMap(parseXml(relsText));
  const sourceParagraphs = Array.from(documentXml.getElementsByTagName('w:p'));
  const renderedParagraphs = Array.from(root.querySelectorAll<HTMLElement>('section.infoedu-docx article p'));
  const mediaCount = Object.keys(zip.files).filter((name) => name.startsWith('word/media/') && !zip.files[name].dir).length;

  let restored = 0;
  let unsupported = 0;

  for (let index = 0; index < sourceParagraphs.length; index += 1) {
    const refs = paragraphImageReferences(sourceParagraphs[index]);
    if (!refs.length) continue;

    const renderedParagraph = renderedParagraphs[index];
    if (!renderedParagraph || hasWorkingRenderedImage(renderedParagraph)) continue;

    for (const ref of refs) {
      const relationship = rels.get(ref.relationshipId);
      if (!relationship || relationship.external) continue;
      const mime = imageMime(relationship.target);
      if (!mime) {
        unsupported += 1;
        continue;
      }
      const src = await dataUrlFor(zip, relationship.target);
      if (!src) continue;

      const image = document.createElement('img');
      image.src = src;
      image.alt = '';
      image.className = 'infoedu-docx-fallback-image';
      image.dataset.relationshipId = ref.relationshipId;
      if (ref.widthPx) image.style.width = `${ref.widthPx}px`;
      if (ref.heightPx) image.style.height = `${ref.heightPx}px`;
      renderedParagraph.appendChild(image);
      restored += 1;
    }
  }

  return { restored, unsupported, media: mediaCount };
}

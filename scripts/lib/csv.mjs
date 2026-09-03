/**
 * 작은 CSV 파서 (RFC 4180). 큰따옴표 필드와 그 안의 콤마·줄바꿈·이중 따옴표를 처리합니다.
 * 백엔드의 CsvReader.cs 와 같은 규칙입니다.
 */
export function parseCsv(text) {
  const rows = [];
  let fields = [];
  let field = '';
  let inQuotes = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') {
      fields.push(field);
      field = '';
    } else if (c === '\n') {
      fields.push(field);
      rows.push(fields);
      fields = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || fields.length > 0) {
    fields.push(field);
    rows.push(fields);
  }
  return rows;
}

/** 첫 행을 헤더로 삼아 객체 배열로. 값은 trim 합니다. */
export function parseCsvRecords(text) {
  const [header, ...rows] = parseCsv(text);
  const keys = header.map((h) => h.trim());
  return rows
    .filter((r) => r.length > 1 || (r[0] ?? '').length > 0)
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

/** "mm:ss" 또는 "HH:mm:ss" → 초. 형식이 다르면 null. */
export function parseClockSeconds(text) {
  if (!text) return null;
  const parts = text.trim().split(':').map((p) => Number.parseInt(p, 10));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** 역명 정규화 — src/services/routing/graph.ts 의 normalizeStationKey 와 같은 규칙. */
export function normalize(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/역$/, '')
    .trim();
}

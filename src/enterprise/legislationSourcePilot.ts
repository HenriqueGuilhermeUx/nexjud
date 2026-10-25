/**
 * Parser de uma norma do acervo ctresb/leis. Importação local, não publica
 * nem altera dados do usuário. O acervo não substitui a fonte oficial.
 */
export interface LegislationSourceRecord {
  title: string;
  instrumentType: string;
  number: string;
  date: string | null;
  state: string | null;
  statusReported: string | null;
  revokedReported: boolean | null;
  textVersion: string | null;
  sourceUrl: string;
  retrievedAt: string | null;
  urn: string | null;
  text: string;
  provenance: "ctresb/leis";
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
}

function yamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {
      // Preserve the original value when this is not JSON-escaped YAML.
    }
  }
  if (trimmed.length >= 2 && trimmed[0] === "'" && trimmed[trimmed.length - 1] === "'") {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function parseLegislationSourceMarkdown(markdown: string): LegislationSourceRecord {
  if (typeof markdown !== "string" || markdown.length > 1_000_000) {
    throw new Error("LEGAL_SOURCE_INVALID_SIZE");
  }
  const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("LEGAL_SOURCE_FRONTMATTER_REQUIRED");

  const fields = new Map<string, string>();
  for (const line of match[1].split("\n")) {
    const item = line.match(/^([a-z_]+):\s*(.*)$/);
    if (item) fields.set(item[1], yamlScalar(item[2]));
  }
  const required = ["titulo", "tipo", "numero", "fonte", "versao_texto"];
  if (required.some((key) => !fields.get(key))) {
    throw new Error("LEGAL_SOURCE_MISSING_REQUIRED_FIELDS");
  }
  const date = fields.get("data") || "";
  if (date && !isDate(date)) throw new Error("LEGAL_SOURCE_INVALID_DATE");
  const source = fields.get("fonte") || "";
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("not https");
  } catch {
    throw new Error("LEGAL_SOURCE_INVALID_OFFICIAL_URL");
  }
  const text = match[2].trim();
  if (!text.startsWith("# ") || text.length < 15) {
    throw new Error("LEGAL_SOURCE_TEXT_MISSING");
  }

  const revokedRaw = fields.get("revogada")?.toLowerCase();
  const revokedReported = revokedRaw === "true" ? true :
    revokedRaw === "false" ? false : null;
  return {
    title: fields.get("titulo")!,
    instrumentType: fields.get("tipo")!,
    number: fields.get("numero")!,
    date: date || null,
    state: fields.get("uf") || null,
    statusReported: fields.get("situacao") || null,
    revokedReported,
    textVersion: fields.get("versao_texto") || null,
    sourceUrl: source,
    retrievedAt: fields.get("baixado_em") || null,
    urn: fields.get("urn") || null,
    text,
    provenance: "ctresb/leis",
    verifiedAgainstOfficialSource: false,
    safeToCiteAsOfficial: false,
  };
}

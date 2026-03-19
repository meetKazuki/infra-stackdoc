import yaml from "js-yaml";
import { validate } from "./validator";
import type { HomelabDocument, ValidationError } from "./types";

export type ParseResult =
  | { ok: true; document: HomelabDocument; warnings: ValidationError[] }
  | { ok: false; errors: ValidationError[] };

/**
 * Parses a YAML string into a validated HomelabDocument.
 *
 * Returns either a successful result with the document and any non-fatal
 * warnings, or a failure result with the list of errors.
 */
export function parse(yamlString: string): ParseResult {
  // Phase 1: YAML syntax parsing
  let raw: unknown;
  try {
    raw = yaml.load(yamlString);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Invalid YAML syntax.";
    return {
      ok: false,
      errors: [{ path: "", message, severity: "error" }],
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      errors: [
        { path: "", message: "Document root must be a mapping.", severity: "error" },
      ],
    };
  }

  // Phase 2: Coerce into our typed shape (light normalization)
  const doc = normalizeDocument(raw as Record<string, unknown>);

  // Phase 3: Structural validation
  const allErrors = validate(doc);
  const errors = allErrors.filter((e) => e.severity === "error");
  const warnings = allErrors.filter((e) => e.severity === "warning");

  if (errors.length > 0) {
    return { ok: false, errors: [...errors, ...warnings] };
  }

  return { ok: true, document: doc, warnings };
}

// ─── Normalization helpers ────────────────────────────────────────
// These turn loosely-typed parsed YAML into our stricter interfaces
// without throwing — we leave error reporting to the validator.

function normalizeDocument(raw: Record<string, unknown>): HomelabDocument {
  return {
    meta: normalizeMeta(raw.meta),
    networks: Array.isArray(raw.networks) ? raw.networks : undefined,
    groups: Array.isArray(raw.groups) ? raw.groups : undefined,
    devices: Array.isArray(raw.devices) ? raw.devices.map(normalizeDevice) : [],
    connections: Array.isArray(raw.connections) ? raw.connections : [],
  };
}

function normalizeMeta(raw: unknown): HomelabDocument["meta"] {
  if (!raw || typeof raw !== "object") {
    return { title: "" };
  }
  const r = raw as Record<string, unknown>;
  return {
    title: String(r.title ?? ""),
    subtitle: r.subtitle ? String(r.subtitle) : undefined,
    author: r.author ? String(r.author) : undefined,
    date: r.date ? String(r.date) : undefined,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : undefined,
  };
}

function normalizeDevice(raw: unknown): HomelabDocument["devices"][number] {
  if (!raw || typeof raw !== "object") {
    return { id: "", name: "", type: "unknown" };
  }
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    type: String(r.type ?? "unknown"),
    ip: r.ip ? String(r.ip) : undefined,
    network: r.network ? String(r.network) : undefined,
    group: r.group ? String(r.group) : undefined,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : undefined,
    specs: r.specs && typeof r.specs === "object" ? (r.specs as any) : undefined,
    metadata:
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, string>)
        : undefined,
    children: Array.isArray(r.children)
      ? r.children.map(normalizeDevice)
      : undefined,
    services: Array.isArray(r.services)
      ? r.services.map((s: any) => ({
          name: String(s?.name ?? ""),
          port: s?.port != null ? Number(s.port) : undefined,
          runtime: s?.runtime ? String(s.runtime) : undefined,
          url: s?.url ? String(s.url) : undefined,
          metadata:
            s?.metadata && typeof s.metadata === "object"
              ? (s.metadata as Record<string, string>)
              : undefined,
        }))
      : undefined,
  };
}

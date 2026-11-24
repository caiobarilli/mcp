import type { Locale, LocalizedString, MetaData } from "./schemas.js";

export const MAX_RESPONSE_BYTES = 16_384;

export type ResponseEnvelope<T extends Record<string, unknown>> = {
  meta: {
    lang: Locale;
    source_url: string;
    data_version: string;
    last_verified_at: string;
    scope: string;
  };
  data: T;
};

export function pickLocale(value: LocalizedString, lang: Locale): string {
  return value[lang];
}

export function buildEnvelope<T extends Record<string, unknown>>(
  meta: MetaData,
  lang: Locale,
  pathSuffix: string,
  data: T,
): ResponseEnvelope<T> {
  const baseUrl = meta.source_urls[lang];
  const normalizedSuffix = pathSuffix.replace(/^\/+/, "");
  const sourceUrl = normalizedSuffix.length > 0 ? `${baseUrl}${normalizedSuffix}` : baseUrl;

  return {
    meta: {
      lang,
      source_url: sourceUrl,
      data_version: meta.data_version,
      last_verified_at: meta.last_verified_at,
      scope: pickLocale(meta.privacy_boundary, lang),
    },
    data,
  };
}

export function buildToolResult<T extends Record<string, unknown>>(
  envelope: ResponseEnvelope<T>,
): {
  structuredContent: ResponseEnvelope<T>;
  content: [{ type: "text"; text: string }];
} {
  const serialized = JSON.stringify(envelope);
  const byteLength = new TextEncoder().encode(serialized).byteLength;

  if (byteLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Response payload exceeds ${String(MAX_RESPONSE_BYTES)} bytes limit`);
  }

  return {
    structuredContent: envelope,
    content: [{ type: "text", text: serialized }],
  };
}

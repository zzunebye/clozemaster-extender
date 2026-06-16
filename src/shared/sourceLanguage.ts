const CLOZEMASTER_SOURCE_LANGUAGE_CODES: Record<string, string> = {
  chi: "zh",
  deu: "de",
  eng: "en",
  fra: "fr",
  ger: "de",
  jpn: "ja",
  kor: "ko",
  por: "pt",
  spa: "es",
  zho: "zh",
}

export function inferSourceLanguageFromPath(pathname: string): string | undefined {
  const languagePair = pathname.match(/^\/l\/[^/]+-([^/]+)/u)
  const sourceCode = languagePair?.[1]

  return sourceCode === undefined ? undefined : CLOZEMASTER_SOURCE_LANGUAGE_CODES[sourceCode]
}

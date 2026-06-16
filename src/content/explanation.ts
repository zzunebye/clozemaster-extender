import type { TranslateMeaningPayload, TranslateMeaningResponse } from "../shared/types.ts"
import { getExplanationSourceText } from "./explanationText.ts"
import {
  applyCurrentMode,
  hasCurrentExplanationTranslation,
  renderExplanationLoading,
  renderExplanationTranslation,
  showExplanationError,
} from "./explanationRender.ts"

export { resetExplanationTranslation } from "./explanationRender.ts"

type ExplanationSettings = {
  readonly explanationTranslationDisplayMode: "replace" | "separate"
  readonly targetLanguage: string
}

type TranslateExplanationModalInput = {
  readonly modal: HTMLElement
  readonly requestTranslation: (payload: TranslateMeaningPayload) => Promise<TranslateMeaningResponse>
  readonly settings: ExplanationSettings
  readonly sourceLanguage?: string | undefined
}

const pendingExplanationTranslations = new Set<string>()

export async function translateExplanationModal(
  input: TranslateExplanationModalInput,
): Promise<boolean> {
  const sourceText = getExplanationSourceText(input.modal)

  if (sourceText === null) {
    return false
  }

  if (hasCurrentExplanationTranslation(input.modal, sourceText, input.settings)) {
    applyCurrentMode(input.modal, input.settings.explanationTranslationDisplayMode)
    return true
  }

  renderExplanationLoading(input.modal, sourceText, input.settings)

  const pendingKey = makePendingKey(sourceText, input.settings.targetLanguage)

  if (pendingExplanationTranslations.has(pendingKey)) {
    return true
  }

  pendingExplanationTranslations.add(pendingKey)

  try {
    const response = await input.requestTranslation({
      meaning: sourceText,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.settings.targetLanguage,
    })

    if (response.translatedText === undefined) {
      showExplanationError(
        input.modal,
        sourceText,
        response.error ?? "No explanation translation.",
        input.settings,
      )
      return true
    }

    renderExplanationTranslation(input.modal, sourceText, response.translatedText, input.settings)

    return true
  } finally {
    pendingExplanationTranslations.delete(pendingKey)
  }
}

function makePendingKey(sourceText: string, targetLanguage: string): string {
  return `${targetLanguage}\u0000${sourceText}`
}

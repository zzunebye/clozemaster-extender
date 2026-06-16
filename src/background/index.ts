import { translateWithGoogleV2 } from "../shared/googleTranslate.ts"
import { getCache, getSettings, setCache } from "../shared/storage.ts"
import { isTranslateMeaningRequest } from "../shared/types.ts"
import type { TranslateMeaningResponse } from "../shared/types.ts"
import { handleTranslateMeaning } from "./translate.ts"

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isTranslateMeaningRequest(message)) {
    return false
  }

  handleTranslateMeaning(message, {
    getSettings,
    getCache,
    setCache,
    translate: translateWithGoogleV2,
  })
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse(toErrorResponse(error))
    })

  return true
})

function toErrorResponse(error: unknown): TranslateMeaningResponse {
  if (error instanceof Error) {
    return { error: error.message }
  }

  return { error: "Unknown translation error." }
}

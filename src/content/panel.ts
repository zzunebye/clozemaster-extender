export const PANEL_ID = "clozemaster-native-helper-panel"

export type NativeMeaningPanelInput = {
  readonly iframe: HTMLIFrameElement
  readonly meaning: string
  readonly targetLanguage: string
  readonly translatedText: string
  readonly word?: string | undefined
}

export function renderNativeMeaningPanel(input: NativeMeaningPanelInput): void {
  document.getElementById(PANEL_ID)?.remove()

  const panel = document.createElement("div")
  panel.id = PANEL_ID
  panel.style.marginTop = "10px"
  panel.style.marginBottom = "10px"
  panel.style.padding = "12px"
  panel.style.border = "1px solid #d0d7de"
  panel.style.borderRadius = "8px"
  panel.style.background = "#ffffff"
  panel.style.color = "#1f2328"
  panel.style.fontSize = "14px"
  panel.style.lineHeight = "1.5"

  const title = document.createElement("div")
  title.textContent = "Native Meaning"
  title.style.fontWeight = "650"
  title.style.marginBottom = "6px"
  panel.append(title)

  if (input.word !== undefined) {
    panel.append(createPanelRow("Word", input.word))
  }

  panel.append(createPanelRow("Original", input.meaning))
  panel.append(createPanelRow(input.targetLanguage.toUpperCase(), input.translatedText))

  input.iframe.parentElement?.insertBefore(panel, input.iframe)
}

function createPanelRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div")
  const labelElement = document.createElement("span")
  labelElement.textContent = `${label}: `
  labelElement.style.opacity = "0.7"

  const valueElement = document.createElement("span")
  valueElement.textContent = value

  row.append(labelElement, valueElement)

  return row
}

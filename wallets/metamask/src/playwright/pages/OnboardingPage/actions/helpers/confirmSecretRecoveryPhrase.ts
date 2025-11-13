import type { Page } from '@playwright/test'
import Selectors from '../../../../../selectors/pages/OnboardingPage'

const StepSelectors = Selectors.SecretRecoveryPhrasePageSelectors.recoveryStep

export async function confirmSecretRecoveryPhrase(page: Page, seedPhrase: string) {
  const seedPhraseWords = seedPhrase.split(' ')
  const seedPhraseLength = seedPhraseWords.length

  // MetaMask v13.8.0+ has a new UI with a single text area instead of individual word inputs
  // Try the new interface first
  const newSRPTextarea = page.locator('[data-testid="srp-input-import__srp-note"]')
  const newSRPTextareaExists = await newSRPTextarea.count()

  if (newSRPTextareaExists > 0) {
    // New interface (v13.8.0+): Single text area
    // Note: .fill() doesn't trigger validation, but .type() does
    await newSRPTextarea.type(seedPhrase, { delay: 10 })

    const confirmButton = page.locator('[data-testid="import-srp-confirm"]')
    await confirmButton.click()
  } else {
    // Old interface: Dropdown + individual word inputs
    await page
      .locator(StepSelectors.selectNumberOfWordsDropdown)
      .selectOption(StepSelectors.selectNumberOfWordsOption(seedPhraseLength))

    for (const [index, word] of seedPhraseWords.entries()) {
      await page.locator(StepSelectors.secretRecoveryPhraseWord(index)).fill(word)
    }

    const confirmSRPButton = page.locator(StepSelectors.confirmSecretRecoveryPhraseButton)

    if (await confirmSRPButton.isDisabled()) {
      const errorText = await page.locator(StepSelectors.error).textContent({
        timeout: 1000
      })

      throw new Error(`[ConfirmSecretRecoveryPhrase] Invalid seed phrase. Error from MetaMask: ${errorText}`)
    }

    await confirmSRPButton.click()
  }
}

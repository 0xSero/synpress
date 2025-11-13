import assert from 'node:assert'
import type { Page } from '@playwright/test'

import HomePageSelectors from '../../../../selectors/pages/HomePage'
import Selectors from '../../../../selectors/pages/OnboardingPage'

import { closeNewNetworkInfoPopover, closePopover, closeWhatsNewPopover } from '../../HomePage/actions'
import { confirmSecretRecoveryPhrase, createPassword } from './helpers'

export async function importWallet(page: Page, seedPhrase: string, password: string) {
  // termsOfServiceCheckbox was removed in MetaMask v13+, so make it optional
  try {
    await page.locator(Selectors.GetStartedPageSelectors.termsOfServiceCheckbox).waitFor({ timeout: 1000 })
    await page.locator(Selectors.GetStartedPageSelectors.termsOfServiceCheckbox).click()
  } catch {
    // Checkbox doesn't exist in this version, skip it
  }
  await page.locator(Selectors.GetStartedPageSelectors.importWallet).click()

  // In MetaMask v13.8.0+, there's a modal with import options (Google, Apple, SRP)
  // We need to click the SRP button if it exists
  try {
    const srpButton = page.locator('[data-testid="onboarding-import-with-srp-button"]')
    await srpButton.waitFor({ timeout: 2000 })
    await srpButton.click()
  } catch {
    // Modal doesn't exist in older versions, continue
  }

  // Analytics page was removed in MetaMask v13.8.0+
  // Try to click optOut, but if it doesn't exist, continue
  try {
    await page.locator(Selectors.AnalyticsPageSelectors.optOut).waitFor({ timeout: 2000 })
    await page.locator(Selectors.AnalyticsPageSelectors.optOut).click()
  } catch {
    // Analytics page doesn't exist in v13.8.0+, continue to SRP input
  }

  // Secret Recovery Phrase Page
  await confirmSecretRecoveryPhrase(page, seedPhrase)
  await createPassword(page, password)

  // In v13.8.0+, analytics page moved to AFTER password (instead of before SRP)
  // Check if we're on the new metametrics page
  try {
    const newMetametricsButton = page.locator('[data-testid="metametrics-i-agree"]')
    await newMetametricsButton.waitFor({ timeout: 3000 })

    // Optionally uncheck the basic usage data checkbox to opt out completely
    // The checkbox is a label that contains an input, we need to click the label
    try {
      const optInCheckbox = page.locator('[data-testid="metametrics-checkbox"]')
      await optInCheckbox.click()
      await page.waitForTimeout(500)
    } catch {
      // Checkbox click failed, continue anyway
    }

    await newMetametricsButton.click()
    // Wait for page transition to completion page
    await page.waitForTimeout(2000)
  } catch {
    // Not on the new metametrics page, might be old version
  }

  // In v13.8.0+, the completion page still exists but at a different URL (#onboarding/completion)
  // The button selector is still "onboarding-complete-done"
  try {
    const successButton = page.locator(Selectors.WalletCreationSuccessPageSelectors.confirmButton)
    await successButton.waitFor({ timeout: 5000 })
    await successButton.click()
  } catch {
    // Success/completion page doesn't exist, continue
  }

  // Pin extension page might also have changed
  try {
    await page.locator(Selectors.PinExtensionPageSelectors.nextButton).waitFor({ timeout: 2000 })
    await page.locator(Selectors.PinExtensionPageSelectors.nextButton).click()
    await page.locator(Selectors.PinExtensionPageSelectors.confirmButton).click()
  } catch {
    // Pin extension page might not exist or have different flow
  }

  // Close popovers in order from top to bottom (z-index order)
  // In v13.8.0+, these popovers might not exist
  try {
    await closeNewNetworkInfoPopover(page)
  } catch {
    // Popover doesn't exist
  }

  try {
    await closePopover(page)
  } catch {
    // Popover doesn't exist
  }

  try {
    await closeWhatsNewPopover(page)
  } catch {
    // Popover doesn't exist
  }

  // Wait a bit for page transition
  await page.waitForTimeout(2000)

  await verifyImportedWallet(page)
}

// Checks if the wallet was imported successfully.
// On rare occasions, the MetaMask hangs during the onboarding process.
async function verifyImportedWallet(page: Page) {
  // In v13.8.0+, the address copy button is no longer on the main page
  // Instead, verify we're on the home page by checking for the account menu icon
  try {
    const accountMenuIcon = page.locator('[data-testid="account-menu-icon"]')
    await accountMenuIcon.waitFor({ timeout: 10000 })
    // Successfully found the home page element - wallet imported successfully
    return
  } catch {
    // Fallback: try the old address copy button selector for older versions
    try {
      const accountAddress = await page.locator(HomePageSelectors.copyAccountAddressButton).textContent({ timeout: 5000 })

      assert.strictEqual(
        accountAddress?.startsWith('0x'),
        true,
        new Error(
          [
            `Incorrect state after importing the seed phrase. Account address is expected to start with "0x", but got "${accountAddress}" instead.`,
            'Note: Try to re-run the cache creation. This is a known but rare error where MetaMask hangs during the onboarding process. If it persists, please file an issue on GitHub.'
          ].join('\n')
        )
      )
    } catch {
      throw new Error(
        'Wallet import verification failed: Could not find home page elements. MetaMask may have hung during onboarding.'
      )
    }
  }
}

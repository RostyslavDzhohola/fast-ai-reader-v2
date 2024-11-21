import { initializeGoogleAuth, handleSignOut, refreshTokenIfNeeded, checkAuthStatus } from './auth'

// TODO: Fix an issue with double click for the extension to work. On first click it makes checks on lins 126, 148, and only on the second click the logic starts to work for popup and side panel.

console.log('background is running')

// Add URL state tracking at the top
let currentURL: string | undefined
let isCurrentURLDiscord = false
const DISCORD_URLS = 'https://discord.com'

// Helper function to get current tab URL
async function getCurrentTabURL() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab?.url
  } catch (error) {
    console.error('Error getting current tab:', error)
    return undefined
  }
}

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
}

// ACTIVE TAB CLICK HANDLER
// Modify the extension icon click handler to use this pattern
chrome.action.onClicked.addListener(async (tab) => {
  console.log('🎯 Click Handler - URL Check:', {
    url: tab.url,
    isDiscord: isCurrentURLDiscord,
    timestamp: new Date().toISOString(),
  })

  if (!tab.id || !tab.url) return

  try {
    const isAuthenticated = await checkAuthStatus()
    console.log('🔍 Auth Status:', isAuthenticated)

    // Allow opening side panel with action click for Discord
    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    })

    // For Discord pages
    if (isCurrentURLDiscord && isAuthenticated) {
      console.log('🔍 Side Panel')
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'sidepanel.html',
        enabled: true,
      })
      // Clear popup for authenticated Discord
      await chrome.action.setPopup({
        tabId: tab.id,
        popup: '',
      })
    } else {
      // For non-Discord pages or unauthenticated
      console.log('🔍 Sign in or Switch to Discord Popup')
      // Add popup for non-Discord or unauthenticated
      await chrome.action.setPopup({
        tabId: tab.id,
        popup: 'popup.html',
      })

      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        enabled: false,
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
      handleError(error)
    }
  }
})

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)

  if (request.action === 'initiateGoogleAuth') {
    initializeGoogleAuth()
      .then((result) => {
        console.log('Auth result:', result)
        sendResponse(result)
      })
      .catch((error) => {
        console.error('Auth error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'signOut') {
    handleSignOut()
      .then(() => {
        console.log('Sign out successful')
        sendResponse({ success: true })
      })
      .catch((error) => {
        console.error('Sign out error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})

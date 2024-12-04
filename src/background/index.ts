import { initializeGoogleAuth, handleSignOut, refreshTokenIfNeeded, checkAuthStatus } from './auth'

console.log('background is running')

// Add URL state tracking at the top
let isCurrentURLDiscord = false
let authStatus = false
let isServiceWorkerReady = false

// Add Service Worker activation handler
chrome.runtime.onStartup.addListener(() => {
  console.log('🚀 Service Worker starting up')
  isServiceWorkerReady = true
})

// Ensure Service Worker is ready on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Extension installed/updated')
  isServiceWorkerReady = true
})

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
}

// First, add a function to check if a URL is a Discord URL
function isDiscordURL(url: string | undefined): boolean {
  return url?.includes('discord.com') || false
}

// Add a tab update listener to keep track of URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    isCurrentURLDiscord = isDiscordURL(changeInfo.url)
    console.log(`${logPrefix} URL updated:`, {
      url: changeInfo.url,
      isDiscord: isCurrentURLDiscord,
    })
  }
})

// ACTIVE TAB CLICK HANDLER
chrome.action.onClicked.addListener(async (tab) => {
  if (!isServiceWorkerReady) {
    console.log('⏳ Service Worker not ready, initializing...')
    isServiceWorkerReady = true
  }

  // Update isCurrentURLDiscord based on the current tab's URL
  isCurrentURLDiscord = isDiscordURL(tab.url)
  authStatus = await checkAuthStatus()

  console.log('🎯 Click Handler - URL Check:', {
    url: tab.url,
    isDiscord: isCurrentURLDiscord,
    timestamp: new Date().toISOString(),
    signedInStatus: authStatus,
    serviceWorkerReady: isServiceWorkerReady,
  })

  if (!tab.id || !tab.url) return

  try {
    console.log('🔍 Auth Status:', authStatus)

    // For Discord pages
    if (isCurrentURLDiscord && authStatus) {
      console.log('🔍 Setting up Side Panel for Discord page')

      // First, clear the popup
      await chrome.action.setPopup({
        tabId: tab.id,
        popup: '',
      })

      // Set up the side panel
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: '/sidepanel.html',
        enabled: true,
      })

      // Let Chrome handle the panel opening on click
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      })

      console.log('🔍 Side panel setup completed')
    } else {
      // For non-Discord pages or unauthenticated
      console.log('🔍 Sign in or Switch to Discord Popup', {
        isDiscord: isCurrentURLDiscord,
        authStatus,
      })

      // Disable side panel first
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        enabled: false,
      })

      // Then set up popup
      await chrome.action.setPopup({
        tabId: tab.id,
        popup: '/popup.html',
      })

      // Force popup to show
      await chrome.action.openPopup()
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message)
      handleError(error)
    }
  }
})

// Add this listener to ensure side panel is ready when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidePanelReady') {
    console.log('🔍 Side panel reported ready')
    sendResponse({ success: true })
  }
  return true
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

  if (request.action === 'getTabInfo') {
    getTabInfo()
      .then((tabInfo) => {
        sendResponse({ success: true, data: tabInfo })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'setupSidePanel') {
    const { tabId, enabled } = request
    setupSidePanel(tabId, enabled)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'getAuthState') {
    getAuthState()
      .then((authState) => {
        sendResponse({ success: true, data: authState })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'navigateToDiscord') {
    const { discordTabId } = request
    navigateToDiscord(discordTabId)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'handlePostSignIn') {
    const { isDiscordPage } = request
    handlePostSignIn(isDiscordPage)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})

interface TabInfo {
  isDiscordPage: boolean
  hasDiscordTab: boolean
  activeDiscordTabId: number | null
}

// Add this function to handle tab info
async function getTabInfo(): Promise<TabInfo> {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const allTabs = await chrome.tabs.query({ currentWindow: true })

  const isCurrentTabDiscord = currentTab.url?.includes('discord.com') || false
  const discordTab = allTabs.find((tab) => tab.url?.includes('discord.com'))

  return {
    isDiscordPage: isCurrentTabDiscord,
    hasDiscordTab: !!discordTab,
    activeDiscordTabId: discordTab?.id || null,
  }
}

// Add this new function to manage side panel
async function setupSidePanel(tabId: number, enabled: boolean = true): Promise<void> {
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled,
      path: enabled ? 'sidepanel.html' : '',
    })

    if (enabled) {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      })
    }
  } catch (error) {
    console.error('Side panel setup error:', error)
    throw error
  }
}

// Add these new interfaces and functions
interface AuthState {
  isSignedIn: boolean
  registrationRequired: boolean
}

async function getAuthState(): Promise<AuthState> {
  try {
    const result = await chrome.storage.local.get('googleToken')
    const isSignedIn = !!result.googleToken

    // You can add additional checks here if needed
    return {
      isSignedIn,
      registrationRequired: false,
    }
  } catch (error) {
    console.error('Auth state check failed:', error)
    throw error
  }
}

// Add this new function for Discord navigation
async function navigateToDiscord(discordTabId: number | null): Promise<void> {
  try {
    if (discordTabId) {
      // Switch to existing Discord tab
      await chrome.tabs.update(discordTabId, { active: true })
    } else {
      // Open new Discord tab
      await chrome.tabs.create({ url: 'https://discord.com/channels/@me' })
    }
  } catch (error) {
    console.error('Discord navigation error:', error)
    throw error
  }
}

// Add new function to handle post-signin actions
async function handlePostSignIn(isDiscordPage: boolean): Promise<void> {
  try {
    if (isDiscordPage) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        await setupSidePanel(tab.id, true)
      }
    }
  } catch (error) {
    console.error('Post sign-in handling error:', error)
    throw error
  }
}

// Add at the top with other imports/constants
const logPrefix = '[Background]'

// Add these listeners to track popup events
chrome.action.onClicked.addListener((tab) => {
  console.log(`${logPrefix} Extension icon clicked, popup should display`)
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    console.log(`${logPrefix} Popup connected`)

    port.onDisconnect.addListener(() => {
      console.log(`${logPrefix} Popup disconnected`)
    })
  }
})

// Add this to track when popup is created
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.url?.includes('popup.html')) {
    console.log(`${logPrefix} Popup window loaded`, {
      tabId: sender.tab?.id,
      frameId: sender.frameId,
    })
  }
})

// Add this message handler in background/index.ts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // ... existing listeners ...

  if (message.action === 'extractMessages') {
    console.log('Background script received extract request:', message)

    try {
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!activeTab?.id) {
        throw new Error('No active tab found')
      }

      // Forward the message to content script
      const response = await chrome.tabs.sendMessage(activeTab.id, message)
      console.log('Received response from content script:', response)
      sendResponse(response)
    } catch (error) {
      console.error('Error in message relay:', error)
      sendResponse({ error: 'Failed to communicate with Discord tab' })
    }
    return true
  }
})

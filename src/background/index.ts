console.log('background is running')

// Function to check if a given URL is a Discord URL
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

// Function to set or unset the side panel based on whether the URL is Discord
async function setSidePanelForDiscord(tabId: number, url: string) {
  try {
    if (isDiscordUrl(url)) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true,
      })
    } else {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })
    }
  } catch (error) {
    handleError(error as Error)
  }
}

async function checkAuthAndInitialize() {
  const token = await chrome.storage.local.get('googleToken')
  if (!token) {
    initializeGoogleAuth()
  } else {
    console.log('Google auth already initialized')
  }
}

async function initializeGoogleAuth() {
  try {
    // Clear existing tokens
    await chrome.storage.local.remove(['googleToken', 'tokenTimestamp'])

    const { token } = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    })

    if (!token) {
      throw new Error('Failed to obtain auth token')
    }

    // Store token with timestamp
    const timestamp = Date.now()
    await chrome.storage.local.set({
      googleToken: token,
      tokenTimestamp: timestamp,
      lastRefresh: timestamp,
    })

    // Validate token immediately
    try {
      const userInfo = await validateToken(token)
      return { success: true, token, userInfo }
    } catch (error) {
      // If validation fails, clear tokens and retry once
      await chrome.storage.local.remove(['googleToken', 'tokenTimestamp'])
      throw new Error('Token validation failed: ' + error.message)
    }
  } catch (error) {
    console.error('Authentication failed:', error)
    return { success: false, error: error.message }
  }
}

async function validateToken(token: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Token validation failed')
  }

  return response.json()
}

// Token refresh logic
async function refreshTokenIfNeeded() {
  try {
    const { googleToken, lastRefresh } = await chrome.storage.local.get([
      'googleToken',
      'lastRefresh',
    ])

    if (!googleToken) return null

    // Refresh if token is older than 45 minutes
    if (Date.now() - lastRefresh > 45 * 60 * 1000) {
      const result = await initializeGoogleAuth()
      if (!result.success) {
        throw new Error('Token refresh failed')
      }
      return result.token
    }

    return googleToken
  } catch (error) {
    console.error('Token refresh failed:', error)
    await chrome.storage.local.remove(['googleToken', 'tokenTimestamp', 'lastRefresh'])
    return null
  }
}

// Function to handle tab updates and activations
async function handleTabUpdate(tabId: number, url: string | undefined) {
  if (!url) return

  try {
    const { googleToken } = await chrome.storage.local.get('googleToken')

    // Immediately disable side panel for non-Discord URLs
    if (!isDiscordUrl(url)) {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })
      return
    }

    // For Discord URLs, check authentication
    if (isDiscordUrl(url) && googleToken) {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true,
      })
    } else {
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })
    }
  } catch (error) {
    console.error('Error in handleTabUpdate:', error)
  }
}

// Event listeners for tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleTabUpdate(tabId, tab.url)
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  handleTabUpdate(tab.id!, tab.url)
})

// Force check all tabs when extension loads
chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    if (tab.id) handleTabUpdate(tab.id, tab.url)
  })
})

// Track tabs where content script is ready
const contentScriptReadyTabs = new Set<number>()

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'contentScriptReady' && sender.tab?.id) {
    contentScriptReadyTabs.add(sender.tab.id)
  }
})

// Improved message sending with retry logic
async function sendMessageToTab(tabId: number, message: any, maxRetries = 3): Promise<any> {
  try {
    // Check if content script is ready
    if (!contentScriptReadyTabs.has(tabId)) {
      throw new Error('Content script not ready')
    }

    return await chrome.tabs.sendMessage(tabId, message)
  } catch (error) {
    if (maxRetries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return sendMessageToTab(tabId, message, maxRetries - 1)
    }
    throw error
  }
}

// Update the extractDiscordMessages function
async function extractDiscordMessages(count: number): Promise<string[]> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error('No active tab found')

    const tabId = tab.id

    // Check if we're on a Discord page
    if (!isDiscordUrl(tab.url || '')) {
      throw new Error('This feature only works on Discord pages')
    }

    // Check if content script is ready
    if (!contentScriptReadyTabs.has(tabId)) {
      throw new Error('Please refresh the Discord page to activate the message extraction feature')
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'extractMessages', count }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (response?.error) {
          reject(new Error(response.error))
          return
        }
        resolve(response?.messages || [])
      })
    })
  } catch (error) {
    console.error('Error in extractDiscordMessages:', error)
    throw error
  }
}

// Clean up contentScriptReadyTabs when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  contentScriptReadyTabs.delete(tabId)
})

// Message listener for extraction requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)
  if (request.action === 'extractMessages') {
    extractDiscordMessages(request.count)
      .then((messages) => sendResponse({ messages }))
      .catch((error) => sendResponse({ error: error.message }))
    return true
  }

  // Add new handler for Google auth
  if (request.action === 'initiateGoogleAuth') {
    initializeGoogleAuth()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  // Add new handler for sign out
  if (request.action === 'signOut') {
    handleSignOut()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
}

// Initialize side panel behavior
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

// Add this after your existing event listeners
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return

  try {
    const { googleToken } = await chrome.storage.local.get('googleToken')

    if (isDiscordUrl(tab.url)) {
      if (googleToken) {
        // Toggle side panel only on Discord pages for authenticated users
        const sidePanel = await chrome.sidePanel.getOptions({ tabId: tab.id })
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          enabled: !sidePanel.enabled,
          path: 'sidepanel.html',
        })
      }
    }
  } catch (error) {
    console.error('Error handling action click:', error)
  }
})

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.googleToken) {
    // Broadcast auth state change to all extension components
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: !!changes.googleToken.newValue,
    })
  }
})

// Check token validity every 15 minutes
setInterval(
  async () => {
    await refreshTokenIfNeeded()
  },
  15 * 60 * 1000,
)

// Add this new function to handle sign out
async function handleSignOut() {
  try {
    // Get the current token
    const { googleToken } = await chrome.storage.local.get('googleToken')

    if (googleToken) {
      // Revoke the token with Google
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`)

      // Remove token from chrome.identity
      await chrome.identity.removeCachedAuthToken({ token: googleToken })
    }

    // Clear all stored tokens and timestamps
    await chrome.storage.local.remove(['googleToken', 'tokenTimestamp', 'lastRefresh'])

    // Broadcast auth state change
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: false,
    })

    console.log('Sign out successful')
    return { success: true }
  } catch (error) {
    console.error('Sign out failed:', error)
    throw error
  }
}

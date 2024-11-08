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
    const auth = await chrome.identity.getAuthToken({ interactive: true })
    await chrome.storage.local.set({ googleToken: auth.token })
    return true
  } catch (error) {
    console.error('Authentication failed:', error)
    throw error
  }
}

// Function to handle tab updates and activations
function handleTabUpdate(tabId: number, url: string | undefined) {
  if (url) {
    setSidePanelForDiscord(tabId, url)
  }
}

// Event listeners for tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabUpdate(tabId, tab.url)
  }
})

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      handleTabUpdate(tab.id!, tab.url)
    }
  })
})

// Keep track of tabs where content script is ready
const contentScriptReadyTabs = new Set<number>()

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'contentScriptReady' && sender.tab?.id) {
    contentScriptReadyTabs.add(sender.tab.id)
  }
})

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
})

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
}

// Initialize side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => handleError(error as Error))

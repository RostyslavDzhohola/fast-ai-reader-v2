import { initializeGoogleAuth, handleSignOut, refreshTokenIfNeeded, checkAuthStatus } from './auth'

console.log('background is running')

// Function to check if a given URL is a Discord URL
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

// Function to set or unset the side panel based on whether the URL is Discord
// async function setSidePanelForDiscord(tabId: number, url: string) {
//   try {
//     if (isDiscordUrl(url)) {
//       await chrome.sidePanel.setOptions({
//         tabId,
//         path: 'sidepanel.html',
//         enabled: true,
//       })
//     } else {
//       await chrome.sidePanel.setOptions({
//         tabId,
//         enabled: false,
//       })
//     }
//   } catch (error) {
//     handleError(error as Error)
//   }
// }

// Message listener for extraction requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request)

  // Add new handler for Google auth
  if (request.action === 'initiateGoogleAuth') {
    initializeGoogleAuth()
      .then((result) => sendResponse(result))
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

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return

  try {
    const isAuthenticated = await checkAuthStatus()

    if (isDiscordUrl(tab.url)) {
      if (isAuthenticated) {
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

// Listen for auth state changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.googleToken) {
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: !!changes.googleToken.newValue,
    })
  }
})

// Check token validity every 15 minutes
setInterval(refreshTokenIfNeeded, 15 * 60 * 1000)

// ... rest of your Discord-related functionality ...

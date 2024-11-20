import { initializeGoogleAuth, handleSignOut, refreshTokenIfNeeded, checkAuthStatus } from './auth'

console.log('background is running')

function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

function handleError(error: Error) {
  console.error('An error occurred:', error.message)
}

// Set up panel behavior when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Don't set openPanelOnActionClick here anymore
  // It will be managed in the click handler
})

// Simplify getCurrentStates to only get side panel state
async function getCurrentStates(tabId: number) {
  try {
    const sidePanelOptions = await chrome.sidePanel.getOptions({ tabId })
    const popupDetails = await chrome.action.getPopup({ tabId })
    return {
      sidePanel: {
        enabled: sidePanelOptions.enabled,
        path: sidePanelOptions.path,
      },
      popup: {
        path: popupDetails,
      },
    }
  } catch (error) {
    console.error('Error getting current states:', error)
    return null
  }
}

// Add this reusable logging function
async function logExtensionState(tab: chrome.tabs.Tab) {
  if (!tab.id || !tab.url) return

  try {
    const isDiscord = isDiscordUrl(tab.url)
    const isAuthenticated = await checkAuthStatus()
    const currentStates = await getCurrentStates(tab.id)

    const expectedStates = {
      sidePanel: {
        enabled: isDiscord && isAuthenticated,
        path: isDiscord && isAuthenticated ? 'sidepanel.html' : '',
      },
      popup: {
        path: !isDiscord || !isAuthenticated ? 'popup.html' : '',
      },
    }

    console.log('🔔 Extension States:', {
      url: tab.url,
      sidePanel: {
        current: currentStates?.sidePanel,
        expected: expectedStates.sidePanel,
        needsUpdate:
          JSON.stringify(currentStates?.sidePanel) !== JSON.stringify(expectedStates.sidePanel),
      },
      popup: {
        current: {
          path: currentStates?.popup?.path || '',
        },
        expected: {
          path: !isDiscord || !isAuthenticated ? 'popup.html' : '',
        },
        needsUpdate:
          currentStates?.popup?.path !== (!isDiscord || !isAuthenticated ? 'popup.html' : ''),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error logging state:', error.message)
      handleError(error)
    }
  }
}

// Modify the extension icon click handler - only adding popup settings
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return

  // Log state immediately when icon is clicked
  await logExtensionState(tab)

  try {
    const isDiscord = isDiscordUrl(tab.url)
    const isAuthenticated = await checkAuthStatus()

    console.log('🎯 Click Handler - URL Check:', {
      url: tab.url,
      isDiscord,
      isAuthenticated,
      timestamp: new Date().toISOString(),
    })

    // For non-Discord pages
    if (!isDiscord) {
      await Promise.all([
        chrome.sidePanel.setOptions({
          tabId: tab.id,
          enabled: false,
        }),
        chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: false,
        }),
        // ADDING POPUP FOR NON-DISCORD PAGES
        chrome.action.setPopup({
          tabId: tab.id,
          popup: 'popup.html',
        }),
      ])
    } else {
      // For Discord pages
      if (isAuthenticated) {
        await Promise.all([
          chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: true,
            path: 'sidepanel.html',
          }),
          chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: true,
          }),
          // CLEAR POPUP FOR AUTHENTICATED DISCORD
          chrome.action.setPopup({
            tabId: tab.id,
            popup: '',
          }),
        ])
      } else {
        // Discord page but not authenticated
        await Promise.all([
          chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: false,
          }),
          chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: false,
          }),
          // ADDING POPUP FOR UNAUTHENTICATED DISCORD
          chrome.action.setPopup({
            tabId: tab.id,
            popup: 'popup.html',
          }),
        ])
      }
    }

    // Log final state after changes
    await logExtensionState(tab)
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

// Add this helper function near the top of the file
async function logSidePanelState(tabId: number) {
  try {
    const options = await chrome.sidePanel.getOptions({ tabId })
    console.log('🔍 Side Panel State:', {
      tabId,
      enabled: options.enabled,
      path: options.path,
      timestamp: new Date().toISOString(),
    })
    return options
  } catch (error) {
    console.error('Error getting side panel state:', error)
    return null
  }
}

// Modify tab update listener to be more strict
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isDiscord = isDiscordUrl(tab.url)
    const isAuthenticated = await checkAuthStatus()

    console.log('📄 Tab Updated:', {
      url: tab.url,
      isDiscord,
      isAuthenticated,
      timestamp: new Date().toISOString(),
    })

    // For non-Discord pages, disable side panel and its availability
    if (!isDiscord) {
      await Promise.all([
        chrome.sidePanel.setOptions({
          tabId,
          enabled: false,
        }),
        chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: false,
        }),
      ])
    } else {
      // For Discord pages
      if (isAuthenticated) {
        await Promise.all([
          chrome.sidePanel.setOptions({
            tabId,
            enabled: true,
            path: 'sidepanel.html',
          }),
          chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: true,
          }),
        ])
      } else {
        // Discord page but not authenticated
        await Promise.all([
          chrome.sidePanel.setOptions({
            tabId,
            enabled: false,
          }),
          chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: false,
          }),
        ])
      }
    }

    // Log state after update
    if (tab.id) {
      await logExtensionState(tab)
    }
  }
})

// Token refresh
setInterval(refreshTokenIfNeeded, 15 * 60 * 1000)

// Remove the incorrect onChanged listener and replace with a polling mechanism
let sidePanelState = new Map<number, boolean>()

// Function to check side panel state
async function checkSidePanelState(tabId: number) {
  try {
    const options = await chrome.sidePanel.getOptions({ tabId })
    const currentState = options.enabled
    const previousState = sidePanelState.get(tabId)

    // Get the current tab to access its URL
    const currentTab = await chrome.tabs.get(tabId)
    const url = currentTab?.url || 'unknown'
    const isDiscord = url !== 'unknown' ? isDiscordUrl(url) : false

    // If not on Discord, ensure side panel is disabled
    if (!isDiscord && currentState) {
      console.log('📌 Forcing side panel disable for non-Discord page:', {
        tabId,
        url,
        currentState,
      })

      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false,
      })

      // Update currentState after forcing disable
      const updatedOptions = await chrome.sidePanel.getOptions({ tabId })
      sidePanelState.set(tabId, updatedOptions.enabled)

      console.log('Side panel state corrected:', {
        tabId,
        previousState,
        currentState: updatedOptions.enabled,
        url,
        isDiscordPage: isDiscord,
        timestamp: new Date().toISOString(),
      })
    } else if (previousState !== currentState) {
      console.log('Side panel state changed:', {
        tabId,
        previousState,
        currentState,
        url,
        isDiscordPage: isDiscord,
        timestamp: new Date().toISOString(),
      })

      sidePanelState.set(tabId, currentState)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking side panel state:', {
        error: error.message,
        tabId,
        timestamp: new Date().toISOString(),
      })
      handleError(error)
    }
  }
}

// Add tab listener to track new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    sidePanelState.set(tab.id, false)
  }
})

// Clean up removed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  sidePanelState.delete(tabId)
})

// Check state periodically
setInterval(async () => {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id && tab.url) {
      const isDiscord = isDiscordUrl(tab.url)
      if (!isDiscord) {
        // Force disable for non-Discord pages
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          enabled: false,
        })
      }
      await checkSidePanelState(tab.id)
    }
  }
}, 1000) // Check every second

// Add initialization on extension startup with immediate disable
chrome.runtime.onStartup.addListener(async () => {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      // Always start with disabled state
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        enabled: false,
      })

      if (tab.url) {
        const isDiscord = isDiscordUrl(tab.url)
        console.log('🚀 Startup - Initial side panel state:', {
          tabId: tab.id,
          url: tab.url,
          isDiscord,
        })

        // Only potentially enable if it's Discord
        if (isDiscord) {
          const isAuthenticated = await checkAuthStatus()
          if (isAuthenticated) {
            await chrome.sidePanel.setOptions({
              tabId: tab.id,
              enabled: true,
              path: 'sidepanel.html',
            })
          }
        }
      }
      await logSidePanelState(tab.id)
    }
  }
})

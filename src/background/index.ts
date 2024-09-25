console.log('background is running')

// Function to check if the URL is discord.com
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return
  const url = new URL(tab.url)
  // enable the side panel on the discord url
  if (isDiscordUrl(url.origin)) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    })
  } else {
    // disable the side panel on all other urls
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    })
  }
})

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
  console.error('Error setting side panel behavior:', err)
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request)
  if (request.type === 'GET_CURRENT_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        console.log('Sending URL to popup:', tabs[0].url)
        sendResponse({ url: tabs[0].url })
      } else {
        console.error('Unable to get current URL')
        sendResponse({ url: 'Unable to get current URL' })
      }
    })
    return true
  }
})

// Event listener for tab updates (page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Page loaded:', tab.url)
    if (isDiscordUrl(tab.url)) {
      console.log('Setting side panel for Discord URL')
      chrome.sidePanel.setOptions({ path: 'sidepanel.html', tabId: tab.id }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error setting side panel:', chrome.runtime.lastError)
        } else {
          console.log('Side panel set successfully')
        }
      })
    }
  }
})

// Event listener for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, async (tab) => {
    if (tab.url) {
      console.log('Tab activated:', tab.url)
      if (isDiscordUrl(tab.url)) {
        await chrome.sidePanel.setOptions({
          tabId: activeInfo.tabId,
          path: 'sidepanel.html',
          enabled: true,
        })
      }
    }
  })
})

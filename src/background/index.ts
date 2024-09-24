console.log('background is running')

// Function to open the popup
function openPopup() {
  chrome.action.openPopup()
}

// Function to check if the URL is discord.com
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

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
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Page loaded:', tab.url)
    if (isDiscordUrl(tab.url)) {
      openPopup()
    }
  }
})

// Event listener for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      console.log('Tab activated:', tab.url)
      if (isDiscordUrl(tab.url)) {
        openPopup()
      }
    }
  })
})

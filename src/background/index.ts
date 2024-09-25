console.log('background is running')

// Function to check if a given URL is a Discord URL
function isDiscordUrl(url: string): boolean {
  return url.includes('discord.com')
}

// Function to set or unset the side panel based on whether the URL is Discord
async function setSidePanelForDiscord(tabId: number, url: string) {
  if (isDiscordUrl(url)) {
    console.log('Setting side panel for Discord URL')
    // Enable the side panel for Discord URLs
    await chrome.sidePanel
      .setOptions({
        tabId,
        path: 'sidepanel.html', // Path to the side panel HTML file
        enabled: true,
      })
      .catch((err) => console.error('Error setting side panel:', err))
  } else {
    // Disable the side panel for non-Discord URLs
    await chrome.sidePanel
      .setOptions({
        tabId,
        enabled: false,
      })
      .catch((err) => console.error('Error disabling side panel:', err))
  }
}

// Function to handle tab updates and activations
function handleTabUpdate(tabId: number, url: string | undefined) {
  if (url) {
    console.log('Tab updated or activated:', url)
    setSidePanelForDiscord(tabId, url)
  }
}

// Event listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only proceed if the tab has finished loading and has a URL
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabUpdate(tabId, tab.url)
  }
})

// Event listener for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      handleTabUpdate(tab.id!, tab.url)
    }
  })
})

// Set the side panel to open when the extension action is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
  console.error('Error setting side panel behavior:', err)
})

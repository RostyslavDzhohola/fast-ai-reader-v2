console.log('background is running')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request) // Log received message
  if (request.type === 'GET_CURRENT_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        console.log('Sending URL to popup:', tabs[0].url) // Log URL being sent
        sendResponse({ url: tabs[0].url })
      } else {
        console.error('Unable to get current URL') // Log error
        sendResponse({ url: 'Unable to get current URL' })
      }
    })
    return true // Indicates that we will send a response asynchronously
  }
})

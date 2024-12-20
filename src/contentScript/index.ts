console.info('contentScript is running')

// TODO: fix a bug in scrolling feature. When scanning more than 200 msgs, it doens't scrape the all the messages, some get lost.

// TODO: reduce the scroling speed
// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' })

// Add this helper function at the top level
async function scrollToBottom() {
  try {
    const scroller = document.querySelector(
      'div[class*="scroller_e2e187"][class*="customTheme_"]',
    ) as HTMLElement

    if (!scroller) {
      console.error('Could not find scroller element for bottom scroll')
      return
    }

    // Smooth scroll to bottom
    scroller.style.scrollBehavior = 'smooth'
    scroller.scrollTop = scroller.scrollHeight

    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Reset scroll behavior
    scroller.style.scrollBehavior = ''

    console.log('Scrolled back to bottom')
  } catch (error) {
    console.error('Error scrolling to bottom:', error)
  }
}

// Function to extract messages from Discord
async function extractMessages(count: number): Promise<string[]> {
  console.log('Starting message extraction, requested count:', count)
  const messages: string[] = []

  // Get chat container with more detailed error checking
  const chatContainer = document.querySelector('[class*="messagesWrapper_"]') as HTMLElement
  if (!chatContainer) {
    console.error('Chat container not found')
    return messages
  }

  // Try to find Discord's internal message list component
  async function triggerMessageLoad(): Promise<boolean> {
    try {
      const scroller = document.querySelector(
        'div[class*="scroller_e2e187"][class*="customTheme_"]',
      ) as HTMLElement

      if (!scroller) {
        console.error('Could not find scroller element')
        return false
      }

      // Log initial state
      const initialMessages = document.querySelectorAll('[id^="chat-messages-"]')
      console.log('Initial state:', {
        messageCount: initialMessages.length,
        scrollTop: scroller.scrollTop,
        scrollHeight: scroller.scrollHeight,
      })

      // Gradually scroll up in smaller increments
      scroller.style.scrollBehavior = 'auto'

      // Start from current position
      let currentScrollTop = scroller.scrollTop
      const scrollIncrement = 1500 // Increased from 1500 to 2000
      const scrollDelay = 500 // Increased from 500 to 600

      // Scroll up gradually
      while (currentScrollTop > 0) {
        // Calculate next scroll position
        currentScrollTop = Math.max(0, currentScrollTop - scrollIncrement)
        scroller.scrollTop = currentScrollTop

        // Dispatch scroll event
        scroller.dispatchEvent(new Event('scroll', { bubbles: true }))

        // Give Discord time to load and render messages
        await new Promise((resolve) => setTimeout(resolve, scrollDelay))

        // Check if we loaded new messages
        const newMessageCount = document.querySelectorAll('[id^="chat-messages-"]').length
        console.log('Scroll progress:', {
          currentScrollTop,
          messageCount: newMessageCount,
          scrollHeight: scroller.scrollHeight,
        })

        if (newMessageCount > initialMessages.length) {
          console.log('Successfully loaded new messages:', {
            before: initialMessages.length,
            after: newMessageCount,
          })
          return true
        }

        // Safety check - if we're at the top and no new messages, stop
        if (currentScrollTop === 0 && newMessageCount === initialMessages.length) {
          console.log('Reached top without loading new messages')
          break
        }
      }

      // Reset scroll behavior
      scroller.style.scrollBehavior = ''

      return false
    } catch (error) {
      console.error('Error in triggerMessageLoad:', error)
      return false
    }
  }

  function extractMessages() {
    const messageGroups = document.querySelectorAll('[id^="chat-messages-"]')
    let currentUsername = ''
    let currentTimestamp = ''

    messageGroups.forEach((group) => {
      const usernameElement = group.querySelector('span[id^="message-username-"]')
      const timestampElement = group.querySelector('time')
      const contentElements = group.querySelectorAll('div[id^="message-content-"]')

      if (usernameElement && timestampElement) {
        currentUsername = usernameElement.textContent?.trim() || 'Unknown User'
        currentTimestamp = timestampElement.textContent?.trim() || 'Unknown Time'
      }

      contentElements.forEach((contentElement) => {
        const content = contentElement.textContent?.trim() || ''
        if (content) {
          const formattedMessage = `${currentUsername} | ${currentTimestamp}\n${content}\n`
          if (!messages.includes(formattedMessage)) {
            messages.push(formattedMessage)
          }
        }
      })
    })
  }

  // First extraction of currently visible messages
  extractMessages()

  // Keep trying to load more messages until we have enough
  const maxAttempts = 20
  let attempts = 0

  while (messages.length < count && attempts < maxAttempts) {
    console.log(`Current message count: ${messages.length}, Target: ${count}`)

    // Try to load more messages first
    const loaded = await triggerMessageLoad()
    if (!loaded) {
      console.log('Failed to load more messages, waiting longer...')
      // Wait longer between attempts
      await new Promise((resolve) => setTimeout(resolve, 2000))
      attempts++

      if (attempts >= maxAttempts) {
        console.log('Max attempts reached, stopping')
        break
      }
      continue
    }

    // Extract messages after successful load
    extractMessages()

    // Add a delay between successful loads
    await new Promise((resolve) => setTimeout(resolve, 500))
    attempts++
  }

  console.log(
    `Extracted ${messages.length} messages out of ${count} requested after ${attempts} load attempts`,
  )

  // Scroll back to bottom before returning
  await scrollToBottom()

  return messages.slice(-count)
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request)

  if (request.action === 'extractMessages') {
    extractMessages(request.count).then((messages) => {
      console.log('Successfully extracted messages:', {
        count: messages.length,
        sample: messages[0]?.substring(0, 100),
      })
      sendResponse({ messages })
    })
  }
  return true
})

console.log('%cContent Script Loaded', 'color: #00ff00; font-size: 20px; font-weight: bold;')

console.info('contentScript is running')

// Notify background script that content script is ready
chrome.runtime.sendMessage({ action: 'contentScriptReady' })

// Add this helper function at the top level
async function scrollToBottom() {
  try {
    // Updated selector to match Discord's current class names
    const scroller = document.querySelector(
      'div[class*="scroller"][class*="customTheme"][class*="auto"]',
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
async function extractMessagesFromDiscord(count: number): Promise<string[]> {
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
      // Updated selector to match Discord's current class names
      const scroller = document.querySelector(
        'div[class*="scroller"][class*="customTheme"][class*="auto"]',
      ) as HTMLElement

      if (!scroller) {
        return false
      }

      // Log initial state
      const initialMessages = document.querySelectorAll('[id^="chat-messages-"]')

      // Gradually scroll up in smaller increments
      scroller.style.scrollBehavior = 'auto'

      // Start from current position
      let currentScrollTop = scroller.scrollTop
      const scrollIncrement = 2000
      const scrollDelay = 600

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

        if (newMessageCount > initialMessages.length) {
          return true
        }

        // Safety check - if we're at the top and no new messages, stop
        if (currentScrollTop === 0 && newMessageCount === initialMessages.length) {
          break
        }
      }

      // Reset scroll behavior
      scroller.style.scrollBehavior = ''

      return false
    } catch (error) {
      return false
    }
  }

  function parseVisibleMessages() {
    const messageGroups = document.querySelectorAll('[id^="chat-messages-"]')
    const messagesArray: { timestamp: Date; message: string }[] = []
    let currentUsername = ''
    let currentTimestamp = ''

    messageGroups.forEach((group) => {
      const usernameElement = group.querySelector('span[id^="message-username-"]')
      const timestampElement = group.querySelector('time')
      const contentElements = group.querySelectorAll('div[id^="message-content-"]')

      if (usernameElement && timestampElement) {
        currentUsername = usernameElement.textContent?.trim() || 'Unknown User'
        currentTimestamp = timestampElement.textContent?.trim() || 'Unknown Time'

        // Parse the timestamp into a Date object
        const date = timestampElement.getAttribute('datetime')
        const parsedDate = date ? new Date(date) : new Date()

        contentElements.forEach((contentElement) => {
          const content = contentElement.textContent?.trim() || ''
          if (content) {
            const formattedMessage = `${currentUsername} | ${currentTimestamp}\n${content}\n`
            messagesArray.push({
              timestamp: parsedDate,
              message: formattedMessage,
            })
          }
        })
      }
    })

    // Sort messages by timestamp
    messagesArray.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Clear the messages array and add sorted messages
    messages.length = 0
    messagesArray.forEach(({ message }) => {
      if (!messages.includes(message)) {
        messages.push(message)
      }
    })
  }

  // Main workflow
  parseVisibleMessages()

  // Keep trying to load more messages until we have enough
  const maxAttempts = 20
  let attempts = 0

  while (messages.length < count && attempts < maxAttempts) {
    // Try to load more messages first
    const loaded = await triggerMessageLoad()
    if (!loaded) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      attempts++

      if (attempts >= maxAttempts) {
        break
      }
      continue
    }

    // Extract messages after successful load
    parseVisibleMessages()

    // Add a delay between successful loads
    await new Promise((resolve) => setTimeout(resolve, 500))
    attempts++
  }

  // console.log(`Total messages extracted: ${messages.length}`)

  // Scroll back to bottom before returning
  await scrollToBottom()

  return messages.slice(-count)
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request)

  if (request.action === 'extractMessages') {
    extractMessagesFromDiscord(request.count).then((messages) => {
      console.log('Successfully extracted messages:', {
        count: messages.length,
        sample: messages[0]?.substring(0, 100),
      })
      sendResponse({ messages })
    })
  }

  if (request.action === 'find_username') {
    try {
      console.log('%cSearching for username', 'color: #ff00ff; font-size: 16px;')

      // First attempt: Try to clear existing search
      // Look for the 'X' button in the search bar to clear any existing search
      const clearButton = document.querySelector('.iconContainer_fea832')
      if (clearButton) {
        console.log('Found clear button, clicking it')
        ;(clearButton as HTMLElement).click()

        // Wait a bit for the clear animation to complete
        setTimeout(() => {
          // Find Discord's search bar and its DraftEditor (rich text input)
          // DraftEditor is React's rich text editor that Discord uses
          const editorContent = document.querySelector(
            'div[class*="searchBar_"] div[class*="DraftEditor-content"]',
          ) as HTMLElement
          if (!editorContent) {
            console.error('Editor content not found')
            return
          }

          // Set focus to the editor so it's ready to receive input
          // This shows the blinking cursor in the search field
          editorContent.focus()

          // Create a clipboard event to simulate pasting text
          // This works better than directly setting textContent
          const clipboardData = new DataTransfer()
          clipboardData.setData('text/plain', `from: ${request.username}`)

          // Create and dispatch a paste event
          // bubbles: true allows Discord to detect the change
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData,
          })

          // Trigger the paste event on the editor
          editorContent.dispatchEvent(pasteEvent)

          // Wait for Discord to process the search and show results
          setTimeout(() => {
            // First try to find and click the first result
            // Discord shows results with this class when there's a direct match
            const firstResult = document.querySelector('div[class*="content_b0286e"]')
            if (firstResult) {
              console.log('Found first result, clicking it')
              ;(firstResult as HTMLElement).click()
            } else {
              // If no direct result, check for return button
              const returnButton = document.querySelector('span[class*="key_"]')
              if (returnButton) {
                console.log('Found return button, simulating Enter key')
                editorContent.dispatchEvent(
                  new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                  }),
                )
              } else {
                console.error('Neither result nor return button found')
              }
            }
          }, 201) // Give Discord time to show search results

          console.log('Successfully set search text:', request.username)
        }, 100)
      } else {
        console.log('No clear button found, proceeding with search')
        // ... rest of the existing search code ...
      }
    } catch (error) {
      console.error('%cError in username search:', 'color: red; font-size: 16px;', error)
    }
  }

  return true
})

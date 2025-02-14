import { useEffect, useRef, useState } from 'react'

type UseScrollProps = {
  isLoading: boolean
  messagesLength: number
}

export const useScroll = ({ isLoading, messagesLength }: UseScrollProps) => {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Function to check if user is near bottom
  const isNearBottom = () => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current
      const threshold = 100 // pixels from bottom
      return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
    }
    return true
  }

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (!shouldAutoScroll || isLoading) return

    // Handle scroll for output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }

    // Handle scroll for chat container
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    // Update shouldAutoScroll when user scrolls
    const handleScroll = () => {
      setShouldAutoScroll(isNearBottom())
    }

    // Add scroll event listener
    const container = chatContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
    }

    // Scroll when messages change only if we should auto-scroll
    if (shouldAutoScroll) {
      scrollToBottom()
    }

    // Add event listener for when side panel becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldAutoScroll) {
        scrollToBottom()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (container) {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }, [messagesLength, shouldAutoScroll, isLoading]) // Watch messagesLength, shouldAutoScroll, and isLoading states

  return {
    chatContainerRef,
    outputRef,
    shouldAutoScroll,
    scrollToBottom,
  }
}

export default useScroll

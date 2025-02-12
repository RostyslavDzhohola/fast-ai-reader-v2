import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import './SidePanel.css';
import { useChat } from 'ai/react';
import { isGuildRestricted } from '../config/restrictions';
import ReactMarkdown from 'react-markdown';
// Add near the top, after imports
const logPrefix = '[SidePanel]';
// Error message component
const ErrorMessage = ({ error, onDismiss, }) => {
    return (_jsx("div", { className: `error-message error-${error.type}`, children: _jsxs("div", { className: "error-content", children: [_jsx("span", { children: error.message }), _jsx("button", { onClick: onDismiss, className: "error-dismiss", children: "\u00D7" })] }) }));
};
// Rename to handleSearchUsernameClick and update message format
const handleSearchUsernameClick = (text) => {
    console.log(`${logPrefix} Searching for username:`, text);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'find_username',
                username: text,
            });
        }
    });
};
// Track if text is both bold and italic
let isBoldAndItalic = false;
// Add this component for blocked guild message in side panel
const BlockedGuildView = () => {
    return (_jsx("div", { className: "blocked-guild-container", children: _jsxs("div", { className: "blocked-guild-content", children: [_jsx("h2", { children: "Access Restricted" }), _jsx("p", { children: "This Discord server has been restricted from using the AI Assistant extension." })] }) }));
};
export const SidePanel = () => {
    const [authToken, setAuthToken] = useState('');
    const [currentError, setCurrentError] = useState(null);
    // Function to create error state
    const createError = (type, message) => ({
        type,
        message,
        timestamp: Date.now(),
    });
    // Function to handle error dismissal
    const handleErrorDismiss = () => {
        setCurrentError(null);
    };
    // Function to handle different types of errors
    const handleError = (error) => {
        console.error(`${logPrefix} Error occurred:`, error);
        if (error.message?.includes('Failed to parse stream')) {
            setCurrentError(createError('stream', 'There was an error processing the AI response. Please try again.'));
        }
        else if (error.message?.includes('unauthorized') || error.status === 401) {
            setCurrentError(createError('auth', 'Your session has expired. Please sign in again.'));
            // Trigger sign out flow
            chrome.runtime.sendMessage({ action: 'SIGN_OUT' });
        }
        else if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
            setCurrentError(createError('network', 'Network error. Please check your connection and try again.'));
        }
        else {
            setCurrentError(createError('unknown', 'An unexpected error occurred. Please try again.'));
        }
    };
    useEffect(() => {
        chrome.storage.local.get('authToken').then((result) => {
            if (result.authToken) {
                // console.log(`${logPrefix} Auth token loaded from storage`)
                setAuthToken(result.authToken);
            }
            else {
                console.warn(`${logPrefix} No auth token found in storage`);
            }
        });
    }, []);
    // useEffect(() => {
    //   if (authToken) {
    //     console.log(`${logPrefix} Current auth token:`, {
    //       token: authToken,
    //       length: authToken.length,
    //       prefix: authToken.substring(0, 15) + '...',
    //     })
    //   }
    // }, [authToken])
    const { messages: aiMessages, input, handleInputChange, handleSubmit: originalHandleSubmit, error, isLoading, setMessages, append, } = useChat({
        api: 'http://localhost:3000/api/chat', // For local testing, don't forget to switch to, from HTTPS to HTTP.
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
        },
        credentials: 'same-origin',
        initialMessages: [],
        streamProtocol: 'text', // Required in 4.1+ to handle text-based streaming responses
        onResponse: (response) => {
            // Clear any existing errors when we get a successful response
            setCurrentError(null);
            console.log(`${logPrefix} Request details:`, {
                url: response.url,
                method: response.type,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
            });
        },
        onError: (error) => {
            handleError(error);
            console.error(`${logPrefix} Chat error:`, {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
            if (error instanceof Response) {
                console.error(`${logPrefix} Response error details:`, {
                    status: error.status,
                    statusText: error.statusText,
                    headers: Object.fromEntries(error.headers.entries()),
                });
            }
        },
    });
    // Modify handleSubmit to use append instead of direct storage
    const handleSubmit = async (e) => {
        if (!input.trim())
            return;
        // Create user message
        const userMessage = {
            content: input,
            role: 'user',
            id: Date.now().toString(),
        };
        // Use append to add the message (this will trigger the useEffect)
        append(userMessage);
        // Call original submit handler
        await originalHandleSubmit(e);
    };
    // Update the handleKeyDown to use new handleSubmit
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading) {
            // console.log(`${logPrefix} Submitting message with auth:`, {
            //   hasToken: !!authToken,
            //   tokenLength: authToken?.length,
            //   tokenPrefix: authToken ? `${authToken.substring(0, 15)}...` : 'none',
            //   input,
            // })
            e.preventDefault();
            handleSubmit(e);
        }
    };
    // console.log('Side panel component mounted')
    const [chatHistory, setChatHistory] = useState([]);
    const outputRef = useRef(null);
    const chatContainerRef = useRef(null);
    // New state for modal and message count
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [messageCount, setMessageCount] = useState(100); // Default to 10 messages
    // Add this state near your other state declarations
    const [isSignedIn, setIsSignedIn] = useState(true);
    // Load chat history and API key when component mounts
    useEffect(() => {
        console.log(`${logPrefix} Component mounting...`);
        loadChatHistory();
        // Notify background script that side panel is ready
        chrome.runtime.sendMessage({ action: 'sidePanelReady' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error notifying background script:', chrome.runtime.lastError);
            }
            else {
                console.log('Background script notified of side panel ready state');
            }
        });
        const handleMessage = (message) => {
            console.log(`${logPrefix} Received message:`, message);
            if (message.action === 'reloadSidePanel') {
                console.log(`${logPrefix} Reloading side panel...`);
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        console.log(`${logPrefix} Component mounted successfully`);
        return () => {
            console.log(`${logPrefix} Component unmounting...`);
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);
    // Add this state to track if user is at bottom
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    useEffect(() => {
        // Function to check if user is near bottom
        const isNearBottom = () => {
            if (chatContainerRef.current) {
                const container = chatContainerRef.current;
                const threshold = 100; // pixels from bottom
                return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
            }
            return true;
        };
        // Function to scroll to bottom
        const scrollToBottom = () => {
            if (!shouldAutoScroll || isLoading)
                return;
            // Handle scroll for output
            if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
            // Handle scroll for chat container
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        };
        // Update shouldAutoScroll when user scrolls
        const handleScroll = () => {
            setShouldAutoScroll(isNearBottom());
        };
        // Add scroll event listener
        const container = chatContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        // Scroll when messages change only if we should auto-scroll
        if (shouldAutoScroll) {
            scrollToBottom();
        }
        // Add event listener for when side panel becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && shouldAutoScroll) {
                scrollToBottom();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [chatHistory, aiMessages, shouldAutoScroll]); // Watch shouldAutoScroll state too
    const loadChatHistory = () => {
        chrome.storage.local.get(['chatHistory'], (result) => {
            if (result.chatHistory) {
                setChatHistory(result.chatHistory);
            }
        });
    };
    const handleResetChat = () => {
        setMessages([]);
        chrome.storage.local.remove('aiMessages').then(() => {
            console.log(`${logPrefix} Chat history cleared from storage`);
        });
    };
    const handleResearchClick = () => {
        // TODO: rebuild to use the new flow from useChat
        setIsModalOpen(true);
    };
    const handleModalSubmit = () => {
        console.log(`${logPrefix} Requesting to extract ${messageCount} messages`);
        chrome.runtime.sendMessage({
            action: 'extractMessages',
            count: messageCount,
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`${logPrefix} Error:`, chrome.runtime.lastError);
                return;
            }
            try {
                if (response?.messages && Array.isArray(response.messages)) {
                    console.log(`${logPrefix} Received ${response.messages.length} messages`);
                    processReceivedMessages(response.messages);
                }
                else {
                    console.error(`${logPrefix} Invalid response format:`, response);
                }
            }
            catch (error) {
                console.error(`${logPrefix} Processing error:`, error);
            }
        });
        setIsModalOpen(false);
    };
    // Add new state for collapsed messages
    const [collapsedMessages, setCollapsedMessages] = useState(new Set());
    // Add toggle function
    const toggleMessageCollapse = (messageId) => {
        setCollapsedMessages((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            }
            else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };
    // Add state for custom instructions
    const [customInstructions, setCustomInstructions] = useState('');
    // Update processReceivedMessages to use custom instructions if provided
    const processReceivedMessages = (messages) => {
        const formattedMessages = messages.map((msg) => {
            const lines = msg.split('\n');
            if (lines.length >= 2) {
                return `<span class="message-header">${lines[0]}</span>${lines.slice(1).join('\n')}`;
            }
            return msg;
        });
        const messagesText = formattedMessages.join('\n');
        const messageId = Date.now().toString();
        // Use custom instructions if provided, otherwise use default
        const instructionText = customInstructions.trim()
            ? customInstructions.trim()
            : 'Please analyze these messages and be ready to answer questions about them.';
        const aiMessage = {
            role: 'user',
            content: `I have extracted ${messages.length} messages from a Discord chat. ${instructionText} Here are the messages:\n\n${messagesText}`,
            id: messageId,
            isExtracted: true,
            messageCount: messages.length,
        };
        console.log(`${logPrefix} Sending message to AI:`, aiMessage);
        setCollapsedMessages((prev) => new Set(prev).add(messageId));
        append(aiMessage);
        // Reset custom instructions after sending
        setCustomInstructions('');
    };
    const handleContactClick = () => {
        window.location.href =
            'mailto:rostyslav.dzhohola@pm.me?subject=Feedback%20on%20Discord%20AI%20Extension';
    };
    // Add error effect to log any chat errors
    useEffect(() => {
        if (error) {
            console.error(`${logPrefix} Chat error occurred:`, error);
        }
    }, [error]);
    // Add loading state effect
    useEffect(() => {
        console.log(`${logPrefix} Chat loading state:`, isLoading);
    }, [isLoading]);
    // Update the auth state effect to also handle message loading
    useEffect(() => {
        const loadStoredMessages = () => {
            chrome.storage.local.get('aiMessages').then((result) => {
                if (result.aiMessages) {
                    // console.log(`${logPrefix} Loading ${result.aiMessages.length} messages from storage`)
                    setMessages(result.aiMessages);
                }
            });
        };
        const handleAuthStateChange = (message) => {
            if (message.action === 'AUTH_STATE_CHANGED') {
                console.log('Auth state changed:', message.state);
                if (message.state === 'SIGNED_IN') {
                    setIsSignedIn(true);
                    setAuthToken(message.token);
                    console.log('User signed in, token:', message.token);
                    // Load messages when user signs in
                    loadStoredMessages();
                }
                else if (message.state === 'SIGNED_OUT') {
                    setIsSignedIn(false);
                    setAuthToken('');
                    setMessages([]);
                    console.log('User signed out');
                }
            }
        };
        // Check initial auth state and load messages if authenticated
        chrome.storage.local.get(['authToken', 'aiMessages'], (result) => {
            if (result.authToken) {
                setIsSignedIn(true);
                setAuthToken(result.authToken);
                // Load messages on initial mount if user is authenticated
                if (result.aiMessages) {
                    console.log(`${logPrefix} Initial load: ${result.aiMessages.length} messages`);
                    setMessages(result.aiMessages);
                }
            }
        });
        chrome.runtime.onMessage.addListener(handleAuthStateChange);
        return () => chrome.runtime.onMessage.removeListener(handleAuthStateChange);
    }, []);
    // Add this component for the signed-out state
    const SignedOutView = () => {
        const handleOptionsClick = () => {
            chrome.runtime.openOptionsPage();
        };
        return (_jsx("div", { className: "signed-out-container", children: _jsxs("div", { className: "signed-out-content", children: [_jsx("h2", { children: "Not Signed In" }), _jsx("p", { children: "You need to be signed in to use the Discord AI Assistant." }), _jsx("button", { onClick: handleOptionsClick, className: "sign-in-button", children: "Go to Sign In" })] }) }));
    };
    // Keep the existing useEffect for storage - it will now handle both user and AI messages
    useEffect(() => {
        if (aiMessages.length > 0) {
            chrome.storage.local.set({ aiMessages }).then(() => {
                // console.log(`${logPrefix} Saved ${aiMessages.length} messages to storage`, {
                //   lastMessage: aiMessages[aiMessages.length - 1],
                // })
            });
        }
    }, [aiMessages]);
    // TODO: Add jump to bottom button whenever I am scrolling up.
    // TODO: Add loading messages icon while it is scanning the messages on the discord channel.
    // TODO: Move the summary of the messages how many were extracted and their dates at the bottom of the message.
    // TODO: make the loading of the stream of the chat reply smoother
    // TODO: add button for choosing which OpenAI model to use.
    // Add URL change listener
    const [isBlockedGuild, setIsBlockedGuild] = useState(false);
    useEffect(() => {
        const handleUrlChange = (message) => {
            if (message.action === 'URL_CHANGED') {
                console.log(`${logPrefix} URL changed:`, message);
                setIsBlockedGuild(message.isBlocked);
            }
        };
        // Add message listeners for both runtime and tabs
        chrome.runtime.onMessage.addListener(handleUrlChange);
        // Check current URL on mount and set up interval to check periodically
        const checkCurrentUrl = async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                // Extract guild ID from Discord URL
                const guildMatch = tab.url.match(/discord\.com\/channels\/(\d+)/);
                const guildId = guildMatch ? guildMatch[1] : null;
                const isBlocked = guildId ? isGuildRestricted(guildId) : false;
                setIsBlockedGuild(isBlocked);
            }
        };
        // Check immediately on mount
        checkCurrentUrl();
        // Set up periodic check every second
        const intervalId = setInterval(checkCurrentUrl, 1000);
        // Request initial state from background
        chrome.runtime.sendMessage({ action: 'sidePanelReady' });
        return () => {
            chrome.runtime.onMessage.removeListener(handleUrlChange);
            clearInterval(intervalId);
        };
    }, []);
    // Add new state for help modal
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    // Modify the main render to show blocked state
    return (_jsxs("main", { className: "side-panel", children: [currentError && _jsx(ErrorMessage, { error: currentError, onDismiss: handleErrorDismiss }), isBlockedGuild ? (_jsx(BlockedGuildView, {})) : isSignedIn ? (
            // Your existing chat UI
            _jsxs(_Fragment, { children: [_jsxs("div", { className: "button-container", children: [_jsx("button", { onClick: handleResetChat, className: "reset-button", children: "Clear Chat" }), _jsx("button", { onClick: handleResearchClick, className: "research-button", children: "Research" }), _jsx("div", { style: { flexGrow: 1 } }), _jsx("button", { onClick: () => setIsHelpModalOpen(true), className: "help-icon", children: "?" }), _jsx("button", { onClick: handleContactClick, className: "contact-button", children: "Contact" })] }), _jsx("div", { className: "chat-container", ref: chatContainerRef, children: _jsx("div", { className: "messages", ref: outputRef, children: aiMessages.length > 0 ? (aiMessages.map((message) => (_jsx("div", { className: `message ${message.role} ${message.isExtracted ? 'extracted' : ''}`, onClick: () => message.isExtracted ? toggleMessageCollapse(message.id) : undefined, style: { cursor: message.isExtracted ? 'pointer' : 'default' }, children: message.isExtracted ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "extracted-header", children: [`${message.messageCount} Messages Extracted`, _jsx("span", { className: "collapse-indicator", children: collapsedMessages.has(message.id) ? '▼' : '▲' })] }), !collapsedMessages.has(message.id) && (_jsx("pre", { dangerouslySetInnerHTML: { __html: message.content } }))] })) : (_jsx(ReactMarkdown, { components: {
                                        strong: ({ node, children }) => _jsx("strong", { children: children }),
                                        em: ({ node, children }) => (_jsx("em", { onClick: () => handleSearchUsernameClick(String(children)), style: { cursor: 'pointer' }, children: children })),
                                    }, children: message.content })) }, message.id)))) : (_jsx("div", { className: "empty-chat", children: "AI response will appear here..." })) }) }), _jsxs("div", { className: "input-container", children: [_jsx("input", { type: "text", value: input, onChange: handleInputChange, onKeyDown: handleKeyDown, placeholder: "Type your message here...", className: "prompt-input", disabled: isLoading }), _jsx("button", { onClick: (e) => handleSubmit(e), disabled: isLoading || !input.trim(), className: "ask-button", children: isLoading ? 'Asking...' : 'Ask' })] }), isModalOpen && (_jsx("div", { className: "modal", children: _jsxs("div", { className: "modal-content", children: [_jsx("h2", { children: "Research" }), _jsxs("div", { className: "modal-section number-input", children: [_jsx("label", { children: "Number of messages to analyze" }), _jsx("input", { type: "number", value: messageCount || '', onChange: (e) => {
                                                const value = e.target.value;
                                                // Only update if the value is empty or a positive number
                                                if (value === '' || parseInt(value) > 0) {
                                                    setMessageCount(value === '' ? 0 : parseInt(value));
                                                }
                                            }, min: "1", placeholder: "1" })] }), _jsxs("div", { className: "modal-section textarea-input", children: [_jsx("label", { children: "Custom Instructions (Optional)" }), _jsx("textarea", { value: customInstructions, onChange: (e) => setCustomInstructions(e.target.value), placeholder: "Please analyze these messages and be ready to answer questions about them.", rows: 4 })] }), _jsxs("div", { className: "modal-buttons", children: [_jsx("button", { onClick: handleModalSubmit, disabled: !messageCount || messageCount < 1, children: "Submit" }), _jsx("button", { onClick: () => {
                                                setIsModalOpen(false);
                                                setCustomInstructions('');
                                                setMessageCount(1); // Reset to 1 instead of 0
                                            }, children: "Cancel" })] })] }) })), isHelpModalOpen && (_jsx("div", { className: "modal", onClick: () => setIsHelpModalOpen(false), children: _jsxs("div", { className: "modal-content help-modal", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: "Important Notice for Moderators" }), _jsx("button", { className: "close-button", onClick: () => setIsHelpModalOpen(false), children: "\u00D7" })] }), _jsxs("div", { className: "modal-body", children: [_jsx("p", { children: "If you don't want this tool to be used on your Discord server, please contact us and we will remove access of this extension from your server." }), _jsx("button", { className: "contact-button-primary", onClick: () => {
                                                const emailSubject = encodeURIComponent('Please remove my Discord server from Fast AI Reader');
                                                const emailBody = encodeURIComponent('Please specify your Discord server URL here:\n\n');
                                                window.location.href = `mailto:rostyslav.dzhohola@pm.me?subject=${emailSubject}&body=${emailBody}`;
                                            }, children: "Contact Us" })] })] }) }))] })) : (_jsx(SignedOutView, {}))] }));
};
export default SidePanel;

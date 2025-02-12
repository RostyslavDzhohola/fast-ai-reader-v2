import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import './Popup.css';
const BlockedGuildView = () => {
    return (_jsx("div", { className: "blocked-guild-container", children: _jsxs("div", { className: "blocked-guild-content", children: [_jsx("h2", { children: "Access Restricted" }), _jsx("p", { children: "This Discord server has been restricted from using the AI Assistant extension." })] }) }));
};
const SignedOutView = () => {
    const handleOptionsClick = () => {
        chrome.runtime.openOptionsPage();
    };
    return (_jsx("div", { className: "signed-out-container", children: _jsxs("div", { className: "signed-out-content", children: [_jsx("h2", { children: "Not Signed In" }), _jsx("p", { children: "You need to be signed in to use the Discord AI Assistant." }), _jsx("button", { onClick: handleOptionsClick, className: "sign-in-button", children: "Go to Sign In" })] }) }));
};
export const Popup = () => {
    const [isDiscordPage, setIsDiscordPage] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [hasDiscordTab, setHasDiscordTab] = useState(false);
    const [activeDiscordTabId, setActiveDiscordTabId] = useState(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [registrationRequired, setRegistrationRequired] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isBlockedGuild, setIsBlockedGuild] = useState(false);
    useEffect(() => {
        const initializePopup = async () => {
            console.log('🚀 Initializing Popup');
            try {
                // Get both tab and auth info from background script
                const [tabInfoResponse, authStateResponse] = await Promise.all([
                    chrome.runtime.sendMessage({ action: 'getTabInfo' }),
                    chrome.runtime.sendMessage({ action: 'getAuthState' }),
                ]);
                if (!tabInfoResponse.success || !authStateResponse.success) {
                    throw new Error('Failed to initialize popup');
                }
                const { isDiscordPage, hasDiscordTab, activeDiscordTabId, isBlockedGuild } = tabInfoResponse.data;
                const { isSignedIn, registrationRequired } = authStateResponse.data;
                // Update all states at once
                setIsDiscordPage(isDiscordPage);
                setHasDiscordTab(hasDiscordTab);
                setIsSignedIn(isSignedIn);
                setRegistrationRequired(registrationRequired);
                setIsBlockedGuild(isBlockedGuild || false);
                if (activeDiscordTabId) {
                    setActiveDiscordTabId(activeDiscordTabId);
                }
                // Handle side panel setup if conditions are met
                if (isSignedIn && isDiscordPage && !isBlockedGuild) {
                    console.log('🎯 Setting up side panel');
                    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (currentTab.id) {
                        await chrome.runtime.sendMessage({
                            action: 'setupSidePanel',
                            tabId: currentTab.id,
                            enabled: true,
                        });
                        console.log('🎯 Side panel setup complete');
                    }
                }
            }
            catch (error) {
                console.error('❌ Popup initialization error:', error);
            }
        };
        initializePopup();
    }, []);
    const handleSignIn = async () => {
        try {
            setIsSigningIn(true);
            console.log('User clicked sign in with Google button');
            const response = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' });
            console.log('Auth response:', response);
            if (!response.success) {
                if (response.error === 'REGISTRATION_REQUIRED') {
                    console.log('Registration required, showing registration prompt');
                    setRegistrationRequired(true);
                    setIsSigningIn(false);
                    return;
                }
                throw new Error(response.error || 'Authentication failed');
            }
            setIsSignedIn(true);
            // Handle post-signin actions in background
            await chrome.runtime.sendMessage({
                action: 'handlePostSignIn',
                isDiscordPage,
            });
            window.close();
        }
        catch (error) {
            console.error('Authentication failed:', error);
            setRegistrationRequired(false);
        }
        finally {
            setIsSigningIn(false);
        }
    };
    const handleDiscordNavigation = async () => {
        try {
            await chrome.runtime.sendMessage({
                action: 'navigateToDiscord',
                discordTabId: activeDiscordTabId,
            });
            window.close();
        }
        catch (error) {
            console.error('Navigation failed:', error);
        }
    };
    useEffect(() => {
        // Minimal timeout to ensure smooth transition
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 50);
        return () => clearTimeout(timer);
    }, []);
    if (!isSignedIn) {
        if (registrationRequired) {
            return (_jsx("div", { className: `popup-container ${isLoading ? 'loading' : ''}`, children: _jsxs("div", { className: "auth-container", children: [_jsx("h2", { children: "Registration Required" }), _jsx("p", { children: "Please register on our website first to use this extension." }), _jsx("button", { onClick: () => chrome.tabs.create({
                                url: 'https://fastaireader.com/',
                                active: true,
                            }), className: "registration-button", children: "Register Now" }), _jsx("button", { onClick: () => setRegistrationRequired(false), className: "back-button", children: "Back" })] }) }));
        }
        return (_jsx("div", { className: `popup-container ${isLoading ? 'loading' : ''}`, children: _jsxs("div", { className: "auth-container", children: [_jsx("p", { children: "Please sign in with Google to use this extension." }), _jsx("button", { onClick: handleSignIn, className: "sign-in-button", disabled: isSigningIn, children: isSigningIn ? (_jsxs("span", { className: "loading-container", children: [_jsx("span", { className: "loading-spinner" }), "Signing in..."] })) : ('Sign in with Google') })] }) }));
    }
    return (_jsx("div", { className: "popup-container", children: isBlockedGuild ? (_jsx(BlockedGuildView, {})) : !isSignedIn ? (_jsx(SignedOutView, {})) : (_jsx("div", { className: `popup-container ${isLoading ? 'loading' : ''}`, children: _jsxs("div", { className: "success-container", children: [_jsx("h2", { children: "Not on Discord" }), _jsxs("p", { children: [hasDiscordTab ? 'Switch to Discord tab' : 'Open Discord', " to use the extension."] }), _jsx("button", { onClick: handleDiscordNavigation, className: "discord-button", children: hasDiscordTab ? 'Switch to Discord Tab' : 'Go to Discord' })] }) })) }));
};
export default Popup;

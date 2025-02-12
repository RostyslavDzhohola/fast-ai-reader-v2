import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import './Options.css';
export const Options = () => {
    const [apiKey, setApiKey] = useState('');
    const [isKeySet, setIsKeySet] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const highlightedKeyRef = useRef(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [registrationRequired, setRegistrationRequired] = useState(false);
    // Main initialization effect that sets up auth listener and loads initial data
    useEffect(() => {
        // Listener for authentication state changes from background script
        const authStateListener = (message) => {
            if (message.action === 'authStateChanged') {
                console.log('Auth state changed:', message.isAuthenticated);
                if (message.isAuthenticated) {
                    fetchUserInfo();
                }
                else {
                    setIsGoogleSignedIn(false);
                    setUserInfo(null);
                }
            }
        };
        // Initialize data and set up listeners
        const initialize = async () => {
            // Load the API key from chrome storage
            const apiKeyResult = await chrome.storage.sync.get(['openaiApiKey']);
            if (apiKeyResult.openaiApiKey) {
                setApiKey(apiKeyResult.openaiApiKey);
                setIsKeySet(true);
            }
            // Perform initial authentication check
            await fetchUserInfo();
        };
        // Set up listener and initialize component
        chrome.runtime.onMessage.addListener(authStateListener);
        initialize();
        // Cleanup listener on component unmount
        return () => {
            chrome.runtime.onMessage.removeListener(authStateListener);
        };
    }, []);
    // Fetches user information from Google's API using stored token
    const fetchUserInfo = async () => {
        try {
            const tokenResult = await chrome.storage.local.get('googleToken');
            if (!tokenResult.googleToken) {
                setIsGoogleSignedIn(false);
                return;
            }
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${tokenResult.googleToken}`,
                },
            });
            if (!response.ok) {
                // Clean up invalid token
                await chrome.storage.local.remove(['googleToken', 'tokenTimestamp']);
                setIsGoogleSignedIn(false);
                return;
            }
            const data = await response.json();
            setIsGoogleSignedIn(true);
            setUserInfo({
                email: data.email,
                picture: data.picture,
                name: data.name,
            });
        }
        catch (error) {
            console.error('Error fetching user info:', error);
            setIsGoogleSignedIn(false);
            setUserInfo(null);
            await chrome.storage.local.remove(['googleToken', 'tokenTimestamp']);
        }
    };
    // Handles changes to the API key input field
    const handleApiKeyChange = (event) => {
        setApiKey(event.target.value);
    };
    // Saves the API key to chrome storage
    const saveApiKey = () => {
        chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
            setIsKeySet(true);
            alert('API key saved successfully!');
        });
    };
    // Removes the API key from chrome storage
    const deleteApiKey = () => {
        chrome.storage.sync.remove('openaiApiKey', () => {
            setApiKey('');
            setIsKeySet(false);
            alert('API key deleted successfully!');
        });
    };
    // Handles user sign-out process
    const handleSignOut = async () => {
        try {
            console.log('User clicked sign out button');
            await chrome.runtime.sendMessage({ action: 'signOut' });
            setIsGoogleSignedIn(false);
            setUserInfo(null);
            console.log('User signed out successfully');
        }
        catch (error) {
            console.error('Sign out failed:', error);
        }
    };
    // Masks the API key for display purposes
    const maskApiKey = (key) => {
        if (key.length <= 8)
            return '****...****';
        return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };
    // Copies the API key to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 1000);
        });
    };
    // Handles user sign-in process
    const handleSignIn = async () => {
        try {
            setIsSigningIn(true);
            console.log('User clicked sign in with Google button');
            const response = await chrome.runtime.sendMessage({ action: 'initiateGoogleAuth' });
            if (!response.success) {
                if (response.error === 'REGISTRATION_REQUIRED') {
                    setRegistrationRequired(true);
                    return;
                }
                throw new Error(response.error || 'Authentication failed');
            }
            if (response.userInfo) {
                setIsGoogleSignedIn(true);
                setUserInfo(response.userInfo);
                console.log('User signed in successfully:', response.userInfo);
            }
            else {
                throw new Error('No user information received');
            }
        }
        catch (error) {
            console.error('Sign in failed:', error);
            setIsGoogleSignedIn(false);
            setUserInfo(null);
            // Only show error message for non-registration errors
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
            if (!errorMessage.includes('REGISTRATION_REQUIRED')) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.textContent = 'Sign in failed. Please try again.';
                const container = document.querySelector('.user-profile');
                if (container) {
                    const existingError = container.querySelector('.error-message');
                    if (existingError) {
                        existingError.remove();
                    }
                    container.appendChild(errorElement);
                    setTimeout(() => errorElement.remove(), 3000);
                }
            }
        }
        finally {
            setIsSigningIn(false);
        }
    };
    return (_jsx("div", { className: "options-layout", children: isGoogleSignedIn && userInfo ? (_jsxs("div", { className: "user-profile", children: [_jsx("img", { src: userInfo.picture, alt: "Profile", className: "profile-image" }), _jsxs("div", { className: "user-info", children: [_jsx("h3", { children: userInfo.name }), _jsx("p", { children: userInfo.email })] }), _jsx("button", { onClick: handleSignOut, className: "sign-out-button", children: "Sign Out" })] })) : (_jsx("div", { className: "user-profile", children: registrationRequired ? (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Registration Required" }), _jsx("p", { children: "Please register on our website first to use this extension." }), _jsx("button", { onClick: () => chrome.tabs.create({ url: 'https://fastaireader.com/' }), className: "registration-button", children: "Register Now" }), _jsx("button", { onClick: () => setRegistrationRequired(false), className: "back-button", children: "Back" })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Not Signed In" }), _jsx("p", { children: "Sign in to use the extension" }), _jsx("button", { onClick: handleSignIn, className: "sign-in-button", disabled: isSigningIn, children: isSigningIn ? (_jsxs("span", { className: "loading-container", children: [_jsx("span", { className: "loading-spinner" }), "Signing in..."] })) : ('Sign in with Google') })] })) })) }));
};
export default Options;

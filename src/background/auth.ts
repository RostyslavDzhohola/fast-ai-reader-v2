// For production: https://discord-ai-orcin.vercel.app/
// For development: http://localhost:3000/
// For main: // https://www.fastaireader.com/

// Interface definitions
interface AuthUser {
  id: string
  name: string
  email: string
  hasAccess: boolean
}

// Update AuthResponse to include possible error response
interface AuthResponse {
  token?: string
  user?: AuthUser
  error?: string
  success?: boolean
  message?: string
}

// Add a type for the Google auth response
interface GoogleAuthResponse {
  success: boolean
  userInfo?: {
    email: string
    name: string
    picture: string
  }
  error?: string
  message?: string
}

// Move these interfaces here
interface AuthState {
  isSignedIn: boolean
  registrationRequired: boolean
}

// Add the functions we moved from index.ts
export async function getAuthState(): Promise<AuthState> {
  try {
    const result = await chrome.storage.local.get('googleToken')
    const isSignedIn = !!result.googleToken

    return {
      isSignedIn,
      registrationRequired: false,
    }
  } catch (error) {
    console.error('Auth state check failed:', error)
    throw error
  }
}

export async function handlePostSignIn(isDiscordPage: boolean): Promise<void> {
  try {
    if (isDiscordPage) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        await setupSidePanel(tab.id, true)
      }
    }
  } catch (error) {
    console.error('Post sign-in handling error:', error)
    throw error
  }
}

export async function setupSidePanel(tabId: number, enabled: boolean = true): Promise<void> {
  try {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled,
      path: enabled ? 'sidepanel.html' : '',
    })

    if (enabled) {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      })
    }
  } catch (error) {
    console.error('Side panel setup error:', error)
    throw error
  }
}

// Initialize Google authentication
export async function initializeGoogleAuth(): Promise<GoogleAuthResponse> {
  try {
    console.log('Starting Google authentication process...')

    // Clear existing tokens
    await chrome.storage.local.remove(['googleToken', 'tokenTimestamp', 'authToken', 'user'])

    // Get access token from Chrome Identity API
    const { token: accessToken } = await chrome.identity.getAuthToken({
      interactive: true,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    })

    if (!accessToken) {
      console.error('Failed to obtain Google access token')
      throw new Error('Failed to obtain access token')
    }

    console.log('Obtained Google access token, authenticating with backend...')

    // Authenticate with your backend using the access token
    const authResponse = await authenticateWithBackend(accessToken)

    // Check if registration is required
    if (authResponse.error === 'REGISTRATION_REQUIRED') {
      return {
        success: false,
        error: 'REGISTRATION_REQUIRED',
        message: 'Please register before using the extension',
      }
    }

    if (!authResponse.token || !authResponse.user) {
      throw new Error('Invalid response structure from backend')
    }

    console.log('Backend authentication successful:', authResponse)

    // Store tokens and user data
    const timestamp = Date.now()
    await chrome.storage.local.set({
      googleToken: accessToken,
      tokenTimestamp: timestamp,
      lastRefresh: timestamp,
      authToken: authResponse.token,
      user: authResponse.user,
    })

    // Send message to notify successful sign-in
    chrome.runtime.sendMessage({
      action: 'AUTH_STATE_CHANGED',
      state: 'SIGNED_IN',
      token: authResponse.token,
    })

    return {
      success: true,
      userInfo: {
        email: authResponse.user.email,
        name: authResponse.user.name,
        picture: '',
      },
    }
  } catch (error) {
    console.error('Authentication failed:', error)
    await chrome.storage.local.remove(['googleToken', 'tokenTimestamp', 'authToken', 'user'])
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

// Backend authentication
async function authenticateWithBackend(accessToken: string): Promise<AuthResponse> {
  console.log('Sending authentication request to backend...')

  // TODO: Change this to the production URL
  try {
    const response = await fetch('http://localhost:3000/api/authenticate', {
      // TODO: change to production endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        accessToken: accessToken,
      }),
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('Raw response:', responseText)

    if (!responseText) {
      throw new Error('Empty response from server')
    }

    const data = JSON.parse(responseText)

    if (!response.ok) {
      const errorMessage = data.error || `Authentication failed with status ${response.status}`
      console.error('Backend authentication failed:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        details: data.details,
      })

      // Check specifically for user not found case
      if (response.status === 404 && data.error === 'User not found') {
        return {
          success: false,
          error: 'REGISTRATION_REQUIRED',
          message: 'User not registered in the system',
        }
      }

      throw new Error(errorMessage)
    }

    // Decode JWT to get expiration
    const tokenParts = data.token.split('.')
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]))
      const expirationDate = new Date(payload.exp * 1000)
      console.log('JWT Token expires at:', expirationDate.toLocaleString())
      console.log(
        'Days until expiration:',
        Math.floor((payload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    }

    if (!data.token || !data.user || !data.user.id || !data.user.email) {
      console.error('Invalid response structure:', data)
      throw new Error('Invalid response structure from backend')
    }

    return data
  } catch (error) {
    console.error('Error during backend authentication:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('USER_NOT_FOUND')) {
        throw new Error('REGISTRATION_REQUIRED')
      } else if (error.message.includes('401')) {
        throw new Error('Invalid access token. Please try signing in again.')
      } else if (error.message.includes('400')) {
        throw new Error('Invalid request. Please try again.')
      }
    }

    throw new Error('Authentication failed. Please try again.')
  }
}

// Handle sign out
export async function handleSignOut() {
  try {
    console.log('Starting sign out process...')
    const { googleToken, authToken } = await chrome.storage.local.get(['googleToken', 'authToken'])

    console.log('Current tokens before removal:', { googleToken, authToken })

    if (googleToken) {
      console.log('Revoking Google access token...')
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`)
      await chrome.identity.removeCachedAuthToken({ token: googleToken })
    }

    // Clear all auth-related storage
    await chrome.storage.local.remove([
      'googleToken',
      'tokenTimestamp',
      'lastRefresh',
      'authToken',
      'user',
    ])

    // Verify tokens were removed
    const afterRemoval = await chrome.storage.local.get(['googleToken', 'authToken'])
    console.log('Storage after removal:', afterRemoval)

    // Send message to notify sign-out
    chrome.runtime.sendMessage({
      action: 'AUTH_STATE_CHANGED',
      state: 'SIGNED_OUT',
    })

    console.log('Sign out successful')
    return { success: true }
  } catch (error) {
    console.error('Sign out failed:', error)
    throw error
  }
}

// Check and refresh token if needed
export async function refreshTokenIfNeeded() {
  try {
    const { googleToken, lastRefresh, authToken } = await chrome.storage.local.get([
      'googleToken',
      'lastRefresh',
      'authToken',
    ])

    if (!googleToken || !authToken) return null

    if (Date.now() - lastRefresh > 45 * 60 * 1000) {
      console.log('Token refresh needed, initiating refresh...')
      const result = await initializeGoogleAuth()
      if (!result.success) {
        throw new Error('Token refresh failed')
      }
      return result
    }

    return { success: true, token: googleToken }
  } catch (error) {
    console.error('Token refresh failed:', error)
    await chrome.storage.local.remove([
      'googleToken',
      'tokenTimestamp',
      'lastRefresh',
      'authToken',
      'user',
    ])
    return null
  }
}

// Check authentication status
export async function checkAuthStatus() {
  const { googleToken } = await chrome.storage.local.get('googleToken')
  return !!googleToken
}

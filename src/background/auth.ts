// Interface definitions
interface AuthUser {
  id: string
  name: string
  email: string
  hasAccess: boolean
}

interface AuthResponse {
  token: string
  user: AuthUser
}

// Initialize Google authentication
export async function initializeGoogleAuth() {
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

  try {
    const response = await fetch('http://localhost:3000/api/authenticate', {
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
      throw new Error(errorMessage)
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
      if (error.message.includes('404')) {
        throw new Error('User not found. Please make sure you are registered.')
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

    if (googleToken) {
      console.log('Revoking Google access token...')
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${googleToken}`)
      await chrome.identity.removeCachedAuthToken({ token: googleToken })
    }

    await chrome.storage.local.remove([
      'googleToken',
      'tokenTimestamp',
      'lastRefresh',
      'authToken',
      'user',
    ])

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

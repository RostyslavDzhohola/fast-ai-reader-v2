# Work in Progress (WIP) Notes

## Deprecated React Events

1. `onKeyPress` is deprecated

   - Issue: The `onKeyPress` event is deprecated in React.
   - Solution: Use `onKeyDown` instead.
   - Example:

     ```typescript
     // Old (deprecated):
     <input onKeyPress={handleKeyPress} />

     // New (recommended):
     <input onKeyDown={handleKeyDown} />
     ```

   - Note: When migrating from `onKeyPress` to `onKeyDown`, be aware that `onKeyDown` fires for all keys, not just printable characters. You may need to adjust your event handling logic accordingly.

## Chrome Extension Development Context

1. Chrome Extension Limitations

   - No server-side code: Chrome extensions cannot use server-side code or API routes. All code must be executable within the extension's context.
   - API requests: Make API requests directly from the extension's JavaScript, not through server-side routes.

2. Code Modification Guidelines

   - Focus on one issue at a time: When addressing a specific task or bug, focus only on the relevant code sections.
   - Preserve existing code: Do not remove or modify code that is not directly related to the task at hand.
   - Incremental changes: Make small, focused changes rather than attempting to optimize or refactor unrelated parts of the codebase.

3. Extension-specific Considerations

   - Use Chrome Extension APIs: Utilize Chrome-specific APIs for functionality like storage, tabs, and messaging.
   - Manifest file: Ensure the manifest.json (or manifest.ts) file includes all necessary permissions and correctly defines the extension's structure.
   - Content scripts vs. Background scripts: Understand the difference and use each appropriately for your extension's needs.

4. Popup Handling

   - Use `setOptions` pattern: Instead of using the outdated `open` method, use the `setOptions` pattern for consistency with other extension features.
   - Example for popup handling:

     ```typescript
     // Function to set popup options
     async function setPopupOptions(tabId: number, enabled: boolean) {
       try {
         await chrome.action.setPopup({
           tabId,
           popup: enabled ? 'popup.html' : '',
         })
       } catch (error) {
         handleError(error as Error)
       }
     }

     // Usage in background script
     chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
       if (changeInfo.status === 'complete' && tab.url) {
         if (isDiscordUrl(tab.url)) {
           setSidePanelForDiscord(tabId, tab.url)
           setPopupOptions(tabId, false) // Disable popup for Discord pages
         } else {
           setSidePanelForDiscord(tabId, tab.url)
           setPopupOptions(tabId, true) // Enable popup for non-Discord pages
         }
       }
     })

     // Handle extension icon click
     chrome.action.onClicked.addListener((tab) => {
       if (tab.id && tab.url) {
         if (isDiscordUrl(tab.url)) {
           chrome.sidePanel.setOptions({ tabId: tab.id, enabled: true })
         } else {
           setPopupOptions(tab.id, true)
           // Trigger popup to open (you may need to implement this separately)
         }
       }
     })
     ```

   - Note: This approach allows for consistent handling of both side panel and popup visibility based on the current URL.
   - Remember to update the `manifest.ts` file to include necessary permissions and action settings.

## Chrome Extension Side Panel API Limitations

1. Side Panel Opening Methods

   - ❌ INCORRECT: Using `chrome.sidePanel.open()`

     ```typescript
     // This doesn't work - method doesn't exist
     await chrome.sidePanel.open({ windowId: window.id })
     ```

   - ✅ CORRECT: Using `setPanelBehavior` and `setOptions`

     ```typescript
     // First, set the behavior to open on action click
     await chrome.sidePanel.setPanelBehavior({
       openPanelOnActionClick: true,
     })

     // Then enable the side panel for the specific tab
     await chrome.sidePanel.setOptions({
       tabId: tab.id,
       enabled: true,
       path: 'sidepanel.html',
     })
     ```

2. Best Practices for Side Panel Visibility

   - Use `setPanelBehavior` to configure how the panel opens
   - Use `setOptions` to enable/disable the panel for specific tabs
   - Handle visibility through the extension's action click
   - Remember that side panel visibility is controlled by Chrome, not directly by the extension

3. Example Implementation:

   ```typescript
   // In background script
   chrome.runtime.onInstalled.addListener(() => {
     // Set default behavior
     chrome.sidePanel
       .setPanelBehavior({
         openPanelOnActionClick: true,
       })
       .catch(console.error)
   })

   // Handle tab updates
   chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
     if (changeInfo.status === 'complete' && tab.url) {
       const isDiscordUrl = tab.url.includes('discord.com')
       const isAuthenticated = await checkAuthStatus()

       await chrome.sidePanel.setOptions({
         tabId,
         enabled: isDiscordUrl && isAuthenticated,
         path: 'sidepanel.html',
       })
     }
   })
   ```

[Source: Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

Remember: The side panel visibility is ultimately controlled by Chrome's UI, and we can only configure when it's available and how it behaves when the user interacts with the extension.

Remember: Always test changes thoroughly in the context of a Chrome extension to ensure compatibility and proper functionality.

## Important Permission Issues

### Chrome Tabs Query Permission

- The `chrome.tabs.query()` was returning undefined URLs because the `tabs` permission was missing in manifest
- Need to add `"tabs"` to the permissions array in manifest.ts
- Without this permission, the extension cannot access tab URLs properly
- Example fix in manifest:
  ```typescript
  permissions: [
    'tabs', // Required for chrome.tabs.query to work properly
    // ... other permissions
  ]
  ```

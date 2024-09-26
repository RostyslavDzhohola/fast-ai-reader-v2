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

Remember: Always test changes thoroughly in the context of a Chrome extension to ensure compatibility and proper functionality.

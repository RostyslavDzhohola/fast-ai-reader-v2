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

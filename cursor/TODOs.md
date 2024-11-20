# TODOs

## ✅ Completed Tasks

✅ Basic extension setup
✅ Google authentication implementation
✅ Options page creation
✅ API key management
✅ Discord message extraction
✅ Side panel implementation
✅ Registration flow
✅ Basic error handling
✅ Implement Google Sign-in functionality
✅ Add registration flow for new users
✅ Implement user-provided API key functionality
✅ Create options page for API key management
✅ Add secure storage for API keys using chrome.storage.sync
✅ Implement message extraction from Discord
✅ Add side panel functionality
✅ Add loading indicators for authentication
✅ Implement registration required prompts

## High Priority Tasks

- [ ] Replace OpenAI API key functionality with backend API integration
- [ ] Fix side panel toggle behavior when clicking extension icon on Discord page

## Authentication and User Management

- [ ] Add "Remember Me" functionality for authentication
- [ ] Implement session management and token refresh
- [ ] Add user profile management features
- [ ] Implement Google account chooser on every sign-in:
  - [ ] Research and implement proper OAuth2 parameters for account selection
  - [ ] Add 'prompt=select_account' parameter to force account chooser
  - [ ] Test account selection behavior across extension reinstalls

## General Improvements

- [ ] Implement error handling for API key issues:

  - [ ] Add user-friendly error messages when API key is missing or invalid
  - [ ] Provide guidance on how to obtain and input a valid API key

- [ ] Add a loading indicator:

  - [ ] Implement a visual loading indicator while waiting for AI responses

- [ ] Enhance chat history management:

  - [ ] Implement a way to limit the number of messages stored in chat history
  - [ ] Add an option for users to export their chat history

- [ ] Improve accessibility:

  - [ ] Ensure all interactive elements are keyboard accessible
  - [ ] Add proper ARIA labels and roles where necessary

- [ ] Optimize performance:

  - [ ] Investigate and implement performance improvements for handling large chat histories

- [ ] Add unit and integration tests:
  - [ ] Develop a comprehensive test suite to ensure reliability and ease future development

Remember to prioritize these tasks based on their importance and impact on user experience and security. The API key management and security-related tasks should be addressed as soon as possible to protect your users and your own API key.
Don't add new tasks if I don't request them.

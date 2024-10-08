# TODOs

## Security and API Key Management

- ✅ Prevent secret from being committed during build:

  - [ ] Investigate ways to exclude secrets from the build process
  - [ ] Consider using environment variables or a secure secret management system

- [ ] Implement user-provided API key functionality:

  - [ ] Create an options page for the Chrome extension
  - [ ] Add a form for users to input their own OpenAI API key
  - [ ] Implement secure storage for the user-provided API key (e.g., using chrome.storage.sync)
  - [ ] Update the SidePanel component to use the user-provided API key instead of the hardcoded one

- [ ] Remove hardcoded API key from the codebase:
  - [ ] Once user-provided API key functionality is implemented, remove any hardcoded API keys
  - [ ] Update documentation to guide users on how to obtain and input their own API key

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

## Completed Tasks

- [x] Example completed task (remove this when you complete a real task)

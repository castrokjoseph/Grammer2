# Grammer2 Chrome Extension

Grammer2 is a Chrome extension for real-time grammar, spelling, and rephrasing suggestions. It provides a seamless experience for improving your writing across the web.

## Features

*   **Real-time Analysis**: Get instant feedback on your writing.
*   **Multiple Modes**: Choose between on-demand and automatic analysis.
*   **Customizable Templates**: Connect to different AI providers like OpenAI, Claude, and Gemini.
*   **API Testing**: A built-in tool to test your API connections.
*   **Usage Statistics**: Keep track of your API usage and corrections.

## Project Structure

*   `manifest.json`: The core configuration file for the Chrome extension.
*   `src/popup/`: Contains the React-based popup UI.
*   `src/scripts/background.js`: The service worker for handling background tasks and API calls.
*   `src/scripts/content.js`: The content script for interacting with web pages.

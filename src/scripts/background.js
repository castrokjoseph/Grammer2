// Grammer2 Background Service Worker

console.log("Grammer2 background script loaded.");

const defaultStats = {
  totalApiHits: 0,
  wordCountCorrected: 0,
  grammarIssuesFixed: 0,
  typosFixed: 0,
  rephrasingsApplied: 0,
};

// Helper to safely update stats in storage
function updateStats(statsToUpdate) {
  chrome.storage.local.get({ stats: defaultStats }, ({ stats }) => {
    for (const key in statsToUpdate) {
      if (stats.hasOwnProperty(key)) {
        stats[key] += statsToUpdate[key];
      }
    }
    chrome.storage.local.set({ stats });
  });
}

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check the message type to determine the requested action
  if (message.type === 'ANALYZE_TEXT') {
    console.log('Background script received text to analyze:', message.text);
    updateStats({ totalApiHits: 1 });

    // This is a MOCK analysis.
    setTimeout(() => {
      const mockCorrections = [
        { original: 'This is a testt.', suggestion: 'This is a test.', type: 'typo', start: 0, end: 17 },
        { original: 'It seem to work.', suggestion: 'It seems to work.', type: 'grammar', start: 18, end: 34 },
        { original: 'make it better', suggestion: 'improve it', type: 'rephrase', start: 35, end: 49 }
      ];

      // Update stats based on the mock corrections
      const statsFromCorrections = {
        wordCountCorrected: mockCorrections.reduce((acc, corr) => acc + corr.suggestion.split(' ').length, 0),
        grammarIssuesFixed: mockCorrections.filter(c => c.type === 'grammar').length,
        typosFixed: mockCorrections.filter(c => c.type === 'typo').length,
        rephrasingsApplied: mockCorrections.filter(c => c.type === 'rephrase').length,
      };
      updateStats(statsFromCorrections);

      console.log('Sending mock corrections back to content script.');
      sendResponse({ success: true, corrections: mockCorrections });
    }, 1000); // Simulate a 1-second network delay

    return true; // Indicate async response
  }

  // Handle other message types in the future
  if (message.type === 'TEST_API') {
    const { template } = message;
    if (!template || !template.apiKey || !template.endpoint) {
      sendResponse({ severity: 'error', message: 'Template is missing API key or endpoint URL.' });
      return false; // No async response
    }

    // Use fetch to make the API call
    fetch(template.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${template.apiKey}`
      },
      // Send a minimal body that is likely to be accepted by most LLM APIs for a check
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // A reasonable default
        messages: [{ role: "user", content: "Say this is a test." }],
        max_tokens: 1
      })
    })
    .then(response => {
      if (response.ok) {
        sendResponse({ severity: 'success', message: `Success! Received status ${response.status}.` });
      } else {
        // Try to read the error message from the API if possible
        response.json().then(errorBody => {
          const errorMessage = errorBody.error?.message || JSON.stringify(errorBody);
          sendResponse({ severity: 'error', message: `API Error (${response.status}): ${errorMessage}` });
        }).catch(() => {
          sendResponse({ severity: 'error', message: `API request failed with status: ${response.status}.` });
        });
      }
    })
    .catch(error => {
      sendResponse({ severity: 'error', message: `Network error: ${error.message}. Check the endpoint URL and your connection.` });
    });

    return true; // Indicate async response
  }
});

// Example of how to handle extension installation or updates
chrome.runtime.onInstalled.addListener(() => {
  console.log('Grammer2 extension installed or updated.');
  // Here you could set up default settings in chrome.storage
  chrome.storage.sync.get(['isEnabled', 'mode', 'templates'], (result) => {
    if (result.isEnabled === undefined) {
      chrome.storage.sync.set({ isEnabled: true });
    }
    if (result.mode === undefined) {
      chrome.storage.sync.set({ mode: 'on-demand' });
    }
    if (result.templates === undefined) {
      // Set up some default templates later
      chrome.storage.sync.set({ templates: [] });
    }
  });
});

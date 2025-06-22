import { Preferences } from '@capacitor/preferences';

// Define the key consistently. Make sure this EXACT key is used in login.js to retrieve the URL.
const BACKEND_URL_KEY = 'operrate_backend_url'; // You had this, which is good.

document.addEventListener('DOMContentLoaded', async () => {
    const backendUrlInput = document.getElementById('backendUrlInput');
    const saveUrlButton = document.getElementById('saveUrlButton');
    const messageElement = document.getElementById('message');

    if (!backendUrlInput || !saveUrlButton || !messageElement) {
        console.error('Setup page: One or more essential DOM elements are missing!');
        if (messageElement) {
            messageElement.textContent = 'Error: Page elements missing. Cannot proceed.';
            messageElement.style.color = 'red';
        }
        return; // Stop if essential elements aren't found
    }

    // Check if a URL is already saved and pre-fill
    try {
        console.log(`Setup.js: Attempting to get existing URL with key: ${BACKEND_URL_KEY}`);
        const { value: savedUrl } = await Preferences.get({ key: BACKEND_URL_KEY });
        if (savedUrl) {
            console.log(`Setup.js: Found saved URL: ${savedUrl}`);
            backendUrlInput.value = savedUrl;
        } else {
            console.log(`Setup.js: No saved URL found with key: ${BACKEND_URL_KEY}`);
        }
    } catch (e) {
        console.error('Setup.js: Error getting saved URL from Preferences:', e);
        messageElement.textContent = 'Error loading saved settings.';
        messageElement.style.color = 'red';
    }

    saveUrlButton.addEventListener('click', async () => {
        const url = backendUrlInput.value.trim();

        if (!url) {
            messageElement.textContent = 'Please enter a valid URL.';
            messageElement.style.color = 'red';
            return;
        }

        // Basic URL validation
        try {
            new URL(url); // Check if it's a valid URL structure
        } catch (e) {
            messageElement.textContent = 'Invalid URL format. Please include http:// or https://';
            messageElement.style.color = 'red';
            return;
        }

        try {
            console.log(`Setup.js: Attempting to save URL: "${url}" with key: "${BACKEND_URL_KEY}"`);
            await Preferences.set({
                key: BACKEND_URL_KEY,
                value: url
            });
            console.log(`Setup.js: Successfully saved URL: "${url}" with key: "${BACKEND_URL_KEY}"`);

            messageElement.textContent = 'URL Saved! Redirecting to login...';
            messageElement.style.color = 'green';

            // Redirect to login page
            // Ensure login.html is at the root of your 'dist' folder
            // and your Parcel build script includes it.
            setTimeout(() => { // Added a small timeout to ensure message is visible
                window.location.href = '/login.html';
            }, 500); // 0.5 second delay

        } catch (e) {
            console.error('Setup.js: Error saving URL to Preferences:', e);
            messageElement.textContent = 'Error saving URL. Please try again.';
            messageElement.style.color = 'red';
            // Optionally, you might want to log the specific error to the user or a debugging console
        }
    });
});



// import { Preferences } from '@capacitor/preferences';

// const BACKEND_URL_KEY = 'operrate_backend_url';

// document.addEventListener('DOMContentLoaded', async () => {
//     const backendUrlInput = document.getElementById('backendUrlInput');
//     const saveUrlButton = document.getElementById('saveUrlButton');
//     const messageElement = document.getElementById('message');

//     // Check if a URL is already saved and pre-fill
//     const { value: savedUrl } = await Preferences.get({ key: BACKEND_URL_KEY });
//     if (savedUrl) {
//         backendUrlInput.value = savedUrl;
//     }

//     saveUrlButton.addEventListener('click', async () => {
//         const url = backendUrlInput.value.trim();
//         if (!url) {
//             messageElement.textContent = 'Please enter a valid URL.';
//             messageElement.style.color = 'red';
//             return;
//         }

//         // Basic URL validation (you might want a more robust one)
//         try {
//             new URL(url); // Check if it's a valid URL structure
//         } catch (e) {
//             messageElement.textContent = 'Invalid URL format.';
//             messageElement.style.color = 'red';
//             return;
//         }

//         await Preferences.set({
//             key: BACKEND_URL_KEY,
//             value: url
//         });
//         messageElement.textContent = 'URL Saved! Redirecting to login...';
//         messageElement.style.color = 'green';

//         // Redirect to login page
//         window.location.href = '/login.html';
//     });
// });


import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import PushNotificationService from './push-notifications.js';

console.log('🔧 LOGIN.JS FILE LOADED - Android Debug');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM LOADED - Android Debug');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('🔧 LOGIN FORM FOUND - Android Debug');
    } else {
        console.log('🔧 LOGIN FORM NOT FOUND - Android Debug');
    }
});

console.log("frustration1")
console.log('🔧 Login.js loaded');
console.log('🔧 Platform:', Capacitor.getPlatform());

document.addEventListener('DOMContentLoaded', async () => {
console.log('🔧 DOM loaded');

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const pushSection = document.getElementById('pushNotificationSection');
const pushStatus = document.getElementById('pushStatus');
const testPushBtn = document.getElementById('testPushBtn');

console.log('🔧 Elements found:', {
loginForm: !!loginForm,
loginMessage: !!loginMessage,
pushSection: !!pushSection,
pushStatus: !!pushStatus,
testPushBtn: !!testPushBtn
});

// Show push section immediately for testing
if (pushSection) {
pushSection.style.display = 'block';
console.log('🔧 Push section made visible');
}

// Your existing login form handler
loginForm.addEventListener('submit', async (e) => {
e.preventDefault();
console.log('🔧 Login form submitted');

const email = document.getElementById('email').value;
const password = document.getElementById('password').value;

try {
const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });

if (!backendUrl) {
loginMessage.textContent = 'Please set backend URL first';
return;
}

loginMessage.textContent = 'Logging in...';

const response = await fetch(`${backendUrl}/auth/login/jwt`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({ email, password })
});

const result = await response.json();
console.log('🔧 Login result:', result);

// if (result.success) {
// // Store JWT token
// await Preferences.set({ key: 'authToken', value: result.token });
// loginMessage.textContent = 'Login successful!';
// loginMessage.style.color = 'green';

// // // Initialize push notifications after successful login
// // console.log('🔧 Calling initializePushNotifications');
// // await initializePushNotifications();

// } else {
// loginMessage.textContent = result.message || 'Login failed';
// loginMessage.style.color = 'red';
// }
if (result.success) {
    // Store JWT token
    await Preferences.set({ key: 'authToken', value: result.token });
    loginMessage.textContent = 'Login successful!';
    loginMessage.style.color = 'green';
    
    // Initialize push notifications after successful login
    console.log('🔧 Calling PushNotificationService.initialize()');
    try {
        const pushResult = await PushNotificationService.initialize();
        console.log('🔧 Push notification initialization result:', pushResult);
    } catch (error) {
        console.error('🔧 Push notification initialization failed:', error);
    }
} else {
    loginMessage.textContent = result.message || 'Login failed';
    loginMessage.style.color = 'red';
}

} catch (error) {
console.error('Login error:', error);
loginMessage.textContent = 'Network error occurred';
loginMessage.style.color = 'red';
}
});

// Initialize push notifications
// async function initializePushNotifications() 
// {// ADD THIS LISTENER HERE - RIGHT AFTER initializePushNotifications()
// const { PushNotifications } = await import('@capacitor/push-notifications');
// console.log('🔧 initializePushNotifications called');
// console.log('🔧 Platform check:', Capacitor.getPlatform());

// if (Capacitor.getPlatform() === 'web') {
// pushStatus.textContent = '⚠️ Push notifications only work on mobile devices';
// pushSection.style.display = 'block';
// console.log('🔧 Web platform detected');
// return;
// }

// pushSection.style.display = 'block';
// pushStatus.textContent = '🔄 Setting up push notifications...';
// console.log('🔧 Starting push notification setup');

// try {


// // Listen for registration success and save the token
// // Listen for registration success and save the token
// PushNotifications.addListener('registration', async (token) => {
// console.log('🔧 *** REGISTRATION SUCCESS FIRED ***');
// console.log('🔧 Push registration success, token:', token.value);
// console.log('🔧 Token type:', typeof token.value);
// console.log('🔧 Token length:', token.value ? token.value.length : 'null');
// await Preferences.set({
// key: 'deviceToken',
// value: token.value || 'SIMULATOR_TOKEN_PLACEHOLDER'
// });
// console.log('🔧 Device token saved');

// // ALSO REGISTER THE DEVICE WITH THE BACKEND HERE
// try {
// await PushNotificationService.registerDevice();
// console.log('🔧 Device registered with backend after token received');
// } catch (error) {
// console.error('🔧 Failed to register device with backend:', error);
// }
// });


// // Also add this listener to see registration errors:
// PushNotifications.addListener('registrationError', (error) => {
// console.error('🔧 Push registration error:', error);
// });

// await PushNotificationService.initialize();
// console.log('🔧 Push notification service initialized');

// // For now, just enable the test button
// pushStatus.textContent = '✅ Push notifications ready! (Debug mode)';
// testPushBtn.disabled = false;

// } catch (error) {
// console.error('Push notification setup error:', error);
// pushStatus.textContent = '❌ Push notification setup failed';
// }
// }

// Test push notification button
testPushBtn.addEventListener('click', async () => {
console.log('🔧 Test push button clicked');
testPushBtn.disabled = true;
testPushBtn.textContent = '🔄 Sending...';

// Use the EXACT same keys that are being saved
const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' }); // Same as Setup.js
const { value: authToken } = await Preferences.get({ key: 'authToken' }); // Same as login success
let { value: deviceToken } = await Preferences.get({ key: 'deviceToken' });

// Use placeholder token for simulator testing
if (!deviceToken && Capacitor.getPlatform() === 'ios') {
deviceToken = 'SIMULATOR_TEST_TOKEN_12345';
console.log('🔧 Using simulator placeholder token');
}

console.log('🔧 Retrieved values:', { backendUrl, authToken, deviceToken });

if (!backendUrl || !authToken) {
console.error('❌ Missing values:', { backendUrl: !!backendUrl, authToken: !!authToken });
testPushBtn.disabled = false;
testPushBtn.textContent = '🧪 Test Push Notification';
return;
}

try {
const result = await PushNotificationService.requestTestNotification();
console.log('🔧 Test notification result:', result);

if (result.success) {
// alert(`✅ ${result.message}`);
console.log(result.message);
} else {
// alert(`❌ ${result.message}`);
console.log(result.message);

}
} catch (error) {
console.error('🔧 Test notification error:', error);
alert(`❌ Error: ${error.message}`);
} finally {
testPushBtn.disabled = false;
testPushBtn.textContent = '🧪 Test Push Notification';
}
});

// Show push section immediately for debugging
console.log('🔧 Making push section visible for debugging');
if (pushSection) {
pushSection.style.display = 'block';
pushStatus.textContent = '🔧 Debug: Push section loaded';
testPushBtn.disabled = false;
}

// Add this event listener with your existing ones
testLocalBtn.addEventListener('click', async () => {
    console.log('🔧 Test local notification button clicked');
    testLocalBtn.disabled = true;
    testLocalBtn.textContent = '🔄 Sending...';

    try {
        const result = await PushNotificationService.testLocalNotification();
        console.log('🔧 Local notification result:', result);

        if (result.success) {
            pushStatus.textContent = '✅ Local notification sent!';
            pushStatus.style.color = 'green';
        } else {
            pushStatus.textContent = `❌ Local notification failed: ${result.error}`;
            pushStatus.style.color = 'red';
        }
    } catch (error) {
        console.error('🔧 Local notification error:', error);
        pushStatus.textContent = `❌ Local notification error: ${error.message}`;
        pushStatus.style.color = 'red';
    } finally {
        testLocalBtn.disabled = false;
        testLocalBtn.textContent = '📱 Test Local Notification';
    }
});


});

import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
// Add this import at the top of your file with other imports
import { registerPlugin } from '@capacitor/core';
// Register the custom plugin
const AppGroupReaderPlugin = registerPlugin('AppGroupReaderPlugin');


class PushNotificationService {
    constructor() {
        this.deviceToken = null;
        this.isInitialized = false;
        this.notificationId = 1; // Simple counter for notification IDs
        // Web-specific properties
        this.firebaseApp = null;
        this.messaging = null;
    }

    // --- FINAL, CORRECTED INITIALIZE METHOD ---
    async initialize() {
        if (this.isInitialized) return { success: true };

        try {
            console.log('🔔 Initializing push notifications...');
            console.log('📱 Platform:', Capacitor.getPlatform());

            await this.initializeLocalNotifications();

            if (Capacitor.getPlatform() === 'web') {
                const result = await this.initializeFirebaseWeb();
                if (!result.success) throw new Error(result.error);
                // The token is set within initializeFirebaseWeb
            } else {
                // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
                this.addListeners(); // Sets up listeners for errors and incoming notifications

                const permissionStatus = await PushNotifications.checkPermissions();
                console.log('📋 Current push permission status:', permissionStatus);
                if (permissionStatus.receive === 'prompt') {
                    const requestResult = await PushNotifications.requestPermissions();
                    if (requestResult.receive !== 'granted') {
                        throw new Error('Push notification permission denied');
                    }
                }
                if (permissionStatus.receive !== 'granted') {
                    throw new Error('Push notification permission not granted');
                }

                await PushNotifications.register();
                console.log('✅ Push registration process started...');

                    if (Capacitor.getPlatform() === 'ios') {
                    // For iOS, get the FCM token from Preferences (where Swift saved it)
                    this.deviceToken = await this.getFCMTokenFromPreferences();
                    } else {
                // For Android, listen for the 'registration' event directly from PushNotifications
                     this.deviceToken = await new Promise((resolve, reject) => {
                      const wait = setTimeout(() => {
                            reject(new Error('Timed out waiting for Android registration token.'));
                        }, 15000); // 15 seconds timeout

                        PushNotifications.addListener('registration', (token) => {
                            clearTimeout(wait);
                            console.log(`✅ Android registration success, token: ${token.value}`);
                            resolve(token.value);
                        });
                    });
                }
            }

            if (!this.deviceToken) {
                throw new Error('Failed to obtain device token.');
            }

            // Save the device token to standard Preferences for general use within JS
            await this.saveDeviceToken(this.deviceToken);
            await this.registerDevice();

            this.isInitialized = true;
            console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
            return { success: true, token: this.deviceToken };

        } catch (error) {
            console.error('❌ Push notification initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

// Add this method to your PushNotificationService class
async getFCMTokenFromPreferences() {
    const maxAttempts = 20;
    const interval = 500;
    let attempts = 0;

    console.log('⏳ [iOS] Getting FCM token from Preferences...');

    return new Promise((resolve, reject) => {
        const poll = setInterval(async () => {
            try {
                const { value } = await Preferences.get({ key: 'deviceToken' });

                if (value) {
                    console.log(`✅ [iOS] FCM token retrieved: ${value}`);
                    clearInterval(poll);
                    resolve(value);
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(poll);
                        console.error('❌ [iOS] Timed out getting FCM token.');
                        reject(new Error('Timed out waiting for FCM token.'));
                    } else {
                        console.log(`...[iOS] attempt ${attempts}, FCM token not ready yet.`);
                    }
                }
            } catch (error) {
                clearInterval(poll);
                console.error('❌ [iOS] Error getting FCM token:', error);
                reject(error);
            }
        }, interval);
    });
}



    // --- MODIFIED addListeners METHOD ---
    addListeners() {
        console.log('🔧 Setting up push notification listeners...');
        
        // The 'registration' listener for Android is handled directly in the initialize method's Promise.
        // For iOS, we poll the App Group UserDefaults.

        PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            console.log('🔔 Push notification received (foreground):', notification);
            try {
                const notificationId = this.getNextNotificationId();
                await LocalNotifications.schedule({
                    notifications: [{
                        title: notification.title || 'Operrate',
                        body: notification.body || 'You have a new notification',
                        id: notificationId,
                        schedule: { at: new Date(Date.now() + 500) },
                        sound: 'default',
                        extra: notification.data || {},
                        smallIcon: 'ic_stat_icon_config_sample',
                        iconColor: '#488AFF'
                    }]
                });
                console.log('✅ Foreground notification displayed as local notification');
            } catch (error) {
                console.error('❌ Failed to show foreground notification:', error);
            }
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('🔔 Push notification action performed (background):', notification);
            this.handleNotificationTap(notification);
        });
    }

    // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

    async initializeFirebaseWeb() {
        try {
            console.log('🌐 Initializing Firebase for web...');
            const { initializeApp } = await import('firebase/app');
            const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
            const firebaseConfigModule = await import('./firebase-config.js');
            const firebaseConfig = firebaseConfigModule.default;
            this.firebaseApp = initializeApp(firebaseConfig);
            this.messaging = getMessaging(this.firebaseApp);
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
                console.log('🔧 Service worker registered:', registration);
            }
            const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
            if (token) {
                console.log('🔑 FCM token:', token);
                this.deviceToken = token;
            }
            onMessage(this.messaging, (payload) => {
                console.log('🔔 Foreground message received:', payload);
                this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
            });
            return { success: true, token: this.deviceToken };
        } catch (error) {
            console.error('❌ Firebase web initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    async showWebNotification(title, body) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body: body, icon: '/icon-192x192.png' });
            } else {
                console.log('🔔 Notification:', title, body);
            }
        } catch (error) {
            console.error('❌ Failed to show web notification:', error);
        }
    }

    async initializeLocalNotifications() {
        try {
            const localPermissions = await LocalNotifications.checkPermissions();
            console.log('📋 Local notification permissions:', localPermissions);
            if (localPermissions.display === 'prompt') {
                const requestResult = await LocalNotifications.requestPermissions();
                if (requestResult.display !== 'granted') {
                    console.warn('⚠️ Local notification permission denied');
                }
            }
            LocalNotifications.addListener('localNotificationReceived', (notification) => {
                console.log('🔔 Local notification received:', notification);
            });
            LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                console.log('🔔 Local notification action performed:', notification);
                this.handleNotificationTap(notification);
            });
            console.log('✅ Local notifications initialized');
        } catch (error) {
            console.error('❌ Local notification initialization failed:', error);
        }
    }

    getNextNotificationId() {
        if (this.notificationId >= 2147483647) {
            this.notificationId = 1;
        }
        return this.notificationId++;
    }

    handleNotificationTap(notification) {
        console.log('👆 User tapped notification:', notification);
        if (notification.notification?.data?.page) {
            console.log('🧭 Should navigate to:', notification.notification.data.page);
        }
        alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
    }

    async getDeviceToken() {
        try {
            if (this.deviceToken) {
                return this.deviceToken;
            }
            // This reads the token saved to standard Preferences by saveDeviceToken
            const { value } = await Preferences.get({ key: 'deviceToken' });
            if (value) {
                this.deviceToken = value;
                return value;
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get device token:', error);
            return null;
        }
    }

    async saveDeviceToken(token) {
        try {
            await Preferences.set({ key: 'deviceToken', value: token });
            console.log('💾 Device token saved');
        } catch (error) {
            console.error('❌ Failed to save device token:', error);
        }
    }

    async registerDevice() {
        try {
            const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
            const { value: authToken } = await Preferences.get({ key: 'authToken' });
            const deviceToken = await this.getDeviceToken();
            if (!backendUrl || !authToken || !deviceToken) {
                throw new Error('Missing required data for device registration');
            }
            const platformToSend = Capacitor.getPlatform();
            console.log('🔧 Registering device with platform:', platformToSend);
            const response = await fetch(`${backendUrl}/mobile/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ token: deviceToken, platform: platformToSend })
            });
            
            // --- DEBUGGING STEP FOR "The string did not match the expected pattern." ---
            const responseText = await response.text();
            console.log('🔧 DEBUG: Raw response from registerDevice:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (jsonError) {
                throw new Error(`Failed to parse JSON response from backend: ${jsonError.message}. Raw response: ${responseText}`);
            }
            // --- END DEBUGGING STEP ---

            if (!response.ok) {
                throw new Error(result.message || 'Device registration failed');
            }
            console.log('✅ Device registered successfully:', result);
            return result;
        } catch (error) {
            console.error('❌ Device registration failed:', error);
            throw error;
        }
    }

    async requestTestNotification() {
        try {
            const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
            const { value: authToken } = await Preferences.get({ key: 'authToken' });
            const deviceToken = await this.getDeviceToken();
            const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
            console.log('🔧 DEBUG: Request details:');
            console.log('🔧 URL:', fullUrl);
            console.log('🔧 Method: POST');
            console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
            console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
            const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
            console.log('🔧 Body:', JSON.stringify(requestBody));
            
            if (!backendUrl || !authToken) {
                throw new Error('Missing backend URL or auth token');
            }
            if (!deviceToken) {
                throw new Error('Device token not available. Make sure push notifications are initialized.');
            }
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(requestBody)
            });
            
            console.log('🔧 DEBUG: Response status:', response.status);
            console.log('🔧 DEBUG: Response headers:', response.headers);
            
            const responseText = await response.text();
            console.log('🔧 DEBUG: Raw response:', responseText);
            
            const result = JSON.parse(responseText);
            
            if (result.success) {
                return { success: true, message: result.message };
            } else {
                return { success: false, message: result.message || 'Test failed' };
            }
        } catch (error) {
            console.error('❌ Error requesting test notification:', error);
            return { success: false, message: error.message };
        }
    }

    async testLocalNotification() {
        try {
            const notificationId = Math.floor(Math.random() * 1000000) + 1;
            await LocalNotifications.schedule({
                notifications: [{
                    title: '🧪 Test Local Notification',
                    body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
                    id: notificationId,
                    schedule: { at: new Date(Date.now() + 1000) },
                    sound: 'default',
                    extra: { type: 'test' }
                }]
            });
            return { success: true };
        } catch (error) {
            console.error('❌ Local notification error:', error);
            return { success: false, error: error.message };
        }
    }
}

const pushNotificationService = new PushNotificationService();
export default pushNotificationService;




// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

// class PushNotificationService {
//     constructor() {
//         this.deviceToken = null;
//         this.isInitialized = false;
//         this.notificationId = 1; // Simple counter for notification IDs
//         // Web-specific properties
//         this.firebaseApp = null;
//         this.messaging = null;
//     }

//     // --- FINAL, CORRECTED INITIALIZE METHOD ---
//     async initialize() {
//         if (this.isInitialized) return { success: true };

//         try {
//             console.log('🔔 Initializing push notifications...');
//             console.log('📱 Platform:', Capacitor.getPlatform());

//             await this.initializeLocalNotifications();

//             if (Capacitor.getPlatform() === 'web') {
//                 const result = await this.initializeFirebaseWeb();
//                 if (!result.success) throw new Error(result.error);
//                 // The token is set within initializeFirebaseWeb
//             } else {
//                 // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
//                 this.addListeners(); // Sets up listeners for errors and incoming notifications

//                 const permissionStatus = await PushNotifications.checkPermissions();
//                 console.log('📋 Current push permission status:', permissionStatus);
//                 if (permissionStatus.receive === 'prompt') {
//                     const requestResult = await PushNotifications.requestPermissions();
//                     if (requestResult.receive !== 'granted') {
//                         throw new Error('Push notification permission denied');
//                     }
//                 }
//                 if (permissionStatus.receive !== 'granted') {
//                     throw new Error('Push notification permission not granted');
//                 }

//                 await PushNotifications.register();
//                 console.log('✅ Push registration process started...');

//                 // Wait for the 'registration' event to get the token for both iOS and Android
//                 this.deviceToken = await new Promise((resolve, reject) => {
//                     const timeout = setTimeout(() => {
//                         reject(new Error('Timed out waiting for push notification registration token.'));
//                     }, 20000); // 20 seconds timeout

//                     PushNotifications.addListener('registration', (token) => {
//                         clearTimeout(timeout);
//                         console.log(`✅ Mobile registration success, token: ${token.value}`);
//                         resolve(token.value);
//                     });
//                 });
//             }

//             if (!this.deviceToken) {
//                 throw new Error('Failed to obtain device token.');
//             }

//             await this.saveDeviceToken(this.deviceToken);
//             await this.registerDevice();

//             this.isInitialized = true;
//             console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
//             return { success: true, token: this.deviceToken };

//         } catch (error) {
//             console.error('❌ Push notification initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // --- MODIFIED addListeners METHOD ---
//     // This method now handles the 'registration' event for both platforms
//     addListeners() {
//         console.log('🔧 Setting up push notification listeners...');
        
//         // The 'registration' listener is now handled directly in the initialize method's Promise.

//         PushNotifications.addListener('registrationError', (error) => {
//             console.error('❌ Push registration error:', error);
//         });

//         PushNotifications.addListener('pushNotificationReceived', async (notification) => {
//             console.log('🔔 Push notification received (foreground):', notification);
//             try {
//                 const notificationId = this.getNextNotificationId();
//                 await LocalNotifications.schedule({
//                     notifications: [{
//                         title: notification.title || 'Operrate',
//                         body: notification.body || 'You have a new notification',
//                         id: notificationId,
//                         schedule: { at: new Date(Date.now() + 500) },
//                         sound: 'default',
//                         extra: notification.data || {},
//                         smallIcon: 'ic_stat_icon_config_sample',
//                         iconColor: '#488AFF'
//                     }]
//                 });
//                 console.log('✅ Foreground notification displayed as local notification');
//             } catch (error) {
//                 console.error('❌ Failed to show foreground notification:', error);
//             }
//         });

//         PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
//             console.log('🔔 Push notification action performed (background):', notification);
//             this.handleNotificationTap(notification);
//         });
//     }

//     // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

//     async initializeFirebaseWeb() {
//         try {
//             console.log('🌐 Initializing Firebase for web...');
//             const { initializeApp } = await import('firebase/app');
//             const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
//             const firebaseConfigModule = await import('./firebase-config.js');
//             const firebaseConfig = firebaseConfigModule.default;
//             this.firebaseApp = initializeApp(firebaseConfig);
//             this.messaging = getMessaging(this.firebaseApp);
//             if ('serviceWorker' in navigator) {
//                 const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
//                 console.log('🔧 Service worker registered:', registration);
//             }
//             const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
//             if (token) {
//                 console.log('🔑 FCM token:', token);
//                 this.deviceToken = token;
//             }
//             onMessage(this.messaging, (payload) => {
//                 console.log('🔔 Foreground message received:', payload);
//                 this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
//             });
//             return { success: true, token: this.deviceToken };
//         } catch (error) {
//             console.error('❌ Firebase web initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     async showWebNotification(title, body) {
//         try {
//             if ('Notification' in window && Notification.permission === 'granted') {
//                 new Notification(title, { body: body, icon: '/icon-192x192.png' });
//             } else {
//                 console.log('🔔 Notification:', title, body);
//             }
//         } catch (error) {
//             console.error('❌ Failed to show web notification:', error);
//         }
//     }

//     async initializeLocalNotifications() {
//         try {
//             const localPermissions = await LocalNotifications.checkPermissions();
//             console.log('📋 Local notification permissions:', localPermissions);
//             if (localPermissions.display === 'prompt') {
//                 const requestResult = await LocalNotifications.requestPermissions();
//                 if (requestResult.display !== 'granted') {
//                     console.warn('⚠️ Local notification permission denied');
//                 }
//             }
//             LocalNotifications.addListener('localNotificationReceived', (notification) => {
//                 console.log('🔔 Local notification received:', notification);
//             });
//             LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
//                 console.log('🔔 Local notification action performed:', notification);
//                 this.handleNotificationTap(notification);
//             });
//             console.log('✅ Local notifications initialized');
//         } catch (error) {
//             console.error('❌ Local notification initialization failed:', error);
//         }
//     }

//     getNextNotificationId() {
//         if (this.notificationId >= 2147483647) {
//             this.notificationId = 1;
//         }
//         return this.notificationId++;
//     }

//     handleNotificationTap(notification) {
//         console.log('👆 User tapped notification:', notification);
//         if (notification.notification?.data?.page) {
//             console.log('🧭 Should navigate to:', notification.notification.data.page);
//         }
//         alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
//     }

//     async getDeviceToken() {
//         try {
//             if (this.deviceToken) {
//                 return this.deviceToken;
//             }
//             // This will now only read from the standard preferences, as the FCM token is obtained via the 'registration' event
//             const { value } = await Preferences.get({ key: 'deviceToken' });
//             if (value) {
//                 this.deviceToken = value;
//                 return value;
//             }
//             return null;
//         } catch (error) {
//             console.error('❌ Failed to get device token:', error);
//             return null;
//         }
//     }

//     async saveDeviceToken(token) {
//         try {
//             await Preferences.set({ key: 'deviceToken', value: token });
//             console.log('💾 Device token saved');
//         } catch (error) {
//             console.error('❌ Failed to save device token:', error);
//         }
//     }

//     async registerDevice() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             if (!backendUrl || !authToken || !deviceToken) {
//                 throw new Error('Missing required data for device registration');
//             }
//             const platformToSend = Capacitor.getPlatform();
//             console.log('🔧 Registering device with platform:', platformToSend);
//             const response = await fetch(`${backendUrl}/mobile/register`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify({ token: deviceToken, platform: platformToSend })
//             });
            
//             // --- DEBUGGING STEP FOR "The string did not match the expected pattern." ---
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response from registerDevice:', responseText);
            
//             let result;
//             try {
//                 result = JSON.parse(responseText);
//             } catch (jsonError) {
//                 throw new Error(`Failed to parse JSON response from backend: ${jsonError.message}. Raw response: ${responseText}`);
//             }
//             // --- END DEBUGGING STEP ---

//             if (!response.ok) {
//                 throw new Error(result.message || 'Device registration failed');
//             }
//             console.log('✅ Device registered successfully:', result);
//             return result;
//         } catch (error) {
//             console.error('❌ Device registration failed:', error);
//             throw error;
//         }
//     }

//     async requestTestNotification() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
//             console.log('🔧 DEBUG: Request details:');
//             console.log('🔧 URL:', fullUrl);
//             console.log('🔧 Method: POST');
//             console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
//             console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
//             const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
//             console.log('🔧 Body:', JSON.stringify(requestBody));
            
//             if (!backendUrl || !authToken) {
//                 throw new Error('Missing backend URL or auth token');
//             }
//             if (!deviceToken) {
//                 throw new Error('Device token not available. Make sure push notifications are initialized.');
//             }
            
//             const response = await fetch(fullUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify(requestBody)
//             });
            
//             console.log('🔧 DEBUG: Response status:', response.status);
//             console.log('🔧 DEBUG: Response headers:', response.headers);
            
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response:', responseText);
            
//             const result = JSON.parse(responseText);
            
//             if (result.success) {
//                 return { success: true, message: result.message };
//             } else {
//                 return { success: false, message: result.message || 'Test failed' };
//             }
//         } catch (error) {
//             console.error('❌ Error requesting test notification:', error);
//             return { success: false, message: error.message };
//         }
//     }

//     async testLocalNotification() {
//         try {
//             const notificationId = Math.floor(Math.random() * 1000000) + 1;
//             await LocalNotifications.schedule({
//                 notifications: [{
//                     title: '🧪 Test Local Notification',
//                     body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
//                     id: notificationId,
//                     schedule: { at: new Date(Date.now() + 1000) },
//                     sound: 'default',
//                     extra: { type: 'test' }
//                 }]
//             });
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Local notification error:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// const pushNotificationService = new PushNotificationService();
// export default pushNotificationService;




// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

// class PushNotificationService {
//     constructor() {
//         this.deviceToken = null;
//         this.isInitialized = false;
//         this.notificationId = 1; // Simple counter for notification IDs
//         // Web-specific properties
//         this.firebaseApp = null;
//         this.messaging = null;
//     }

//     // --- FINAL, CORRECTED INITIALIZE METHOD ---
//     async initialize() {
//         if (this.isInitialized) return { success: true };

//         try {
//             console.log('🔔 Initializing push notifications...');
//             console.log('📱 Platform:', Capacitor.getPlatform());

//             await this.initializeLocalNotifications();

//             if (Capacitor.getPlatform() === 'web') {
//                 const result = await this.initializeFirebaseWeb();
//                 if (!result.success) throw new Error(result.error);
//                 // The token is set within initializeFirebaseWeb
//             } else {
//                 // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
//                 this.addListeners(); // Sets up listeners for errors and incoming notifications

//                 const permissionStatus = await PushNotifications.checkPermissions();
//                 console.log('📋 Current push permission status:', permissionStatus);
//                 if (permissionStatus.receive === 'prompt') {
//                     const requestResult = await PushNotifications.requestPermissions();
//                     if (requestResult.receive !== 'granted') {
//                         throw new Error('Push notification permission denied');
//                     }
//                 }
//                 if (permissionStatus.receive !== 'granted') {
//                     throw new Error('Push notification permission not granted');
//                 }

//                 await PushNotifications.register();
//                 console.log('✅ Push registration process started...');

//                 // Wait for the 'registration' event to get the token for both iOS and Android
//                 this.deviceToken = await new Promise((resolve, reject) => {
//                     const timeout = setTimeout(() => {
//                         reject(new Error('Timed out waiting for push notification registration token.'));
//                     }, 20000); // 20 seconds timeout

//                     PushNotifications.addListener('registration', (token) => {
//                         clearTimeout(timeout);
//                         console.log(`✅ Mobile registration success, token: ${token.value}`);
//                         resolve(token.value);
//                     });
//                 });
//             }

//             if (!this.deviceToken) {
//                 throw new Error('Failed to obtain device token.');
//             }

//             await this.saveDeviceToken(this.deviceToken);
//             await this.registerDevice();

//             this.isInitialized = true;
//             console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
//             return { success: true, token: this.deviceToken };

//         } catch (error) {
//             console.error('❌ Push notification initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // --- MODIFIED addListeners METHOD (renamed from addOtherListeners) ---
//     // This method now handles the 'registration' event for both platforms
//     addListeners() {
//         console.log('🔧 Setting up push notification listeners...');
        
//         // The 'registration' listener is now handled directly in the initialize method's Promise.

//         PushNotifications.addListener('registrationError', (error) => {
//             console.error('❌ Push registration error:', error);
//         });

//         PushNotifications.addListener('pushNotificationReceived', async (notification) => {
//             console.log('🔔 Push notification received (foreground):', notification);
//             try {
//                 const notificationId = this.getNextNotificationId();
//                 await LocalNotifications.schedule({
//                     notifications: [{
//                         title: notification.title || 'Operrate',
//                         body: notification.body || 'You have a new notification',
//                         id: notificationId,
//                         schedule: { at: new Date(Date.now() + 500) },
//                         sound: 'default',
//                         extra: notification.data || {},
//                         smallIcon: 'ic_stat_icon_config_sample',
//                         iconColor: '#488AFF'
//                     }]
//                 });
//                 console.log('✅ Foreground notification displayed as local notification');
//             } catch (error) {
//                 console.error('❌ Failed to show foreground notification:', error);
//             }
//         });

//         PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
//             console.log('🔔 Push notification action performed (background):', notification);
//             this.handleNotificationTap(notification);
//         });
//     }

//     // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

//     async initializeFirebaseWeb() {
//         try {
//             console.log('🌐 Initializing Firebase for web...');
//             const { initializeApp } = await import('firebase/app');
//             const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
//             const firebaseConfigModule = await import('./firebase-config.js');
//             const firebaseConfig = firebaseConfigModule.default;
//             this.firebaseApp = initializeApp(firebaseConfig);
//             this.messaging = getMessaging(this.firebaseApp);
//             if ('serviceWorker' in navigator) {
//                 const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
//                 console.log('🔧 Service worker registered:', registration);
//             }
//             const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
//             if (token) {
//                 console.log('🔑 FCM token:', token);
//                 this.deviceToken = token;
//             }
//             onMessage(this.messaging, (payload) => {
//                 console.log('🔔 Foreground message received:', payload);
//                 this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
//             });
//             return { success: true, token: this.deviceToken };
//         } catch (error) {
//             console.error('❌ Firebase web initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     async showWebNotification(title, body) {
//         try {
//             if ('Notification' in window && Notification.permission === 'granted') {
//                 new Notification(title, { body: body, icon: '/icon-192x192.png' });
//             } else {
//                 console.log('🔔 Notification:', title, body);
//             }
//         } catch (error) {
//             console.error('❌ Failed to show web notification:', error);
//         }
//     }

//     async initializeLocalNotifications() {
//         try {
//             const localPermissions = await LocalNotifications.checkPermissions();
//             console.log('📋 Local notification permissions:', localPermissions);
//             if (localPermissions.display === 'prompt') {
//                 const requestResult = await LocalNotifications.requestPermissions();
//                 if (requestResult.display !== 'granted') {
//                     console.warn('⚠️ Local notification permission denied');
//                 }
//             }
//             LocalNotifications.addListener('localNotificationReceived', (notification) => {
//                 console.log('🔔 Local notification received:', notification);
//             });
//             LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
//                 console.log('🔔 Local notification action performed:', notification);
//                 this.handleNotificationTap(notification);
//             });
//             console.log('✅ Local notifications initialized');
//         } catch (error) {
//             console.error('❌ Local notification initialization failed:', error);
//         }
//     }

//     getNextNotificationId() {
//         if (this.notificationId >= 2147483647) {
//             this.notificationId = 1;
//         }
//         return this.notificationId++;
//     }

//     handleNotificationTap(notification) {
//         console.log('👆 User tapped notification:', notification);
//         if (notification.notification?.data?.page) {
//             console.log('🧭 Should navigate to:', notification.notification.data.page);
//         }
//         alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
//     }

//     async getDeviceToken() {
//         try {
//             if (this.deviceToken) {
//                 return this.deviceToken;
//             }
//             // This will now only read from the standard preferences, as the FCM token is obtained via the 'registration' event
//             const { value } = await Preferences.get({ key: 'deviceToken' });
//             if (value) {
//                 this.deviceToken = value;
//                 return value;
//             }
//             return null;
//         } catch (error) {
//             console.error('❌ Failed to get device token:', error);
//             return null;
//         }
//     }

//     async saveDeviceToken(token) {
//         try {
//             await Preferences.set({ key: 'deviceToken', value: token });
//             console.log('💾 Device token saved');
//         } catch (error) {
//             console.error('❌ Failed to save device token:', error);
//         }
//     }

//     async registerDevice() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             if (!backendUrl || !authToken || !deviceToken) {
//                 throw new Error('Missing required data for device registration');
//             }
//             const platformToSend = Capacitor.getPlatform();
//             console.log('🔧 Registering device with platform:', platformToSend);
//             const response = await fetch(`${backendUrl}/mobile/register`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify({ token: deviceToken, platform: platformToSend })
//             });
//             const result = await response.json(); // This line might be causing the "The string did not match the expected pattern." error
//             if (!response.ok) {
//                 throw new Error(result.message || 'Device registration failed');
//             }
//             console.log('✅ Device registered successfully:', result);
//             return result;
//         } catch (error) {
//             console.error('❌ Device registration failed:', error);
//             throw error;
//         }
//     }

//     async requestTestNotification() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
//             console.log('🔧 DEBUG: Request details:');
//             console.log('🔧 URL:', fullUrl);
//             console.log('🔧 Method: POST');
//             console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
//             console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
//             const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
//             console.log('🔧 Body:', JSON.stringify(requestBody));
            
//             if (!backendUrl || !authToken) {
//                 throw new Error('Missing backend URL or auth token');
//             }
//             if (!deviceToken) {
//                 throw new Error('Device token not available. Make sure push notifications are initialized.');
//             }
            
//             const response = await fetch(fullUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify(requestBody)
//             });
            
//             console.log('🔧 DEBUG: Response status:', response.status);
//             console.log('🔧 DEBUG: Response headers:', response.headers);
            
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response:', responseText);
            
//             const result = JSON.parse(responseText);
            
//             if (result.success) {
//                 return { success: true, message: result.message };
//             } else {
//                 return { success: false, message: result.message || 'Test failed' };
//             }
//         } catch (error) {
//             console.error('❌ Error requesting test notification:', error);
//             return { success: false, message: error.message };
//         }
//     }

//     async testLocalNotification() {
//         try {
//             const notificationId = Math.floor(Math.random() * 1000000) + 1;
//             await LocalNotifications.schedule({
//                 notifications: [{
//                     title: '🧪 Test Local Notification',
//                     body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
//                     id: notificationId,
//                     schedule: { at: new Date(Date.now() + 1000) },
//                     sound: 'default',
//                     extra: { type: 'test' }
//                 }]
//             });
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Local notification error:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// const pushNotificationService = new PushNotificationService();
// export default pushNotificationService;





// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

// class PushNotificationService {
//     constructor() {
//         this.deviceToken = null;
//         this.isInitialized = false;
//         this.notificationId = 1; // Simple counter for notification IDs
//         // Web-specific properties
//         this.firebaseApp = null;
//         this.messaging = null;
//     }

//     // --- FINAL, CORRECTED INITIALIZE METHOD ---
//     async initialize() {
//         if (this.isInitialized) return { success: true };

//         try {
//             console.log('🔔 Initializing push notifications...');
//             console.log('📱 Platform:', Capacitor.getPlatform());

//             await this.initializeLocalNotifications();

//             if (Capacitor.getPlatform() === 'web') {
//                 const result = await this.initializeFirebaseWeb();
//                 if (!result.success) throw new Error(result.error);
//                 // The token is set within initializeFirebaseWeb
//             } else {
//                 // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
//                 this.addListeners(); // Sets up listeners for errors and incoming notifications

//                 const permissionStatus = await PushNotifications.checkPermissions();
//                 console.log('📋 Current push permission status:', permissionStatus);
//                 if (permissionStatus.receive === 'prompt') {
//                     const requestResult = await PushNotifications.requestPermissions();
//                     if (requestResult.receive !== 'granted') {
//                         throw new Error('Push notification permission denied');
//                     }
//                 }
//                 if (permissionStatus.receive !== 'granted') {
//                     throw new Error('Push notification permission not granted');
//                 }

//                 await PushNotifications.register();
//                 console.log('✅ Push registration process started...');

//                 // Wait for the 'registration' event to get the token for both iOS and Android
//                 this.deviceToken = await new Promise((resolve, reject) => {
//                     const timeout = setTimeout(() => {
//                         reject(new Error('Timed out waiting for push notification registration token.'));
//                     }, 20000); // 20 seconds timeout

//                     PushNotifications.addListener('registration', (token) => {
//                         clearTimeout(timeout);
//                         console.log(`✅ Mobile registration success, token: ${token.value}`);
//                         resolve(token.value);
//                     });
//                 });
//             }

//             if (!this.deviceToken) {
//                 throw new Error('Failed to obtain device token.');
//             }

//             await this.saveDeviceToken(this.deviceToken);
//             await this.registerDevice();

//             this.isInitialized = true;
//             console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
//             return { success: true, token: this.deviceToken };

//         } catch (error) {
//             console.error('❌ Push notification initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // --- MODIFIED addListeners METHOD (renamed from addOtherListeners) ---
//     // This method now handles the 'registration' event for both platforms
//     addListeners() {
//         console.log('🔧 Setting up push notification listeners...');
        
//         // The 'registration' listener is now handled directly in the initialize method's Promise.

//         PushNotifications.addListener('registrationError', (error) => {
//             console.error('❌ Push registration error:', error);
//         });

//         PushNotifications.addListener('pushNotificationReceived', async (notification) => {
//             console.log('🔔 Push notification received (foreground):', notification);
//             try {
//                 const notificationId = this.getNextNotificationId();
//                 await LocalNotifications.schedule({
//                     notifications: [{
//                         title: notification.title || 'Operrate',
//                         body: notification.body || 'You have a new notification',
//                         id: notificationId,
//                         schedule: { at: new Date(Date.now() + 500) },
//                         sound: 'default',
//                         extra: notification.data || {},
//                         smallIcon: 'ic_stat_icon_config_sample',
//                         iconColor: '#488AFF'
//                     }]
//                 });
//                 console.log('✅ Foreground notification displayed as local notification');
//             } catch (error) {
//                 console.error('❌ Failed to show foreground notification:', error);
//             }
//         });

//         PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
//             console.log('🔔 Push notification action performed (background):', notification);
//             this.handleNotificationTap(notification);
//         });
//     }

//     // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

//     async initializeFirebaseWeb() {
//         try {
//             console.log('🌐 Initializing Firebase for web...');
//             const { initializeApp } = await import('firebase/app');
//             const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
//             const firebaseConfigModule = await import('./firebase-config.js');
//             const firebaseConfig = firebaseConfigModule.default;
//             this.firebaseApp = initializeApp(firebaseConfig);
//             this.messaging = getMessaging(this.firebaseApp);
//             if ('serviceWorker' in navigator) {
//                 const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
//                 console.log('🔧 Service worker registered:', registration);
//             }
//             const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
//             if (token) {
//                 console.log('🔑 FCM token:', token);
//                 this.deviceToken = token;
//             }
//             onMessage(this.messaging, (payload) => {
//                 console.log('🔔 Foreground message received:', payload);
//                 this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
//             });
//             return { success: true, token: this.deviceToken };
//         } catch (error) {
//             console.error('❌ Firebase web initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     async showWebNotification(title, body) {
//         try {
//             if ('Notification' in window && Notification.permission === 'granted') {
//                 new Notification(title, { body: body, icon: '/icon-192x192.png' });
//             } else {
//                 console.log('🔔 Notification:', title, body);
//             }
//         } catch (error) {
//             console.error('❌ Failed to show web notification:', error);
//         }
//     }

//     async initializeLocalNotifications() {
//         try {
//             const localPermissions = await LocalNotifications.checkPermissions();
//             console.log('📋 Local notification permissions:', localPermissions);
//             if (localPermissions.display === 'prompt') {
//                 const requestResult = await LocalNotifications.requestPermissions();
//                 if (requestResult.display !== 'granted') {
//                     console.warn('⚠️ Local notification permission denied');
//                 }
//             }
//             LocalNotifications.addListener('localNotificationReceived', (notification) => {
//                 console.log('🔔 Local notification received:', notification);
//             });
//             LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
//                 console.log('🔔 Local notification action performed:', notification);
//                 this.handleNotificationTap(notification);
//             });
//             console.log('✅ Local notifications initialized');
//         } catch (error) {
//             console.error('❌ Local notification initialization failed:', error);
//         }
//     }

//     getNextNotificationId() {
//         if (this.notificationId >= 2147483647) {
//             this.notificationId = 1;
//         }
//         return this.notificationId++;
//     }

//     handleNotificationTap(notification) {
//         console.log('👆 User tapped notification:', notification);
//         if (notification.notification?.data?.page) {
//             console.log('🧭 Should navigate to:', notification.notification.data.page);
//         }
//         alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
//     }

//     async getDeviceToken() {
//         try {
//             if (this.deviceToken) {
//                 return this.deviceToken;
//             }
//             // This will now only read from the standard preferences, as the FCM token is obtained via the 'registration' event
//             const { value } = await Preferences.get({ key: 'deviceToken' });
//             if (value) {
//                 this.deviceToken = value;
//                 return value;
//             }
//             return null;
//         } catch (error) {
//             console.error('❌ Failed to get device token:', error);
//             return null;
//         }
//     }

//     async saveDeviceToken(token) {
//         try {
//             await Preferences.set({ key: 'deviceToken', value: token });
//             console.log('💾 Device token saved');
//         } catch (error) {
//             console.error('❌ Failed to save device token:', error);
//         }
//     }

//     async registerDevice() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             if (!backendUrl || !authToken || !deviceToken) {
//                 throw new Error('Missing required data for device registration');
//             }
//             const platformToSend = Capacitor.getPlatform();
//             console.log('🔧 Registering device with platform:', platformToSend);
//             const response = await fetch(`${backendUrl}/mobile/register`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify({ token: deviceToken, platform: platformToSend })
//             });
//             const result = await response.json();
//             if (!response.ok) {
//                 throw new Error(result.message || 'Device registration failed');
//             }
//             console.log('✅ Device registered successfully:', result);
//             return result;
//         } catch (error) {
//             console.error('❌ Device registration failed:', error);
//             throw error;
//         }
//     }

//     async requestTestNotification() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
//             console.log('🔧 DEBUG: Request details:');
//             console.log('🔧 URL:', fullUrl);
//             console.log('🔧 Method: POST');
//             console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
//             console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
//             const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
//             console.log('🔧 Body:', JSON.stringify(requestBody));
            
//             if (!backendUrl || !authToken) {
//                 throw new Error('Missing backend URL or auth token');
//             }
//             if (!deviceToken) {
//                 throw new Error('Device token not available. Make sure push notifications are initialized.');
//             }
            
//             const response = await fetch(fullUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify(requestBody)
//             });
            
//             console.log('🔧 DEBUG: Response status:', response.status);
//             console.log('🔧 DEBUG: Response headers:', response.headers);
            
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response:', responseText);
            
//             const result = JSON.parse(responseText);
            
//             if (result.success) {
//                 return { success: true, message: result.message };
//             } else {
//                 return { success: false, message: result.message || 'Test failed' };
//             }
//         } catch (error) {
//             console.error('❌ Error requesting test notification:', error);
//             return { success: false, message: error.message };
//         }
//     }

//     async testLocalNotification() {
//         try {
//             const notificationId = Math.floor(Math.random() * 1000000) + 1;
//             await LocalNotifications.schedule({
//                 notifications: [{
//                     title: '🧪 Test Local Notification',
//                     body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
//                     id: notificationId,
//                     schedule: { at: new Date(Date.now() + 1000) },
//                     sound: 'default',
//                     extra: { type: 'test' }
//                 }]
//             });
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Local notification error:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// const pushNotificationService = new PushNotificationService();
// export default pushNotificationService;




// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

// class PushNotificationService {
//     constructor() {
//         this.deviceToken = null;
//         this.isInitialized = false;
//         this.notificationId = 1; // Simple counter for notification IDs
//         // Web-specific properties
//         this.firebaseApp = null;
//         this.messaging = null;
//     }

//     // --- FINAL, CORRECTED INITIALIZE METHOD ---
//     async initialize() {
//         if (this.isInitialized) return { success: true };

//         try {
//             console.log('🔔 Initializing push notifications...');
//             console.log('📱 Platform:', Capacitor.getPlatform());

//             await this.initializeLocalNotifications();

//             if (Capacitor.getPlatform() === 'web') {
//                 const result = await this.initializeFirebaseWeb();
//                 if (!result.success) throw new Error(result.error);
//                 // The token is set within initializeFirebaseWeb
//             } else {
//                 // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
//                 this.addListeners(); // Sets up listeners for errors and incoming notifications

//                 const permissionStatus = await PushNotifications.checkPermissions();
//                 console.log('📋 Current push permission status:', permissionStatus);
//                 if (permissionStatus.receive === 'prompt') {
//                     const requestResult = await PushNotifications.requestPermissions();
//                     if (requestResult.receive !== 'granted') {
//                         throw new Error('Push notification permission denied');
//                     }
//                 }
//                 if (permissionStatus.receive !== 'granted') {
//                     throw new Error('Push notification permission not granted');
//                 }

//                 await PushNotifications.register();
//                 console.log('✅ Push registration process started...');

//                 // Wait for the 'registration' event to get the token for both iOS and Android
//                 this.deviceToken = await new Promise((resolve, reject) => {
//                     const timeout = setTimeout(() => {
//                         reject(new Error('Timed out waiting for push notification registration token.'));
//                     }, 20000); // 20 seconds timeout

//                     PushNotifications.addListener('registration', (token) => {
//                         clearTimeout(timeout);
//                         console.log(`✅ Mobile registration success, token: ${token.value}`);
//                         resolve(token.value);
//                     });
//                 });
//             }

//             if (!this.deviceToken) {
//                 throw new Error('Failed to obtain device token.');
//             }

//             await this.saveDeviceToken(this.deviceToken);
//             await this.registerDevice();

//             this.isInitialized = true;
//             console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
//             return { success: true, token: this.deviceToken };

//         } catch (error) {
//             console.error('❌ Push notification initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // --- MODIFIED addListeners METHOD (renamed from addOtherListeners) ---
//     // This method now handles the 'registration' event for both platforms
//     addListeners() {
//         console.log('🔧 Setting up push notification listeners...');
        
//         // The 'registration' listener is now handled directly in the initialize method's Promise.

//         PushNotifications.addListener('registrationError', (error) => {
//             console.error('❌ Push registration error:', error);
//         });

//         PushNotifications.addListener('pushNotificationReceived', async (notification) => {
//             console.log('🔔 Push notification received (foreground):', notification);
//             try {
//                 const notificationId = this.getNextNotificationId();
//                 await LocalNotifications.schedule({
//                     notifications: [{
//                         title: notification.title || 'Operrate',
//                         body: notification.body || 'You have a new notification',
//                         id: notificationId,
//                         schedule: { at: new Date(Date.now() + 500) },
//                         sound: 'default',
//                         extra: notification.data || {},
//                         smallIcon: 'ic_stat_icon_config_sample',
//                         iconColor: '#488AFF'
//                     }]
//                 });
//                 console.log('✅ Foreground notification displayed as local notification');
//             } catch (error) {
//                 console.error('❌ Failed to show foreground notification:', error);
//             }
//         });

//         PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
//             console.log('🔔 Push notification action performed (background):', notification);
//             this.handleNotificationTap(notification);
//         });
//     }

//     // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

//     async initializeFirebaseWeb() {
//         try {
//             console.log('🌐 Initializing Firebase for web...');
//             const { initializeApp } = await import('firebase/app');
//             const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
//             const firebaseConfigModule = await import('./firebase-config.js');
//             const firebaseConfig = firebaseConfigModule.default;
//             this.firebaseApp = initializeApp(firebaseConfig);
//             this.messaging = getMessaging(this.firebaseApp);
//             if ('serviceWorker' in navigator) {
//                 const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
//                 console.log('🔧 Service worker registered:', registration);
//             }
//             const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
//             if (token) {
//                 console.log('🔑 FCM token:', token);
//                 this.deviceToken = token;
//             }
//             onMessage(this.messaging, (payload) => {
//                 console.log('🔔 Foreground message received:', payload);
//                 this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
//             });
//             return { success: true, token: this.deviceToken };
//         } catch (error) {
//             console.error('❌ Firebase web initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     async showWebNotification(title, body) {
//         try {
//             if ('Notification' in window && Notification.permission === 'granted') {
//                 new Notification(title, { body: body, icon: '/icon-192x192.png' });
//             } else {
//                 console.log('🔔 Notification:', title, body);
//             }
//         } catch (error) {
//             console.error('❌ Failed to show web notification:', error);
//         }
//     }

//     async initializeLocalNotifications() {
//         try {
//             const localPermissions = await LocalNotifications.checkPermissions();
//             console.log('📋 Local notification permissions:', localPermissions);
//             if (localPermissions.display === 'prompt') {
//                 const requestResult = await LocalNotifications.requestPermissions();
//                 if (requestResult.display !== 'granted') {
//                     console.warn('⚠️ Local notification permission denied');
//                 }
//             }
//             LocalNotifications.addListener('localNotificationReceived', (notification) => {
//                 console.log('🔔 Local notification received:', notification);
//             });
//             LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
//                 console.log('🔔 Local notification action performed:', notification);
//                 this.handleNotificationTap(notification);
//             });
//             console.log('✅ Local notifications initialized');
//         } catch (error) {
//             console.error('❌ Local notification initialization failed:', error);
//         }
//     }

//     getNextNotificationId() {
//         if (this.notificationId >= 2147483647) {
//             this.notificationId = 1;
//         }
//         return this.notificationId++;
//     }

//     handleNotificationTap(notification) {
//         console.log('👆 User tapped notification:', notification);
//         if (notification.notification?.data?.page) {
//             console.log('🧭 Should navigate to:', notification.notification.data.page);
//         }
//         alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
//     }

//     async getDeviceToken() {
//         try {
//             if (this.deviceToken) {
//                 return this.deviceToken;
//             }
//             // This will now only read from the standard preferences, as the FCM token is obtained via the 'registration' event
//             const { value } = await Preferences.get({ key: 'deviceToken' });
//             if (value) {
//                 this.deviceToken = value;
//                 return value;
//             }
//             return null;
//         } catch (error) {
//             console.error('❌ Failed to get device token:', error);
//             return null;
//         }
//     }

//     async saveDeviceToken(token) {
//         try {
//             await Preferences.set({ key: 'deviceToken', value: token });
//             console.log('💾 Device token saved');
//         } catch (error) {
//             console.error('❌ Failed to save device token:', error);
//         }
//     }

//     async registerDevice() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             if (!backendUrl || !authToken || !deviceToken) {
//                 throw new Error('Missing required data for device registration');
//             }
//             const platformToSend = Capacitor.getPlatform();
//             console.log('🔧 Registering device with platform:', platformToSend);
//             const response = await fetch(`${backendUrl}/mobile/register`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify({ token: deviceToken, platform: platformToSend })
//             });
//             const result = await response.json();
//             if (!response.ok) {
//                 throw new Error(result.message || 'Device registration failed');
//             }
//             console.log('✅ Device registered successfully:', result);
//             return result;
//         } catch (error) {
//             console.error('❌ Device registration failed:', error);
//             throw error;
//         }
//     }

//     async requestTestNotification() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
//             console.log('🔧 DEBUG: Request details:');
//             console.log('🔧 URL:', fullUrl);
//             console.log('🔧 Method: POST');
//             console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
//             console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
//             const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
//             console.log('🔧 Body:', JSON.stringify(requestBody));
            
//             if (!backendUrl || !authToken) {
//                 throw new Error('Missing backend URL or auth token');
//             }
//             if (!deviceToken) {
//                 throw new Error('Device token not available. Make sure push notifications are initialized.');
//             }
            
//             const response = await fetch(fullUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify(requestBody)
//             });
            
//             console.log('🔧 DEBUG: Response status:', response.status);
//             console.log('🔧 DEBUG: Response headers:', response.headers);
            
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response:', responseText);
            
//             const result = JSON.parse(responseText);
            
//             if (result.success) {
//                 return { success: true, message: result.message };
//             } else {
//                 return { success: false, message: result.message || 'Test failed' };
//             }
//         } catch (error) {
//             console.error('❌ Error requesting test notification:', error);
//             return { success: false, message: error.message };
//         }
//     }

//     async testLocalNotification() {
//         try {
//             const notificationId = Math.floor(Math.random() * 1000000) + 1;
//             await LocalNotifications.schedule({
//                 notifications: [{
//                     title: '🧪 Test Local Notification',
//                     body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
//                     id: notificationId,
//                     schedule: { at: new Date(Date.now() + 1000) },
//                     sound: 'default',
//                     extra: { type: 'test' }
//                 }]
//             });
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Local notification error:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// const pushNotificationService = new PushNotificationService();
// export default pushNotificationService;





// import { PushNotifications } from '@capacitor/push-notifications';
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { Preferences } from '@capacitor/preferences';
// import { Capacitor } from '@capacitor/core';

// class PushNotificationService {
//     constructor() {
//         this.deviceToken = null;
//         this.isInitialized = false;
//         this.notificationId = 1; // Simple counter for notification IDs
//         // Web-specific properties
//         this.firebaseApp = null;
//         this.messaging = null;
//     }

//     // --- FINAL, CORRECTED INITIALIZE METHOD ---
//     async initialize() {
//         if (this.isInitialized) return { success: true };

//         try {
//             console.log('🔔 Initializing push notifications...');
//             console.log('📱 Platform:', Capacitor.getPlatform());

//             await this.initializeLocalNotifications();

//             if (Capacitor.getPlatform() === 'web') {
//                 const result = await this.initializeFirebaseWeb();
//                 if (!result.success) throw new Error(result.error);
//                 // The token is set within initializeFirebaseWeb
//             } else {
//                 // --- UNIFIED AND CORRECTED MOBILE LOGIC ---
//                 this.addListeners(); // Sets up listeners for errors and incoming notifications

//                 const permissionStatus = await PushNotifications.checkPermissions();
//                 console.log('📋 Current push permission status:', permissionStatus);
//                 if (permissionStatus.receive === 'prompt') {
//                     const requestResult = await PushNotifications.requestPermissions();
//                     if (requestResult.receive !== 'granted') {
//                         throw new Error('Push notification permission denied');
//                     }
//                 }
//                 if (permissionStatus.receive !== 'granted') {
//                     throw new Error('Push notification permission not granted');
//                 }

//                 await PushNotifications.register();
//                 console.log('✅ Push registration process started...');

//                 if (Capacitor.getPlatform() === 'ios') {
//                     // For iOS, poll for the FCM token saved by AppDelegate into the App Group UserDefaults
//                     this.deviceToken = await this.pollForFcmToken();
//                 } else {
//                     // For Android, listen for the 'registration' event directly from PushNotifications
//                     this.deviceToken = await new Promise((resolve, reject) => {
//                         const wait = setTimeout(() => {
//                             reject(new Error('Timed out waiting for Android registration token.'));
//                         }, 15000);

//                         PushNotifications.addListener('registration', (token) => {
//                             clearTimeout(wait);
//                             console.log(`✅ Android registration success, token: ${token.value}`);
//                             resolve(token.value);
//                         });
//                     });
//                 }
//             }

//             if (!this.deviceToken) {
//                 throw new Error('Failed to obtain device token.');
//             }

//             // Save the device token to standard Preferences for general use within JS
//             await this.saveDeviceToken(this.deviceToken);
//             await this.registerDevice();

//             this.isInitialized = true;
//             console.log(`✅ Push notifications fully initialized. Token: ${this.deviceToken}`);
//             return { success: true, token: this.deviceToken };

//         } catch (error) {
//             console.error('❌ Push notification initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     // --- NEW HELPER METHOD TO POLL FOR THE TOKEN ON IOS ---
//     // This method will now read from the App Group UserDefaults
//     pollForFcmToken() {
//         return new Promise((resolve, reject) => {
//             const maxAttempts = 20;
//             const interval = 500;
//             let attempts = 0;

//             console.log('⏳ [iOS] Starting to poll for FCM token from App Group Preferences...');

//             const poll = setInterval(async () => {
//                 try {
//                     // Specify the group identifier when getting the preference
//                     const { value } = await Preferences.get({ key: 'fcmToken', group: 'group.com.operrate.mobilevanilla' });

//                     if (value) {
//                         console.log(`✅ [iOS] Successfully fetched FCM token from App Group: ${value}`);
//                         clearInterval(poll);
//                         resolve(value);
//                     } else {
//                         attempts++;
//                         if (attempts >= maxAttempts) {
//                             clearInterval(poll);
//                             console.error('❌ [iOS] Timed out polling for FCM token from App Group.');
//                             reject(new Error('Timed out waiting for FCM token.'));
//                         } else {
//                             console.log(`...[iOS] polling attempt ${attempts}, token not found yet in App Group.`);
//                         }
//                     }
//                 } catch (error) {
//                     clearInterval(poll);
//                     console.error('❌ [iOS] Error while polling for FCM token from App Group:', error);
//                     reject(error);
//                 }
//             }, interval);
//         });
//     }

//     // --- MODIFIED addListeners METHOD ---
//     addListeners() {
//         console.log('🔧 Setting up push notification listeners...');
        
//         PushNotifications.addListener('registrationError', (error) => {
//             console.error('❌ Push registration error:', error);
//         });

//         PushNotifications.addListener('pushNotificationReceived', async (notification) => {
//             console.log('🔔 Push notification received (foreground):', notification);
//             try {
//                 const notificationId = this.getNextNotificationId();
//                 await LocalNotifications.schedule({
//                     notifications: [{
//                         title: notification.title || 'Operrate',
//                         body: notification.body || 'You have a new notification',
//                         id: notificationId,
//                         schedule: { at: new Date(Date.now() + 500) },
//                         sound: 'default',
//                         extra: notification.data || {},
//                         smallIcon: 'ic_stat_icon_config_sample',
//                         iconColor: '#488AFF'
//                     }]
//                 });
//                 console.log('✅ Foreground notification displayed as local notification');
//             } catch (error) {
//                 console.error('❌ Failed to show foreground notification:', error);
//             }
//         });

//         PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
//             console.log('🔔 Push notification action performed (background):', notification);
//             this.handleNotificationTap(notification);
//         });
//     }

//     // --- ALL YOUR ORIGINAL METHODS BELOW ARE PRESERVED ---

//     async initializeFirebaseWeb() {
//         try {
//             console.log('🌐 Initializing Firebase for web...');
//             const { initializeApp } = await import('firebase/app');
//             const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
//             const firebaseConfigModule = await import('./firebase-config.js');
//             const firebaseConfig = firebaseConfigModule.default;
//             this.firebaseApp = initializeApp(firebaseConfig);
//             this.messaging = getMessaging(this.firebaseApp);
//             if ('serviceWorker' in navigator) {
//                 const registration = await navigator.serviceWorker.register(new URL('../firebase-messaging-sw.js', import.meta.url));
//                 console.log('🔧 Service worker registered:', registration);
//             }
//             const token = await getToken(this.messaging, { vapidKey: firebaseConfig.vapidKey });
//             if (token) {
//                 console.log('🔑 FCM token:', token);
//                 this.deviceToken = token;
//             }
//             onMessage(this.messaging, (payload) => {
//                 console.log('🔔 Foreground message received:', payload);
//                 this.showWebNotification(payload.notification?.title || 'New Message', payload.notification?.body || 'You have a new notification');
//             });
//             return { success: true, token: this.deviceToken };
//         } catch (error) {
//             console.error('❌ Firebase web initialization failed:', error);
//             return { success: false, error: error.message };
//         }
//     }

//     async showWebNotification(title, body) {
//         try {
//             if ('Notification' in window && Notification.permission === 'granted') {
//                 new Notification(title, { body: body, icon: '/icon-192x192.png' });
//             } else {
//                 console.log('🔔 Notification:', title, body);
//             }
//         } catch (error) {
//             console.error('❌ Failed to show web notification:', error);
//         }
//     }

//     async initializeLocalNotifications() {
//         try {
//             const localPermissions = await LocalNotifications.checkPermissions();
//             console.log('📋 Local notification permissions:', localPermissions);
//             if (localPermissions.display === 'prompt') {
//                 const requestResult = await LocalNotifications.requestPermissions();
//                 if (requestResult.display !== 'granted') {
//                     console.warn('⚠️ Local notification permission denied');
//                 }
//             }
//             LocalNotifications.addListener('localNotificationReceived', (notification) => {
//                 console.log('🔔 Local notification received:', notification);
//             });
//             LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
//                 console.log('🔔 Local notification action performed:', notification);
//                 this.handleNotificationTap(notification);
//             });
//             console.log('✅ Local notifications initialized');
//         } catch (error) {
//             console.error('❌ Local notification initialization failed:', error);
//         }
//     }

//     getNextNotificationId() {
//         if (this.notificationId >= 2147483647) {
//             this.notificationId = 1;
//         }
//         return this.notificationId++;
//     }

//     handleNotificationTap(notification) {
//         console.log('👆 User tapped notification:', notification);
//         if (notification.notification?.data?.page) {
//             console.log('🧭 Should navigate to:', notification.notification.data.page);
//         }
//         alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
//     }

//     async getDeviceToken() {
//         try {
//             if (this.deviceToken) {
//                 return this.deviceToken;
//             }
//             const { value } = await Preferences.get({ key: 'deviceToken' });
//             if (value) {
//                 this.deviceToken = value;
//                 return value;
//             }
//             return null;
//         } catch (error) {
//             console.error('❌ Failed to get device token:', error);
//             return null;
//         }
//     }

//     async saveDeviceToken(token) {
//         try {
//             await Preferences.set({ key: 'deviceToken', value: token });
//             console.log('💾 Device token saved');
//         } catch (error) {
//             console.error('❌ Failed to save device token:', error);
//         }
//     }

//     async registerDevice() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             if (!backendUrl || !authToken || !deviceToken) {
//                 throw new Error('Missing required data for device registration');
//             }
//             const platformToSend = Capacitor.getPlatform();
//             console.log('🔧 Registering device with platform:', platformToSend);
//             const response = await fetch(`${backendUrl}/mobile/register`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify({ token: deviceToken, platform: platformToSend })
//             });
//             const result = await response.json();
//             if (!response.ok) {
//                 throw new Error(result.message || 'Device registration failed');
//             }
//             console.log('✅ Device registered successfully:', result);
//             return result;
//         } catch (error) {
//             console.error('❌ Device registration failed:', error);
//             throw error;
//         }
//     }

//     async requestTestNotification() {
//         try {
//             const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//             const { value: authToken } = await Preferences.get({ key: 'authToken' });
//             const deviceToken = await this.getDeviceToken();
//             const fullUrl = `${backendUrl}/mobile/send-test-notification`;
            
//             console.log('🔧 DEBUG: Request details:');
//             console.log('🔧 URL:', fullUrl);
//             console.log('🔧 Method: POST');
//             console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
//             console.log('🔧 Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}` });
            
//             const requestBody = { message: 'Test notification from mobile app', deviceToken: deviceToken };
//             console.log('🔧 Body:', JSON.stringify(requestBody));
            
//             if (!backendUrl || !authToken) {
//                 throw new Error('Missing backend URL or auth token');
//             }
//             if (!deviceToken) {
//                 throw new Error('Device token not available. Make sure push notifications are initialized.');
//             }
            
//             const response = await fetch(fullUrl, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
//                 body: JSON.stringify(requestBody)
//             });
            
//             console.log('🔧 DEBUG: Response status:', response.status);
//             console.log('🔧 DEBUG: Response headers:', response.headers);
            
//             const responseText = await response.text();
//             console.log('🔧 DEBUG: Raw response:', responseText);
            
//             const result = JSON.parse(responseText);
            
//             if (result.success) {
//                 return { success: true, message: result.message };
//             } else {
//                 return { success: false, message: result.message || 'Test failed' };
//             }
//         } catch (error) {
//             console.error('❌ Error requesting test notification:', error);
//             return { success: false, message: error.message };
//         }
//     }

//     async testLocalNotification() {
//         try {
//             const notificationId = Math.floor(Math.random() * 1000000) + 1;
//             await LocalNotifications.schedule({
//                 notifications: [{
//                     title: '🧪 Test Local Notification',
//                     body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
//                     id: notificationId,
//                     schedule: { at: new Date(Date.now() + 1000) },
//                     sound: 'default',
//                     extra: { type: 'test' }
//                 }]
//             });
//             return { success: true };
//         } catch (error) {
//             console.error('❌ Local notification error:', error);
//             return { success: false, error: error.message };
//         }
//     }
// }

// const pushNotificationService = new PushNotificationService();
// export default pushNotificationService;


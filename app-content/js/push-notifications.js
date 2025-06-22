import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

class PushNotificationService {
    constructor() {
        this.deviceToken = null;
        this.isInitialized = false;
        this.notificationId = 1; // Simple counter for notification IDs
    }

    async initialize() {
        if (this.isInitialized) return { success: true };

        try {
            console.log('🔔 Initializing push notifications...');
            
            // Initialize local notifications first
            await this.initializeLocalNotifications();
            
            // Add listeners
            this.addListeners();

            // Check and request push notification permissions
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

            // Register for push notifications
            await PushNotifications.register();
            console.log('✅ Push notifications registered');

            this.isInitialized = true;
            return { success: true };
        } catch (error) {
            console.error('❌ Push notification initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeLocalNotifications() {
        try {
            // Request local notification permissions
            const localPermissions = await LocalNotifications.checkPermissions();
            console.log('📋 Local notification permissions:', localPermissions);

            if (localPermissions.display === 'prompt') {
                const requestResult = await LocalNotifications.requestPermissions();
                if (requestResult.display !== 'granted') {
                    console.warn('⚠️ Local notification permission denied');
                }
            }

            // Add local notification listeners
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

    addListeners() {
        console.log('🔧 Setting up push notification listeners...');

        // Registration success
        PushNotifications.addListener('registration', async (token) => {
            console.log('📱 Push registration success, token:', token.value);
            this.deviceToken = token.value;
            await this.saveDeviceToken(token.value);
            
            // Auto-register with backend
            try {
                await this.registerDevice();
                console.log('✅ Device auto-registered with backend');
            } catch (error) {
                console.error('❌ Auto-registration failed:', error);
            }
        });

        // Registration error
        PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Push registration error:', error);
        });

        // Foreground notifications - show as local notifications
        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            console.log('🔔 Push notification received (foreground):', notification);
            
            try {
                // Generate a simple notification ID (1-2147483647)
                const notificationId = this.getNextNotificationId();
                
                // Show the notification as a local notification when app is in foreground
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: notification.title || 'Operrate',
                            body: notification.body || 'You have a new notification',
                            id: notificationId,
                            schedule: { at: new Date(Date.now() + 500) }, // Show in 0.5 seconds
                            sound: 'default',
                            attachments: [],
                            actionTypeId: '',
                            extra: notification.data || {},
                            smallIcon: 'ic_stat_icon_config_sample',
                            iconColor: '#488AFF'
                        }
                    ]
                });
                
                console.log('✅ Foreground notification displayed as local notification');
            } catch (error) {
                console.error('❌ Failed to show foreground notification:', error);
            }
        });

        // Background notifications (when user taps notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('🔔 Push notification action performed (background):', notification);
            
            // Handle notification tap - you can navigate to specific screens here
            this.handleNotificationTap(notification);
        });
    }

    getNextNotificationId() {
        // Keep ID within Java int range (1 to 2147483647)
        if (this.notificationId >= 2147483647) {
            this.notificationId = 1;
        }
        return this.notificationId++;
    }

    handleNotificationTap(notification) {
        console.log('👆 User tapped notification:', notification);
        
        // Add your navigation logic here
        // For example, navigate to a specific page based on notification data
        if (notification.notification?.data?.page) {
            console.log('🧭 Should navigate to:', notification.notification.data.page);
            // window.location.href = notification.notification.data.page;
        }
        
        // Show alert for demo purposes
        alert(`Notification tapped: ${notification.notification?.title || 'Unknown'}`);
    }
   
    async getDeviceToken() {
        try {
            if (this.deviceToken) {
                return this.deviceToken;
            }
            
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
            await Preferences.set({
                key: 'deviceToken',
                value: token
            });
            console.log('💾 Device token saved');
        } catch (error) {
            console.error('❌ Failed to save device token:', error);
        }
    }

    // async getDeviceToken() {
    //     try {
    //         if (this.deviceToken) {
    //             return this.deviceToken;
    //         }

    //         const { value } = await Preferences.get({ key: 'deviceToken' });
    //         if (value) {
    //             this.deviceToken = value;
    //             return value;
    //         }

    //         return null;
    //     } catch (error) {
    //         console.error('❌ Failed to get device token:', error);
    //         return null;
    //     }
    // }

    

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: deviceToken,
                    platform: platformToSend
                })
            });

            const result = await response.json();
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

    // async requestTestNotification() {
    //     try {
    //         const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
    //         const { value: authToken } = await Preferences.get({ key: 'authToken' });

    //         if (!backendUrl || !authToken) {
    //             return {
    //                 success: false,
    //                 message: 'Missing backend URL or auth token'
    //             };
    //         }

    //         const deviceToken = await this.getDeviceToken() || 'TEST_TOKEN_12345';

    //         const response = await fetch(`${backendUrl}/mobile/send-test-notification`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${authToken}`
    //             },
    //             body: JSON.stringify({
    //                 deviceToken,
    //                 message: 'Test notification from mobile app'
    //             })
    //         });

    //         const result = await response.json();

    //         if (!response.ok) {
    //             throw new Error(`HTTP ${response.status}: ${result.message || 'Request failed'}`);
    //         }

    //         return result;
    //     } catch (error) {
    //         console.error('❌ Error requesting test notification:', error);
    //         throw error;
    //     }
    // }

    // // Test local notification directly
    // async testLocalNotification() {
    //     try {
    //         const notificationId = this.getNextNotificationId();
            
    //         await LocalNotifications.schedule({
    //             notifications: [
    //                 {
    //                     title: '🧪 Local Test',
    //                     body: `Local notification test at ${new Date().toLocaleTimeString()}`,
    //                     id: notificationId,
    //                     schedule: { at: new Date(Date.now() + 1000) },
    //                     sound: 'default',
    //                     attachments: [],
    //                     actionTypeId: '',
    //                     extra: { test: true },
    //                     smallIcon: 'ic_stat_icon_config_sample',
    //                     iconColor: '#FF0000'
    //                 }
    //             ]
    //         });
            
    //         console.log('✅ Local test notification scheduled with ID:', notificationId);
    //         return { success: true };
    //     } catch (error) {
    //         console.error('❌ Failed to schedule local notification:', error);
    //         return { success: false, error: error.message };
    //     }
    // }
// Just add this method to your existing PushNotificationService class
// async requestTestNotification() {
//     try {
//         const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
//         const { value: authToken } = await Preferences.get({ key: 'authToken' });


//         // DEBUG: Log the exact URL being called
//         const fullUrl = `${backendUrl}/mobile/send-test-notification`;
//         // NOW we can use fullUrl in debug - AFTER it's declared
//         console.log('🔧 DEBUG: Request details:');
//         console.log('🔧 URL:', fullUrl);
//         console.log('🔧 Method: POST');
//         console.log('🔧 Headers:', {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}`
//         });
//         console.log('🔧 Body:', JSON.stringify({
//             message: 'Test notification from mobile app'
//         }));
        
//         if (!backendUrl || !authToken) {
//             throw new Error('Missing backend URL or auth token');
//         }

//         const response = await fetch(fullUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${authToken}`
//             },
//             body: JSON.stringify({
//                 message: 'Test notification from mobile app'
//             })
//         });

//         // DEBUG: Log response details
//         console.log('🔧 DEBUG: Response status:', response.status);
//         console.log('🔧 DEBUG: Response headers:', response.headers);
        
//         const responseText = await response.text();
//         console.log('🔧 DEBUG: Raw response:', responseText);
        
//         // Try to parse as JSON
//         const result = JSON.parse(responseText);
        
//         if (result.success) {
//             return { success: true, message: result.message };
//         } else {
//             return { success: false, message: result.message || 'Test failed' };
//         }
//     } catch (error) {
//         console.error('❌ Error requesting test notification:', error);
//         return { success: false, message: error.message };
//     }
// }
async requestTestNotification() {
    try {
        const { value: backendUrl } = await Preferences.get({ key: 'operrate_backend_url' });
        const { value: authToken } = await Preferences.get({ key: 'authToken' });
        
        // Get the device token
        const deviceToken = await this.getDeviceToken();
        
        const fullUrl = `${backendUrl}/mobile/send-test-notification`;
        
        console.log('🔧 DEBUG: Request details:');
        console.log('🔧 URL:', fullUrl);
        console.log('🔧 Method: POST');
        console.log('🔧 Device Token:', deviceToken ? 'Present' : 'Missing');
        console.log('🔧 Headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken ? authToken.substring(0, 20) + '...' : 'MISSING'}`
        });
        
        const requestBody = {
            message: 'Test notification from mobile app',
            deviceToken: deviceToken  // Add the device token here
        };
        
        console.log('🔧 Body:', JSON.stringify(requestBody));

        if (!backendUrl || !authToken) {
            throw new Error('Missing backend URL or auth token');
        }

        if (!deviceToken) {
            throw new Error('Device token not available. Make sure push notifications are initialized.');
        }

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
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
            notifications: [
                {
                    title: '🧪 Test Local Notification',
                    body: `This is a test local notification sent at ${new Date().toLocaleTimeString()}`,
                    id: notificationId,
                    schedule: { at: new Date(Date.now() + 1000) },
                    sound: 'default',
                    extra: { type: 'test' }
                }
            ]
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

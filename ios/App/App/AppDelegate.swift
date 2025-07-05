import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging // <-- Make sure this is imported

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Use Firebase library to configure APIs
        FirebaseApp.configure()
        
        // Set self as the messaging delegate
        Messaging.messaging().delegate = self
        
        return true
    }

    // This function is called when APNs successfully registers your app.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // 1. Pass token to Firebase
        Messaging.messaging().apnsToken = deviceToken
        
        // 2. Pass token to Capacitor
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    // This function is called when APNs fails to register your app.
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Pass the error to Capacitor
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// --- ADD THIS ENTIRE BLOCK AT THE END OF THE FILE ---
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("✅ Firebase registration token (FCM): \(String(describing: fcmToken))")
        
        // This token is for sending notifications FROM Firebase.
        // You can now send this fcmToken to your server.

        // --- NEW: Save FCM token to App Group UserDefaults so JavaScript can retrieve it ---
        if let token = fcmToken {
            // IMPORTANT: Replace "group.com.operrate.mobilevanilla" with your actual App Group Identifier
            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
                sharedDefaults.set(token, forKey: "fcmToken")
                print("💾 FCM token saved to App Group UserDefaults: \(token)")
            } else {
                print("❌ Could not access shared App Group UserDefaults. Make sure the App Group is correctly configured in Xcode.")
            }
        } else {
            // If token is nil, remove it from shared defaults as well
            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
                sharedDefaults.removeObject(forKey: "fcmToken")
                print("❌ FCM token is nil, removed from App Group UserDefaults.")
            }
        }
    }
}


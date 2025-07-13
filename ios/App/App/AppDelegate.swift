import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

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

// Firebase Messaging Delegate
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("✅ Firebase registration token (FCM): \(String(describing: fcmToken))")
        
        if let token = fcmToken {
            // Send the FCM token to Capacitor as a registration event
            DispatchQueue.main.async {
                NotificationCenter.default.post(
                    name: .capacitorDidRegisterForRemoteNotifications,
                    object: token.data(using: .utf8)
                )
            }
            print("📤 FCM token sent to Capacitor: \(token)")
        }
    }
}



//import UIKit
//import Capacitor
//import FirebaseCore
//import FirebaseMessaging
//
//@UIApplicationMain
//class AppDelegate: UIResponder, UIApplicationDelegate {
//
//    var window: UIWindow?
//
//    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
//        // Use Firebase library to configure APIs
//        FirebaseApp.configure()
//        
//        // Set self as the messaging delegate
//        Messaging.messaging().delegate = self
//        
//        return true
//    }
//
//    // This function is called when APNs successfully registers your app.
//    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
//        // 1. Pass token to Firebase
//        Messaging.messaging().apnsToken = deviceToken
//        
//        // 2. Pass token to Capacitor
//        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
//    }
//
//    // This function is called when APNs fails to register your app.
//    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
//        // Pass the error to Capacitor
//        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
//    }
//
//    func applicationWillResignActive(_ application: UIApplication) {
//    }
//
//    func applicationDidEnterBackground(_ application: UIApplication) {
//    }
//
//    func applicationWillEnterForeground(_ application: UIApplication) {
//    }
//
//    func applicationDidBecomeActive(_ application: UIApplication) {
//    }
//
//    func applicationWillTerminate(_ application: UIApplication) {
//    }
//
//    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
//        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
//    }
//
//    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
//        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
//    }
//}
//
//// Firebase Messaging Delegate
//extension AppDelegate: MessagingDelegate {
//    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
//        print("✅ Firebase registration token (FCM): \(String(describing: fcmToken))")
//        
//        // Save ONLY to App Group UserDefaults (where Capacitor Preferences can find it)
//        if let token = fcmToken {
//            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
//                sharedDefaults.set(token, forKey: "fcmToken")
//                sharedDefaults.synchronize() // Force immediate save
//                print("💾 FCM token saved to App Group UserDefaults: \(token)")
//            } else {
//                print("❌ Could not access App Group UserDefaults.")
//            }
//        } else {
//            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
//                sharedDefaults.removeObject(forKey: "fcmToken")
//                sharedDefaults.synchronize()
//                print("❌ FCM token is nil, removed from App Group UserDefaults.")
//            }
//        }
//    }
//}



//import UIKit
//import Capacitor
//import FirebaseCore
//import FirebaseMessaging
//
//@UIApplicationMain
//class AppDelegate: UIResponder, UIApplicationDelegate {
//
//    var window: UIWindow?
//
//    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
//        // Use Firebase library to configure APIs
//        FirebaseApp.configure()
//        
//        // Set self as the messaging delegate
//        Messaging.messaging().delegate = self
//        
//        return true
//    }
//
//    // This function is called when APNs successfully registers your app.
//    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
//        // 1. Pass token to Firebase
//        Messaging.messaging().apnsToken = deviceToken
//        
//        // 2. Pass token to Capacitor
//        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
//    }
//
//    // This function is called when APNs fails to register your app.
//    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
//        // Pass the error to Capacitor
//        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
//    }
//
//    func applicationWillResignActive(_ application: UIApplication) {
//    }
//
//    func applicationDidEnterBackground(_ application: UIApplication) {
//    }
//
//    func applicationWillEnterForeground(_ application: UIApplication) {
//    }
//
//    func applicationDidBecomeActive(_ application: UIApplication) {
//    }
//
//    func applicationWillTerminate(_ application: UIApplication) {
//    }
//
//    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
//        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
//    }
//
//    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
//        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
//    }
//}
//
//// Firebase Messaging Delegate
//extension AppDelegate: MessagingDelegate {
//    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
//        print("✅ Firebase registration token (FCM): \(String(describing: fcmToken))")
//        
//        // Save FCM token to App Group UserDefaults
//        if let token = fcmToken {
//            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
//                sharedDefaults.set(token, forKey: "fcmToken")
//                print("💾 FCM token saved to App Group UserDefaults: \(token)")
//            } else {
//                print("❌ Could not access shared App Group UserDefaults.")
//            }
//        } else {
//            if let sharedDefaults = UserDefaults(suiteName: "group.com.operrate.mobilevanilla") {
//                sharedDefaults.removeObject(forKey: "fcmToken")
//                print("❌ FCM token is nil, removed from App Group UserDefaults.")
//            }
//        }
//    }
//}
//

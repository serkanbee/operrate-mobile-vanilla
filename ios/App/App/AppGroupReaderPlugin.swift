//
//  AppGroupReaderPlugin.swift
//  App
//
//  Created by Serks Arr on Lea on 05/07/2025.
//

import Foundation
import Capacitor

@objc(AppGroupReaderPlugin)
public class AppGroupReaderPlugin: CAPPlugin {
    
    @objc func getFCMToken(_ call: CAPPluginCall) {
        let appGroupIdentifier = "group.com.operrate.mobilevanilla"
        
        if let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) {
            if let fcmToken = sharedDefaults.string(forKey: "fcmToken") {
                print("✅ AppGroupReaderPlugin: Successfully read FCM token: \(fcmToken)")
                call.resolve(["fcmToken": fcmToken])
            } else {
                print("❌ AppGroupReaderPlugin: FCM token not found in App Group.")
                call.resolve(["fcmToken": NSNull()])
            }
        } else {
            print("❌ AppGroupReaderPlugin: Could not access App Group UserDefaults.")
            call.reject("Could not access App Group UserDefaults")
        }
    }
}

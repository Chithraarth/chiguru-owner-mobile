// Apps built with the iOS 27 SDK (Xcode 27) must start through a UIScene;
// otherwise UIKit stops the app at launch
// (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). Expo SDK
// 54's generated AppDelegate still creates its UIWindow the pre-scene way, so
// this plugin:
//   1. declares a scene configuration in Info.plist pointing at SceneDelegate;
//   2. makes AppDelegate keep the launch options instead of building a window;
//   3. adds a SceneDelegate that creates the window from the UIWindowScene and
//      starts React Native in it.
// Safe to run repeatedly: every edit checks whether it's already applied.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const MARKER = "// chiguru: scene lifecycle";

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle expects a Swift AppDelegate");
    }
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    const factoryVars = "  var reactNativeFactory: RCTReactNativeFactory?\n";
    const windowStart = /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
    if (!src.includes(factoryVars) || !windowStart.test(src)) {
      throw new Error("withSceneLifecycle: AppDelegate.swift doesn't match the Expo SDK 54 template - update the plugin");
    }

    src = src.replace(
      factoryVars,
      `${factoryVars}  ${MARKER}: React Native starts when the scene connects (SceneDelegate).\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`,
    );
    src = src.replace(windowStart, "    self.launchOptions = launchOptions\n");
    src += `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: appDelegate.launchOptions)
    self.window = window
    appDelegate.window = window
    // Deep links that launched the app arrive here rather than in AppDelegate.
    for context in connectionOptions.urlContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};

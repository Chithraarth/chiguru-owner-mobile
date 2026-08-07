import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// expo-firebase-recaptcha was removed from the Expo SDK (unmaintained since
// SDK 48). A plain-object "fake verifier" satisfying only the public
// ApplicationVerifier TS interface does NOT work: the Firebase JS SDK's
// phone-auth flow internally calls private methods (e.g. `_reset`) on the
// verifier instance, which only a real `firebase.auth.RecaptchaVerifier`
// implements. RN has no DOM for that class to attach to.
//
// Fix: run the *entire* send-OTP step (real RecaptchaVerifier + real DOM)
// inside a WebView using Firebase's compat SDK there. Firebase's
// confirmationResult.verificationId is just a portable string (issued by
// the Identity Toolkit backend, not tied to the browser instance) - we hand
// it back to RN and finish the OTP step there with the RN-native
// PhoneAuthProvider.credential(verificationId, code) + signInWithCredential,
// which produces a real native Firebase Auth session.
//
// Rendered INLINE (not as a popup/Modal) directly in the sign-in form flow -
// the container is collapsed to 0 height until a send-OTP attempt is in
// flight, then expands in place to show the challenge if Google requires
// one (most attempts pass invisibly with no visible challenge at all).

function buildHtml(apiKey: string, authDomain: string, projectId: string, appId: string, phoneNumber: string) {
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;">
  <div id="recaptcha-container"></div>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script>
    function post(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    try {
      firebase.initializeApp({
        apiKey: "${apiKey}",
        authDomain: "${authDomain}",
        projectId: "${projectId}",
        appId: "${appId}",
      });
      var verifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
        size: "normal",
        callback: function () { post({ type: "challenge_solved" }); },
      });
      verifier.render().then(function () { post({ type: "rendered" }); });
      firebase.auth().signInWithPhoneNumber("${phoneNumber}", verifier)
        .then(function (confirmationResult) {
          post({ type: "otp_sent", verificationId: confirmationResult.verificationId });
        })
        .catch(function (err) {
          post({ type: "error", message: String(err && err.message ? err.message : err) });
        });
    } catch (err) {
      post({ type: "error", message: String(err && err.message ? err.message : err) });
    }
  </script>
</body>
</html>`;
}

export interface RecaptchaModalHandle {
  /** Runs the real reCAPTCHA + send-OTP flow inline, resolves with a verificationId. */
  sendOtp(phoneNumber: string): Promise<string>;
}

interface Props {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export const RecaptchaModal = forwardRef<RecaptchaModalHandle, Props>(function RecaptchaModal(
  { apiKey, authDomain, projectId, appId },
  ref
) {
  const [active, setActive] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const resolverRef = useRef<((verificationId: string) => void) | null>(null);
  const rejecterRef = useRef<((err: Error) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    sendOtp: (phone: string) =>
      new Promise<string>((resolve, reject) => {
        resolverRef.current = resolve;
        rejecterRef.current = reject;
        setNeedsChallenge(false);
        setPhoneNumber(phone);
        setActive(true);
      }),
  }));

  function reset() {
    setActive(false);
    setNeedsChallenge(false);
    setPhoneNumber(null);
  }

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === "otp_sent") {
        resolverRef.current?.(payload.verificationId);
        reset();
      } else if (payload.type === "error") {
        rejecterRef.current?.(new Error(payload.message ?? "Could not send OTP, try again"));
        reset();
      } else if (payload.type === "challenge_solved") {
        // Verifier is about to auto-submit the phone sign-in - keep the box
        // visible a moment longer rather than collapsing mid-challenge.
        setNeedsChallenge(false);
      } else if (payload.type === "rendered") {
        // Most attempts pass invisibly; only reveal the box if reCAPTCHA
        // actually renders a visible challenge widget.
        setNeedsChallenge(true);
      }
    } catch {
      // ignore malformed messages
    }
  }

  const visible = active && needsChallenge;

  return (
    <View style={[styles.container, visible ? styles.containerVisible : styles.containerHidden]}>
      {active && phoneNumber ? (
        <WebView
          originWhitelist={["*"]}
          source={{
            html: buildHtml(apiKey, authDomain, projectId, appId, phoneNumber),
            // Without a baseUrl matching the Firebase authDomain, the
            // WebView's document has no real origin and Firebase's
            // Identity Toolkit backend rejects the reCAPTCHA/phone-auth
            // request with a generic "auth/internal-error". Setting
            // baseUrl makes window.location.origin resolve to the
            // authorized domain so the request validates correctly.
            baseUrl: `https://${authDomain}`,
          }}
          onMessage={handleMessage}
          style={{ backgroundColor: "transparent" }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  containerHidden: { height: 0 },
  containerVisible: { height: 90, marginBottom: 16 },
});

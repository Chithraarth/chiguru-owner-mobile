import React from "react";
import { Modal, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../../../components/theme";

// This app has no native Razorpay SDK (subscriptions are sold via Google
// Play Billing instead — see react-native-iap in SubscriptionScreen). A
// one-time wallet recharge order is still a real Razorpay payment though, so
// it needs Razorpay's own checkout.js, which is a browser-only script — same
// problem RecaptchaModal solves for Firebase's phone-auth reCAPTCHA: run the
// real, unmodified web widget inside a WebView and bridge its result back to
// RN with postMessage. Mirrors chiguru-owner-web's subscription.tsx flow
// (loadRazorpayScript + `new window.Razorpay(...).open()`) 1:1, just hosted
// inside a modal WebView instead of the page itself.

function buildHtml(opts: { keyId: string; orderId: string; amount: number; currency: string; name: string; description: string }) {
  const { keyId, orderId, amount, currency, name, description } = opts;
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;background:#fff;">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function post(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    try {
      var rzp = new Razorpay({
        key: "${keyId}",
        order_id: "${orderId}",
        amount: ${Math.round(amount * 100)},
        currency: "${currency}",
        name: "Chiguru",
        description: ${JSON.stringify(description)},
        theme: { color: "#2E2A54" },
        handler: function (response) {
          post({
            type: "success",
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () { post({ type: "dismissed" }); },
        },
      });
      rzp.on("payment.failed", function (resp) {
        post({ type: "error", message: (resp && resp.error && resp.error.description) || "Payment failed" });
      });
      rzp.open();
    } catch (err) {
      post({ type: "error", message: String(err && err.message ? err.message : err) });
    }
  </script>
</body>
</html>`;
}

interface Props {
  visible: boolean;
  order: { keyId: string; orderId: string; amount: number; currency: string } | null;
  description: string;
  onSuccess: (result: { paymentId: string; orderId: string; signature: string }) => void;
  onDismiss: () => void;
  onError: (message: string) => void;
}

export function RazorpayCheckoutModal({ visible, order, description, onSuccess, onDismiss, onError }: Props) {
  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === "success") {
        onSuccess({ paymentId: payload.paymentId, orderId: payload.orderId, signature: payload.signature });
      } else if (payload.type === "dismissed") {
        onDismiss();
      } else if (payload.type === "error") {
        onError(payload.message ?? "Payment failed");
      }
    } catch {
      // ignore malformed messages
    }
  }

  return (
    <Modal visible={visible && !!order} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        {order ? (
          <WebView
            originWhitelist={["*"]}
            source={{
              html: buildHtml({ ...order, name: "Chiguru", description }),
              baseUrl: "https://checkout.razorpay.com",
            }}
            onMessage={handleMessage}
            style={styles.webview}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  webview: { flex: 1, backgroundColor: colors.bg },
});

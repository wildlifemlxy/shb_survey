const axios = require('axios');

// Updated OneSignal App ID and REST API Key
//0fb681c3-9fae-4229-b291-678c70049a02
//os_v2_app_b63idq47vzbctmurm6ghabe2aia7hart4zcevafhvdae5xrg5d4sju7jeizbtfc53hin6md7z6fqofve7wolpjzzoxq2emw62cwvd4q
const ONESIGNAL_APP_ID = '0fb681c3-9fae-4229-b291-678c70049a02';
const ONESIGNAL_API_KEY = 'Basic os_v2_app_b63idq47vzbctmurm6ghabe2aia7hart4zcevafhvdae5xrg5d4sju7jeizbtfc53hin6md7z6fqofve7wolpjzzoxq2emw62cwvd4q';// Replace with your actual REST API Key (no Basic or os_v2_app_ prefix)

/**
 * Send a OneSignal push notification to a specific device (for testing) or all users.
 * The notification can include additional data for the Android app.
 */
async function sendOneSignalNotification({ title, message, data = null, type = 'web' }) {
  try {    
    console.log("Sending OneSignal notification with:", { title, message, data, type });

    const notificationData = {
      app_id: ONESIGNAL_APP_ID,
      contents: { en: message },
      headings: { en: title },
      priority: 10,
      ttl: 259200,  // 72 days in seconds
      send_after: new Date().toISOString(), // Send immediately
      // Target all users regardless of subscription status
      include_unsubscribed: true
    };
    
    // Add custom data if provided (for MFA approval, etc.)
    if (data) {
      notificationData.data = data;
    }

    // Handle different notification types
    if (type === 'mfa_approval') {
      // For MFA approval - target all users including Android devices
      notificationData.included_segments = ["Active Users", "Engaged Users", "All"];
      console.log("Targeting all users for MFA approval");
    } else {
      // For web push notifications - include web URL and target web browsers
      notificationData.url = "https://gentle-dune-0405ec500.1.azurestaticapps.net/";
      notificationData.included_segments = ["Active Users", "Engaged Users", "All"];
      console.log("Targeting web browsers for general notifications");
    }

    console.log("OneSignal request payload:", JSON.stringify(notificationData));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications', 
      notificationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ONESIGNAL_API_KEY
        }
      }
    );

    console.log("OneSignal API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("OneSignal API error:", error.response ? error.response.data : error.message);

    // Special handling for "no subscribers" error
    if (error.response?.data?.errors?.includes('All included players are not subscribed')) {
      console.log("No subscribed users found. This is normal if no one has accepted notifications yet.");
      return { success: false, reason: "No subscribed users" };
    }

    throw error;
  }
}

module.exports = { sendOneSignalNotification };
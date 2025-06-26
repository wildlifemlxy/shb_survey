const axios = require('axios');

// Updated OneSignal App ID and REST API Key
//0fb681c3-9fae-4229-b291-678c70049a02
//os_v2_app_b63idq47vzbctmurm6ghabe2aia7hart4zcevafhvdae5xrg5d4sju7jeizbtfc53hin6md7z6fqofve7wolpjzzoxq2emw62cwvd4q
const ONESIGNAL_APP_ID = '0fb681c3-9fae-4229-b291-678c70049a02';
const ONESIGNAL_API_KEY = 'Basic os_v2_app_b63idq47vzbctmurm6ghabe2aia7hart4zcevafhvdae5xrg5d4sju7jeizbtfc53hin6md7z6fqofve7wolpjzzoxq2emw62cwvd4q';// Replace with your actual REST API Key (no Basic or os_v2_app_ prefix)

/**
 * Send a OneSignal push notification to a specific device (for testing) or all users.
 * The notification URL is always set to the Azure SWA URL.
 */
async function sendOneSignalNotification({ title, message }) {
  try {    
    // Always use Azure SWA URL for notifications
    const url = "https://gentle-dune-0405ec500.1.azurestaticapps.net/";

    console.log("Sending OneSignal notification with:", { title, message, url });

    // Add your Player ID here to force notification to your device
    const testDevices = ['be9615de-c4d7-42e6-950e-8aa7b4a790cf']; // Replace with your actual Player ID from OneSignal dashboard

    const data = {
      app_id: ONESIGNAL_APP_ID,
      contents: { en: message },
      headings: { en: title },
      url: url,
      priority: 10,
      ttl: 259200  // 72 days in seconds
    };
    

    data.included_segments = ["Active Users", "Engaged Users", "All"];

    console.log("OneSignal request payload:", JSON.stringify(data));

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications', 
      data,
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
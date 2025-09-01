

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import '../css/components/PrivacyPolicyNotice.css';

class PrivacyPolicyNotice extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentDateTime: new Date().toLocaleString(),
    };
    this.timer = null;
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: new Date().toLocaleString() });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  render() {
    const { currentDateTime } = this.state;
    return (
      <div className="privacy-policy-container">
        <div className="privacy-policy-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Privacy Policy</h1>
            </div>
            <div className="header-actions">
              <Link to="/" className="home-link">
                <FontAwesomeIcon icon={faHome} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="privacy-policy-content">
          <h3 className="last-updated">Last updated: July 14, 2025</h3>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application (the "Service"). By using the Service, you consent to the practices described in this policy.
          </p>
          <h3>1. Information We Collect</h3>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, phone number, and other identifiers you provide when registering or interacting with the Service.</li>
            <li><strong>Account Credentials:</strong> Username, password, and authentication tokens.</li>
            <li><strong>Usage Data:</strong> IP address, browser type, device information, operating system, access times, and pages viewed.</li>
            <li><strong>Location Data:</strong> If you enable location services, we may collect and process information about your actual location.</li>
            <li><strong>Cookies and Tracking:</strong> We use cookies, web beacons, and similar technologies to collect information about your interactions with the Service.</li>
          </ul>
          <h3>2. How We Use Your Information</h3>
          <ul>
            <li>To provide, operate, and maintain the Service</li>
            <li>To personalize your experience and deliver content relevant to you</li>
            <li>To process transactions and send related information</li>
            <li>To communicate with you, including for support, updates, and marketing</li>
            <li>To monitor and analyze usage and trends to improve the Service</li>
            <li>To detect, prevent, and address technical issues, fraud, and abuse</li>
            <li>To comply with legal obligations and enforce our policies</li>
          </ul>
          <h3>3. Legal Bases for Processing (GDPR Users)</h3>
          <ul>
            <li>We process your personal data only when we have a legal basis, such as your consent, to fulfill a contract, to comply with legal obligations, or for our legitimate interests.</li>
          </ul>
          <h3>4. Sharing and Disclosure of Information</h3>
          <ul>
            <li>With service providers and contractors who help us operate the Service</li>
            <li>With affiliates, partners, and subsidiaries</li>
            <li>With law enforcement or government agencies if required by law or to protect our rights</li>
            <li>In connection with a merger, sale, or asset transfer</li>
            <li>We do not sell your personal information to third parties</li>
          </ul>
          <h3>5. Data Retention</h3>
          <p>
            We retain your personal information only as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
          </p>
          <h3>6. Data Security</h3>
          <p>
            We implement reasonable administrative, technical, and physical safeguards to protect your information. However, no method of transmission over the Internet or electronic storage is completely secure.
          </p>
          <h3>7. Your Rights and Choices</h3>
          <ul>
            <li>You may access, update, or delete your personal information by contacting us.</li>
            <li>You may opt out of marketing communications at any time.</li>
            <li>You may disable cookies through your browser settings.</li>
            <li>Depending on your location, you may have additional rights under local laws (e.g., GDPR, CCPA).</li>
          </ul>
          <h3>8. International Data Transfers</h3>
          <p>
            Your information may be transferred to and maintained on servers located outside your country. We take steps to ensure your data is treated securely and in accordance with this policy.
          </p>
          <h3>9. Children's Privacy</h3>
          <p>
            Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will take steps to delete it.
          </p>
          <h3>10. Third-Party Links and Services</h3>
          <p>
            The Service may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties.
          </p>
          <h3>11. Changes to This Privacy Policy</h3>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. Changes are effective when posted.
          </p>
          <h3>12. Contact Us</h3>
          <p>
            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at privacy@yourdomain.com.
          </p>
        </div>
      </div>
    );
  }
}

export default PrivacyPolicyNotice;

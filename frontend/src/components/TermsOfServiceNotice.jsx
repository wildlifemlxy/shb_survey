

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';

class TermsOfServiceNotice extends Component {
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
      <div className="terms-of-service-container">
        <div className="terms-of-service-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="header-title">
            <h1 style={{ marginBottom: 0 }}>Terms of Service</h1>
            <div className="terms-of-service-datetime" style={{ fontSize: '0.9rem', color: '#888' }}>{currentDateTime}</div>
            <p style={{ marginTop: '0.5rem' }}>Last updated: July 14, 2025</p>
          </div>
          <div className="header-actions">
            <Link to="/" className="home-link" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: '#333' }}>
              <FontAwesomeIcon icon={faHome} style={{ marginRight: '0.5rem' }} />
              <span>Home</span>
            </Link>
          </div>
        </div>
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: 24 }}>Terms of Service</h2>
          <p>Last updated: July 14, 2025</p>
          <p>
            Welcome to the WWF Straw-headed Bulbul Survey Platform. By accessing or using our platform, you agree to comply with and be bound by the following terms and conditions. Please read them carefully.
          </p>
          <h3>1. Acceptance of Terms</h3>
          <p>
            By using this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the platform.
          </p>
          <h3>2. Use of the Platform</h3>
          <ul>
            <li>You must use the platform in accordance with all applicable laws and regulations.</li>
            <li>You agree not to misuse the platform or attempt to access it using a method other than the interface and instructions provided.</li>
            <li>Unauthorized use, including but not limited to hacking, scraping, or data mining, is strictly prohibited.</li>
          </ul>
          <h3>3. User Accounts</h3>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>All activities that occur under your account are your responsibility.</li>
            <li>Notify us immediately of any unauthorized use of your account.</li>
          </ul>
          <h3>4. Data and Content</h3>
          <ul>
            <li>You retain ownership of any data or content you submit, but grant us a license to use it for conservation and research purposes.</li>
            <li>You must not upload content that is unlawful, offensive, or infringes on the rights of others.</li>
          </ul>
          <h3>5. Intellectual Property</h3>
          <ul>
            <li>All platform content, including text, graphics, logos, and software, is the property of WWF or its licensors.</li>
            <li>You may not reproduce, distribute, or create derivative works without express permission.</li>
          </ul>
          <h3>6. Limitation of Liability</h3>
          <p>
            We are not liable for any damages arising from your use of the platform. The platform is provided "as is" without warranties of any kind.
          </p>
          <h3>7. Indemnification</h3>
          <p>
            You agree to indemnify and hold harmless WWF, its affiliates, partners, and employees from any claims, damages, liabilities, and expenses arising from your use of the platform or violation of these terms.
          </p>
          <h3>8. Termination</h3>
          <p>
            We reserve the right to suspend or terminate your access to the platform at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users or the platform.
          </p>
          <h3>9. Changes to Terms</h3>
          <p>
            We reserve the right to update these Terms of Service at any time. Continued use of the platform after changes constitutes acceptance of the new terms.
          </p>
          <h3>10. Governing Law</h3>
          <p>
            These Terms of Service are governed by and construed in accordance with the laws of Singapore, without regard to its conflict of law principles.
          </p>
          <h3>11. Contact</h3>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:info@wwf.sg">info@wwf.sg</a>.
          </p>
        </div>
      </div>
    );
  }
}

export default TermsOfServiceNotice;

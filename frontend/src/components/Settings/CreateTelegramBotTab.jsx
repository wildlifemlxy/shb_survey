import React from 'react';
import axios from 'axios';
import PopupModal from './PopupModal';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class CreateTelegramBotTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      token: '',
      name: '',
      desc: '',
      status: null,
      validation: {}
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleTokenBlur = async () => {
    const { token } = this.state;
    if (!token) return;
    this.setState({ status: 'loading' });
    try {
      const result = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getBotInfo',
        token
      });
      console.log('Telegram bot info:', result.data);
      if (result.data && result.data.ok) {
        let { username, first_name } = result.data.result;
        // Format username: replace _ with space and capitalize each word
        if (username) {
          username = username.replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          username = username.charAt(0).toUpperCase() + username.slice(1);
          // Replace 'Shb' with 'SHB' if present at the start or as a word
          username = username.replace(/\bShb\b/g, 'SHB');
        }
        this.setState({
          name: username || '',
          desc: first_name || '',
          status: null
        });
      } else {
        this.setState({ status: 'error' });
      }
    } catch {
      this.setState({ status: 'error' });
    }
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { name, desc, token } = this.state;
    const validation = {};
    if (!name) validation.name = 'Bot name is required.';
    if (!desc) validation.desc = 'Description is required.';
    if (!token) validation.token = 'Bot token is required.';
    if (Object.keys(validation).length > 0) {
      this.setState({ validation });
      return;
    }
    this.setState({ status: 'loading', validation: {} });
    try {
      const result = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'createBot',
        name,
        description: desc,
        token
      });
      if (result.status === 200 || result.status === 201) this.setState({ status: 'success' });
      else this.setState({ status: 'error' });
    } catch {
      this.setState({ status: 'error' });
    }
  };

  closePopup = () => {
    if (this.state.status === 'success') {
      this.setState({
        token: '',
        name: '',
        desc: '',
        status: null,
        validation: {}
      });
    } else {
      this.setState({ status: null });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if ((this.state.status === 'success' || this.state.status === 'error') && prevState.status !== this.state.status) {
      this._popupTimer && clearTimeout(this._popupTimer);
      this._popupTimer = setTimeout(() => {
        this.closePopup();
      }, 5000);
    }
  }

  componentWillUnmount() {
    if (this._popupTimer) clearTimeout(this._popupTimer);
  }

  render() {
    const { name, desc, token, status, validation } = this.state;
    return (
      <div className="telegram-bot-tab" style={{ padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 480, margin: '32px auto' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--color-primary, #2563eb)' }}>Create Telegram Bot</h2>
        <p style={{ marginBottom: 24, color: 'var(--color-text-secondary, #555)' }}>
          Set up a new Telegram bot for your survey platform. Follow the guided steps to register and connect your bot.
        </p>
        <div style={{ background: '#f3f4f6', color: '#444', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 14 }}>
          <strong>Notes:</strong>
          <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
            <li>You must create your bot and get its token using <b>@BotFather</b> in the Telegram app.</li>
            <li>Paste the token here to auto-fill the bot name and description.</li>
            <li>Bot name formatting will automatically capitalize and space words for readability (e.g., <b>SHB Survey Bot</b>).</li>
            <li>For security, your token is never shown after registration.</li>
          </ul>
        </div>
        <form onSubmit={this.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ fontWeight: 500, color: 'var(--color-label, #222)' }}>
            Bot Name (auto-filled from Telegram)
            <input name="name" value={name} onChange={this.handleChange} placeholder="Bot Name" style={{ width: '100%', marginTop: 4, marginBottom: 0, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', background: 'var(--color-input-bg, #f9fafb)' }} />
            {validation.name && <div style={{ color: 'red', fontSize: 13, marginTop: 2 }}>{validation.name}</div>}
          </label>
          <label style={{ fontWeight: 500, color: 'var(--color-label, #222)' }}>
            Description (auto-filled from Telegram)
            <input name="desc" value={desc} onChange={this.handleChange} placeholder="Description" style={{ width: '100%', marginTop: 4, marginBottom: 0, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', background: 'var(--color-input-bg, #f9fafb)' }} />
            {validation.desc && <div style={{ color: 'red', fontSize: 13, marginTop: 2 }}>{validation.desc}</div>}
          </label>
          <label style={{ fontWeight: 500, color: 'var(--color-label, #222)' }}>
            Bot Token
            <input name="token" value={token} onChange={this.handleChange} onBlur={this.handleTokenBlur} placeholder="Bot Token" style={{ width: '100%', marginTop: 4, marginBottom: 0, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', background: 'var(--color-input-bg, #f9fafb)' }} />
            {validation.token && <div style={{ color: 'red', fontSize: 13, marginTop: 2 }}>{validation.token}</div>}
          </label>
          <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 6, background: 'var(--color-primary, #2563eb)', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', marginTop: 8, cursor: 'pointer', transition: 'background 0.2s' }}>
            Register Bot
          </button>
        </form>
        {status === 'loading' && <p style={{ color: 'var(--color-primary, #2563eb)', marginTop: 16 }}>Registering...</p>}
        <PopupModal status={status} onClose={this.closePopup} />
      </div>
    );
  }
}

export default CreateTelegramBotTab;

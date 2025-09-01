import React from 'react';
import PopupModal from './PopupModal';
import botDataService from '../data/botData';

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
    
    console.log('Token blur triggered with token:', token);
    this.setState({ status: 'loading' });
    
    try {
      const result = await botDataService.getBotInfo(token);
      console.log('getBotInfo result:', result);
      
      if (result.ok && result.result) {
        const botInfo = result.result;
        console.log('Bot info received:', botInfo);
        this.setState({
          name: botInfo.first_name || botInfo.username || '',
          desc: botInfo.description || `${botInfo.first_name || botInfo.username}`,
          status: 'info-loaded'
        });
      } else {
        console.error('Invalid bot info response:', result);
        this.setState({
          name: '',
          desc: '',
          status: 'error: Invalid token or bot not found'
        });
      }
    } catch (error) {
      console.error('Error fetching bot info:', error);
      this.setState({
        name: '',
        desc: '',
        status: 'error: Failed to fetch bot information'
      });
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
    this.setState({ status: 'submitting', validation: {} });
    
    try {
      const result = await botDataService.createBot(name, desc, token);
      console.log('createBot result:', result);
      
      if (result.success || result.message) {
        this.setState({ status: 'success' });
        // Refresh bot data in parent component if available
        if (this.props.onRefreshBotData) {
          this.props.onRefreshBotData();
        }
      } else {
        this.setState({ 
          status: 'error', 
          error: result.error || 'Failed to create bot' 
        });
      }
    } catch (error) {
      console.error('Error creating bot:', error);
      this.setState({ 
        status: 'error', 
        error: error.message || 'Failed to create bot' 
      });
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
        {status === 'loading' && <p style={{ color: 'var(--color-primary, #2563eb)', marginTop: 16 }}>Fetching bot information...</p>}
        {status === 'submitting' && <p style={{ color: 'var(--color-primary, #2563eb)', marginTop: 16 }}>Registering bot...</p>}
        {status === 'info-loaded' && <p style={{ color: 'green', marginTop: 16 }}>Bot information loaded successfully!</p>}
        {status && status.startsWith('error:') && <p style={{ color: 'red', marginTop: 16 }}>{status}</p>}
        <PopupModal status={status} onClose={this.closePopup} />
      </div>
    );
  }
}

export default CreateTelegramBotTab;

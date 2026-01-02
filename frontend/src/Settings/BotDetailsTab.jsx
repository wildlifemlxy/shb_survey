import React from 'react';
import BotChatTabs from './BotChatTabs'; // Adjust the import path as necessary
import botDataService from '../data/botData';

class BotDetailsTab extends React.Component {
  state = {
    selectedBot: '',
    shownBot: '',
    groupData: null,
    groupLoading: false,
    groupError: null,
    chatHistory: null,
    chatHistoryLoading: false,
    chatHistoryError: null,
  };

  handleSelect = async (e) => {
    const selectedBot = e.target.value;
    const bots = this.props.botData || [];
    const bot = bots.find(b => b.name === selectedBot);
    if (!bot) {
      this.setState({ selectedBot: '', shownBot: '', groupData: null, groupError: 'Please select a valid bot.', groupLoading: false });
      return;
    }
    const token = bot.token;
    this.setState({ selectedBot, shownBot: selectedBot, groupData: null, groupLoading: true, groupError: null });
    
    try {
      const result = await botDataService.getBotGroups(token);
      console.log('getBotGroups result:', result);
      
      if (result.groups !== undefined) {
        this.setState({ 
          groupData: result.groups || [], 
          groupLoading: false
        });
      } else if (result.error) {
        this.setState({ 
          groupData: [], 
          groupLoading: false,
          groupError: result.error || 'Failed to fetch group info.'
        });
      } else {
        this.setState({ 
          groupData: [], 
          groupLoading: false,
          groupError: 'No groups found or bot has not been added to any groups.'
        });
      }
    } catch (err) {
      console.error('Error in handleSelect:', err);
      this.setState({ groupError: err.message || 'Failed to fetch group info.', groupLoading: false });
    }
  };

  // Fetch chat history for a bot and group
  fetchChatHistory = async (token, chatId) => {
    this.setState({ chatHistoryLoading: true, chatHistory: null, chatHistoryError: null });
    try {
      const result = await botDataService.getChatHistory(token, chatId);
      console.log('getChatHistory result:', result);
      
      if (result.success && result.data) {
        this.setState({ chatHistory: result.data, chatHistoryLoading: false });
      } else {
        throw new Error(result.error || 'Failed to fetch chat history');
      }
    } catch (err) {
      console.error('Error in fetchChatHistory:', err);
      this.setState({ chatHistoryError: err.message || 'Failed to fetch chat history.', chatHistoryLoading: false });
    }
  };

  render() {
    const bots = this.props.botData || [];
    const loading = this.props.isLoading;
    const { selectedBot, groupData, groupLoading, groupError, shownBot, chatHistory, chatHistoryLoading, chatHistoryError } = this.state;
    return (
      <div className="bot-details-tab">
        {loading && <p>Loading bots...</p>}
        {!loading && bots.length === 0 && <p>No bots found.</p>}
        {!loading && bots.length > 0 && (
          <div style={{ margin: '16px 0', position: 'relative', padding: '24px'}}>
            {/* Clear Button at top right */}
            <button
              onClick={() => this.setState({ selectedBot: '', shownBot: '', groupData: null, groupError: null, chatHistory: null, chatHistoryError: null })}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: '6px 18px',
                borderRadius: 6,
                border: '1px solid var(--border-color, #ccc)',
                background: 'var(--button-bg, #fff)',
                color: 'var(--text-color, #333)',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                zIndex: 2,
              }}
            >
              Clear
            </button>
            <div className="bot-selector">
              <label htmlFor="bot-select" style={{ fontWeight: 500 }}>Select a Bot: </label>
              <input
                list="bot-list"
                id="bot-select"
                value={selectedBot}
                onChange={this.handleSelect}
                placeholder="Choose a bot by name"
                style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc', minWidth: 200 }}
              />
              <datalist id="bot-list">
                {bots.map((bot, idx) => (
                  <option key={bot._id || idx} value={bot.name} />
                ))}
              </datalist>
            </div>
            {(shownBot) && (
              <div style={{ marginTop: 24 }}>
                <h3>Selected Bot Details</h3>
                {(() => {
                  const bot = bots.find(bot => bot.name === shownBot) || (groupData && bots.find(bot => bot.token === (groupData[0]?.bot_token || '')));
                  return bot ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 500, padding: 8, border: '1px solid #ddd' }}>Name</td>
                          <td style={{ padding: 8, border: '1px solid #ddd' }}>{bot.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 500, padding: 8, border: '1px solid #ddd' }}>Description</td>
                          <td style={{ padding: 8, border: '1px solid #ddd' }}>{bot.description}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 500, padding: 8, border: '1px solid #ddd' }}>Token</td>
                          <td style={{ padding: 8, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 13 }}>{bot.token}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : null;
                })()}
              </div>
            )}
            {shownBot && (
              <div className="bot-groups-section">
                <BotChatTabs
                  groupData={groupData}
                  groupLoading={groupLoading}
                  groupError={groupError}
                  onClearData={() => this.setState({ groupData: null, groupError: null })}
                  chatHistory={chatHistory}
                  chatHistoryLoading={chatHistoryLoading}
                  chatHistoryError={chatHistoryError}
                  onFetchChatHistory={this.fetchChatHistory}
                  botToken={(() => {
                    const bot = bots.find(bot => bot.name === shownBot);
                    return bot ? bot.token : '';
                  })()}
                  botId={(() => {
                    const bot = bots.find(bot => bot.name === shownBot);
                    return bot ? bot._id : '';
                  })()}
                  // Optionally, pass selectedChatId if you track it in state
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default BotDetailsTab;

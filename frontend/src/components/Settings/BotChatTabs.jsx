import React from 'react';
import '../../css/components/Settings/BotChatTabs.css';

class BotChatTabs extends React.Component {
  state = {
    activeTab: 'Groups/Users',
  };

  handleTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { groupData = [], groupLoading, groupError, chatMessages = [] } = this.props;
    const { activeTab } = this.state;

    let displayData = groupData;
    console.log('Display Data:', displayData);

    return (
      <div className="bot-chat-tabs-container bot-chat-tabs-theme">
        <div className="bot-chat-tabs-buttons">
          <button
            onClick={() => this.handleTab('Groups/Users')}
            className={`bot-chat-tab-btn${activeTab === 'Groups/Users' ? ' active' : ''}`}
          >
            Groups/Users
          </button>
          <button
            onClick={() => this.handleTab('Chats')}
            className={`bot-chat-tab-btn${activeTab === 'Chats' ? ' active' : ''}`}
          >
            Chats
          </button>
        </div>
        <div className="bot-chat-tabs-content">
          <h4>{activeTab}</h4>
          {groupLoading && <p>Loading {activeTab.toLowerCase()} info...</p>}
          {groupError && <p className="bot-chat-tabs-error">{groupError}</p>}
          {activeTab === 'Groups/Users' && (
            <>
              {displayData && displayData.length === 0 && <p>No {activeTab.toLowerCase()} info found for this bot.</p>}
              {displayData && displayData.length > 0 && (
                <ul className="bot-chat-tabs-list">
                  {displayData.map((g, i) => (
                    <li key={i} className="bot-chat-tabs-list-item">
                      {typeof g === 'string' ? g : (g && (g.title || g.username || g.id)) || ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {activeTab === 'Chats' && (
            <div className="bot-chat-telegram-messages">
              {chatMessages && chatMessages.length > 0 ? (
                <ul className="bot-chat-telegram-list">
                  {chatMessages.map((msg, idx) => (
                    <li key={idx} className={`bot-chat-telegram-msg bot-chat-telegram-msg-${msg.from === 'bot' ? 'bot' : 'user'}`}> 
                      <div className="bot-chat-telegram-msg-content">{msg.text}</div>
                      <div className="bot-chat-telegram-msg-meta">{msg.from === 'bot' ? 'Bot' : msg.username || 'User'}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No chat messages found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default BotChatTabs;

import React from 'react';
import '../../css/components/Settings/BotChatTabs.css';
import { fetchChatData } from '../../data/chatData'; // Adjust the import path as necessary

class BotChatTabs extends React.Component {
  state = {
    activeTab: 'Groups/Users',
    chatMessages: [],
  };

  async componentDidMount() {
    // Use token and chatId from props if available
    const { botToken, botId } = this.props;
    console.log('Selected Bot:', botToken);
    let data3;
    if (botId) {
      data3 = await fetchChatData(botToken, botId);
      console.log('Fetched Chat Data (with botId):', data3);
    } else {
      data3 = await fetchChatData();
      console.log('Fetched Chat Data:', data3);
    }
    this.setState({ chatMessages: data3 });
  }

  async componentDidUpdate(prevProps) {
    // If token or chatId changes, refetch
    if (this.props.botToken !== prevProps.botToken || this.props.chatId !== prevProps.chatId) {
      const { botToken, chatId } = this.props;
      let data3;
      if (botToken && chatId) {
        data3 = await fetchChatData(botToken, chatId);
        console.log('Fetched Chat Data (update, with token/chatId):', data3);
      } else {
        data3 = await fetchChatData();
        console.log('Fetched Chat Data (update):', data3);
      }
      this.setState({ chatMessages: data3 });
    }
  }

  handleTab = (tab) => {
    this.setState({ activeTab: tab });
  };

  render() {
    const { groupData = [], groupLoading, groupError } = this.props;
    const { activeTab, chatMessages } = this.state;

    let displayData = groupData;

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
            <div className="bot-chat-telegram-messages" style={{
              maxHeight: 340,
              minHeight: 120,
              overflowY: 'auto',
              background: '#fafdff',
              borderRadius: 12,
              padding: '12px 0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              position: 'relative',
            }}>
              {/* Day/Date header at the top, changes as you scroll */}
              {chatMessages && chatMessages.length > 0 && (() => {
                // Find the first visible message's date for the header
                const firstMsg = chatMessages[0];
                const sentDate = firstMsg.sentAt ? new Date(firstMsg.sentAt) : null;
                const displayDate = sentDate ? sentDate.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : firstMsg.date;
                return (
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'rgba(243,244,246,0.95)',
                    color: '#2563eb',
                    fontWeight: 700,
                    fontSize: 15,
                    textAlign: 'center',
                    padding: '6px 0 2px 0',
                    borderRadius: '8px',
                    marginBottom: 8,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}>
                    {displayDate}
                  </div>
                );
              })()}
              <ul className="bot-chat-telegram-list" style={{ margin: 0, padding: 0 }}>
                {chatMessages.map((msg, idx, arr) => {
                  // Use sentAt for date grouping and display
                  const sentDate = msg.sentAt ? new Date(msg.sentAt) : null;
                  const currentDate = sentDate ? sentDate.toISOString().slice(0, 10) : msg.date;
                  const prevSentDate = idx > 0 && arr[idx - 1].sentAt ? new Date(arr[idx - 1].sentAt) : null;
                  const prevDate = prevSentDate ? prevSentDate.toISOString().slice(0, 10) : (idx > 0 ? arr[idx - 1].date : null);
                  // Calculate day number (Day 1, Day 2, ...)
                  let dayNumber = 1;
                  for (let i = 0; i < idx; i++) {
                    const compareDate = arr[i].sentAt ? new Date(arr[i].sentAt).toISOString().slice(0, 10) : arr[i].date;
                    if (compareDate !== currentDate) dayNumber++;
                  }
                  const showDayHeader = currentDate !== prevDate;
                  return (
                    <React.Fragment key={msg._id || idx}>
                      {/* Remove the small badge, only use the sticky header */}
                      <li className={`bot-chat-telegram-msg bot-chat-telegram-msg-bot`}
                          style={{
                            display: 'flex',
                            flexDirection: 'row-reverse',
                            alignItems: 'flex-end',
                            marginBottom: 24,
                            border: '1px solid #e6f0fa',
                            borderRadius: 16,
                            background: '#fff',
                            padding: '14px 18px',
                            maxWidth: 340,
                            minWidth: 100,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            position: 'relative',
                          }}
                      >
                        <div
                          className="bot-chat-telegram-msg-content"
                          style={{
                            background: 'none',
                            color: '#222',
                            borderRadius: 0,
                            padding: 0,
                            fontSize: 15,
                            lineHeight: 1.7,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-line',
                            position: 'relative',
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: msg.message }} />
                          {/* Google Map preview if a maps link is present */}
                          {(() => {
                            const match = msg.message && msg.message.match(/https:\/\/www\.google\.com\/maps\/search\/?api=1&query=([^"'>\s]+)/);
                            if (match && match[1]) {
                              const mapQuery = decodeURIComponent(match[1]);
                              const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`;
                              // Google Static Maps API (no API key, so use a generic thumbnail)
                              const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(mapQuery)}&zoom=14&size=120x80&maptype=roadmap&markers=color:purple%7C${encodeURIComponent(mapQuery)}`;
                              // Fallback thumbnail if no API key: use a generic world map or a static image
                              const fallbackMapUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/World_map_blank_without_borders.svg/200px-World_map_blank_without_borders.svg.png';
                              // Try to extract a title (the link text in the message, if present)
                              let mapTitle = 'Location';
                              const titleMatch = msg.message.match(/<a [^>]*href=["']https:\/\/www\.google\.com\/maps\/search\/?api=1&query=[^"']+["'][^>]*>([^<]+)<\/a>/);
                              if (titleMatch && titleMatch[1]) mapTitle = titleMatch[1];
                              return (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  background: 'linear-gradient(90deg, #6d28d9 80%, #a78bfa 100%)',
                                  borderRadius: 12,
                                  padding: '10px 14px',
                                  marginTop: 12,
                                  minWidth: 220,
                                  maxWidth: 320,
                                  boxShadow: '0 2px 8px rgba(109,40,217,0.10)',
                                }}>
                                  <div style={{ flex: 1, color: '#fff', paddingRight: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{mapTitle}</div>
                                    <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 6 }}>
                                      Find local businesses, view maps and get driving directions in Google Maps.
                                    </div>
                                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#ede9fe', textDecoration: 'underline', fontWeight: 500 }}>
                                      Open in Google Maps
                                    </a>
                                  </div>
                                  <img
                                    src={staticMapUrl}
                                    alt="Map preview"
                                    style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#ede9fe', border: '1px solid #a78bfa' }}
                                    onError={e => { e.target.onerror = null; e.target.src = fallbackMapUrl; }}
                                  />
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <span style={{
                          display: 'block',
                          textAlign: 'right',
                          color: '#aaa',
                          fontSize: 11,
                          marginTop: 8,
                          fontFamily: 'monospace',
                          position: 'absolute',
                          right: 0,
                          bottom: 0,
                          background: 'rgba(255,255,255,0.7)',
                          padding: '0 6px',
                          borderRadius: 6,
                        }}>
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''}
                        </span>
                        <div
                          className="bot-chat-telegram-msg-meta"
                          style={{
                            fontSize: 12,
                            color: '#888',
                            margin: '0 8px 0 0',
                            minWidth: 40,
                            textAlign: 'right',
                          }}
                        >
                          Bot
                        </div>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default BotChatTabs;

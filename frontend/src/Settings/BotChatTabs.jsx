import React from 'react';
import '../css/components/Settings/BotChatTabs.css';

class BotChatTabs extends React.Component {
  state = {
    activeTab: 'Groups/Users',
    currentVisibleDate: null,
    selectedChatId: null,
  };

  chatMessagesRef = React.createRef();

  // Handle chat selection to fetch chat history
  handleChatSelect = async (chatId) => {
    const { botToken } = this.props;
    if (!botToken || !chatId) return;
    
    this.setState({ selectedChatId: chatId });
    
    // Call the fetchChatHistory method from BotDetailsTab
    if (this.props.onFetchChatHistory) {
      await this.props.onFetchChatHistory(botToken, chatId);
    }
  };

  // Sort messages by date and time chronologically (earliest first)
  sortMessagesByDateTime = (messages) => {
    if (!messages || !Array.isArray(messages)) return [];
    
    return messages.sort((a, b) => {
      const dateA = a.sentAt ? new Date(a.sentAt) : new Date();
      const dateB = b.sentAt ? new Date(b.sentAt) : new Date();
      return dateA - dateB; // Ascending order (earliest first)
    });
  };

  // Group messages by date for better organization
  groupMessagesByDate = (messages) => {
    if (!messages || !Array.isArray(messages)) return {};
    
    return messages.reduce((groups, message) => {
      const sentDate = message.sentAt ? new Date(message.sentAt) : new Date();
      const dateKey = sentDate.toLocaleDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      
      return groups;
    }, {});
  };

  async componentDidMount() {
    // Use token and chatId from props if available
    const { botToken, botId } = this.props;
    console.log('Selected Bot:', botToken);
    let data3;
    // Temporarily disabled - fetchChatData function not available
    // if (botId) {
    //   data3 = await fetchChatData(botToken, botId);
    //   console.log('Fetched Chat Data (with botId):', data3);
    // } else {
    //   data3 = await fetchChatData();
    //   console.log('Fetched Chat Data:', data3);
    // }
    
    // Use empty data for now
    data3 = [];
    console.log('fetchChatData temporarily disabled');
    
    // Sort messages chronologically by date and time (earliest first)
    const sortedMessages = this.sortMessagesByDateTime(data3);
    
    this.setState({ chatMessages: sortedMessages }, () => {
      // Setup scroll listener after state is updated and DOM is rendered
      setTimeout(() => {
        this.setupScrollListener();
      }, 200);
    });
  }

  componentWillUnmount() {
    this.removeScrollListener();
  }

  setupScrollListener = () => {
    if (this.chatMessagesRef.current) {
      this.chatMessagesRef.current.addEventListener('scroll', this.handleScroll);
      // Set initial date when component mounts
      setTimeout(() => {
        this.setInitialDate();
        this.handleScroll();
      }, 100);
    }
  };

  removeScrollListener = () => {
    if (this.chatMessagesRef.current) {
      this.chatMessagesRef.current.removeEventListener('scroll', this.handleScroll);
    }
  };

  setInitialDate = () => {
    // Get the first date from messages if available
    if (this.state.chatMessages && this.state.chatMessages.length > 0) {
      const sortedMessages = this.sortMessagesByDateTime(this.state.chatMessages);
      const firstMsg = sortedMessages[0];
      if (firstMsg.sentAt) {
        const sentDate = new Date(firstMsg.sentAt);
        const formattedDate = `${sentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${sentDate.getDate().toString().padStart(2, '0')}/${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getFullYear()}`;
        console.log('Setting initial date from first message:', formattedDate);
        this.setState({ currentVisibleDate: formattedDate });
      }
    } else {
      // Fallback to sample date
      console.log('Setting fallback date');
      this.setState({ currentVisibleDate: 'Saturday, 28/06/2025' });
    }
  };

  handleScroll = () => {
    if (!this.chatMessagesRef.current) return;

    const dateHeaders = this.chatMessagesRef.current.querySelectorAll('.telegram-date-header');
    const containerRect = this.chatMessagesRef.current.getBoundingClientRect();
    const scrollTop = this.chatMessagesRef.current.scrollTop;

    console.log('Found date headers:', dateHeaders.length, 'scrollTop:', scrollTop);

    let currentDate = null;
    let closestHeader = null;
    let closestDistance = Infinity;

    // Find the date header that's closest to the top of the visible area
    // Since messages are now properly sorted chronologically, we look for the topmost visible date
    dateHeaders.forEach((header) => {
      const headerRect = header.getBoundingClientRect();
      const relativeTop = headerRect.top - containerRect.top;
      
      console.log('Header:', header.textContent.trim(), 'relativeTop:', relativeTop);
      
      // Check if this header is visible (within the container bounds)
      if (relativeTop >= -50 && relativeTop <= containerRect.height) {
        if (relativeTop < closestDistance || closestDistance === Infinity) {
          closestDistance = relativeTop;
          closestHeader = header;
          currentDate = header.textContent.trim();
        }
      }
    });

    // If no header found in viewport, find the one just above the viewport
    if (!currentDate && dateHeaders.length > 0) {
      let lastHeaderAbove = null;
      dateHeaders.forEach((header) => {
        const headerRect = header.getBoundingClientRect();
        const relativeTop = headerRect.top - containerRect.top;
        
        if (relativeTop < 0) {
          lastHeaderAbove = header;
        }
      });
      
      if (lastHeaderAbove) {
        currentDate = lastHeaderAbove.textContent.trim();
        console.log('Using last header above viewport:', currentDate);
      } else {
        currentDate = dateHeaders[0].textContent.trim();
        console.log('Using first header as fallback:', currentDate);
      }
    }

    console.log('Final current visible date:', currentDate);

    // Update state if date changed
    if (currentDate && currentDate !== this.state.currentVisibleDate) {
      console.log('Updating badge to:', currentDate);
      this.setState({ currentVisibleDate: currentDate });
    }
  };

  async componentDidUpdate(prevProps) {
    // If token or chatId changes, refetch
    if (this.props.botToken !== prevProps.botToken || this.props.chatId !== prevProps.chatId) {
      const { botToken, chatId } = this.props;
      let data3;
      // Temporarily disabled - fetchChatData function not available
      // if (botToken && chatId) {
      //   data3 = await fetchChatData(botToken, chatId);
      //   console.log('Fetched Chat Data (update, with token/chatId):', data3);
      // } else {
      //   data3 = await fetchChatData();
      //   console.log('Fetched Chat Data (update):', data3);
      // }
      
      // Use empty data for now
      data3 = [];
      console.log('fetchChatData temporarily disabled in componentDidUpdate');
      
      // Sort messages chronologically by date and time (earliest first)
      const sortedMessages = this.sortMessagesByDateTime(data3);
      
      this.setState({ chatMessages: sortedMessages }, () => {
        // Re-setup scroll listener after data update and DOM re-render
        this.removeScrollListener();
        setTimeout(() => {
          this.setupScrollListener();
        }, 200);
      });
    }
  }

  handleTab = (tab) => {
    this.setState({ activeTab: tab }, () => {
      // Setup scroll listener when switching to Chats tab
      if (tab === 'Chats') {
        setTimeout(() => {
          this.setupScrollListener();
        }, 100);
      } else {
        this.removeScrollListener();
      }
    });
  };

  render() {
    const { groupData = [], groupLoading, groupError, chatHistory, chatHistoryLoading, chatHistoryError } = this.props;
    const { activeTab, currentVisibleDate, selectedChatId } = this.state;

    let displayData = groupData;
    let chatMessages = chatHistory || [];

    // Add sample chat messages for demonstration if no real data
    if (activeTab === 'Chats' && (!chatMessages || chatMessages.length === 0)) {
      chatMessages = [
        {
          _id: 'sample1',
          message: 'Hi everyone!\n\nPlease find the details for <b>Sunday, Date 30 June 2025</b> survey below:\n\n<b>Survey Details</b>\nLocation: Sungei Buloh Wetland Reserve\nMeeting Point: <a href="https://www.google.com/maps/search/?api=1&query=Sungei+Buloh+Wetland+Reserve+Main+Entrance">Sungei Buloh Wetland Reserve Main Entrance</a>\nTime: 7:00 AM\n\n<b>Participant List</b>\n1. Alice Chen\n2. Bob Tan\n3. Charlie Lim\n\n<a href="https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link">Training Material</a>',
          sentAt: new Date('2025-06-30T07:00:00Z').toISOString(),
          token: 'sample',
          chatId: 'sample'
        },
        {
          _id: 'sample2',
          message: 'Survey reminder: Tomorrow\'s bird survey at MacRitchie Reservoir starts at 6:30 AM. Please bring your binoculars and field notebooks!',
          sentAt: new Date('2025-06-29T19:00:00Z').toISOString(),
          token: 'sample',
          chatId: 'sample'
        },
        {
          _id: 'sample3',
          message: 'Great work everyone on today\'s survey! We recorded 23 different bird species including 2 Straw-headed Bulbuls. Photos and data have been uploaded to the shared drive.',
          sentAt: new Date('2025-06-28T12:30:00Z').toISOString(),
          token: 'sample',
          chatId: 'sample'
        }
      ];
    }

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
                    <li 
                      key={i} 
                      className="bot-chat-tabs-list-item clickable-chat-item"
                      onClick={() => this.handleChatSelect(g.id || g.chatId || `chat_${i}`)}
                      style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', marginBottom: '4px' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {typeof g === 'string' ? g : (g && (g.title || g.username || g.id)) || ''}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {activeTab === 'Chats' && (
            <div className="telegram-chat-container">
              {/* Chat Header */}
              <div className="telegram-chat-header">
                <div className="telegram-chat-avatar">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#0088cc"/>
                    <path d="M8.5 12.5l3 3L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="telegram-chat-title">
                  <h4>SHB Survey Bot</h4>
                  <span>WWF Survey</span>
                </div>
              </div>

              {/* Loading and Error States */}
              {chatHistoryLoading && (
                <div className="chat-loading" style={{ padding: '20px', textAlign: 'center' }}>
                  <p>Loading chat history...</p>
                </div>
              )}
              
              {chatHistoryError && (
                <div className="chat-error" style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
                  <p>{chatHistoryError}</p>
                </div>
              )}

              {/* Chat Messages */}
              {!chatHistoryLoading && !chatHistoryError && (
                <div className="telegram-chat-messages" ref={this.chatMessagesRef}>
                  {chatMessages && chatMessages.length === 0 && (
                    <div className="no-messages" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      <p>No messages found for this chat</p>
                    </div>
                  )}
                  
                  {chatMessages && chatMessages.length > 0 ? (
                  (() => {
                    // Group messages by date
                    const groupedMessages = this.groupMessagesByDate(chatMessages);
                    const sortedDates = Object.keys(groupedMessages).sort((a, b) => new Date(a) - new Date(b));
                    
                    return sortedDates.map((dateKey) => {
                      const messagesForDate = groupedMessages[dateKey];
                      const firstMessage = messagesForDate[0];
                      const sentDate = firstMessage.sentAt ? new Date(firstMessage.sentAt) : new Date(dateKey);
                      const formattedDate = `${sentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${sentDate.getDate().toString().padStart(2, '0')}/${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getFullYear()}`;
                      
                      return (
                        <React.Fragment key={dateKey}>
                          {/* Date header for each group */}
                          <div className="telegram-date-header" data-date={formattedDate}>
                            {formattedDate}
                          </div>
                          
                          {/* Messages for this date */}
                          {messagesForDate.map((msg, idx) => (
                            <div key={msg._id || `${dateKey}-${idx}`} className="telegram-message-wrapper">
                              <div className="telegram-message bot-message">
                                <div className="telegram-message-avatar">
                                  <div className="bot-avatar-circle">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#ffffff"/>
                                    </svg>
                                  </div>
                                </div>
                                <div className="telegram-message-bubble">
                                  <div className="telegram-message-header">
                                    <span className="message-sender">SHB Survey Bot</span>
                                    <span className="message-timestamp">
                                      {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      }) : ''}
                                    </span>
                                  </div>
                                  <div className="telegram-message-content">
                                    <div className="message-text">
                                      <span dangerouslySetInnerHTML={{ __html: msg.message }} />
                                    </div>
                                    
                                    {/* Google Maps preview */}
                                    {(() => {
                                      const match = msg.message && msg.message.match(/https:\/\/www\.google\.com\/maps\/search\/?api=1&query=([^"'>\s]+)/);
                                      if (match && match[1]) {
                                        const mapQuery = decodeURIComponent(match[1]);
                                        const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`;
                                        let mapTitle = 'Location';
                                        const titleMatch = msg.message.match(/<a [^>]*href=["']https:\/\/www\.google\.com\/maps\/search\/?api=1&query=[^"']+["'][^>]*>([^<]+)<\/a>/);
                                        if (titleMatch && titleMatch[1]) mapTitle = titleMatch[1];
                                        
                                        return (
                                          <div className="telegram-map-preview">
                                            <div className="map-info">
                                              <div className="map-title">{mapTitle}</div>
                                              <div className="map-description">Location details</div>
                                              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                                                View on Google Maps
                                              </a>
                                            </div>
                                            <div className="map-icon">📍</div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <div className="message-footer group-chat">
                                    <div className="message-info">
                                      <span className="message-time">
                                        {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        }) : ''}
                                      </span>
                                      <div className="message-status">
                                        {/* Dynamic Status Based on Message State */}
                                        {(() => {
                                          // Simulate different status states based on message age
                                          const messageAge = msg.sentAt ? (Date.now() - new Date(msg.sentAt).getTime()) / 1000 / 60 : 0; // minutes
                                          const isRecent = messageAge < 5;
                                          const isRead = messageAge > 1;
                                          
                                          if (isRecent && !isRead) {
                                            return (
                                              <>
                                                <div className="status-indicator delivered" title="Delivered">
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#4CAF50"/>
                                                  </svg>
                                                </div>
                                                <span className="status-text delivered">Delivered</span>
                                              </>
                                            );
                                          } else {
                                            const readCount = Math.floor(Math.random() * 5) + 1; // Simulate read count
                                            return (
                                              <>
                                                <div className="status-indicator delivered" title="Delivered">
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#4CAF50"/>
                                                  </svg>
                                                </div>
                                                <div className="status-indicator read" title="Read">
                                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#2196F3"/>
                                                  </svg>
                                                </div>
                                                <span className="read-by-count">
                                                  👁 {readCount}
                                                </span>
                                                <div className="read-by-avatars">
                                                  <div className="reader-avatar" title="Alice">A</div>
                                                  {readCount > 1 && <div className="reader-avatar" title="Bob">B</div>}
                                                  {readCount > 2 && <div className="reader-avatar" title="Charlie">C</div>}
                                                  {readCount > 3 && <div className="reader-avatar more" title={`+${readCount - 3} more`}>+</div>}
                                                </div>
                                              </>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </React.Fragment>
                      );
                    });
                  })()
                ) : null}
                </div>
              )}

              {/* Floating Date Badge - positioned to overlay messages, only show if there are messages */}
              {activeTab === 'Chats' && chatMessages && chatMessages.length > 0 && (
                <div className="telegram-floating-date-badge visible">
                  {currentVisibleDate || 'Saturday, 28/06/2025'}
                </div>
              )}

              {/* Chat Input (disabled/read-only) */}
              <div className="telegram-chat-input">
                <div className="input-wrapper">
                  <input 
                    type="text" 
                    placeholder="This is a read-only chat view..." 
                    disabled 
                  />
                  <button disabled>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default BotChatTabs;

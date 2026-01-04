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
    // Get the first date from chat history (from props)
    const chatMessages = this.props.chatHistory || [];
    const botMessages = chatMessages.filter(msg => msg.senderType !== 'user');
    
    if (botMessages.length > 0) {
      // Sort by sentAt ascending
      const sortedMessages = [...botMessages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
      const firstMsg = sortedMessages[0];
      if (firstMsg.sentAt) {
        const sentDate = new Date(firstMsg.sentAt);
        const formattedDate = `${sentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${sentDate.getDate().toString().padStart(2, '0')}/${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getFullYear()}`;
        console.log('Setting initial date from first message:', formattedDate);
        this.setState({ currentVisibleDate: formattedDate });
      }
    } else {
      // No messages, clear the date
      console.log('No bot messages, clearing date');
      this.setState({ currentVisibleDate: null });
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
    // If chat history changes, update initial date
    if (this.props.chatHistory !== prevProps.chatHistory) {
      this.setInitialDate();
      // Re-setup scroll listener after data update
      setTimeout(() => {
        this.setupScrollListener();
      }, 200);
    }
    
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

    // Debug logging
    console.log('🔍 BotChatTabs render - chatHistory:', chatHistory);
    console.log('🔍 BotChatTabs render - chatHistoryLoading:', chatHistoryLoading);

    let displayData = groupData;
    let chatMessages = chatHistory || [];

    // Show placeholder message if no chat history OR if there are no bot messages
    const botMessages = chatMessages.filter(msg => msg.senderType !== 'user');
    console.log('🔍 BotChatTabs render - botMessages after filter:', botMessages);
    const noChatHistory = !chatMessages || chatMessages.length === 0 || botMessages.length === 0;
    console.log('🔍 BotChatTabs render - noChatHistory:', noChatHistory);

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
            <div className="groups-users-section">
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
            </div>
          )}
          {activeTab === 'Chats' && (
            <div className="telegram-chat-container chats-section">
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
                <div className="telegram-chat-messages" ref={this.chatMessagesRef} style={{ position: 'relative', overflow: 'auto' }}>
                  {/* Floating Sticky Date Badge - stays at top while scrolling */}
                  {!noChatHistory && currentVisibleDate && (
                    <div style={{
                      position: 'sticky',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.6)',
                      padding: '5px 14px',
                      borderRadius: '14px',
                      fontSize: '13px',
                      color: '#ffffff',
                      width: 'fit-content',
                      textAlign: 'center',
                      fontWeight: 500,
                      zIndex: 100,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      marginBottom: '10px'
                    }}>
                      {currentVisibleDate}
                    </div>
                  )}
                  
                  {noChatHistory && (
                    <div className="no-messages" style={{ padding: '40px 20px', textAlign: 'center', color: '#666' }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }}>
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
                      </svg>
                      <p style={{ fontWeight: 500, marginBottom: 8 }}>No chat history yet</p>
                      <p style={{ fontSize: 14 }}>Messages will appear here when users interact with the bot.</p>
                    </div>
                  )}
                  
                  {chatMessages && chatMessages.length > 0 ? (
                  (() => {
                    // Filter bot messages only and deduplicate - keep only latest version of similar messages
                    const botMessages = chatMessages.filter(msg => msg.senderType !== 'user');
                    
                    // If no bot messages after filtering, show nothing
                    if (botMessages.length === 0) {
                      return null;
                    }
                    
                    // Deduplicate messages
                    const deduplicatedMessages = [];
                    const seenEventDates = new Map();
                    let latestUpcomingMsg = null;
                    
                    // Sort by sentAt descending (newest first) for deduplication
                    const sortedForDedup = [...botMessages].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
                    
                    for (const msg of sortedForDedup) {
                      // Check if this is an "Upcoming Survey Events" message - keep only the latest one
                      if (msg.message && msg.message.includes('Upcoming Survey Events')) {
                        if (!latestUpcomingMsg) {
                          latestUpcomingMsg = msg;
                          deduplicatedMessages.push(msg);
                        }
                        // Skip older "Upcoming Survey Events" messages
                        continue;
                      }
                      
                      // Check if this is an event survey message
                      const eventDateMatch = msg.message && msg.message.match(/details for.*?<b>([^<]+)<\/b>.*?survey below/);
                      if (eventDateMatch) {
                        const eventDate = eventDateMatch[1];
                        if (!seenEventDates.has(eventDate)) {
                          seenEventDates.set(eventDate, msg);
                          deduplicatedMessages.push(msg);
                        }
                      } else {
                        // Non-event messages, keep all
                        deduplicatedMessages.push(msg);
                      }
                    }
                    
                    // If no messages after deduplication, show nothing
                    if (deduplicatedMessages.length === 0) {
                      return null;
                    }
                    
                    // Sort back by sentAt ascending for display
                    deduplicatedMessages.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
                    
                    // Group messages by date
                    const groupedMessages = this.groupMessagesByDate(deduplicatedMessages);
                    const sortedDates = Object.keys(groupedMessages).sort((a, b) => new Date(a) - new Date(b));
                    
                    return sortedDates.map((dateKey) => {
                      const messagesForDate = groupedMessages[dateKey];
                      const firstMessage = messagesForDate[0];
                      const sentDate = firstMessage.sentAt ? new Date(firstMessage.sentAt) : new Date(dateKey);
                      const formattedDate = `${sentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${sentDate.getDate().toString().padStart(2, '0')}/${(sentDate.getMonth() + 1).toString().padStart(2, '0')}/${sentDate.getFullYear()}`;
                      
                      return (
                        <React.Fragment key={dateKey}>
                          {/* Hidden date marker for scroll detection */}
                          <div 
                            className="telegram-date-header" 
                            data-date={formattedDate}
                            style={{
                              height: '1px',
                              margin: '16px 0 8px 0',
                              visibility: 'hidden'
                            }}
                          >
                            {formattedDate}
                          </div>
                          
                          {/* Messages for this date */}
                          {messagesForDate.map((msg, idx) => {
                            const senderName = 'SHB Survey Bot';
                            const timeStr = msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                            
                            return (
                            <div key={msg._id || `${dateKey}-${idx}`} style={{ display: 'flex', flexDirection: 'column', marginBottom: '4px', padding: '0 16px', alignItems: 'flex-start' }}>
                              <div style={{
                                maxWidth: '65%'
                              }}>
                                <div style={{
                                  background: '#ffffff',
                                  borderRadius: '18px 18px 18px 4px',
                                  padding: '8px 12px',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                }}>
                                  <div style={{ 
                                    fontWeight: 600, 
                                    fontSize: '13px', 
                                    color: '#0088cc',
                                    marginBottom: '2px'
                                  }}>
                                    {senderName}
                                  </div>
                                  <div style={{
                                    fontSize: '14.5px',
                                    lineHeight: '1.4',
                                    color: '#000000',
                                    whiteSpace: 'pre-line'
                                  }}>
                                    <span dangerouslySetInnerHTML={{ __html: msg.message }} />
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: '#000000',
                                  marginTop: '2px',
                                  textAlign: 'right',
                                  paddingRight: '4px'
                                }}>
                                  {timeStr}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()
                ) : null}
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

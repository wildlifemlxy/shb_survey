import React, { Component } from 'react';
import './SHBSurveyAssistant.css';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class SHBSurveyAssistant extends Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: this.props.messages || [
        { 
          id: 1, 
          text: "🤖 Hello! I'm the SHB Survey Assistant. How can I help you today?", 
          sender: 'bot', 
          timestamp: new Date() 
        }
      ],
      inputMessage: '',
      isTyping: false,
      connectionStatus: 'connected', // connected, connecting, disconnected
      isDragOver: false, // For drag and drop visual feedback
      showAttachMenu: false, // For attachment dropdown menu
    };
  }

  componentDidMount() {
    console.log('SHB Survey Assistant mounted');
    
    // Listen for popup events to hide/show assistant
    window.addEventListener('popupOpen', this.hideChatAssistant);
    window.addEventListener('popupClose', this.showChatAssistant);
    
    // Add click outside listener to close chat
    document.addEventListener('mousedown', this.handleClickOutside);
    
    // Initialize current user from props
    if (this.props.currentUser) {
      this.setState({ currentUser: this.props.currentUser });
    }
  }

  componentWillUnmount() {
    // Clean up event listeners
    window.removeEventListener('popupOpen', this.hideChatAssistant);
    window.removeEventListener('popupClose', this.showChatAssistant);
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleSendMessage = async () => {
    const { inputMessage, messages, connectionStatus } = this.state;
    
    // Check if sending is allowed
    if (!inputMessage.trim() || connectionStatus !== 'connected') return;

    const newUserMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message and show typing indicator
    this.setState({
      messages: [...messages, newUserMessage],
      inputMessage: '',
      isTyping: true
    });

    // Generate bot response
    const botResponse = await this.generateBotResponse(inputMessage);
    
    // Simulate typing delay
    setTimeout(() => {
      const newBotMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      this.setState(prevState => ({
        messages: [...prevState.messages, newBotMessage],
        isTyping: false,
        unreadCount: prevState.isOpen ? 0 : prevState.unreadCount + 1
      }));
    }, 1000);
  }

  generateBotResponse = async (userMessage) => {
    const message = userMessage.toLowerCase();
    const { currentPage } = this.props; // Get from props instead of state
    
    // Context-aware responses based on current page
    if (message.includes('help')) {
      return this.getHelpResponse(currentPage);
    }
    
    if (message.includes('data') || message.includes('analysis')) {
      return "📊 For data analysis, you can use the Charts section to view trends, or check the Reports tab for detailed analytics. Would you like me to guide you through the data visualization options?";
    }
    
    if (message.includes('map')) {
      return "🗺️ The Map section shows geographical survey data. You can filter by location, date, or survey type. Click on map markers to see detailed information about each survey point.";
    }
    
    if (message.includes('survey')) {
      return "📝 Survey data can be viewed in the main dashboard. Use filters to narrow down by date range, location, or participant type. You can also export survey data from the Data Table tab.";
    }
    
    if (message.includes('export')) {
      return "💾 You can export data in Excel or PDF format. Go to the Dashboard → Data Table tab and use the export tools. The maintenance bot on the bottom right also has export options.";
    }
    
    if (message.includes('filter')) {
      return "🔍 Use the filter panel to narrow down your data by date range, location, observer, or bird species. Filters are available on most data views and will update charts and tables automatically.";
    }
    
    if (message.includes('chart') || message.includes('graph')) {
      return "📈 Charts and graphs are available in the Visualization tab. You can view trends over time, compare locations, and analyze survey patterns. Hover over chart elements for detailed information.";
    }
    
    if (message.includes('bird') || message.includes('species')) {
      return "🐦 Bird survey data includes species identification, location, behavior observations, and environmental conditions. Use the species filter to focus on specific birds you're interested in.";
    }
    
    if (message.includes('location')) {
      return "📍 Location data is displayed on the map view and in the data tables. You can filter by specific locations or geographic regions to analyze survey patterns in different areas.";
    }
    
    if (message.includes('date') || message.includes('time')) {
      return "📅 Use the date filters to view survey data from specific time periods. You can analyze seasonal patterns, compare different years, or focus on recent surveys.";
    }
    
    if (message.includes('settings')) {
      return "⚙️ Access system settings from the Settings page. You can configure display preferences, notification settings, and user account options.";
    }
    
    // Default responses with page context
    return this.getContextualResponse(currentPage);
  }

  getHelpResponse = (currentPage) => {
    switch (currentPage) {
      case 'dashboard':
        return "❓ On the Dashboard, you can: View overview statistics, explore data tables, analyze charts, and examine map visualizations. Use the tabs at the top to switch between different views. Need help with a specific section?";
      case 'surveyEvents':
        return "❓ In Survey Events, you can: View recent survey activities, track event progress, and manage survey schedules. What specific event information are you looking for?";
      case 'settings':
        return "❓ In Settings, you can: Configure user preferences, manage account settings, and adjust system options. What setting would you like to change?";
      default:
        return "❓ I can help with: Survey data analysis, Map navigation, Report generation, Data filtering, Chart interpretation, and System navigation. What specifically would you like to know?";
    }
  }

  getContextualResponse = (currentPage) => {
    switch (currentPage) {
      case 'dashboard':
        return "I see you're on the Dashboard. I can help you navigate the data views, explain chart information, or assist with data analysis. What would you like to explore?";
      case 'surveyEvents':
        return "You're viewing Survey Events. I can help you understand event statuses, explain survey workflows, or assist with event management. What do you need help with?";
      case 'settings':
        return "You're in the Settings area. I can help you configure preferences, understand options, or guide you through system settings. What would you like to adjust?";
      default:
        return "I understand you're asking about that. Let me help you with more specific information about the SHB Survey system. What particular aspect interests you?";
    }
  }

  handleInputChange = (e) => {
    this.setState({ inputMessage: e.target.value });
  }

  handleInputFocus = () => {
    // Prevent chat from being hidden when input is focused
    this.setState({ inputFocused: true });
  }

  handleInputBlur = () => {
    // Allow chat to be hidden when input loses focus
    this.setState({ inputFocused: false });
  }

  handleAttachFile = () => {
    // Toggle the attachment menu
    this.setState(prevState => ({ showAttachMenu: !prevState.showAttachMenu }));
  }

  handleAttachSpecificType = (fileType) => {
    // Close the menu first
    this.setState({ showAttachMenu: false });
    
    // Create a file input element with specific accept types
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    
    switch (fileType) {
      case 'image':
        fileInput.accept = 'image/*';
        break;
      case 'video':
        fileInput.accept = 'video/*';
        break;
      case 'audio':
        fileInput.accept = 'audio/*';
        break;
      default:
        fileInput.accept = 'image/*,video/*,audio/*';
    }
    
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        this.handleFileAttachment(files);
      }
    };
    
    fileInput.click();
  }

  closeAttachMenu = () => {
    this.setState({ showAttachMenu: false });
  }

  handleFileAttachment = (files) => {
    // Add attachment message to chat without text message
    const newAttachmentMessage = {
      id: Date.now(),
      text: '', // No text message, just attachments
      sender: 'user',
      timestamp: new Date(),
      type: 'attachment',
      files: files
    };

    this.setState(prevState => ({
      messages: [...prevState.messages, newAttachmentMessage]
    }));

    // Generate bot response about the attachment
    setTimeout(() => {
      const botResponse = this.generateAttachmentResponse(files);
      
      const newBotMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      this.setState(prevState => ({
        messages: [...prevState.messages, newBotMessage]
      }));
    }, 500);
  }

  getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    return 'file';
  }

  getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('text')) return '📄';
    return '📎';
  }

  formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  renderFilePreview = (file) => {
    const fileType = this.getFileType(file.type);
    const fileUrl = URL.createObjectURL(file);

    if (fileType === 'image') {
      return (
        <div className="file-thumbnail image-thumbnail">
          <img 
            src={fileUrl} 
            alt={file.name}
            onLoad={() => URL.revokeObjectURL(fileUrl)} // Clean up after loading
          />
        </div>
      );
    } else if (fileType === 'video') {
      return (
        <div className="file-thumbnail video-thumbnail">
          <video 
            src={fileUrl}
            onLoadedData={() => URL.revokeObjectURL(fileUrl)} // Clean up after loading
          />
          <div className="play-button">▶️</div>
        </div>
      );
    } else {
      // For audio and documents, show icon
      return (
        <div className="file-thumbnail icon-thumbnail">
          <div className="file-icon">{this.getFileIcon(file.type)}</div>
        </div>
      );
    }
  }

  handleAttachmentClick = (file) => {
    const fileType = this.getFileType(file.type);
    const fileUrl = URL.createObjectURL(file);

    if (fileType === 'image') {
      // Create image preview modal
      this.showImagePreview(fileUrl, file.name);
    } else if (fileType === 'video') {
      // Create video preview modal
      this.showVideoPreview(fileUrl, file.name);
    } else if (fileType === 'audio') {
      // Create audio player modal
      this.showAudioPreview(fileUrl, file.name);
    } else {
      // For documents and other files, try to open in new tab
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.name;
      link.click();
    }
  }

  showImagePreview = (imageUrl, fileName) => {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'file-preview-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${fileName}</h3>
            <button class="modal-close" onclick="this.closest('.file-preview-modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <img src="${imageUrl}" alt="${fileName}" style="max-width: 100%; max-height: 70vh; object-fit: contain;">
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showVideoPreview = (videoUrl, fileName) => {
    const modal = document.createElement('div');
    modal.className = 'file-preview-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${fileName}</h3>
            <button class="modal-close" onclick="this.closest('.file-preview-modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <video controls style="max-width: 100%; max-height: 70vh;">
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showAudioPreview = (audioUrl, fileName) => {
    const modal = document.createElement('div');
    modal.className = 'file-preview-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${fileName}</h3>
            <button class="modal-close" onclick="this.closest('.file-preview-modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div class="audio-player">
              <div class="audio-icon">🎵</div>
              <audio controls style="width: 100%; margin-top: 16px;">
                <source src="${audioUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  generateAttachmentResponse = (files) => {
    const fileTypes = files.map(file => this.getFileType(file.type));
    const hasImages = fileTypes.includes('image');
    const hasVideos = fileTypes.includes('video');
    const hasAudio = fileTypes.includes('audio');

    if (hasImages && hasVideos) {
      return "🖼️🎥 I can see you've attached images and videos! While I can't process media files directly yet, I can help you with questions about uploading survey photos, video documentation, or where to find media management features in the SHB Survey system.";
    } else if (hasImages) {
      return "🖼️ Great! I can see you've attached images. These could be useful for survey documentation. I can help you with questions about photo requirements, image formats, or where to upload survey images in the system.";
    } else if (hasVideos) {
      return "🎥 I can see you've attached videos! Video documentation can be valuable for survey records. I can help you with questions about video formats, upload requirements, or where to manage video files in the system.";
    } else if (hasAudio) {
      return "🎵 I can see you've attached audio files! Audio recordings can be useful for bird call documentation. I can help you with questions about audio formats, recording guidelines, or where to manage audio files in the system.";
    } else {
      return "📎 I can see you've attached files. While I can't process file contents directly yet, I can help you with questions about uploading data, file formats, or where to find file management features in the SHB Survey system.";
    }
  }

  // Drag and Drop handlers
  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.state.isDragOver) {
      this.setState({ isDragOver: true });
    }
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the chat window entirely
    if (!this.chatRef.contains(e.relatedTarget)) {
      this.setState({ isDragOver: false });
    }
  }

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Filter for supported file types (only images, videos, and audio)
      const supportedFiles = files.filter(file => {
        return file.type.startsWith('image/') || 
               file.type.startsWith('video/') || 
               file.type.startsWith('audio/');
      });

      if (supportedFiles.length > 0) {
        this.handleFileAttachment(supportedFiles);
      } else {
        // Show message about unsupported files
        const unsupportedMessage = {
          id: Date.now(),
          text: "⚠️ Only images, videos, and audio files are supported.",
          sender: 'bot',
          timestamp: new Date()
        };
        this.setState(prevState => ({
          messages: [...prevState.messages, unsupportedMessage]
        }));
      }
    }
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSendMessage();
    }
  }

  formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // This ensures 24-hour format
    });
  }

  formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  hideChatAssistant = () => {
    // Don't hide chat assistant if user is typing (input is focused)
    if (this.state.inputFocused) {
      return;
    }
    // Hide chat assistant when popups open
    if (this.props.onChatToggle) {
      this.props.onChatToggle(false);
    }
  }

  showChatAssistant = () => {
    // Show chat assistant when popups close
    if (this.props.onChatToggle) {
      this.props.onChatToggle(true);
    }
  }

  handleClickOutside = (event) => {
    // Close attach menu if clicking outside
    if (this.state.showAttachMenu && this.attachMenuRef && !this.attachMenuRef.contains(event.target)) {
      this.setState({ showAttachMenu: false });
    }
    
    // Close chat if clicking outside
    if (this.chatRef && !this.chatRef.contains(event.target)) {
      // Close chat on outside click
      if (this.props.onChatToggle) {
        this.props.onChatToggle(false);
      }
    }
  }

  render() {
    const { inputMessage, isTyping, connectionStatus, isMinimized, messages, isDragOver, showAttachMenu } = this.state;
    const { showChat, onChatToggle } = this.props;

    if (!showChat) return null;

    return (
      <div 
        className={`shb-chat-window ${isDragOver ? 'drag-over' : ''}`} 
        ref={ref => this.chatRef = ref}
        onDragOver={this.handleDragOver}
        onDragLeave={this.handleDragLeave}
        onDrop={this.handleDrop}
      >
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-text">
              <h3>SHB Survey Assistant</h3>
            </div>
          </div>
          <div className="chat-header-actions">
            <button 
              className="close-btn"
              onClick={onChatToggle}
              title="Close Chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        {!isMinimized && (
          <>
            <div className="chat-messages">
              {/* Date Badge at top of chat */}
              <div className="date-badge">
                {this.formatDate(new Date())}
              </div>
              
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.sender}`}
                >
                  <div className="message-content">
                    {message.text && (
                      <div className="message-text">
                        {message.text}
                      </div>
                    )}
                    {message.type === 'attachment' && message.files && (
                      <div className="message-attachments">
                        {Array.from(message.files).map((file, index) => (
                          <div 
                            key={index} 
                            className="attachment-item"
                            onClick={() => this.handleAttachmentClick(file)}
                          >
                            <div className="attachment-preview">
                              {this.renderFilePreview(file)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="message-time">
                      {this.formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message bot typing">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
              <div className="chat-input-wrapper">
                <textarea
                  value={inputMessage}
                  onChange={this.handleInputChange}
                  onKeyPress={this.handleKeyPress}
                  onFocus={this.handleInputFocus}
                  onBlur={this.handleInputBlur}
                  placeholder="Type your message..."
                  className="chat-input"
                  rows="1"
                  disabled={connectionStatus !== 'connected'}
                />
                <div className="chat-buttons">
                  <div className="attach-button-container" ref={ref => this.attachMenuRef = ref}>
                    <svg 
                      className="attach-button"
                      onClick={this.handleAttachFile}
                      title="Attach File"
                      width="16" 
                      height="16" 
                      viewBox="0 0 16 16" 
                      fill="none"
                    >
                      <path d="M11 4V10C11 11.1 10.1 12 9 12C7.9 12 7 11.1 7 10V4C7 2.9 7.9 2 9 2C10.1 2 11 2.9 11 4V9.5C11 9.8 10.8 10 10.5 10C10.2 10 10 9.8 10 9.5V4.5" 
                            stroke="#6b7280" 
                            strokeWidth="1.2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"/>
                    </svg>
                    
                    {showAttachMenu && (
                      <div className="attach-menu">
                        <div className="attach-menu-item" onClick={() => this.handleAttachSpecificType('image')}>
                          <span className="attach-menu-icon">🖼️</span>
                          <span className="attach-menu-text">Photos</span>
                        </div>
                        <div className="attach-menu-item" onClick={() => this.handleAttachSpecificType('video')}>
                          <span className="attach-menu-icon">🎥</span>
                          <span className="attach-menu-text">Videos</span>
                        </div>
                        <div className="attach-menu-item" onClick={() => this.handleAttachSpecificType('audio')}>
                          <span className="attach-menu-icon">🎵</span>
                          <span className="attach-menu-text">Audio</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <svg 
                    className="send-button"
                    onClick={this.handleSendMessage}
                    title="Send Message"
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                  >
                    <path d="M2 14L14 8L2 2L2 6.5L10 8L2 9.5z" 
                          stroke="#4f46e5" 
                          strokeWidth="1.5" 
                          strokeLinejoin="round" 
                          strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}

export default SHBSurveyAssistant;
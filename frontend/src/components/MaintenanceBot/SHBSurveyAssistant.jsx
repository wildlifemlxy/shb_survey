import React, { Component } from 'react';
import '../../css/components/MaintenanceBot/SHBSurveyAssistant.css';

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
      showGuide: false, // For showing/hiding guide tips
      isIdentifying: false, // For animal identification loading state
      pendingIdentification: false, // Flag to indicate next image upload is for identification
      pendingImage: null, // Store uploaded image waiting for identification command
      lastUploadedImage: null, // Store most recent image for retry functionality
    };
  }

  // Clear chat history and reset to initial greeting
  clearChatHistory = () => {
    this.setState({
      messages: [
        { 
          id: Date.now(), 
          text: "🤖 Hello! I'm the SHB Survey Assistant. How can I help you today?", 
          sender: 'bot', 
          timestamp: new Date()
        }
      ],
      inputMessage: '',
      isTyping: false
    });
  };

  componentDidMount() {
    console.log('SHB Survey Assistant mounted');
    
    // Listen for popup events to hide/show assistant
    window.addEventListener('popupOpen', this.hideChatAssistant);
    window.addEventListener('popupClose', this.showChatAssistant);
    
    // Listen for clear chat events from App.jsx
    window.addEventListener('clearChatConfirmed', this.handleClearChatConfirmed);
    window.addEventListener('clearChatCancelled', this.handleClearChatCancelled);
    
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
    window.removeEventListener('clearChatConfirmed', this.handleClearChatConfirmed);
    window.removeEventListener('clearChatCancelled', this.handleClearChatCancelled);
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  // Handle close button click - show confirmation popup in App.jsx
  handleCloseClick = () => {
    if (this.props.onShowClearChatPopup) {
      this.props.onShowClearChatPopup();
    }
  };

  // Handle clear chat confirmed from App.jsx popup
  handleClearChatConfirmed = () => {
    this.clearChatHistory();
    if (this.props.onChatToggle) {
      this.props.onChatToggle();
    }
  };

  // Handle clear chat cancelled from App.jsx popup
  handleClearChatCancelled = () => {
    if (this.props.onChatToggle) {
      this.props.onChatToggle();
    }
  };

  handleSendMessage = async () => {
    const { inputMessage, messages, connectionStatus, pendingImage } = this.state;
    
    // Check if sending is allowed
    if (!inputMessage.trim() || connectionStatus !== 'connected') return;

    // Create user message - include pending image if exists
    const newUserMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      ...(pendingImage && { 
        type: 'attachment',
        files: [pendingImage]
      })
    };

    // Add user message and show typing indicator, clear pending image
    this.setState({
      messages: [...messages, newUserMessage],
      inputMessage: '',
      isTyping: true,
      pendingImage: null
    });

    // Generate bot response
    const botResponse = await this.generateBotResponse(inputMessage, pendingImage);
    
    // If botResponse is null, identification is being processed, don't show another message
    if (botResponse === null) {
      this.setState({ isTyping: false });
      return;
    }
    
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

  generateBotResponse = async (userMessage, imageFile = null) => {
    const message = userMessage.toLowerCase();
    const { currentPage } = this.props; // Get from props instead of state
    
    // Check for animal identification request with image
    if (message.includes('identify') || message.includes('animal') || message.includes('analyze') || message.includes('what is this')) {
      // If there's an image passed, process it
      if (imageFile) {
        // Trigger identification (skip showing image since it's already in user's message)
        setTimeout(() => {
          this.processAnimalIdentification(imageFile, true);
        }, 100);
        return null; // Don't show a bot response, the identification process will handle it
      } else {
        // No image uploaded yet, prompt user to upload
        return "🔍 Sure! I can help you identify an animal. Please upload an image using the 📎 button first.";
      }
    }
    
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

  handleShowGuide = () => {
    this.setState(prevState => ({
      showGuide: !prevState.showGuide
    }));
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
    fileInput.multiple = false; // Only allow single file for image identification
    
    switch (fileType) {
      case 'image':
      default:
        fileInput.accept = 'image/*';
        break;
    }
    
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        // If it's an image, store for potential identification (preview shown in input area)
        if (fileType === 'image' && files[0].type.startsWith('image/')) {
          // Store the image for identification
          this.setState({ pendingImage: files[0] });
        } else {
          this.handleFileAttachment(files);
        }
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
    return 'file';
  }

  getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
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
    } else {
      // For other files, show icon
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
    } else {
      // For other files, try to download
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

  generateAttachmentResponse = (files) => {
    const fileTypes = files.map(file => this.getFileType(file.type));
    const hasImages = fileTypes.includes('image');

    if (hasImages) {
      return "🖼️ Great! I can see you've attached an image. Would you like me to help identify the animal in this photo?";
    } else {
      return "📎 I can see you've attached a file. Currently, I can only process image files for animal identification. Please upload an image (JPG, PNG, etc.) if you'd like me to identify an animal.";
    }
  }

  // Animal Identification Feature
  handleIdentifyAnimal = () => {
    // Show the clicked prompt as a user message
    const userMessage = {
      id: Date.now(),
      text: "🔍 Can you help me identify an animal from a photo?",
      sender: 'user',
      timestamp: new Date()
    };

    this.setState(prevState => ({
      messages: [...prevState.messages, userMessage]
    }), () => {
      // After showing user message, trigger file input for image selection
      this.triggerImageUpload();
    });
  }

  // Handle Yes response to identify again
  handleIdentifyAgainYes = (messageId) => {
    // Show user's "Yes" response
    const userMessage = {
      id: Date.now(),
      text: "Yes",
      sender: 'user',
      timestamp: new Date()
    };

    // Remove the confirm message and add user response
    this.setState(prevState => ({
      messages: [...prevState.messages.filter(msg => msg.id !== messageId), userMessage]
    }), () => {
      // Trigger file input for image selection
      this.triggerImageUpload();
    });
  }

  // Handle No response to identify again
  handleIdentifyAgainNo = (messageId) => {
    // Show user's "No" response
    const userMessage = {
      id: Date.now(),
      text: "No",
      sender: 'user',
      timestamp: new Date()
    };

    const botMessage = {
      id: Date.now() + 1,
      text: "Okay! Let me know if you need any help.",
      sender: 'bot',
      timestamp: new Date()
    };

    // Remove the confirm message and add responses
    this.setState(prevState => ({
      messages: [...prevState.messages.filter(msg => msg.id !== messageId), userMessage, botMessage]
    }));
  }

  // Handle Try Again for error messages
  handleTryAgain = (messageId) => {
    // Remove the error message silently and retry
    this.setState(prevState => ({
      messages: prevState.messages.filter(msg => msg.id !== messageId)
    }), () => {
      // Use the last uploaded image if available (skip showing it again), otherwise trigger new upload
      if (this.state.lastUploadedImage) {
        this.processAnimalIdentification(this.state.lastUploadedImage, true);
      } else {
        this.triggerImageUpload();
      }
    });
  }

  // Handle Cancel/No for error messages
  handleCancelRetry = (messageId) => {
    const botMessage = {
      id: Date.now() + 1,
      text: "No problem! Let me know if you need any help.",
      sender: 'bot',
      timestamp: new Date(),
      showQuickActions: true
    };

    // Remove the error message and add bot response
    this.setState(prevState => ({
      messages: [...prevState.messages.filter(msg => msg.id !== messageId), botMessage]
    }));
  }

  // Trigger file upload dialog
  triggerImageUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        this.processAnimalIdentification(files[0]);
      }
    };
    fileInput.click();
  }

  processAnimalIdentification = async (imageFile, skipShowImage = false) => {
    // Store the image for potential retry
    this.setState({ lastUploadedImage: imageFile });
    
    // Show the uploaded image in chat (unless already shown)
    if (!skipShowImage) {
      const userImageMessage = {
        id: Date.now(),
        text: '',
        sender: 'user',
        timestamp: new Date(),
        type: 'attachment',
        files: [imageFile]
      };

      this.setState(prevState => ({
        messages: [...prevState.messages, userImageMessage],
        isIdentifying: true,
        pendingIdentification: false
      }));
    } else {
      this.setState({
        isIdentifying: true,
        pendingIdentification: false
      });
    }

    // Show analyzing message
    const analyzingMessage = {
      id: Date.now() + 1,
      text: "🔄 Analyzing image with AI... Please wait.",
      sender: 'bot',
      timestamp: new Date()
    };

    this.setState(prevState => ({
      messages: [...prevState.messages, analyzingMessage]
    }));

    try {
      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile);
      
      // Call the backend API
      const response = await fetch(`${BASE_URL}/animal-identification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'identify',
          image: base64Image,
          mimeType: imageFile.type
        })
      });

      const result = await response.json();

      // Remove the analyzing message and show results
      this.setState(prevState => ({
        messages: prevState.messages.filter(msg => msg.id !== analyzingMessage.id)
      }));

      if (result.success && result.identification) {
        const identification = result.identification;
        const primary = identification.primaryMatch;

        // Get the best reference image URL
        let referenceImageUrl = null;
        if (primary.referenceImages && primary.referenceImages.length > 0) {
          referenceImageUrl = primary.referenceImages[0].url || primary.referenceImages[0].largeUrl;
        } else if (primary.wikipediaData?.images && primary.wikipediaData.images.length > 0) {
          referenceImageUrl = primary.wikipediaData.images[0].url;
        } else if (primary.verification?.defaultPhoto?.url) {
          referenceImageUrl = primary.verification.defaultPhoto.url;
        }

        const resultMessage = {
          id: Date.now() + 2,
          text: '', // No text, using custom card layout
          sender: 'bot',
          timestamp: new Date(),
          type: 'identification-result',
          commonName: primary.commonName,
          scientificName: primary.scientificName,
          referenceImageUrl: referenceImageUrl
        };

        const followUpMessage = {
          id: Date.now() + 3,
          text: 'Would you like to identify another animal?',
          sender: 'bot',
          timestamp: new Date(),
          type: 'confirm-identify-again'
        };

        this.setState(prevState => ({
          messages: [...prevState.messages, resultMessage, followUpMessage],
          isIdentifying: false
        }));

      } else {
        const errorMessage = {
          id: Date.now() + 2,
          text: `❌ Could not identify the animal. ${result.error || 'Please try with a clearer image.'}`,
          question: 'Would you like to try again?',
          sender: 'bot',
          timestamp: new Date(),
          type: 'error-with-retry'
        };

        this.setState(prevState => ({
          messages: [...prevState.messages, errorMessage],
          isIdentifying: false
        }));
      }

    } catch (error) {
      console.error('Animal identification error:', error);
      
      const errorMessage = {
        id: Date.now() + 2,
        text: `❌ Error during identification: ${error.message}. Please try again later.`,
        question: 'Would you like to try again?',
        sender: 'bot',
        timestamp: new Date(),
        type: 'error-with-retry'
      };

      this.setState(prevState => ({
        messages: prevState.messages.filter(msg => msg.text !== "🔄 Analyzing image with AI... Please wait."),
        isIdentifying: false
      }));

      this.setState(prevState => ({
        messages: [...prevState.messages, errorMessage]
      }));
    }
  }

  fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
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
      // Filter for supported file types (only images)
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        // Store image in pending state (same as attach button behavior)
        this.setState({ pendingImage: imageFiles[0] });
      } else {
        // Show message about unsupported files
        const unsupportedMessage = {
          id: Date.now(),
          text: "⚠️ Only image files are supported for identification.",
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
    
    // Show clear chat popup if clicking outside the chat window
    if (this.chatRef && !this.chatRef.contains(event.target)) {
      // Show the clear chat confirmation popup (same as clicking close button)
      if (this.props.onShowClearChatPopup) {
        this.props.onShowClearChatPopup();
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
              onClick={this.handleCloseClick}
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
                    {/* Combined text and attachment in same bubble */}
                    {message.text && message.type === 'attachment' && message.files && (
                      <div className="message-text-with-attachment">
                        <div className="message-text">
                          {message.text}
                        </div>
                        <div className="message-attachments inline">
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
                      </div>
                    )}
                    {/* Text only (no attachment) */}
                    {message.text && message.type !== 'attachment' && message.type !== 'confirm-identify-again' && message.type !== 'error-with-retry' && (
                      <div className={`message-text ${message.showQuickActions ? 'with-quick-actions' : ''}`}>
                        {message.text}
                        {/* Quick Action Buttons - shown inside greeting message bubble */}
                        {message.showQuickActions && (
                          <div className="message-quick-actions">
                            <div 
                              className="message-suggestion"
                              onClick={this.handleIdentifyAnimal}
                              role="button"
                              tabIndex={0}
                            >
                              🔍 Can you help me identify an animal from a photo?
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Attachment only (no text) */}
                    {message.type === 'attachment' && message.files && !message.text && (
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
                    {/* Identification Result Card - two column layout */}
                    {message.type === 'identification-result' && (
                      <div className="identification-card">
                        {message.referenceImageUrl && (
                          <div className="identification-image">
                            <img 
                              src={message.referenceImageUrl} 
                              alt={message.commonName}
                              onClick={() => window.open(message.referenceImageUrl, '_blank')}
                            />
                          </div>
                        )}
                        <div className="identification-info">
                          <div className="identification-common-name">{message.commonName}</div>
                          <div className="identification-scientific-name">{message.scientificName}</div>
                        </div>
                      </div>
                    )}
                    {/* Standalone Quick Actions bubble (no text, just quick actions) */}
                    {!message.text && !message.type && message.showQuickActions && (
                      <div className="message-quick-actions standalone">
                        <div 
                          className="message-suggestion"
                          onClick={this.handleIdentifyAnimal}
                          role="button"
                          tabIndex={0}
                        >
                          🔍 Can you help me identify an animal from a photo?
                        </div>
                      </div>
                    )}
                    {/* Confirm identify again with Yes/No buttons */}
                    {message.type === 'confirm-identify-again' && (
                      <div className="confirm-identify-again">
                        <div className="message-text">
                          {message.text}
                        </div>
                        <div className="confirm-time">
                          {this.formatTime(message.timestamp)}
                        </div>
                        <div className="confirm-buttons">
                          <button 
                            className="confirm-btn yes"
                            onClick={() => this.handleIdentifyAgainYes(message.id)}
                          >
                            Yes
                          </button>
                          <button 
                            className="confirm-btn no"
                            onClick={() => this.handleIdentifyAgainNo(message.id)}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Error message with Try Again button */}
                    {message.type === 'error-with-retry' && (
                      <div className="error-with-retry">
                        <div className="message-text error">
                          {message.text}
                          {message.question && (
                            <div className="error-question">
                              {message.question}
                            </div>
                          )}
                        </div>
                        <div className="retry-buttons">
                          <button 
                            className="retry-btn secondary"
                            onClick={() => this.handleTryAgain(message.id)}
                          >
                            Yes
                          </button>
                          <button 
                            className="retry-btn secondary"
                            onClick={() => this.handleCancelRetry(message.id)}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                    {message.type !== 'confirm-identify-again' && (
                      <div className="message-time">
                        {this.formatTime(message.timestamp)}
                      </div>
                    )}
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

            {/* Guide Button Section */}
            <div className="chat-guide-section">
              <button 
                className="guide-btn"
                onClick={this.handleShowGuide}
              >
                📖 Guide
              </button>
              <button 
                className="guide-btn"
                onClick={this.handleIdentifyAnimal}
              >
                🔍 Identify Animal
              </button>
              {this.state.showGuide && (
                <div className="guide-content">
                  <span>📎 Attach images</span>
                  <span>🖱️ Drag & drop</span>
                  <span>💬 Type naturally</span>
                  <button 
                    className="guide-close-btn"
                    onClick={this.handleShowGuide}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
              {/* Pending Image Preview */}
              {this.state.pendingImage && (
                <div className="pending-image-preview">
                  <img 
                    src={URL.createObjectURL(this.state.pendingImage)} 
                    alt="Pending upload"
                  />
                  <button 
                    className="remove-pending-image"
                    onClick={() => this.setState({ pendingImage: null })}
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="chat-input-wrapper">
                <textarea
                  value={inputMessage}
                  onChange={this.handleInputChange}
                  onKeyPress={this.handleKeyPress}
                  onFocus={this.handleInputFocus}
                  onBlur={this.handleInputBlur}
                  placeholder={this.state.pendingImage ? "Type 'identify' to analyze the image..." : "Try: identify animal, help, map, survey..."}
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
import React, { Component } from 'react';
import './WWFSurveyBot.css';

class WWFSurveyBot extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userMessage: '',
      conversation: [
        { id: 1, sender: 'bot', text: 'WWF-SG Survey Schedule Bot. Ready to send updates to your Telegram group.', timestamp: new Date() }
      ],
      isTyping: false,
      telegramToken: '7968511707:AAF3ZRpt1q4kNik8cEpcskQjbnJy5kVm6N4',
      telegramGroupChatId: '2136702422',
      isSending: false,
      newParticipantName: '',
      editingListType: null,
      editingListIndex: null,
      surveyData: {
        wwfLed: {
          date: "16 Apr",
          location: "Mandai Track 15",
          meetingPoint: "https://maps.app.goo.gl/dmdpqUJvEakzm76s9",
          meetingPointDesc: "Central Catchment Park Connector",
          time: "07:30am - 09:30am",
          participants: ["Anya", "Keon", "Germaine", "Steve", "Varsha", "Haz"]
        },
        volunteerLed: [
          {
            date: "11 April",
            location: "Springleaf Nature Park",
            meetingPoint: "", // Will be generated dynamically when needed
            meetingPointDesc: "Main Entrance",
            time: "7.30am - 9.30am",
            participants: ["Raymond", "Sharon", "Steve", "Wayne"]
          },
          {
            date: "12 April",
            location: "Rifle Range Nature Park",
            meetingPoint: "", // Will be generated dynamically when needed
            meetingPointDesc: "Visitor Center",
            time: "7.30am - 9.30am",
            participants: ["Raymond", "Feng Yun", "Keon", "Germaine", "Kwang Boon"]
          },
          {
            date: "26 April",
            location: "TBC",
            meetingPoint: "", // Will be generated dynamically when needed
            meetingPointDesc: "",
            time: "7.30am - 9.30am",
            participants: ["Feng Yun", "Tseng Wen", "Keon", "Tvish"]
          }
        ]
      },
      customSurvey: {
        date: "",
        location: "",
        meetingPoint: "",
        meetingPointDesc: "",
        time: "",
        participants: []
      },
      showMapModal: false,
      showParticipantModal: false,
      activeLocation: null,
      mapSearchTerm: ""
    };
  }
  
  // Helper function to get meeting point URL based on location
  getMeetingPointUrl(location) {
    if (!location || location === "TBC") return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }
  
  handleTokenChange = (e) => {
    this.setState({ telegramToken: e.target.value });
  };
  
  handleGroupIdChange = (e) => {
    this.setState({ telegramGroupChatId: e.target.value });
  };
  
  handleCustomSurveyChange = (field, e) => {
    const value = e.target.value;
    this.setState(prevState => ({
      customSurvey: {
        ...prevState.customSurvey,
        [field]: value
      }
    }));
  };
  
  handleParticipantsChange = (e) => {
    const participants = e.target.value.split('\n').filter(p => p.trim() !== '');
    this.setState(prevState => ({
      customSurvey: {
        ...prevState.customSurvey,
        participants
      }
    }));
  };
  
  // Handle map search term change
  handleMapSearchChange = (e) => {
    this.setState({ mapSearchTerm: e.target.value });
  };
  
  // New Participant Name Change Handler
  handleNewParticipantChange = (e) => {
    this.setState({ newParticipantName: e.target.value });
  };
  
  // Open participant modal to edit participant list
  openParticipantModal = (listType, index = null) => {
    this.setState({
      showParticipantModal: true,
      editingListType: listType,
      editingListIndex: index,
      newParticipantName: ''
    });
  };
  
  // Close participant modal
  closeParticipantModal = () => {
    this.setState({
      showParticipantModal: false,
      editingListType: null,
      editingListIndex: null,
      newParticipantName: ''
    });
  };
  
  // Add participant to the list
  addParticipant = () => {
    const { newParticipantName, editingListType, editingListIndex } = this.state;
    
    if (!newParticipantName.trim()) return;
    
    this.setState(prevState => {
      let updatedState = { ...prevState };
      
      if (editingListType === 'wwf-led') {
        updatedState.surveyData.wwfLed.participants = [
          ...prevState.surveyData.wwfLed.participants,
          newParticipantName.trim()
        ];
      } else if (editingListType === 'volunteer-led') {
        updatedState.surveyData.volunteerLed[editingListIndex].participants = [
          ...prevState.surveyData.volunteerLed[editingListIndex].participants,
          newParticipantName.trim()
        ];
      } else if (editingListType === 'custom') {
        updatedState.customSurvey.participants = [
          ...prevState.customSurvey.participants,
          newParticipantName.trim()
        ];
      }
      
      return {
        ...updatedState,
        newParticipantName: ''
      };
    });
  };
  
  // Remove participant from the list
  removeParticipant = (participantIndex) => {
    const { editingListType, editingListIndex } = this.state;
    
    this.setState(prevState => {
      let updatedState = { ...prevState };
      
      if (editingListType === 'wwf-led') {
        updatedState.surveyData.wwfLed.participants = prevState.surveyData.wwfLed.participants
          .filter((_, index) => index !== participantIndex);
      } else if (editingListType === 'volunteer-led') {
        updatedState.surveyData.volunteerLed[editingListIndex].participants = 
          prevState.surveyData.volunteerLed[editingListIndex].participants
            .filter((_, index) => index !== participantIndex);
      } else if (editingListType === 'custom') {
        updatedState.customSurvey.participants = prevState.customSurvey.participants
          .filter((_, index) => index !== participantIndex);
      }
      
      return updatedState;
    });
  };
  
  // Open map modal to select a location
  openMapModal = (locationType, index = null) => {
    let activeLocation;
    
    if (locationType === 'wwf-led') {
      activeLocation = 'wwf-led';
    } else if (locationType === 'volunteer-led') {
      activeLocation = `volunteer-led-${index}`;
    } else if (locationType === 'custom') {
      activeLocation = 'custom';
    }
    
    this.setState({ 
      showMapModal: true, 
      activeLocation,
      mapSearchTerm: ""
    });
  };
  
  // Close map modal
  closeMapModal = () => {
    this.setState({ showMapModal: false, activeLocation: null });
  };
  
  // Search and set Google Maps location
  searchAndSetLocation = () => {
    const { activeLocation, mapSearchTerm } = this.state;
    
    if (!mapSearchTerm.trim()) return;
    
    // Generate a Google Maps URL for the search term
    const googleMapsUrl = `https://maps.app.goo.gl/?q=${encodeURIComponent(mapSearchTerm)}`;
    
    // Update the correct survey with the new map link
    if (activeLocation === 'wwf-led') {
      this.setState(prevState => ({
        surveyData: {
          ...prevState.surveyData,
          wwfLed: {
            ...prevState.surveyData.wwfLed,
            meetingPoint: googleMapsUrl
          }
        },
        showMapModal: false
      }));
    } else if (activeLocation === 'custom') {
      this.setState(prevState => ({
        customSurvey: {
          ...prevState.customSurvey,
          meetingPoint: googleMapsUrl
        },
        showMapModal: false
      }));
    } else if (activeLocation.startsWith('volunteer-led-')) {
      const index = parseInt(activeLocation.split('-')[2]);
      
      this.setState(prevState => {
        const updatedVolunteerLed = [...prevState.surveyData.volunteerLed];
        updatedVolunteerLed[index] = {
          ...updatedVolunteerLed[index],
          meetingPoint: googleMapsUrl
        };
        
        return {
          surveyData: {
            ...prevState.surveyData,
            volunteerLed: updatedVolunteerLed
          },
          showMapModal: false
        };
      });
    }
    
    // Add confirmation message to conversation
    this.setState(prevState => ({
      conversation: [
        ...prevState.conversation,
        {
          id: prevState.conversation.length + 1,
          sender: 'bot',
          text: `Google Maps link updated for location: ${mapSearchTerm}`,
          timestamp: new Date()
        }
      ]
    }));
  };
  
  formatStandardSurveyMessage = (survey) => {
    let message = `Hi everyone! Please find the details for tomorrow's (${survey.date}) survey below:\n\n`;
    message += `**Location: ${survey.location}\n`;
    
    // Use the meeting point from state or generate it dynamically
    let meetingPointUrl = survey.meetingPoint;
    if (!meetingPointUrl && survey.location && survey.location !== "TBC") {
      meetingPointUrl = this.getMeetingPointUrl(survey.location);
    }
    
    if (meetingPointUrl) {
      message += `Meeting Point: ${meetingPointUrl} (${survey.meetingPointDesc || 'Click for directions'}) \n`;
    }
    
    message += `Time: ${survey.time}**\n\n`;
    message += `Participant List <- please add your name if you want to join\n`;
    
    if (survey.participants && survey.participants.length > 0) {
      survey.participants.forEach((participant, index) => {
        message += `${index + 1}. ${participant}\n`;
      });
    }
    
    return message;
  };
  
  sendFormattedSurveyInfo = (surveyType) => {
    let survey;
    
    if (surveyType === 'wwf-led') {
      survey = this.state.surveyData.wwfLed;
    } else if (surveyType === 'custom') {
      survey = this.state.customSurvey;
    } else {
      const index = parseInt(surveyType.split('-')[2]) - 1;
      survey = this.state.surveyData.volunteerLed[index];
    }
    
    const message = this.formatStandardSurveyMessage(survey);
    
    // Add bot message to conversation showing what's being sent
    const botMessage = {
      id: this.state.conversation.length + 1,
      sender: 'bot',
      text: `Sending the following message to Telegram:\n\n${message}`,
      timestamp: new Date()
    };
    
    this.setState({
      conversation: [...this.state.conversation, botMessage],
      isSending: true
    });
    
    // Send to Telegram
    this.sendToTelegram(message);
  };
  
  sendCustomMessage = () => {
    const { userMessage } = this.state;
    
    if (!userMessage.trim()) return;
    
    // Add user message to conversation
    const newUserMessage = {
      id: this.state.conversation.length + 1,
      sender: 'user',
      text: userMessage,
      timestamp: new Date()
    };
    
    this.setState({
      conversation: [...this.state.conversation, newUserMessage],
      userMessage: '',
      isSending: true
    });
    
    // Send to Telegram
    this.sendToTelegram(userMessage);
  };
  
  handleMessageChange = (e) => {
    this.setState({ userMessage: e.target.value });
  };
  
  handleKeyPress = (e) => {
    if (e.key === 'Enter' && this.state.isConfigured) {
      this.sendCustomMessage();
    }
  };
  
  sendToTelegram = (message) => {
    const { telegramToken, telegramGroupChatId } = this.state;
    
    // Using Telegram Bot API to send message
    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    
    fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramGroupChatId,
        text: message,
        parse_mode: 'Markdown'
      }),
    })
    .then(response => response.json())
    .then(data => {
      // Handle success
      const successMessage = {
        id: this.state.conversation.length + 1,
        sender: 'bot',
        text: `Message sent to Telegram group successfully!`,
        timestamp: new Date()
      };
      
      this.setState({
        conversation: [...this.state.conversation, successMessage],
        isSending: false
      });
    })
    .catch(error => {
      // Handle error
      console.error('Error sending message to Telegram:', error);
      
      const errorMessage = {
        id: this.state.conversation.length + 1,
        sender: 'bot',
        text: `Error sending message to Telegram: ${error.message}. Please check your token and group ID.`,
        timestamp: new Date()
      };
      
      this.setState({
        conversation: [...this.state.conversation, errorMessage],
        isSending: false
      });
    });
  };
  
  formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get the current participants list being edited
  getCurrentParticipantsList = () => {
    const { editingListType, editingListIndex } = this.state;
    
    if (editingListType === 'wwf-led') {
      return this.state.surveyData.wwfLed.participants;
    } else if (editingListType === 'volunteer-led') {
      return this.state.surveyData.volunteerLed[editingListIndex].participants;
    } else if (editingListType === 'custom') {
      return this.state.customSurvey.participants;
    }
    
    return [];
  };
  
  // Get the current list title
  getCurrentListTitle = () => {
    const { editingListType, editingListIndex, surveyData } = this.state;
    
    if (editingListType === 'wwf-led') {
      return `${surveyData.wwfLed.location} (${surveyData.wwfLed.date})`;
    } else if (editingListType === 'volunteer-led') {
      const survey = surveyData.volunteerLed[editingListIndex];
      return `${survey.location} (${survey.date})`;
    } else if (editingListType === 'custom') {
      return 'Custom Survey';
    }
    
    return 'Participants';
  };
  
  render() {
    const { 
      userMessage, 
      conversation, 
      isConfigured, 
      isSending, 
      telegramToken, 
      telegramGroupChatId, 
      customSurvey,
      showMapModal,
      mapSearchTerm,
      surveyData,
      newParticipantName,
      showParticipantModal
    } = this.state;
    
    return (
      <div className="wwf-bot-container">
        <div className="message-header">
          <h2>WWF-SG Survey Schedule Telegram Bot</h2>
        </div>
        
        {(
          <>
            <div className="survey-controls">
              <h3>Send Survey Information</h3>
              <div className="survey-buttons">
                <div className="survey-button-group">
                  <button onClick={() => this.sendFormattedSurveyInfo('wwf-led')} disabled={isSending}>
                    Send Mandai T15 Survey Info (16 Apr)
                  </button>
                  <button 
                    className="map-button" 
                    onClick={() => this.openMapModal('wwf-led')}
                    title="Set Google Maps Location"
                  >
                    {surveyData.wwfLed.meetingPoint ? '📍' : '➕📍'}
                  </button>
                  <button
                    className="participants-button"
                    onClick={() => this.openParticipantModal('wwf-led')}
                    title="Edit Participants List"
                  >
                    👥 Edit List
                  </button>
                </div>
                
                {surveyData.volunteerLed.map((survey, index) => (
                  <div key={index} className="survey-button-group">
                    <button 
                      onClick={() => this.sendFormattedSurveyInfo(`volunteer-led-${index+1}`)} 
                      disabled={isSending}
                    >
                      Send {survey.location} Survey Info ({survey.date})
                    </button>
                    <button 
                      className="map-button"
                      onClick={() => this.openMapModal('volunteer-led', index)}
                      title="Set Google Maps Location"
                    >
                      {survey.meetingPoint ? '📍' : '➕📍'}
                    </button>
                    <button
                      className="participants-button"
                      onClick={() => this.openParticipantModal('volunteer-led', index)}
                      title="Edit Participants List"
                    >
                      👥 Edit List
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="custom-survey-form">
              <h3>Create Custom Survey Announcement</h3>
              <div className="survey-form-grid">
                <div className="form-group">
                  <label>Date:</label>
                  <input 
                    type="text" 
                    value={customSurvey.date}
                    onChange={(e) => this.handleCustomSurveyChange('date', e)}
                    placeholder="e.g., 16 Apr"
                  />
                </div>
                <div className="form-group">
                  <label>Location:</label>
                  <input 
                    type="text" 
                    value={customSurvey.location}
                    onChange={(e) => this.handleCustomSurveyChange('location', e)}
                    placeholder="e.g., Mandai Track 15"
                  />
                </div>
                <div className="form-group">
                  <label>Meeting Point URL:</label>
                  <div className="input-with-button">
                    <input 
                      type="text" 
                      value={customSurvey.meetingPoint}
                      onChange={(e) => this.handleCustomSurveyChange('meetingPoint', e)}
                      placeholder="Google Maps URL"
                      readOnly
                    />
                    <button 
                      className="map-button"
                      onClick={() => this.openMapModal('custom')}
                      title="Set Google Maps Location"
                    >
                      {customSurvey.meetingPoint ? '📍' : '➕📍'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Meeting Point Description:</label>
                  <input 
                    type="text" 
                    value={customSurvey.meetingPointDesc}
                    onChange={(e) => this.handleCustomSurveyChange('meetingPointDesc', e)}
                    placeholder="e.g., Central Catchment Park Connector"
                  />
                </div>
                <div className="form-group">
                  <label>Time:</label>
                  <input 
                    type="text" 
                    value={customSurvey.time}
                    onChange={(e) => this.handleCustomSurveyChange('time', e)}
                    placeholder="e.g., 07:30am - 09:30am"
                  />
                </div>
                <div className="form-group full-width participant-list-container">
                  <div className="participant-header">
                    <label>Participants:</label>
                    <button
                      className="edit-participants-button"
                      onClick={() => this.openParticipantModal('custom')}
                      title="Edit Participants List"
                    >
                      👥 Edit List
                    </button>
                  </div>
                  <div className="participants-preview">
                    {customSurvey.participants.length > 0 ? (
                      customSurvey.participants.map((name, idx) => (
                        <span key={idx} className="participant-chip">{name}</span>
                      ))
                    ) : (
                      <span className="no-participants">No participants added yet</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => this.sendFormattedSurveyInfo('custom')} 
                disabled={isSending || !customSurvey.date || !customSurvey.location || !customSurvey.time}
                className="send-custom-survey"
              >
                Send Custom Survey Announcement
              </button>
            </div>
          
            <div className="message-list">
              {conversation.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message-item ${msg.sender === 'user' ? 'user-message' : 'bot-message'}`}
                >
                  <div className="message-bubble">
                    <div className="message-text">{msg.text}</div>
                    <div className="message-time">{this.formatTimestamp(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              
              {isSending && (
                <div className="message-item bot-message">
                  <div className="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="message-input-container">
              <input
                type="text"
                className="message-input"
                value={userMessage}
                onChange={this.handleMessageChange}
                onKeyPress={this.handleKeyPress}
                placeholder="Type a custom message to send..."
              />
              <button 
                className="send-button"
                onClick={this.sendCustomMessage}
                disabled={!userMessage.trim() || isSending}
              >
                {isSending ? 'Sending...' : 'Send Custom Message'}
              </button>
            </div>
            
            {/* Map Selection Modal */}
            {showMapModal && (
              <div className="map-modal-overlay">
                <div className="map-modal">
                  <h3>Set Google Maps Location</h3>
                  <p>Enter a location to generate a Google Maps link</p>
                  
                  <div className="map-search">
                    <input
                      type="text"
                      value={mapSearchTerm}
                      onChange={this.handleMapSearchChange}
                      placeholder="Enter location name or address"
                      className="map-search-input"
                    />
                    <button 
                      className="map-search-button"
                      onClick={this.searchAndSetLocation}
                    >
                      Add Map Link
                    </button>
                  </div>
                  
                  <div className="map-modal-actions">
                    <button onClick={this.closeMapModal} className="cancel-button">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Participant Edit Modal */}
            {showParticipantModal && (
              <div className="participant-modal-overlay">
                <div className="participant-modal">
                  <h3>Edit Participants for {this.getCurrentListTitle()}</h3>
                  
                  <div className="participant-list">
                    {this.getCurrentParticipantsList().length > 0 ? (
                      this.getCurrentParticipantsList().map((participant, index) => (
                        <div key={index} className="participant-item">
                          <span className="participant-number">{index + 1}.</span>
                          <span className="participant-name">{participant}</span>
                          <button
                            className="remove-participant-button"
                            onClick={() => this.removeParticipant(index)}
                            title="Remove Participant"
                          >
                            ❌
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="no-participants-message">No participants added yet</div>
                    )}
                  </div>
                  
                  <div className="add-participant-form">
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={this.handleNewParticipantChange}
                      placeholder="New participant name"
                      className="participant-input"
                    />
                    <button
                      className="add-participant-button"
                      onClick={this.addParticipant}
                      disabled={!newParticipantName.trim()}
                    >
                      Add Participant
                    </button>
                  </div>
                  
                  <div className="participant-modal-actions">
                    <button onClick={this.closeParticipantModal} className="done-button">
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default WWFSurveyBot;
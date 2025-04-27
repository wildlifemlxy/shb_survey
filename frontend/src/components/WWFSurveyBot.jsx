import React, { Component } from 'react';
import './WWFSurveyBot.css';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx'; // Import the xlsx library
import axios from 'axios';


class WWFSurveyBot extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userMessage: '',
      conversation: [
        { id: 1, sender: 'bot', text: 'WWF-SG Survey Schedule Bot. Ready to send updates to your Telegram groups.', timestamp: new Date() }
      ],
      isTyping: false,
      telegramToken: '7968511707:AAF3ZRpt1q4kNik8cEpcskQjbnJy5kVm6N4',
      telegramGroups: [
        { id: '2136702422', name: 'WWF volunteer Telegram'},
        { id: '611754613', name: 'Moses Personal Chat'},
        { id: -1002415651477, name: "WWF-SG Straw-headed Bulbul Citizen Science Programme"}
      ],
      newGroupId: '',
      newGroupName: '',
      showGroupModal: false,
      isSending: false,
      newParticipantName: '',
      editingListType: null,
      editingListIndex: null,
      surveyData: {
        wwfLed: [],
        volunteerLed: []
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

  componentDidMount = async() => {
    this.fetchSurveyDataFromSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vSuWNqWojoUhanoFvrFkPu4ObOXs1btQSF06gcVer_co9LwK2GROTupV1MfthXf1_zQPnxjBVmvA3Bg/pub?output=xlsx');
  }

  fetchSurveyDataFromSheet = (url) => {
    fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the correct sheet - using "Sheet4" or first sheet if not found
        const sheetNames = workbook.SheetNames;
        console.log("Available sheets:", sheetNames);
        
        let sheetName = sheetNames.find(name => name.includes("Survey")) ||
                        (sheetNames.includes("Upcoming Surveys") ? "Upcoming Surveys" : sheetNames[0]);
        
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
          throw new Error(`Sheet "${sheetName}" not found in workbook`);
        }
        
        // Get the raw data as a 2D array
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        console.log("Raw sheet data:", rawData);
        
        // Process the survey data by columns
        const surveysByType = this.processSurveyData(rawData);
        
        // Helper function to check if a survey has already passed
        const isSurveyPassed = (surveyDate, surveyTime) => {
          if (!surveyDate || !surveyTime) return false;
          
          // Parse the date (format: "12 April 2025")
          const dateParts = surveyDate.trim().split(" ");
          if (dateParts.length !== 3) return false;
          
          const day = parseInt(dateParts[0], 10);
          const monthStr = dateParts[1];
          const year = parseInt(dateParts[2], 10);
          
          // Map month string to month number (0-based)
          const months = {
            'january': 0, 'february': 1, 'march': 2, 'april': 3,
            'may': 4, 'june': 5, 'july': 6, 'august': 7,
            'september': 8, 'october': 9, 'november': 10, 'december': 11
          };
          
          const month = months[monthStr.toLowerCase()];
          if (month === undefined) return false;
          
          // Parse the time (format: "0730hrs - 0930hrs")
          const timeMatch = surveyTime.match(/(\d{4})hrs/);
          if (!timeMatch) return false;
          
          const timeStr = timeMatch[1];
          const hours = parseInt(timeStr.substring(0, 2), 10);
          const minutes = parseInt(timeStr.substring(2, 4), 10);
          
          // Create survey date object
          const surveyDateTime = new Date(year, month, day, hours, minutes);
          
          // Compare with current date and time
          const currentDateTime = new Date();
          
          console.log("Survey date/time:", surveyDateTime);
          console.log("Current date/time:", currentDateTime);
          
          return surveyDateTime < currentDateTime;
        };
        
        // Transform data to match expected structure
        this.setState(prevState => {
          // Initialize with empty structure
          const updatedData = {
            wwfLed: [],
            volunteerLed: []
          };
          
          // Filter and update WWF-led data if available
          const wwfSurveys = surveysByType["WWF-led (WWF staff will be present)"];
          if (wwfSurveys && wwfSurveys.length > 0) {
            // Filter out past surveys
            const futureWwfSurveys = wwfSurveys.filter(survey => 
              !isSurveyPassed(survey.date, survey.time)
            );
            
            if (futureWwfSurveys.length > 0) {
              updatedData.wwfLed = futureWwfSurveys.map(survey => ({
                date: survey.date || "",
                location: survey.location || "",
                meetingPoint: "", // Empty initially
                meetingPointDesc: "",
                time: survey.time || "",
                participants: survey.participants?.map(p => p.name) || []
              }))[0]; // Take the first item since wwfLed is a single object, not an array
            }
          }
            
          // Filter and update volunteer-led data if available
          const volunteerSurveys = surveysByType["Volunteer-led"];
          if (volunteerSurveys && volunteerSurveys.length > 0) {
            // Filter out past surveys
            const futureVolunteerSurveys = volunteerSurveys.filter(survey => 
              !isSurveyPassed(survey.date, survey.time)
            );
            
            updatedData.volunteerLed = futureVolunteerSurveys.map(survey => ({
              date: survey.date || "",
              location: survey.location || "",
              meetingPoint: "", // Empty initially
              meetingPointDesc: "",
              time: survey.time || "",
              participants: survey.participants?.map(p => p.name) || []
            }));
          }
          
          // Add one empty volunteer survey if none exist
          if (updatedData.volunteerLed.length === 0) {
            updatedData.volunteerLed = [{
              date: "",
              location: "",
              meetingPoint: "",
              meetingPointDesc: "",
              time: "",
              participants: []
            }];
          }
          
          return {
            surveyData: updatedData,
            surveysByType: surveysByType // Store original data if needed
          };
        });
      })
      .catch(error => {
        console.error('Error fetching or parsing survey data:', error);
        this.setState({
          error: error.message
        });
      });
  };

  processSurveyData = (rawData) => {
    // Object to store surveys organized by type
    const surveysByType = {
      "WWF-led": [],
      "Volunteer-led": []
    };
    
    let currentType = null;
    
    // Process each row in the data
    for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
      // Check if we have a valid row
      const row = rawData[rowIndex];
      if (!row || !row.length) continue;
      
      // Check column A for survey type indicators
      const cellA = row[0];
      if (cellA && typeof cellA === 'string') {
        const cellText = cellA.trim().toLowerCase();
        
        // Update current type if we find an indicator
        if (cellText.includes('wwf')) {
          currentType = "WWF-led";
          console.log(`Found ${currentType} section at row ${rowIndex}`);
        } else if (cellText.includes('volunteer')) {
          currentType = "Volunteer-led";
          console.log(`Found ${currentType} section at row ${rowIndex}`);
        }
      }
      
      // Skip if we don't have a type yet
      if (!currentType) continue;
      
      // Look for date rows which indicate the start of a survey
      for (let colIndex = 1; colIndex < (row.length || 20); colIndex++) {
        const cell = row[colIndex];
        
        if (cell && typeof cell === 'string' && cell.includes('Date:')) {
          console.log(`Found survey at row ${rowIndex}, column ${colIndex}`);
          console.log("Cell Value111:", cell);
          
          // This column has a survey - extract info
          const surveyData = {
            date: '',
            location: '',
            time: '',
            participants: []
          };
          
          // Split the cell by newlines
          const lines = cell.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('Date:')) {
              surveyData.date = trimmedLine.replace('Date:', '').trim();
            } else if (trimmedLine.startsWith('Location:')) {
              surveyData.location = trimmedLine.replace('Location:', '').trim();
            } else if (trimmedLine.startsWith('Time:')) {
              surveyData.time = trimmedLine.replace('Time:', '').trim();
            }
          }
          
          console.log("Survey Data:", surveyData);
          
          // Extract participants from rows below until we hit an empty row or a new header
          let participantRow = rowIndex; // Start after date/location/time
          let emptyRowCount = 0;
          
          while (participantRow < rawData.length && emptyRowCount < 2) {
            const numCell = rawData[participantRow][colIndex];
            const nameCell = rawData[participantRow][colIndex + 1];
            
            // If this row has a number and name, it's a participant
            if (numCell && !isNaN(Number(numCell)) && nameCell) {
              surveyData.participants.push({
                number: numCell,
                name: nameCell
              });
              emptyRowCount = 0; // Reset empty row counter
            } else {
              // Count consecutive empty rows to detect end of participant list
              emptyRowCount++;
            }
            
            participantRow++;
          }     
          // Only add surveys with valid data
          if (surveyData.date || surveyData.location || surveyData.time || surveyData.participants.length > 0) {
            surveysByType[currentType].push(surveyData);
            console.log(`Added survey with ${surveyData.participants.length} participants`);
          }
        }
      }
    }
    
    console.log("Processed surveys by type:", surveysByType);
    return surveysByType;
  };

  // Helper function to get meeting point URL based on location
  getMeetingPointUrl(location) {
    if (!location || location === "TBC") return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }
  
  handleTokenChange = (e) => {
    this.setState({ telegramToken: e.target.value });
  };
  
  // Handle new group ID change
  handleNewGroupIdChange = (e) => {
    this.setState({ newGroupId: e.target.value });
  };
  
  // Handle new group name change
  handleNewGroupNameChange = (e) => {
    this.setState({ newGroupName: e.target.value });
  };
  
  // Open group management modal
  openGroupModal = () => {
    this.setState({
      showGroupModal: true,
      newGroupId: '',
      newGroupName: ''
    });
  };
  
  // Close group management modal
  closeGroupModal = () => {
    this.setState({
      showGroupModal: false,
      newGroupId: '',
      newGroupName: ''
    });
  };
  
  // Add a new Telegram group
  addTelegramGroup = () => {
    const { newGroupId, newGroupName } = this.state;
    
    if (!newGroupId.trim() || !newGroupName.trim()) return;
    
    this.setState(prevState => ({
      telegramGroups: [
        ...prevState.telegramGroups,
        { id: newGroupId.trim(), name: newGroupName.trim() }
      ],
      newGroupId: '',
      newGroupName: ''
    }));
  };
  
  // Remove a Telegram group
  removeTelegramGroup = (index) => {
    this.setState(prevState => ({
      telegramGroups: prevState.telegramGroups.filter((_, idx) => idx !== index)
    }));
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
    console.log("Survey162:", survey);
    // Helper function to ensure URLs are properly formatted
    const formatUrl = (url) => {
      if (!url) return '';
      // Make sure URL starts with http:// or https://
      return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    };
    
    // Helper function to escape HTML special characters
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    
    let messageText = `Hi everyone!\nPlease find the details for tomorrow's (${escapeHtml(survey.date)}) survey below:\n\n`;
    messageText += `<b>Survey Details</b>\n`;
    messageText += `Location: ${escapeHtml(survey.location)}\n`;
    
    let meetingPointUrl = survey.meetingPoint;
    if (!meetingPointUrl && survey.location && survey.location !== "TBC") {
      meetingPointUrl = this.getMeetingPointUrl(survey.location);
    }
    
    if (meetingPointUrl) {
      const formattedUrl = formatUrl(meetingPointUrl);
      // Using HTML <a> tag for hyperlink
      messageText += `Meeting Point: <a href="${formattedUrl}">${escapeHtml(survey.location || 'Click here')}</a>`;
      if (survey.meetingPointDesc) {
        messageText += ` (${escapeHtml(survey.meetingPointDesc)})`;
      }
      messageText += '\n';
    }
    
    messageText += `Time: ${escapeHtml(survey.time)}\n\n`;
    messageText += `<b>Participant List</b> - please vote if you're attending\n`;
    
    // Add participant list to message text
    if (survey.participants && survey.participants.length > 0) {
      survey.participants.forEach((participant, index) => {
        messageText += `${index + 1}. ${escapeHtml(participant)}\n`;
      });
    }
    else
    {
      messageText += `No one has confirmed yet. Be the first to confirm!`;
    }
    
    // Add the training materials link
    const trainingUrl = formatUrl("https://drive.google.com/drive/folders/1aztfMfCVlNGqro492FS-3gvdaRA6kCGk?usp=drive_link");
    messageText += `\n<a href="${trainingUrl}">Training Materials</a>`;
    
    // Return an object containing both the message text and the poll-like inline keyboard markup
    return {
      text: messageText,
    };
  };

  sendFormattedSurveyInfo = (surveyType) => {
    console.log("Survey 1121:", this.state.surveyData);
    let survey;
    
    if (surveyType.includes('volunteer-led')) {
      const index = parseInt(surveyType.split('-')[2]) - 1;
      console.log("Index Volunteer Led:", index);
      survey = this.state.surveyData.volunteerLed[index];
      //console.log("Survey1234:",  this.state.surveyData.volunteerLed[index]); 
    } else if (surveyType === 'custom') {
      survey = this.state.customSurvey;
    } else {
      survey = this.state.surveyData.wwfLed;
    }
    
    const message = this.formatStandardSurveyMessage(survey);
    
    // Add bot message to conversation showing what's being sent
    const botMessage = {
      id: this.state.conversation.length + 1,
      sender: 'bot',
      text: `Sending the following message to all configured Telegram groups:\n\n${message}`,
      timestamp: new Date()
    };
    
    this.setState({
      conversation: [...this.state.conversation, botMessage],
      isSending: true
    });
    
    // Send to all Telegram groups
    this.sendToTelegramGroups(message);
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
    
    // Send to all Telegram groups
    this.sendToTelegramGroups(userMessage);
  };
  
  handleMessageChange = (e) => {
    this.setState({ userMessage: e.target.value });
  };
  
  handleKeyPress = (e) => {
    if (e.key === 'Enter' && this.state.isConfigured) {
      this.sendCustomMessage();
    }
  };
  
  // Send message to multiple Telegram groups
  sendToTelegramGroups = (formattedMessage) => {
    const { telegramToken, telegramGroups } = this.state;
        const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        
        const sendPromises = telegramGroups.map(group => {
          return axios.post(telegramApiUrl, {
            chat_id: group.id,
            text: formattedMessage.text,
            parse_mode: "HTML"
          })
          .then(response => {
            console.log(`Message sent to group ${group.name} (${group.id})`);
            
            return { success: true, group, messageId: response.data.result.message_id };
          })
          .catch(error => {
            console.error(`Error sending message to group ${group.name} (${group.id}):`, error.response?.data || error.message);
            return { success: false, group, error: error.response?.data || error.message };
          });
        });
        
        return Promise.all(sendPromises);
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
      telegramGroups,
      newGroupId,
      newGroupName,
      showGroupModal,
      customSurvey,
      showMapModal,
      mapSearchTerm,
      surveyData,
      newParticipantName,
      showParticipantModal
    } = this.state;
    
    return (
      <div className="wwf-bot-container">
        <div className="message-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 20px',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white', // Adding background color to ensure content doesn't show through
              zIndex: 1000, // Ensures the header stays on top of other elements
            }}>
               <h1 style={{
              textAlign: 'center',
              margin: 0,
              flexGrow: 1
            }}>
              <h2>WWF-SG Survey Schedule Telegram Bot</h2>
            </h1>
            <Link to="/" style={{
              color: 'black',
              padding: '10px 15px',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FontAwesomeIcon icon={faHome} style={{ fontSize: '3rem' }} />
            </Link>
          </div>
        <div className="message-header">
          <button 
            className="group-settings-button"
            onClick={this.openGroupModal}
            title="Manage Telegram Groups"
          >
            👥 Manage Groups ({telegramGroups.length})
          </button>
          </div>
        
        {(
          <>
            <div className="survey-controls">
              <h3>Send Survey Information</h3>
              <div className="survey-buttons">
              
              {surveyData.wwfLed.map((survey, index) => {
                console.log("survey:", survey);
                return (
                  <div key={index} className="survey-button-group">
                    <button onClick={() => this.sendFormattedSurveyInfo(`wwf-led-${index+1}`)}>
                      Send {survey.location} Survey Info ({survey.date})
                    </button>
                    <button 
                      className="map-button" 
                      onClick={() => this.openMapModal('wwf-led')}
                      title="Set Google Maps Location"
                    >
                      {survey.meetingPoint ? '📍' : '➕📍'}
                    </button>
                    <button
                      className="participants-button"
                      onClick={() => this.openParticipantModal('wwf-led')}
                      title="Edit Participants List"
                    >
                      👥 Edit List
                    </button>
                  </div>
                );
              })}

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
            
            {/* Telegram Groups Management Modal */}
            {showGroupModal && (
              <div className="group-modal-overlay">
                <div className="group-modal">
                  <h3>Manage Telegram Groups</h3>
                  
                  <div className="group-list">
                    {telegramGroups.length > 0 ? (
                      telegramGroups.map((group, index) => (
                        <div key={index} className="group-item">
                          <span className="group-name">{group.name}</span>
                          <span className="group-id">ID: {group.id}</span>
                          {telegramGroups.length > 1 && (
                            <button
                              className="remove-group-button"
                              onClick={() => this.removeTelegramGroup(index)}
                              title="Remove Group"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="no-groups-message">No groups configured</div>
                    )}
                  </div>
                  
                  <div className="add-group-form">
                    <div className="group-form-row">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={this.handleNewGroupNameChange}
                        placeholder="Group Name (e.g. WWF SG Team)"
                        className="group-input"
                      />
                    </div>
                    <div className="group-form-row">
                      <input
                        type="text"
                        value={newGroupId}
                        onChange={this.handleNewGroupIdChange}
                        placeholder="Group Chat ID (e.g. -1001234567890)"
                        className="group-input"
                      />
                    </div>
                    
                    <button
                      className="add-group-button"
                      onClick={this.addTelegramGroup}
                      disabled={!newGroupId.trim() || !newGroupName.trim()}
                    >
                      Add Group
                    </button>
                  </div>
                  
                  <div className="group-modal-actions">
                    <button onClick={this.closeGroupModal} className="done-button">
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
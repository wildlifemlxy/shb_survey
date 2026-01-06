import React, { Component } from 'react';
import axios from 'axios';
import '../../css/components/Dashboard/NewSurveyModal.css';
import ObserverInfoSection from './ObserverInfoSection';
import ObservationDetailsSection from './ObservationDetailsSection';
import SubmissionSummarySection from './SubmissionSummarySection';
import simpleApiService from '../../utils/simpleApiService';

const SECTIONS = [
  {
    key: 'observer',
    legend: 'Observation Info',
    fields: [
      'Observer(s) name',
      'Location',
      'Date',
      'Number of Observation',
    ],
  },
  {
    key: 'observation',
    legend: 'Observation Details',
    fields: [
      'Lat',
      'Long',
      'Time',
    ],
  },
  {
    key: 'imageUpload',
    legend: 'Image Upload',
    fields: [],
    optional: true,
  },
  {
    key: 'height',
    legend: 'Submission Summary Details',
    fields: [
      'Height of tree/m',
      'Height of bird/m',
    ],
  },
];

class NewSurveyModal extends Component {
  state = {
    newSurvey: {
      'Observer name': [''],
      'SHB individual ID': '',
      'Number of Birds': 0,
      'Number of Observation': '', // <-- Add this line
      'Location': '',
      'Lat': '',
      'Long': '',
      'Date': '',
      'Time': '',
      'Height of tree/m': '',
      'Height of bird/m': '',
      'Activity (foraging, preening, calling, perching, others)': '',
      'Seen/Heard': '',
      'Activity Details': '',
    },
    currentSection: 0,
    errorMessages: {}, // changed from errorMessage: ''
    uploadedFiles: [],
    isDragOver: false,
    filePreviews: {}, // Map of file index to preview URL
    isUploadingToGoogleDrive: false,
    googleDriveUploadProgress: {}, // Map of file index to upload progress
    googleDriveFileIds: [], // Array of uploaded file IDs
    googleDriveUploadError: null,
  };

  // Utility to get observer names as a comma-separated string
  getObserverNamesString = () => {
    const names = (this.state.newSurvey['Observer name'] || []).filter(n => n && n.trim());
    return names.join(', ');
  };

  validateObserverSection = () => {
    const { newSurvey } = this.state;
    const errors = {};
    if (!(newSurvey['Observer name'] && newSurvey['Observer name'].some(name => name.trim()))) {
      errors['Observer name'] = 'At least one observer name is required.';
    }
    if (!newSurvey['Location'].trim()) {
      errors['Location'] = 'Location is required.';
    }
    if (!newSurvey['Date'].trim()) {
      errors['Date'] = 'Date is required.';
    }
    if (!newSurvey['Number of Observation'].trim() || isNaN(Number(newSurvey['Number of Observation']))) {
      errors['Number of Observation'] = 'Number of Observation is required and must be a number.';
    }
    return errors;
  };

  validateObservationSection = () => {
    const { newSurvey } = this.state;
    const errors = {};
    const requiredFields = [
      'Number of Birds',
      'SHB individual ID',
      'Lat',
      'Long',
      'Time',
      'Activity',
      'SeenHeard',
    ];
    
    // Get observation details, ensuring we have an array
    const details = Array.isArray(newSurvey['Observation Details']) ? newSurvey['Observation Details'] : [];
    
    // If no observation details exist, create an error for the first row
    if (details.length === 0) {
      errors[0] = {};
      requiredFields.forEach(field => {
        errors[0][field] = `${field} is required`;
      });
      return errors;
    }
    
    // Validate each observation row
    details.forEach((row, idx) => {
      requiredFields.forEach(field => {
        // Check if field is missing, empty, or just whitespace
        const fieldValue = row[field];
        if (!fieldValue || 
            (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
            (typeof fieldValue === 'number' && isNaN(fieldValue))) {
          if (!errors[idx]) errors[idx] = {};
          errors[idx][field] = `${field} is required for observation ${idx + 1}`;
        }
      });
    });
    
    return errors;
  };

  handleObserverNameChange = (idx, value) => {
    this.setState((prevState) => {
      const names = [...prevState.newSurvey['Observer name']];
      names[idx] = value;
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Observer name': names,
        },
      };
    });
  };

  handleAddObserverName = () => {
    this.setState((prevState) => ({
      newSurvey: {
        ...prevState.newSurvey,
        'Observer name': [...prevState.newSurvey['Observer name'], ''],
      },
    }));
  };

  handleRemoveObserverName = (idx) => {
    this.setState((prevState) => {
      const names = prevState.newSurvey['Observer name'].filter((_, i) => i !== idx);
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Observer name': names.length ? names : [''],
        },
      };
    });
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'Observer(s) name') return; // handled separately
    this.setState((prevState) => ({
      newSurvey: {
        ...prevState.newSurvey,
        [name]: value,
      },
    }));
  };

  handleNumberOfObservationChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    const num = Math.max(1, parseInt(value || '1', 10));
    this.setState((prevState) => {
      let details = prevState.newSurvey['Observation Details'] || [];
      if (num > details.length) {
        details = details.concat(Array(num - details.length).fill({ Location: '', Lat: '', Long: '', Date: '', Time: '' }));
      } else if (num < details.length) {
        details = details.slice(0, num);
      }
      return {
        newSurvey: {
          ...prevState.newSurvey,
          'Number of Observation': value,
          'Observation Details': details,
        },
      };
    });
  };

   handleObservationDetailChange = (idx, field, value) => {
    // Always treat newSurvey as an object, and Observation Details as an array
    let details = Array.isArray(this.state.newSurvey['Observation Details'])
      ? [...this.state.newSurvey['Observation Details']]
      : [];
  
    // If details is empty but Number of Observation is set, initialize array
    if (
      details.length === 0 &&
      this.state.newSurvey['Number of Observation'] &&
      !isNaN(Number(this.state.newSurvey['Number of Observation']))
    ) {
      const numRows = Math.max(1, parseInt(this.state.newSurvey['Number of Observation'], 10));
      details = Array.from({ length: numRows }, () => ({}));
    }
  
    // Support replaceAll for Observation Details (for Add Row)
    if (idx === 'replaceAll' && field === 'Observation Details') {
      details = value;
    } else {
      // Ensure the array is long enough
      if (typeof idx === 'number' && idx >= details.length) {
        details = [
          ...details,
          ...Array.from({ length: idx - details.length + 1 }, () => ({})),
        ];
      }
      details[idx] = { ...details[idx], [field]: value };
    }
  
    // Bidirectional auto-update system
    if (field === 'SHB individual ID') {
      // Auto-calculate Number of Birds when Bird ID field is updated
      details = details.map((row, rowIdx) => {
        if (rowIdx === idx) {
          const birdIdValue = value || '';
          // Count the number of bird IDs (separated by commas)
          let numberOfBirds = 0;
          if (birdIdValue.trim()) {
            // Split by comma and count non-empty entries
            const birdIds = birdIdValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
            numberOfBirds = birdIds.length;
          }
          return { ...row, 'Number of Birds': numberOfBirds };
        }
        return row;
      });
    } else if (field === 'Number of Birds') {
      // Auto-generate Bird IDs when Number of Birds field is updated
      // Also update all subsequent rows to maintain sequential numbering
      
      // First, update the specific row with the new value
      if (idx >= 0 && idx < details.length) {
        details[idx] = { ...details[idx], [field]: value };
      }
      
      // Then recalculate Bird IDs for ALL rows to ensure proper sequence
      let runningTotal = 1; // Start from SHB1
      
      details = details.map((row, rowIdx) => {
        const currentBirdId = row['SHB individual ID'] || '';
        const isAutoGenerated = currentBirdId.match(/^SHB\d+(,\s*SHB\d+)*$/);
        
        // Only auto-generate if the field is empty or appears to be auto-generated
        if (!currentBirdId || isAutoGenerated) {
          const num = parseInt(row['Number of Birds'], 10);
          let shbId = '';
          if (num && num > 0) {
            // Generate sequential IDs from the running total
            shbId = Array.from({ length: num }, (_, i) => `SHB${runningTotal + i}`).join(', ');
            runningTotal += num; // Update running total for next row
          }
          return { ...row, 'SHB individual ID': shbId };
        } else {
          // For manual IDs, still need to account for them in the running total
          // Count the number of IDs to maintain sequence for subsequent rows
          const manualIdCount = currentBirdId.split(',').map(id => id.trim()).filter(id => id.length > 0).length;
          runningTotal += manualIdCount;
        }
        return row;
      });
    } else {
      // For other field changes, auto-generate Bird IDs only if the current Bird ID is empty or auto-generated
      let runningTotal = 1; // Start from SHB1
      
      details = details.map((row, rowIdx) => {
        const currentBirdId = row['SHB individual ID'] || '';
        const isAutoGenerated = currentBirdId.match(/^SHB\d+(,\s*SHB\d+)*$/);
        
        // Only auto-generate if the field is empty or appears to be auto-generated
        if (!currentBirdId || isAutoGenerated) {
          const num = parseInt(row['Number of Birds'], 10);
          let shbId = '';
          if (num && num > 0) {
            // Generate sequential IDs from the running total
            shbId = Array.from({ length: num }, (_, i) => `SHB${runningTotal + i}`).join(', ');
            runningTotal += num; // Update running total for next row
          }
          return { ...row, 'SHB individual ID': shbId };
        } else {
          // For manual IDs, still need to account for them in the running total
          // Count the number of IDs to maintain sequence for subsequent rows
          const manualIdCount = currentBirdId.split(',').map(id => id.trim()).filter(id => id.length > 0).length;
          runningTotal += manualIdCount;
        }
        return row;
      });
    }
  
    // Always sync 'Number of Observation' to the number of rows
    this.setState(prevState => ({
      newSurvey: {
        ...prevState.newSurvey,
        'Observation Details': details,
        'Number of Observation': details.length ? String(details.length) : '1',
      },
    }));
  };

  handleNext = () => {
    // Clear any existing error messages first
    this.setState({ errorMessages: {} });
    
    if (this.state.currentSection === 0) {
      const errors = this.validateObserverSection();
      if (Object.keys(errors).length > 0) {
        this.setState({ errorMessages: errors });
        // Scroll to top to show error messages
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
          modalContent.scrollTop = 0;
        }
        return; // Prevent navigation
      }
    }
    
    if (this.state.currentSection === 1) {
      const errors = this.validateObservationSection();
      if (Object.keys(errors).length > 0) {
        this.setState({ errorMessages: errors });
        console.log('Validation failed for observation section:', errors);
        // Scroll to show error messages
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
          modalContent.scrollTop = modalContent.scrollHeight;
        }
        return; // Prevent navigation
      }
    }
    
    // If we get here, validation passed - proceed to next section
    this.setState(prevState => ({
      currentSection: Math.min(prevState.currentSection + 1, SECTIONS.length - 1),
      errorMessages: {},
    }));
  };

  handleBack = () => {
    this.setState((prevState) => ({
      currentSection: Math.max(prevState.currentSection - 1, 0),
    }));
  };


  formatSubmissionSummaryAsJson = () => {
    const { newSurvey } = this.state;
    const isObservationArray = Array.isArray(newSurvey['Observation Details']);
    if (!isObservationArray) return '[]';
    
    // Recalculate sequential Bird IDs before submission
    const observationDetails = [...newSurvey['Observation Details']];
    const detailsWithCalculatedIds = observationDetails.map((obs, idx) => {
      const num = parseInt(obs['Number of Birds'], 10);
      let shbId = '';
      if (num && num > 0) {
        let startNum = 1;
        // Calculate the starting ID number based on birds in previous rows
        for (let i = 0; i < idx; i++) {
          const prevNum = parseInt(observationDetails[i]?.['Number of Birds'] || '', 10);
          if (prevNum && prevNum > 0) startNum += prevNum;
        }
        shbId = Array.from({ length: num }, (_, i) => `SHB${startNum + i}`).join(', ');
      }
      return { ...obs, 'SHB individual ID': shbId };
    });
    
    const summary = detailsWithCalculatedIds.map((obs, idx) => ({
      'Observer name': Array.isArray(newSurvey['Observer name'])
        ? newSurvey['Observer name'].join(', ')
        : (newSurvey['Observer name']),
      'SHB individual ID': obs['SHB individual ID'],
      'Number of Birds': obs['Number of Birds'] ,
      'Location': newSurvey['Location'],
      'Height of bird/m': obs['HeightOfBird'],
      'Lat': obs['Lat'],
      'Long': obs['Long'],
      'Date': newSurvey['Date'],
      'Time': obs['Time'],
      'Height of tree/m': obs['HeightOfTree'],
      'Activity (foraging, preening, calling, perching, others)': obs['Activity'],
      'Seen/Heard': obs['SeenHeard'],
      'Activity Details': obs['ActivityDetails']
    }));
    return JSON.stringify(summary, null, 2);
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const summary = JSON.parse(this.formatSubmissionSummaryAsJson());
    console.log('Submitting survey data:', summary);
    
    try {
      // Upload files to Google Drive if any exist
      let googleDriveFileIds = [];
      if (this.state.uploadedFiles.length > 0) {
        try {
          console.log(`Starting Google Drive upload for ${this.state.uploadedFiles.length} file(s)`);
          googleDriveFileIds = await this.uploadFilesToGoogleDrive();
          console.log('Files uploaded to Google Drive:', googleDriveFileIds);
        } catch (error) {
          console.error('Error uploading to Google Drive:', error);
          
          // Ask user if they want to continue without uploading files
          const shouldContinue = window.confirm(
            `Error uploading files to Google Drive:\n\n${error.message}\n\nDo you want to continue and submit the survey without files?\n\nClick OK to continue or Cancel to go back.`
          );
          
          if (!shouldContinue) {
            return; // User chose to go back
          }
          
          // User chose to continue without files
          googleDriveFileIds = [];
        }
      }

      // Submit all observations simultaneously
      const submissions = [];
      
      const submitPromises = summary.map(async (surveyEntry) => {
        // Add Google Drive file IDs/links to the survey entry (empty if upload was skipped)
        const entryWithFiles = {
          ...surveyEntry,
          'Google Drive Files': googleDriveFileIds.map(f => ({
            id: f.id,
            name: f.name,
            webLink: f.webLink
          }))
        };
        
        const result = await simpleApiService.submitSurvey(entryWithFiles);
        submissions.push(result);
        return result;
      });

      // Wait for all submissions to complete simultaneously
      await Promise.all(submitPromises);
      
      console.log('Survey submission successful:', submissions);
      
      // Show success message
      const fileCount = googleDriveFileIds.length > 0 ? googleDriveFileIds.length : 0;
      alert(`Successfully submitted ${summary.length} survey observation(s)${fileCount > 0 ? ` with ${fileCount} file(s)` : ''}!`);
      
      // Close the modal and reset form
      this.handleCancel();
      
      // Trigger the upload success modal callback if files were uploaded
      if (this.props.onUploadSuccess && fileCount > 0) {
        this.props.onUploadSuccess(fileCount);
      }
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert(`Error submitting survey: ${error.message}\n\nPlease try again.`);
    }
  };

  handleCancel = () => {
    this.setState({
      newSurvey: {
        'Observer name': [''],
        'SHB individual ID': '',
        'Number of Birds': 0,
        'Number of Observation': '', // <-- Reset this line
        'Location': '',
        'Lat': '',
        'Long': '',
        'Date': '',
        'Time': '',
        'Height of tree/m': '',
        'Height of bird/m': '',
        'Activity (foraging, preening, calling, perching, others)': '',
        'Seen/Heard': '',
        'Activity Details': '',
      },
      currentSection: 0,
      errorMessages: {},
      uploadedFiles: [],
      isUploadingToGoogleDrive: false,
      googleDriveUploadProgress: {},
      googleDriveFileIds: [],
      googleDriveUploadError: null,
    });
    if (this.props.onClose) this.props.onClose();
  };

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: true });
  };

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      this.setState(prevState => ({
        uploadedFiles: [...prevState.uploadedFiles, ...files]
      }), () => {
        this.generatePreviews();
      });
    }
  };

  handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      this.setState(prevState => ({
        uploadedFiles: [...prevState.uploadedFiles, ...files]
      }), () => {
        this.generatePreviews();
      });
    }
  };

  generatePreviews = () => {
    const { uploadedFiles } = this.state;
    const newPreviews = { ...this.state.filePreviews };

    uploadedFiles.forEach((file, index) => {
      if (!newPreviews[index]) {
        if (file.type.startsWith('video/')) {
          // For videos, extract thumbnail from middle frame
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            // Seek to middle of video
            const middleTime = video.duration / 2;
            video.currentTime = middleTime;
          };
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            this.setState(prevState => ({
              filePreviews: {
                ...prevState.filePreviews,
                [index]: canvas.toDataURL('image/jpeg')
              }
            }));
          };
          
          video.onerror = () => {
            // Fallback if video thumbnail extraction fails
            const reader = new FileReader();
            reader.onload = (event) => {
              this.setState(prevState => ({
                filePreviews: {
                  ...prevState.filePreviews,
                  [index]: event.target.result
                }
              }));
            };
            reader.readAsDataURL(file);
          };
          
          video.src = URL.createObjectURL(file);
        } else {
          // For images, use regular preview
          const reader = new FileReader();
          reader.onload = (event) => {
            this.setState(prevState => ({
              filePreviews: {
                ...prevState.filePreviews,
                [index]: event.target.result
              }
            }));
          };
          reader.readAsDataURL(file);
        }
      }
    });
  };

  handleRemoveFile = (index) => {
    this.setState(prevState => ({
      uploadedFiles: prevState.uploadedFiles.filter((_, i) => i !== index)
    }));
  };

  // Skip Google Drive upload and continue with submission
  handleSkipGoogleDriveUpload = () => {
    this.setState({
      googleDriveUploadError: null,
      uploadedFiles: [],
      filePreviews: {},
      isUploadingToGoogleDrive: false
    });
  };

  // Upload files to Google Drive
  uploadFilesToGoogleDrive = async () => {
    const { uploadedFiles } = this.state;
    
    if (uploadedFiles.length === 0) {
      return []; // No files to upload
    }

    this.setState({
      isUploadingToGoogleDrive: true,
      googleDriveUploadError: null,
      googleDriveUploadProgress: {},
    });

    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://shb-backend.azurewebsites.net';

    const uploadProgress = {};

    try {
      // Initialize progress for all files
      uploadedFiles.forEach((_, i) => {
        uploadProgress[i] = 0;
      });
      this.setState({ googleDriveUploadProgress: uploadProgress });

      // Create all upload promises simultaneously
      const uploadPromises = uploadedFiles.map((file, i) => {
        return new Promise(async (resolve, reject) => {
          try {
            console.log(`Starting upload for file ${i}:`, file.name, file.type, file.size);
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('purpose', 'upload');

            // Upload with axios and track progress
            const response = await axios.post(`${baseUrl}/gallery`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                if (progressEvent.lengthComputable) {
                  uploadProgress[i] = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                  this.setState({ googleDriveUploadProgress: { ...uploadProgress } });
                }
              }
            });

            console.log(`File ${i} upload response:`, response.data);

            if (response.data.success && response.data.file && response.data.file.id) {
              console.log(`File ${i} uploaded successfully with ID: ${response.data.file.id}`);
              resolve({
                id: response.data.file.id,
                name: response.data.file.name,
                webLink: response.data.file.webLink,
                index: i
              });
            } else {
              const errorMsg = response.data.error || response.data.message || 'Unknown upload error';
              console.error(`Upload success but no file ID for ${i}:`, response.data);
              reject(new Error(errorMsg));
            }
          } catch (error) {
            console.error(`Error uploading file ${i}:`, error);
            
            const errorMessage = error.response?.data?.error || 
                                 error.response?.data?.message || 
                                 error.message || 
                                 'Unknown error occurred';
            
            this.setState({
              googleDriveUploadError: `Failed to upload ${file.name}: ${errorMessage}`
            });
            reject(error);
          }
        });
      });

      // Wait for all uploads to complete simultaneously
      const uploadedFileIds = await Promise.all(uploadPromises);

      console.log(`All files uploaded successfully. Total: ${uploadedFileIds.length}`);
      this.setState({
        isUploadingToGoogleDrive: false,
        googleDriveFileIds: uploadedFileIds,
      });

      return uploadedFileIds;
    } catch (error) {
      console.error('Google Drive upload failed:', error);
      this.setState({
        isUploadingToGoogleDrive: false,
        googleDriveUploadError: error.message,
      });
      throw error;
    }
  };

  // Add swipe gesture support
  touchStartX = null;
  touchEndX = null;

  handleTouchStart = (e) => {
    this.touchStartX = e.touches[0].clientX;
  };

  handleTouchMove = (e) => {
    this.touchEndX = e.touches[0].clientX;
  };

  handleTouchEnd = () => {
    if (this.touchStartX !== null && this.touchEndX !== null) {
      const diff = this.touchEndX - this.touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && !this.state.currentSection === 0) {
          this.handleBack(); // Swipe right to go back
        } else if (diff < 0 && this.state.currentSection < SECTIONS.length - 1) {
          this.handleNext(); // Swipe left to go next
        }
      }
    }
    this.touchStartX = null;
    this.touchEndX = null;
  };

  render() {
    const { show, onClose } = this.props;
    const { newSurvey, currentSection, errorMessages } = this.state;
    if (!show) return null;
    const section = SECTIONS[currentSection];
    const isLast = currentSection === SECTIONS.length - 1;
    const isFirst = currentSection === 0;
    const totalSections = SECTIONS.length;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          {/* HEADER: Title and Close Button Only */}
          <div className="modal-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ margin: 0, marginLeft: 0 }}>New Survey Entry</h3>
              <button
                type="button"
                onClick={this.handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  marginRight: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f0f0';
                  e.target.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#666';
                }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>

          {/* BODY: Navigation/Progress and Form Content */}
          <div className="modal-body">
            {/* Sub-section 1: Navigation Controls and Progress */}
            <div className="modal-body-controls">
              {/* Section Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                {SECTIONS.map((s, idx) => (
                  <button
                    key={s.key}
                    type="button"
                    style={{
                      background: idx === currentSection ? '#007bff' : '#f8f9fa',
                      color: idx === currentSection ? '#fff' : '#333',
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      padding: '6px 14px',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s.legend}
                  </button>
                ))}
              </div>
              
              {/* Progress Bar */}
              <div className="modal-progress-container" style={{ margin: '0 auto 10px auto' }}>
                <div className="modal-progress-bar">
                  <div 
                    className="modal-progress-fill"
                    style={{
                      width: `${((currentSection + 1) / totalSections) * 100}%`
                    }}
                  />
                </div>
              </div>
              
              {/* Page Number */}
              <div className="modal-page-number" style={{ textAlign: 'center', marginBottom: 0 }}>
                Page {currentSection + 1} of {totalSections}
              </div>
            </div>

            {/* Sub-section 2: Form Content */}
            <div className="modal-body-form">
              <form onSubmit={this.handleSubmit}
                onTouchStart={this.handleTouchStart}
                onTouchMove={this.handleTouchMove}
                onTouchEnd={this.handleTouchEnd}
              >
                {/* Mid-form navigation */}
                <div className="modal-mid-nav">
                  {!isFirst ? (
                    <button
                      type="button"
                      onClick={this.handleBack}
                      className="modal-mid-nav-btn modal-mid-nav-left"
                    >
                      ←
                    </button>
                  ) : (
                    <div className="modal-mid-nav-spacer"></div>
                  )}
                  
                  {!isLast ? (
                    <button
                      type="button"
                      onClick={this.handleNext}
                      className="modal-mid-nav-btn modal-mid-nav-right"
                    >
                      →
                    </button>
                  ) : (
                    <div className="modal-mid-nav-spacer"></div>
                  )}
                </div>

                <div className="form-section">
                  <h3 className="section-title">{section.legend}</h3>
                  {section.key === 'observer' && (
                    <ObserverInfoSection
                      newSurvey={newSurvey}
                      onObserverNameChange={this.handleObserverNameChange}
                      onAddObserverName={this.handleAddObserverName}
                      onRemoveObserverName={this.handleRemoveObserverName}
                      onInputChange={this.handleInputChange}
                      onNumberOfObservationChange={this.handleNumberOfObservationChange}
                      fieldErrors={errorMessages}
                    />
                  )}
                  {section.key === 'observation' && (
                    <ObservationDetailsSection
                      newSurvey={newSurvey}
                      onObservationDetailChange={this.handleObservationDetailChange}
                      onDeleteObservationRow={(idx) => {
                        const details = newSurvey['Observation Details'].filter((_, i) => i !== idx);
                        this.setState(prevState => ({
                          newSurvey: {
                            ...prevState.newSurvey,
                            'Observation Details': details.length ? details : [{}],
                            'Number of Observation': details.length ? String(details.length) : '1',
                          },
                        }));
                      }}
                      fieldErrors={errorMessages}
                    />
                  )}
                  {section.key === 'imageUpload' && (
                    <div style={{ padding: '20px 0' }}>
                      <p style={{ color: '#666', marginBottom: '16px', fontSize: '0.95rem' }}>
                        (Optional) Drag and drop images or videos, or click to select files
                      </p>
                      
                      {/* Drag and drop area */}
                      <div
                        onDragOver={this.handleDragOver}
                        onDragLeave={this.handleDragLeave}
                        onDrop={this.handleDrop}
                        style={{
                          border: '2px dashed',
                          borderColor: this.state.isDragOver ? '#4f46e5' : '#d1d5db',
                          borderRadius: '8px',
                          padding: '32px',
                          textAlign: 'center',
                          background: this.state.isDragOver ? 'rgba(79, 70, 229, 0.05)' : '#fafafa',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          marginBottom: '16px'
                        }}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={this.handleFileSelect}
                          style={{ display: 'none' }}
                          id="file-input"
                        />
                        <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            Drag images or videos here
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            or click to browse
                          </div>
                        </label>
                      </div>

                      {/* Uploaded files list */}
                      {this.state.uploadedFiles.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#333' }}>
                            Selected Files ({this.state.uploadedFiles.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {this.state.uploadedFiles.map((file, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px',
                                  background: '#f3f4f6',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                {/* Thumbnail */}
                                <div
                                  style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '4px',
                                    background: '#e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                  }}
                                >
                                  {this.state.filePreviews[index] ? (
                                    <img
                                      src={this.state.filePreviews[index]}
                                      alt={file.name}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain'
                                      }}
                                    />
                                  ) : (
                                    <div style={{ fontSize: '24px' }}>
                                      {file.type.startsWith('video/') ? '🎬' : '🖼️'}
                                    </div>
                                  )}
                                </div>

                                {/* File info with upload progress */}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '500', marginBottom: '4px', wordBreak: 'break-word' }}>
                                    {file.name}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.startsWith('video/') ? 'Video' : 'Image'}
                                  </div>
                                  {/* Upload progress bar */}
                                  {this.state.isUploadingToGoogleDrive && this.state.googleDriveUploadProgress[index] !== undefined && (
                                    <div style={{ marginTop: '6px' }}>
                                      <div style={{ fontSize: '0.75rem', color: '#4f46e5', marginBottom: '2px' }}>
                                        Uploading to Google Drive: {this.state.googleDriveUploadProgress[index]}%
                                      </div>
                                      <div style={{
                                        width: '100%',
                                        height: '4px',
                                        background: '#e5e7eb',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${this.state.googleDriveUploadProgress[index]}%`,
                                          height: '100%',
                                          background: '#4f46e5',
                                          transition: 'width 0.3s ease'
                                        }} />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Remove button - disabled during upload */}
                                <button
                                  type="button"
                                  onClick={() => this.handleRemoveFile(index)}
                                  disabled={this.state.isUploadingToGoogleDrive}
                                  style={{
                                    background: 'transparent',
                                    color: '#ef4444',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    cursor: this.state.isUploadingToGoogleDrive ? 'not-allowed' : 'pointer',
                                    fontSize: '1.2rem',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    opacity: this.state.isUploadingToGoogleDrive ? 0.5 : 1
                                  }}
                                  title="Remove file"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload error message */}
                      {this.state.googleDriveUploadError && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          color: '#dc2626',
                          fontSize: '0.9rem'
                        }}>
                          <div style={{ marginBottom: '8px' }}>
                            ⚠️ {this.state.googleDriveUploadError}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => this.setState({ googleDriveUploadError: null })}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              Try Again
                            </button>
                            <button
                              type="button"
                              onClick={this.handleSkipGoogleDriveUpload}
                              style={{
                                background: '#fbbf24',
                                color: '#92400e',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500'
                              }}
                            >
                              Skip Upload
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {section.key === 'height' && (
                    <SubmissionSummarySection 
                      newSurvey={newSurvey} 
                      uploadedFiles={this.state.uploadedFiles}
                      filePreviews={this.state.filePreviews}
                    />
                  )}
                </div>


              </form>
            </div>
          </div>

          {/* FOOTER: Navigation and Actions */}
          <div className="modal-footer">
            {/* Navigation arrows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {!isFirst ? (
                <button
                  type="button"
                  onClick={this.handleBack}
                  className="modal-nav-arrow"
                >
                  ← Back
                </button>
              ) : (
                <div></div>
              )}

              {!isLast ? (
                <button
                  type="button"
                  onClick={this.handleNext}
                  className="modal-nav-arrow"
                  title={Object.keys(errorMessages).length > 0 ? 'Please fix validation errors before proceeding' : 'Go to next section'}
                >
                  Next →
                </button>
              ) : (
                 <button type="submit" onClick={this.handleSubmit}>Submit</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default NewSurveyModal;

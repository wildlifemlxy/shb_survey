// Complete example: React component with seamless live data sync
// Add this to your frontend: src/components/LiveDataExample.jsx

import React, { useState, useEffect } from 'react';
import { useLiveData, useConnectionStatus, useManualUpdate } from '../hooks/useLiveData';

const LiveDataExample = () => {
    const [surveyData, setSurveyData] = useState([]);
    const [accountData, setAccountData] = useState([]);
    
    // Use live data hooks for real-time sync
    const {
        data: liveSurveyData,
        isConnected: surveyConnected,
        lastUpdate: surveyUpdate,
        refresh: refreshSurvey
    } = useLiveData('Survey', surveyData);
    
    const {
        data: liveAccountData,
        isConnected: accountConnected,
        lastUpdate: accountUpdate
    } = useLiveData('Accounts', accountData);
    
    // Connection status
    const connectionStatus = useConnectionStatus();
    
    // Manual update trigger (for testing)
    const { triggerUpdate, isTriggering } = useManualUpdate();

    useEffect(() => {
        // Update local state when live data changes
        if (liveSurveyData) {
            setSurveyData(liveSurveyData);
        }
    }, [liveSurveyData]);

    useEffect(() => {
        // Update local state when live account data changes
        if (liveAccountData) {
            setAccountData(liveAccountData);
        }
    }, [liveAccountData]);

    // Handle manual test updates
    const handleTestUpdate = async (collection) => {
        const testData = {
            testId: Date.now(),
            message: `Test update at ${new Date().toLocaleTimeString()}`,
            collection: collection
        };
        
        await triggerUpdate(collection, 'insert', testData);
    };

    return (
        <div className="live-data-example">
            <h2>🔴 Live Data Sync Example</h2>
            
            {/* Connection Status */}
            <div className="connection-status">
                <h3>Connection Status</h3>
                <div className={\`status \${connectionStatus.connected ? 'connected' : 'disconnected'}\`}>
                    {connectionStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
                <div>
                    Subscribed Collections: {connectionStatus.subscribedCollections.join(', ')}
                </div>
                {connectionStatus.reconnectAttempts > 0 && (
                    <div>Reconnect Attempts: {connectionStatus.reconnectAttempts}</div>
                )}
            </div>

            {/* Survey Data Section */}
            <div className="data-section">
                <h3>📊 Survey Data (Live Sync)</h3>
                <div className="data-info">
                    Connected: {surveyConnected ? '✅' : '❌'}
                    {surveyUpdate && (
                        <div>
                            Last Update: {surveyUpdate.operation} at {new Date(surveyUpdate.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
                
                <button onClick={refreshSurvey}>🔄 Refresh Survey Data</button>
                <button 
                    onClick={() => handleTestUpdate('Survey')}
                    disabled={isTriggering}
                >
                    {isTriggering ? '⏳ Triggering...' : '🧪 Test Survey Update'}
                </button>
                
                <div className="data-display">
                    <p>Survey items: {Array.isArray(surveyData) ? surveyData.length : 'N/A'}</p>
                    {/* Display your survey data here */}
                </div>
            </div>

            {/* Account Data Section */}
            <div className="data-section">
                <h3>👥 Account Data (Live Sync)</h3>
                <div className="data-info">
                    Connected: {accountConnected ? '✅' : '❌'}
                    {accountUpdate && (
                        <div>
                            Last Update: {accountUpdate.operation} at {new Date(accountUpdate.timestamp).toLocaleTimeString()}
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => handleTestUpdate('Accounts')}
                    disabled={isTriggering}
                >
                    {isTriggering ? '⏳ Triggering...' : '🧪 Test Account Update'}
                </button>
                
                <div className="data-display">
                    <p>Account items: {Array.isArray(accountData) ? accountData.length : 'N/A'}</p>
                    {/* Display your account data here */}
                </div>
            </div>

            {/* Live Update Log */}
            <div className="update-log">
                <h3>📝 Live Update Log</h3>
                <div className="log-entries">
                    {surveyUpdate && (
                        <div className="log-entry">
                            Survey: {surveyUpdate.operation} - {new Date(surveyUpdate.timestamp).toLocaleString()}
                        </div>
                    )}
                    {accountUpdate && (
                        <div className="log-entry">
                            Account: {accountUpdate.operation} - {new Date(accountUpdate.timestamp).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Styling */}
            <style jsx>{\`
                .live-data-example {
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .connection-status {
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                
                .status.connected {
                    color: #28a745;
                    font-weight: bold;
                }
                
                .status.disconnected {
                    color: #dc3545;
                    font-weight: bold;
                }
                
                .data-section {
                    border: 1px solid #ddd;
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 8px;
                }
                
                .data-info {
                    background: #e9ecef;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
                
                button {
                    margin: 5px;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    background: #007bff;
                    color: white;
                    cursor: pointer;
                }
                
                button:disabled {
                    background: #6c757d;
                    cursor: not-allowed;
                }
                
                button:hover:not(:disabled) {
                    background: #0056b3;
                }
                
                .update-log {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 20px;
                }
                
                .log-entry {
                    padding: 5px;
                    border-bottom: 1px solid #dee2e6;
                    font-family: monospace;
                    font-size: 0.9em;
                }
            \`}</style>
        </div>
    );
};

export default LiveDataExample;

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig.js';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Click the button below to start Google Drive authorization');
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);

  const GOOGLE_CLIENT_ID = '389626720765-84tdf20hilcfeg3us8pvh3m5085d12jc.apps.googleusercontent.com';
  const GOOGLE_REDIRECT_URI = `${BASE_URL}/images`;

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const scope = searchParams.get('scope');

      console.log('=== OAuth Callback Received (Frontend) ===');
      console.log('Query Parameters:', { code, errorParam, scope });

      // If there's no code and no error, we're on the initial page load
      if (!code && !errorParam) {
        console.log('No code or error - initial page load');
        return;
      }

      if (errorParam) {
        console.error('OAuth Error:', errorParam);
        setError(`OAuth Error: ${errorParam}`);
        setStatus('Error');
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setError('No authorization code received');
        setStatus('Error');
        return;
      }

      try {
        console.log('Authorization code:', code.substring(0, 20) + '...');
        setStatus('Exchanging code for access token via backend...');

        // Use axios POST to send code to backend
        console.log('Sending POST request to /images with code...');
        const response = await axios.post(`${BASE_URL}/images`, {
          purpose: 'auth-callback',
          code
        });

        const data = response.data;
        console.log('=== Token Exchange Response ===');
        console.log(JSON.stringify(data, null, 2));

        if (response.status !== 200) {
          throw new Error(`${data.error || 'Failed to exchange code'}: ${data.message || ''}`);
        }

        const accessToken = data.tokens?.access_token || data.accessToken;
        console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'N/A');
        console.log('Refresh Token:', data.tokens?.refresh_token ? data.tokens.refresh_token.substring(0, 20) + '...' : 'N/A');
        console.log('Expiry Date:', data.tokens?.expiry_date);

        setAccessToken(accessToken);
        setStatus('✓ Google Drive Authorized! Token received - you can now upload images');
        
        console.log('✓ OAuth authentication successful');
        setError(null);
      } catch (err) {
        console.error('=== OAuth Error ===');
        console.error('Error Type:', err.response?.status);
        console.error('Error Message:', err.response?.data?.error || err.message);
        console.error('Error Details:', err.response?.data?.message);
        console.error('Full Error:', err);

        setError(err.response?.data?.error || err.message);
        setStatus('Error');
      }
    };

    handleCallback();
  }, [searchParams]);

  // Generate authorization URL and open Google OAuth
  const handleStartOAuth = () => {
    try {
      const scope = 'https://www.googleapis.com/auth/drive.file';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=consent`;

      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to start OAuth authorization: ' + err.message);
      setStatus('Error');
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>Google Drive Authorization</h1>
      <p style={{ fontSize: '18px', marginTop: '20px' }}>{status}</p>

      {!accessToken && !error && !searchParams.get('code') && (
        <button
          onClick={handleStartOAuth}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Authorize with Google Drive
        </button>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '15px',
          borderRadius: '4px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <strong>Error:</strong> {error}
          <button
            onClick={handleStartOAuth}
            style={{
              display: 'block',
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {accessToken && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '20px',
          borderRadius: '4px',
          marginTop: '20px',
          textAlign: 'left'
        }}>
          <strong>✓ Google Drive Authorization Successful!</strong>
          <p style={{ marginTop: '15px' }}>You can now upload images to Google Drive. Go back to the Dashboard and try uploading an image.</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default OAuthCallback;

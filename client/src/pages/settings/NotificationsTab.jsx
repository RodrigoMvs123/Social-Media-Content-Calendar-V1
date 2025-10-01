import { useState, useEffect } from 'react';

const NotificationsTab = () => {
  const [slackScheduled, setSlackScheduled] = useState(false);
  const [slackPublished, setSlackPublished] = useState(false);
  const [slackFailed, setSlackFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  console.log('🔧 NotificationsTab component rendered!');

  // Load current preferences
  useEffect(() => {
    const loadPrefs = async () => {
      setIsLoadingSettings(true);
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log('🔧 No auth token found');
          setIsLoadingSettings(false);
          return;
        }
        
        const response = await fetch('/api/slack/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const settings = await response.json();
          console.log('🔧 Loaded settings:', settings);
          
          // Set values based on server response, defaulting to false if not configured
          setSlackScheduled(settings.configured ? (settings.slackScheduled ?? false) : false);
          setSlackPublished(settings.configured ? (settings.slackPublished ?? false) : false);
          setSlackFailed(settings.configured ? (settings.slackFailed ?? false) : false);
        } else {
          console.log('🔧 Failed to load settings:', response.status);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    loadPrefs();
  }, []);

  const handleSave = async () => {
    console.log('🔧 SAVE CLICKED! Current state:', { slackScheduled, slackPublished, slackFailed });
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('❌ Please log in first');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/slack/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          slackScheduled,
          slackPublished,
          slackFailed
        })
      });
      
      const result = await response.json();
      console.log('🔧 Save result:', result);
      
      if (response.ok) {
        alert('✅ Notification preferences saved successfully!\n\nYou can now test by creating a new post.');
      } else {
        alert('❌ Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('🔧 Save error:', error);
      alert('❌ Network error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ marginBottom: '10px' }}>Notification Settings</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '10px' }}>Notification Settings</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Configure how and when you receive notifications about your social media posts.
      </p>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Slack Notifications</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Send notifications to your connected Slack workspace. Make sure you have configured Slack integration in the "Slack Integration" tab first.
        </p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={slackScheduled}
              onChange={(e) => setSlackScheduled(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '500' }}>When a post is scheduled</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Get notified when a new post is scheduled.</div>
            </div>
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={slackPublished}
              onChange={(e) => setSlackPublished(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '500' }}>When a post is published</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Get notified when a post is successfully published.</div>
            </div>
          </label>
        </div>
        
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={slackFailed}
              onChange={(e) => setSlackFailed(e.target.checked)}
              style={{ marginRight: '10px', marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '500' }}>When a post fails to publish</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Get notified when a post fails to publish.</div>
            </div>
          </label>
        </div>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>Current Settings:</h4>
          <div style={{ fontSize: '13px', color: '#666' }}>
            <div>• Scheduled notifications: <strong>{slackScheduled ? 'Enabled' : 'Disabled'}</strong></div>
            <div>• Published notifications: <strong>{slackPublished ? 'Enabled' : 'Disabled'}</strong></div>
            <div>• Failed notifications: <strong>{slackFailed ? 'Enabled' : 'Disabled'}</strong></div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isLoading ? 'Saving...' : 'Save Notification Settings'}
        </button>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '6px', border: '1px solid #b8daff' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: '#0c5aa6' }}>How to Test:</h4>
          <div style={{ fontSize: '13px', color: '#0c5aa6' }}>
            <div>1. Enable the notifications you want above</div>
            <div>2. Click "Save Notification Settings"</div>
            <div>3. Go to the main dashboard and create a new post</div>
            <div>4. Check your Slack channel for notifications</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
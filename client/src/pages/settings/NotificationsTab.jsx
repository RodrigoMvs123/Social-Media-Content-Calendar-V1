import { useState, useEffect } from 'react';

const NotificationsTab = () => {
  const [slackScheduled, setSlackScheduled] = useState(true);
  const [slackPublished, setSlackPublished] = useState(true);
  const [slackFailed, setSlackFailed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  console.log('🔧 NotificationsTab component rendered!');

  // Load current preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/slack/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const settings = await response.json();
          console.log('🔧 Loaded settings:', settings);
          if (settings.configured) {
            setSlackScheduled(settings.slackScheduled !== false);
            setSlackPublished(settings.slackPublished !== false);
            setSlackFailed(settings.slackFailed !== false);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    
    loadPrefs();
  }, []);

  const handleSave = async () => {
    console.log('🔧 SAVE CLICKED! Current state:', { slackScheduled, slackPublished, slackFailed });
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
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
        alert('✅ Notification preferences saved successfully!');
      } else {
        alert('❌ Error: ' + result.error);
      }
    } catch (error) {
      console.error('🔧 Save error:', error);
      alert('❌ Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: '10px' }}>Notification Settings</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Configure how and when you receive notifications about your social media posts.
      </p>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Slack Notifications</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Send notifications to your connected Slack workspace
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
      </div>
    </div>
  );
};

export default NotificationsTab;
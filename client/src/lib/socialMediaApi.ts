// Frontend API for social media publishing
export const publishToSocialMedia = async (postId: number, userId: number, platform: string, content: string, media?: any[]) => {
  try {
    const response = await fetch('/api/social/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        postId,
        userId,
        platform,
        content,
        media
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Publishing failed');
    }

    return result;
  } catch (error) {
    console.error('Social media publishing error:', error);
    throw error;
  }
};

// Check if user has connected social media accounts
export const getConnectedAccounts = async () => {
  try {
    const response = await fetch('/api/social/accounts', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch connected accounts');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    return [];
  }
};
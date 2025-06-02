// A simple in-memory database for development
const mockPosts = [
  {
    id: '1',
    title: 'Product Launch Announcement',
    content: 'Excited to announce our new product launch!',
    platform: 'twitter',
    scheduledDate: new Date('2025-06-01T10:00:00Z'),
    status: 'scheduled'
  },
  {
    id: '2',
    title: 'Company Update',
    content: 'Check out our latest company update on the blog',
    platform: 'linkedin',
    scheduledDate: new Date('2025-06-05T14:00:00Z'),
    status: 'draft'
  },
  {
    id: '3',
    title: 'Customer Testimonial',
    content: 'Hear what our customers are saying about us!',
    platform: 'facebook',
    scheduledDate: new Date('2025-06-10T09:00:00Z'),
    status: 'scheduled'
  }
];

// Mock database operations
export const mockDb = {
  posts: {
    getAll: () => Promise.resolve(mockPosts),
    getById: (id) => Promise.resolve(mockPosts.find(post => post.id === id) || null),
    create: (post) => {
      const newPost = { ...post, id: String(mockPosts.length + 1) };
      mockPosts.push(newPost);
      return Promise.resolve(newPost);
    },
    update: (id, post) => {
      const index = mockPosts.findIndex(p => p.id === id);
      if (index === -1) return Promise.resolve(null);
      
      mockPosts[index] = { ...mockPosts[index], ...post };
      return Promise.resolve(mockPosts[index]);
    },
    delete: (id) => {
      const index = mockPosts.findIndex(p => p.id === id);
      if (index === -1) return Promise.resolve(false);
      
      mockPosts.splice(index, 1);
      return Promise.resolve(true);
    }
  }
};

// Mock database connection test
export async function testDatabaseConnection() {
  return Promise.resolve(true);
}
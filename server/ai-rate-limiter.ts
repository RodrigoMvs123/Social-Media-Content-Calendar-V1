import NodeCache from 'node-cache';

// Cache for storing generated content
const contentCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Queue for API requests
const requestQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  fn: () => Promise<any>;
}> = [];

// Flag to track if the queue is being processed
let isProcessingQueue = false;

// Process the queue with a delay between requests
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  const request = requestQueue.shift();
  if (request) {
    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
    
    // Wait 1 second before processing the next request
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, 1000);
  } else {
    isProcessingQueue = false;
  }
}

// Add a request to the queue
export function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    processQueue();
  });
}

// Get content from cache or generate it
export function getCachedOrGenerate(key: string, generateFn: () => Promise<string>): Promise<string> {
  // Check cache first
  const cachedContent = contentCache.get<string>(key);
  if (cachedContent) {
    console.log(`Using cached content for key: ${key}`);
    return Promise.resolve(cachedContent);
  }
  
  // Queue the generation request
  return queueRequest(async () => {
    try {
      const content = await generateFn();
      // Store in cache
      contentCache.set(key, content);
      return content;
    } catch (error) {
      throw error;
    }
  });
}
/**
 * AI Service Module
 * AI integration for OpenAI and Anthropic
 */

import { APIKeysManager } from './config.js';

/**
 * AI Service Class
 */
export class AIService {
  constructor() {
    this.apiKeysManager = new APIKeysManager();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.timeout = 30000; // 30 seconds
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
    this.rateLimitQueue = [];
    this.requestsPerMinute = 60;
    this.lastRequestTime = 0;
    this.middleware = { beforeRequest: [], afterResponse: [] };
  }

  // ============================================================================
  // API PROVIDERS
  // ============================================================================

  /**
   * Send request to OpenAI
   * @param {string} prompt - User prompt
   * @param {Object} options - Request options
   * @returns {Promise<string>} AI response
   */
  async sendToOpenAI(prompt, options = {}) {
    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 1000
    } = options;

    const apiKey = this.apiKeysManager.loadKey('openai');
    if (!apiKey) {
      throw new Error('מפתח API של OpenAI לא נמצא. אנא הוסף מפתח בהגדרות.');
    }

    const cacheKey = `openai_${model}_${prompt}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit();

    const requestData = {
      model,
      messages: [
        { role: 'system', content: 'אתה עוזר מומחה בתחום השכר והמיסוי בישראל.' },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    };

    // Run beforeRequest middleware
    for (const fn of this.middleware.beforeRequest) {
      await fn(requestData);
    }

    const response = await this.fetchWithRetry(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestData)
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const result = data.choices[0].message.content;

    // Run afterResponse middleware
    for (const fn of this.middleware.afterResponse) {
      await fn(result, data);
    }

    this.saveToCache(cacheKey, result);
    return result;
  }

  /**
   * Send request to Anthropic (Claude)
   * @param {string} prompt - User prompt
   * @param {Object} options - Request options
   * @returns {Promise<string>} AI response
   */
  async sendToAnthropic(prompt, options = {}) {
    const {
      model = 'claude-3-sonnet-20240229',
      maxTokens = 1000,
      temperature = 0.7
    } = options;

    const apiKey = this.apiKeysManager.loadKey('anthropic');
    if (!apiKey) {
      throw new Error('מפתח API של Anthropic לא נמצא. אנא הוסף מפתח בהגדרות.');
    }

    const cacheKey = `anthropic_${model}_${prompt}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit();

    const requestData = {
      model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature,
      system: 'אתה עוזר מומחה בתחום השכר והמיסוי בישראל.'
    };

    // Run beforeRequest middleware
    for (const fn of this.middleware.beforeRequest) {
      await fn(requestData);
    }

    const response = await this.fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestData)
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const result = data.content[0].text;

    // Run afterResponse middleware
    for (const fn of this.middleware.afterResponse) {
      await fn(result, data);
    }

    this.saveToCache(cacheKey, result);
    return result;
  }

  // ============================================================================
  // SALARY-SPECIFIC METHODS
  // ============================================================================

  /**
   * Analyze salary data
   * @param {Array<Object>} salaryRecords - Salary records
   * @param {string} provider - AI provider ('openai' or 'anthropic')
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeSalaryData(salaryRecords, provider = 'openai') {
    if (!salaryRecords || salaryRecords.length === 0) {
      throw new Error('אין נתוני שכר לניתוח');
    }

    // Prepare data summary
    const summary = {
      recordCount: salaryRecords.length,
      averageGross: salaryRecords.reduce((sum, r) => sum + (r.grossSalary || 0), 0) / salaryRecords.length,
      averageNet: salaryRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0) / salaryRecords.length,
      minSalary: Math.min(...salaryRecords.map(r => r.grossSalary || 0)),
      maxSalary: Math.max(...salaryRecords.map(r => r.grossSalary || 0))
    };

    const prompt = `
נתח את נתוני השכר הבאים:
- מספר רשומות: ${summary.recordCount}
- שכר ברוטו ממוצע: ₪${summary.averageGross.toFixed(2)}
- שכר נטו ממוצע: ₪${summary.averageNet.toFixed(2)}
- טווח שכר: ₪${summary.minSalary.toFixed(2)} - ₪${summary.maxSalary.toFixed(2)}

אנא ספק:
1. ניתוח מגמות
2. השוואה לשכר הממוצע במשק
3. המלצות לשיפור
4. תובנות חשובות

השב בעברית בפורמט JSON עם המפתחות: trends, comparison, recommendations, insights
    `.trim();

    let response;
    if (provider === 'anthropic') {
      response = await this.sendToAnthropic(prompt);
    } else {
      response = await this.sendToOpenAI(prompt);
    }

    try {
      return JSON.parse(response);
    } catch {
      return { analysis: response };
    }
  }

  /**
   * Get salary recommendations
   * @param {number} currentSalary - Current salary
   * @param {string} jobTitle - Job title
   * @param {number} experience - Years of experience
   * @param {string} provider - AI provider
   * @returns {Promise<Object>} Recommendations
   */
  async getSalaryRecommendations(currentSalary, jobTitle, experience, provider = 'openai') {
    const prompt = `
אני ${jobTitle} עם ${experience} שנות ניסיון ושכר נוכחי של ₪${currentSalary}.

אנא ספק:
1. האם השכר הוגן בהשוואה לשוק
2. טווח שכר מומלץ
3. טיפים למשא ומתן על שכר
4. אפשרויות לשיפור הכנסה

השב בעברית בפורמט JSON עם המפתחות: isFair, recommendedRange, negotiationTips, improvementOptions
    `.trim();

    let response;
    if (provider === 'anthropic') {
      response = await this.sendToAnthropic(prompt);
    } else {
      response = await this.sendToOpenAI(prompt);
    }

    try {
      return JSON.parse(response);
    } catch {
      return { recommendations: response };
    }
  }

  /**
   * Extract salary data from text
   * @param {string} text - Text containing salary information
   * @param {string} provider - AI provider
   * @returns {Promise<Object>} Extracted data
   */
  async extractSalaryData(text, provider = 'openai') {
    const prompt = `
חלץ את פרטי השכר מהטקסט הבא:

${text}

החזר JSON עם השדות הבאים (אם קיימים):
- grossSalary: שכר ברוטו
- netSalary: שכר נטו
- date: תאריך
- bonus: בונוס
- benefits: הטבות
- description: תיאור

השב רק ב-JSON, ללא טקסט נוסף.
    `.trim();

    let response;
    if (provider === 'anthropic') {
      response = await this.sendToAnthropic(prompt);
    } else {
      response = await this.sendToOpenAI(prompt);
    }

    try {
      return JSON.parse(response);
    } catch {
      return { error: 'Failed to parse response', raw: response };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Fetch with retry logic
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, options) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok && response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries - 1) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Check rate limit
   * @returns {Promise<void>}
   */
  async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = (60 * 1000) / this.requestsPerMinute;

    if (timeSinceLastRequest < minTimeBetweenRequests) {
      await this.sleep(minTimeBetweenRequests - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Save to cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  saveToCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Add middleware
   * @param {string} type - Middleware type ('beforeRequest' or 'afterResponse')
   * @param {Function} fn - Middleware function
   */
  use(type, fn) {
    if (this.middleware[type]) {
      this.middleware[type].push(fn);
    }
  }

  /**
   * Set API key
   * @param {string} provider - Provider name ('openai' or 'anthropic')
   * @param {string} key - API key
   */
  setAPIKey(provider, key) {
    return this.apiKeysManager.saveKey(provider, key);
  }

  /**
   * Check if API key exists
   * @param {string} provider - Provider name
   * @returns {boolean} True if key exists
   */
  hasAPIKey(provider) {
    return !!this.apiKeysManager.loadKey(provider);
  }
}

export default AIService;

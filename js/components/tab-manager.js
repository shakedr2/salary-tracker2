/**
 * Tab Manager Component
 * Tab management with lazy loading and history
 */

/**
 * TabManager Class
 */
export class TabManager {
  /**
   * Create a new TabManager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.tabs = new Map();
    this.activeTab = null;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;
    this.listeners = new Map();
    this.storageKey = options.storageKey || 'tab_manager_state';
    this.useHistory = options.useHistory !== false;
    this.lazyLoad = options.lazyLoad !== false;
    
    // Load saved state
    if (options.restoreState !== false) {
      this.loadState();
    }
    
    // Setup browser history
    if (this.useHistory && typeof window !== 'undefined') {
      this.setupBrowserHistory();
    }
  }

  // ============================================================================
  // TAB REGISTRATION
  // ============================================================================

  /**
   * Register a new tab
   * @param {string} id - Tab ID
   * @param {Object} config - Tab configuration
   */
  register(id, config = {}) {
    const tab = {
      id,
      title: config.title || id,
      content: config.content || null,
      loader: config.loader || null,
      badge: config.badge || null,
      icon: config.icon || null,
      enabled: config.enabled !== false,
      visible: config.visible !== false,
      loaded: false,
      metadata: config.metadata || {}
    };

    this.tabs.set(id, tab);
    this.emit('tabRegistered', tab);
    
    return this;
  }

  /**
   * Unregister a tab
   * @param {string} id - Tab ID
   */
  unregister(id) {
    const tab = this.tabs.get(id);
    if (tab) {
      this.tabs.delete(id);
      this.emit('tabUnregistered', tab);
      
      // If this was the active tab, activate another
      if (this.activeTab === id) {
        const firstTab = Array.from(this.tabs.keys())[0];
        if (firstTab) {
          this.activate(firstTab);
        }
      }
    }
    
    return this;
  }

  // ============================================================================
  // TAB ACTIVATION
  // ============================================================================

  /**
   * Activate a tab
   * @param {string} id - Tab ID
   * @param {Object} options - Activation options
   */
  async activate(id, options = {}) {
    const tab = this.tabs.get(id);
    
    if (!tab) {
      console.error(`Tab "${id}" not found`);
      return false;
    }

    if (!tab.enabled) {
      console.warn(`Tab "${id}" is disabled`);
      return false;
    }

    const previousTab = this.activeTab;
    
    // Emit beforeActivate event
    const shouldContinue = this.emit('beforeActivate', { id, tab, previousTab });
    if (shouldContinue === false) {
      return false;
    }

    // Load content if lazy loading is enabled
    if (this.lazyLoad && !tab.loaded && tab.loader) {
      try {
        tab.content = await tab.loader();
        tab.loaded = true;
      } catch (error) {
        console.error(`Failed to load tab "${id}":`, error);
        this.emit('loadError', { id, tab, error });
        return false;
      }
    }

    // Deactivate previous tab
    if (previousTab && previousTab !== id) {
      this.emit('deactivate', { id: previousTab, tab: this.tabs.get(previousTab) });
    }

    // Activate new tab
    this.activeTab = id;
    this.emit('activate', { id, tab, previousTab });

    // Add to history
    if (!options.skipHistory) {
      this.addToHistory(id);
    }

    // Update browser history
    if (this.useHistory && !options.skipBrowserHistory) {
      this.updateBrowserHistory(id);
    }

    // Save state
    this.saveState();

    return true;
  }

  /**
   * Get active tab
   * @returns {Object|null} Active tab or null
   */
  getActive() {
    return this.activeTab ? this.tabs.get(this.activeTab) : null;
  }

  /**
   * Get active tab ID
   * @returns {string|null} Active tab ID or null
   */
  getActiveId() {
    return this.activeTab;
  }

  // ============================================================================
  // TAB QUERIES
  // ============================================================================

  /**
   * Get tab by ID
   * @param {string} id - Tab ID
   * @returns {Object|undefined} Tab object or undefined
   */
  get(id) {
    return this.tabs.get(id);
  }

  /**
   * Get all tabs
   * @returns {Array<Object>} Array of tab objects
   */
  getAll() {
    return Array.from(this.tabs.values());
  }

  /**
   * Get visible tabs
   * @returns {Array<Object>} Array of visible tabs
   */
  getVisible() {
    return this.getAll().filter(tab => tab.visible);
  }

  /**
   * Get enabled tabs
   * @returns {Array<Object>} Array of enabled tabs
   */
  getEnabled() {
    return this.getAll().filter(tab => tab.enabled);
  }

  /**
   * Check if tab exists
   * @param {string} id - Tab ID
   * @returns {boolean} True if exists
   */
  has(id) {
    return this.tabs.has(id);
  }

  // ============================================================================
  // TAB UPDATES
  // ============================================================================

  /**
   * Update tab configuration
   * @param {string} id - Tab ID
   * @param {Object} updates - Configuration updates
   */
  update(id, updates) {
    const tab = this.tabs.get(id);
    if (tab) {
      Object.assign(tab, updates);
      this.emit('tabUpdated', { id, tab, updates });
      this.saveState();
    }
    return this;
  }

  /**
   * Set tab badge
   * @param {string} id - Tab ID
   * @param {string|number|null} badge - Badge value
   */
  setBadge(id, badge) {
    return this.update(id, { badge });
  }

  /**
   * Set tab content
   * @param {string} id - Tab ID
   * @param {*} content - Tab content
   */
  setContent(id, content) {
    return this.update(id, { content, loaded: true });
  }

  /**
   * Enable tab
   * @param {string} id - Tab ID
   */
  enable(id) {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable tab
   * @param {string} id - Tab ID
   */
  disable(id) {
    return this.update(id, { enabled: false });
  }

  /**
   * Show tab
   * @param {string} id - Tab ID
   */
  show(id) {
    return this.update(id, { visible: true });
  }

  /**
   * Hide tab
   * @param {string} id - Tab ID
   */
  hide(id) {
    return this.update(id, { visible: false });
  }

  // ============================================================================
  // HISTORY MANAGEMENT
  // ============================================================================

  /**
   * Add tab to history
   * @param {string} id - Tab ID
   */
  addToHistory(id) {
    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Don't add duplicate consecutive entries
    if (this.history[this.history.length - 1] !== id) {
      this.history.push(id);

      // Limit history size
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }
  }

  /**
   * Go back in history
   * @returns {boolean} Success status
   */
  back() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const id = this.history[this.historyIndex];
      return this.activate(id, { skipHistory: true });
    }
    return false;
  }

  /**
   * Go forward in history
   * @returns {boolean} Success status
   */
  forward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const id = this.history[this.historyIndex];
      return this.activate(id, { skipHistory: true });
    }
    return false;
  }

  /**
   * Check if can go back
   * @returns {boolean} True if can go back
   */
  canGoBack() {
    return this.historyIndex > 0;
  }

  /**
   * Check if can go forward
   * @returns {boolean} True if can go forward
   */
  canGoForward() {
    return this.historyIndex < this.history.length - 1;
  }

  // ============================================================================
  // BROWSER HISTORY INTEGRATION
  // ============================================================================

  /**
   * Setup browser history integration
   */
  setupBrowserHistory() {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.tabId) {
        this.activate(event.state.tabId, {
          skipHistory: true,
          skipBrowserHistory: true
        });
      }
    });
  }

  /**
   * Update browser history
   * @param {string} id - Tab ID
   */
  updateBrowserHistory(id) {
    const tab = this.tabs.get(id);
    if (tab && window.history) {
      const url = new URL(window.location);
      url.searchParams.set('tab', id);
      window.history.pushState({ tabId: id }, tab.title, url);
    }
  }

  // ============================================================================
  // STATE PERSISTENCE
  // ============================================================================

  /**
   * Save state to storage
   */
  saveState() {
    try {
      const state = {
        activeTab: this.activeTab,
        history: this.history,
        historyIndex: this.historyIndex,
        tabs: Array.from(this.tabs.entries()).map(([id, tab]) => ({
          id,
          badge: tab.badge,
          enabled: tab.enabled,
          visible: tab.visible
        }))
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save tab manager state:', error);
    }
  }

  /**
   * Load state from storage
   */
  loadState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const state = JSON.parse(data);
        this.activeTab = state.activeTab;
        this.history = state.history || [];
        this.historyIndex = state.historyIndex || -1;
      }
    } catch (error) {
      console.error('Failed to load tab manager state:', error);
    }
  }

  /**
   * Clear saved state
   */
  clearState() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear tab manager state:', error);
    }
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {*} Last callback return value
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      let result;
      for (const callback of callbacks) {
        result = callback(data);
      }
      return result;
    }
  }

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  /**
   * Setup keyboard shortcuts
   * @param {Object} shortcuts - Keyboard shortcuts map
   */
  setupKeyboardShortcuts(shortcuts = {}) {
    window.addEventListener('keydown', (event) => {
      const key = event.key;
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      const shortcutKey = [
        ctrl && 'ctrl',
        shift && 'shift',
        alt && 'alt',
        key
      ].filter(Boolean).join('+');

      const tabId = shortcuts[shortcutKey];
      if (tabId && this.has(tabId)) {
        event.preventDefault();
        this.activate(tabId);
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Reset manager
   */
  reset() {
    this.tabs.clear();
    this.activeTab = null;
    this.history = [];
    this.historyIndex = -1;
    this.listeners.clear();
    this.clearState();
  }

  /**
   * Get manager statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      totalTabs: this.tabs.size,
      visibleTabs: this.getVisible().length,
      enabledTabs: this.getEnabled().length,
      activeTab: this.activeTab,
      historySize: this.history.length,
      loadedTabs: this.getAll().filter(t => t.loaded).length
    };
  }
}

export default TabManager;

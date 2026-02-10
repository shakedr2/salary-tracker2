/**
 * State Manager Module
 * Advanced state management with persistence, undo/redo, and subscriptions
 */

import { deepClone, deepMerge } from './utils.js';

/**
 * StateManager class
 * Manages application state with LocalStorage persistence
 */
export class StateManager {
  /**
   * Create a new StateManager
   * @param {string} storageKey - LocalStorage key for persistence
   * @param {Object} initialState - Initial state object
   */
  constructor(storageKey = 'app_state', initialState = {}) {
    this.storageKey = storageKey;
    this.state = this.load() || deepClone(initialState);
    this.subscribers = new Map();
    this.globalSubscribers = [];
    this.history = [deepClone(this.state)];
    this.historyIndex = 0;
    this.maxHistorySize = 50;
    this.middleware = { beforeSet: [], afterSet: [] };
    this.computedValues = new Map();
    this.transaction = null;
    
    // Auto-save on visibility change and beforeunload
    this.setupAutoSave();
  }

  // ============================================================================
  // CORE STATE OPERATIONS
  // ============================================================================

  /**
   * Get state value by path
   * @param {string} path - Dot notation path (e.g., 'user.profile.name')
   * @param {*} defaultValue - Default value if not found
   * @returns {*} State value
   */
  get(path, defaultValue = null) {
    if (!path) return deepClone(this.state);
    
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return deepClone(value);
  }

  /**
   * Set state value by path
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @param {boolean} silent - Skip notifications
   */
  set(path, value, silent = false) {
    // Run beforeSet middleware
    for (const fn of this.middleware.beforeSet) {
      const result = fn(path, value, this.state);
      if (result === false) return; // Cancel set operation
      if (result !== undefined) value = result;
    }
    
    if (this.transaction) {
      this.transaction.operations.push({ type: 'set', path, value });
      return;
    }
    
    const oldValue = this.get(path);
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    // Navigate to parent object
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set value
    target[lastKey] = deepClone(value);
    
    // Add to history
    this.addToHistory();
    
    // Save to storage
    this.save();
    
    // Run afterSet middleware
    for (const fn of this.middleware.afterSet) {
      fn(path, value, oldValue, this.state);
    }
    
    // Notify subscribers
    if (!silent) {
      this.notify(path, value, oldValue);
    }
  }

  /**
   * Update state value (partial update for objects)
   * @param {string} path - Dot notation path
   * @param {Object} updates - Updates to merge
   */
  update(path, updates) {
    const current = this.get(path, {});
    const merged = deepMerge(current, updates);
    this.set(path, merged);
  }

  /**
   * Delete state value by path
   * @param {string} path - Dot notation path
   */
  delete(path) {
    if (this.transaction) {
      this.transaction.operations.push({ type: 'delete', path });
      return;
    }
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    for (const key of keys) {
      if (!(key in target)) return;
      target = target[key];
    }
    
    delete target[lastKey];
    
    this.addToHistory();
    this.save();
    this.notify(path, undefined, undefined);
  }

  // ============================================================================
  // SUBSCRIPTION SYSTEM
  // ============================================================================

  /**
   * Subscribe to state changes
   * @param {string} path - Path to watch (empty for all changes)
   * @param {Function} callback - Callback function(newValue, oldValue, path)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!path) {
      this.globalSubscribers.push(callback);
      return () => {
        const index = this.globalSubscribers.indexOf(callback);
        if (index > -1) this.globalSubscribers.splice(index, 1);
      };
    }
    
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }
    
    this.subscribers.get(path).push(callback);
    
    return () => {
      const callbacks = this.subscribers.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }

  /**
   * Notify subscribers of changes
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   */
  notify(path, newValue, oldValue) {
    // Notify specific path subscribers
    if (this.subscribers.has(path)) {
      for (const callback of this.subscribers.get(path)) {
        callback(newValue, oldValue, path);
      }
    }
    
    // Notify parent path subscribers
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers.has(parentPath)) {
        for (const callback of this.subscribers.get(parentPath)) {
          callback(this.get(parentPath), undefined, parentPath);
        }
      }
    }
    
    // Notify global subscribers
    for (const callback of this.globalSubscribers) {
      callback(newValue, oldValue, path);
    }
  }

  // ============================================================================
  // HISTORY MANAGEMENT (UNDO/REDO)
  // ============================================================================

  /**
   * Add current state to history
   */
  addToHistory() {
    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    // Add new state
    this.history.push(deepClone(this.state));
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * Undo last change
   * @returns {boolean} Success status
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = deepClone(this.history[this.historyIndex]);
      this.save();
      this.notify('', this.state, undefined);
      return true;
    }
    return false;
  }

  /**
   * Redo last undone change
   * @returns {boolean} Success status
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = deepClone(this.history[this.historyIndex]);
      this.save();
      this.notify('', this.state, undefined);
      return true;
    }
    return false;
  }

  /**
   * Check if undo is available
   * @returns {boolean} True if can undo
   */
  canUndo() {
    return this.historyIndex > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean} True if can redo
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [deepClone(this.state)];
    this.historyIndex = 0;
  }

  // ============================================================================
  // BATCH OPERATIONS & TRANSACTIONS
  // ============================================================================

  /**
   * Begin transaction
   * Operations are queued until commit or rollback
   */
  beginTransaction() {
    this.transaction = {
      startState: deepClone(this.state),
      operations: []
    };
  }

  /**
   * Commit transaction
   * Apply all queued operations
   */
  commitTransaction() {
    if (!this.transaction) return;
    
    for (const op of this.transaction.operations) {
      if (op.type === 'set') {
        this.set(op.path, op.value);
      } else if (op.type === 'delete') {
        this.delete(op.path);
      }
    }
    
    this.transaction = null;
  }

  /**
   * Rollback transaction
   * Discard all queued operations
   */
  rollbackTransaction() {
    if (!this.transaction) return;
    
    this.state = this.transaction.startState;
    this.transaction = null;
    this.save();
    this.notify('', this.state, undefined);
  }

  /**
   * Execute batch operations
   * @param {Function} callback - Function to execute batch operations
   */
  batch(callback) {
    this.beginTransaction();
    try {
      callback(this);
      this.commitTransaction();
    } catch (error) {
      this.rollbackTransaction();
      throw error;
    }
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Define computed value
   * @param {string} name - Computed value name
   * @param {Function} compute - Function to compute value
   * @param {Array<string>} dependencies - Paths to watch for changes
   */
  defineComputed(name, compute, dependencies = []) {
    const computedDef = { compute, dependencies };
    this.computedValues.set(name, computedDef);
    
    // Subscribe to dependencies
    for (const dep of dependencies) {
      this.subscribe(dep, () => {
        // Recompute when dependency changes
        this.notify(`computed.${name}`, this.getComputed(name), undefined);
      });
    }
  }

  /**
   * Get computed value
   * @param {string} name - Computed value name
   * @returns {*} Computed value
   */
  getComputed(name) {
    const def = this.computedValues.get(name);
    if (!def) return undefined;
    
    return def.compute(this.state, this);
  }

  // ============================================================================
  // MIDDLEWARE
  // ============================================================================

  /**
   * Add middleware
   * @param {string} type - Middleware type ('beforeSet' or 'afterSet')
   * @param {Function} fn - Middleware function
   */
  use(type, fn) {
    if (this.middleware[type]) {
      this.middleware[type].push(fn);
    }
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Save state to LocalStorage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load state from LocalStorage
   * @returns {Object|null} Loaded state or null
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  }

  /**
   * Export state as JSON
   * @returns {string} JSON string
   */
  export() {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import state from JSON
   * @param {string} json - JSON string
   * @returns {boolean} Success status
   */
  import(json) {
    try {
      const importedState = JSON.parse(json);
      this.state = importedState;
      this.addToHistory();
      this.save();
      this.notify('', this.state, undefined);
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Reset state to initial values
   * @param {Object} initialState - Initial state
   */
  reset(initialState = {}) {
    this.state = deepClone(initialState);
    this.history = [deepClone(this.state)];
    this.historyIndex = 0;
    this.save();
    this.notify('', this.state, undefined);
  }

  /**
   * Setup auto-save on visibility change and beforeunload
   */
  setupAutoSave() {
    // Save on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save();
      }
    });
    
    // Save before unload
    window.addEventListener('beforeunload', () => {
      this.save();
    });
  }

  // ============================================================================
  // STATE MIGRATION
  // ============================================================================

  /**
   * Migrate state between versions
   * @param {number} fromVersion - Current version
   * @param {number} toVersion - Target version
   * @param {Object} migrations - Migration functions
   */
  migrate(fromVersion, toVersion, migrations) {
    for (let v = fromVersion; v < toVersion; v++) {
      const migrationFn = migrations[v + 1];
      if (migrationFn) {
        this.state = migrationFn(this.state);
      }
    }
    this.save();
  }

  // ============================================================================
  // DEBUGGING
  // ============================================================================

  /**
   * Get state snapshot for debugging
   * @returns {Object} State snapshot with metadata
   */
  getSnapshot() {
    return {
      state: deepClone(this.state),
      historySize: this.history.length,
      historyIndex: this.historyIndex,
      subscribersCount: this.subscribers.size,
      globalSubscribersCount: this.globalSubscribers.length,
      computedCount: this.computedValues.size
    };
  }

  /**
   * Log state to console
   */
  debug() {
    console.group('State Manager Debug');
    console.log('State:', this.state);
    console.log('History:', this.history);
    console.log('Subscribers:', this.subscribers);
    console.log('Computed:', this.computedValues);
    console.groupEnd();
  }
}

export default StateManager;

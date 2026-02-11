/**
 * Validators Module
 * Complete validation system for all input types
 */

import { VALIDATION_CONFIG } from './config.js';

// ============================================================================
// SALARY VALIDATION
// ============================================================================

/**
 * Validate salary value
 * @param {number} salary - Salary amount
 * @param {Object} options - Validation options
 * @returns {Object} Validation result {valid, errors}
 */
export function validateSalary(salary, options = {}) {
  const {
    min = VALIDATION_CONFIG.salary.min,
    max = VALIDATION_CONFIG.salary.max,
    required = true
  } = options;

  const errors = [];

  if (required && (salary == null || salary === '')) {
    errors.push('שכר הוא שדה חובה');
    return { valid: false, errors };
  }

  const numSalary = Number(salary);
  
  if (isNaN(numSalary)) {
    errors.push('שכר חייב להיות מספר');
  } else {
    if (numSalary < min) {
      errors.push(`שכר חייב להיות לפחות ${min}`);
    }
    if (numSalary > max) {
      errors.push(`שכר לא יכול להיות יותר מ-${max}`);
    }
    if (numSalary < 0) {
      errors.push('שכר לא יכול להיות שלילי');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate salary record
 * @param {Object} record - Salary record object
 * @returns {Object} Validation result
 */
export function validateSalaryRecord(record) {
  const errors = [];

  // Validate gross salary
  if (!record.grossSalary && record.grossSalary !== 0) {
    errors.push('שכר ברוטו הוא שדה חובה');
  } else {
    const salaryValidation = validateSalary(record.grossSalary);
    if (!salaryValidation.valid) {
      errors.push(...salaryValidation.errors);
    }
  }

  // Validate date
  if (record.date) {
    const dateValidation = validateDate(record.date);
    if (!dateValidation.valid) {
      errors.push(...dateValidation.errors);
    }
  }

  // Validate description (optional)
  if (record.description) {
    const descValidation = validateDescription(record.description);
    if (!descValidation.valid) {
      errors.push(...descValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate salary range
 * @param {number} minSalary - Minimum salary
 * @param {number} maxSalary - Maximum salary
 * @returns {Object} Validation result
 */
export function validateSalaryRange(minSalary, maxSalary) {
  const errors = [];

  const minValidation = validateSalary(minSalary, { required: false });
  const maxValidation = validateSalary(maxSalary, { required: false });

  errors.push(...minValidation.errors, ...maxValidation.errors);

  if (minSalary != null && maxSalary != null && Number(minSalary) > Number(maxSalary)) {
    errors.push('שכר מינימלי לא יכול להיות גדול משכר מקסימלי');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validate email address
 * @param {string} email - Email address
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with typo suggestions
 */
export function validateEmail(email, options = {}) {
  const { required = true, checkTypos = true } = options;
  const errors = [];
  const warnings = [];

  if (required && (!email || email.trim() === '')) {
    errors.push('אימייל הוא שדה חובה');
    return { valid: false, errors, warnings };
  }

  if (!email) {
    return { valid: true, errors, warnings };
  }

  const emailStr = email.trim().toLowerCase();
  const pattern = VALIDATION_CONFIG.email.pattern;

  if (!pattern.test(emailStr)) {
    errors.push('אימייל לא תקין');
  }

  // Check for common typos
  if (checkTypos && errors.length === 0) {
    const domain = emailStr.split('@')[1];
    const commonTypos = VALIDATION_CONFIG.email.commonTypos;
    
    for (const [typo, correct] of Object.entries(commonTypos)) {
      if (domain === typo) {
        warnings.push(`האם התכוונת ל-${correct}?`);
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate email domain
 * @param {string} email - Email address
 * @param {Array<string>} allowedDomains - List of allowed domains
 * @returns {Object} Validation result
 */
export function validateEmailDomain(email, allowedDomains = []) {
  const errors = [];

  if (!email) {
    errors.push('אימייל הוא שדה חובה');
    return { valid: false, errors };
  }

  const domain = email.split('@')[1];
  
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    errors.push(`דומיין ${domain} אינו מורשה`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// PHONE VALIDATION
// ============================================================================

/**
 * Validate phone number (Israeli format)
 * @param {string} phone - Phone number
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validatePhone(phone, options = {}) {
  const { required = true } = options;
  const errors = [];

  if (required && (!phone || phone.trim() === '')) {
    errors.push('טלפון הוא שדה חובה');
    return { valid: false, errors };
  }

  if (!phone) {
    return { valid: true, errors };
  }

  const phoneStr = phone.trim().replace(/\s/g, '');
  const pattern = VALIDATION_CONFIG.phone.pattern;

  if (!pattern.test(phoneStr)) {
    errors.push('מספר טלפון לא תקין (פורמט: 0X-XXXXXXX או 0XX-XXXXXXX)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Israeli mobile phone
 * @param {string} phone - Mobile phone number
 * @returns {Object} Validation result
 */
export function validateMobilePhone(phone) {
  const errors = [];

  if (!phone || phone.trim() === '') {
    errors.push('טלפון נייד הוא שדה חובה');
    return { valid: false, errors };
  }

  const phoneStr = phone.trim().replace(/\s/g, '').replace(/-/g, '');
  const pattern = VALIDATION_CONFIG.phone.israeli;

  if (!pattern.test(phoneStr)) {
    errors.push('מספר טלפון נייד לא תקין (פורמט: 05X-XXXXXXX)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Validate date
 * @param {Date|string} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateDate(date, options = {}) {
  const { required = true } = options;
  const errors = [];

  if (required && (!date || date === '')) {
    errors.push('תאריך הוא שדה חובה');
    return { valid: false, errors };
  }

  if (!date) {
    return { valid: true, errors };
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    errors.push('תאריך לא תקין');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateDateRange(startDate, endDate, options = {}) {
  const { minDate = null, maxDate = null } = options;
  const errors = [];

  const startValidation = validateDate(startDate);
  const endValidation = validateDate(endDate);

  errors.push(...startValidation.errors, ...endValidation.errors);

  if (startValidation.valid && endValidation.valid) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);

    if (start > end) {
      errors.push('תאריך התחלה לא יכול להיות אחרי תאריך סיום');
    }

    if (minDate) {
      const min = minDate instanceof Date ? minDate : new Date(minDate);
      if (start < min) {
        errors.push(`תאריך התחלה לא יכול להיות לפני ${min.toLocaleDateString('he-IL')}`);
      }
    }

    if (maxDate) {
      const max = maxDate instanceof Date ? maxDate : new Date(maxDate);
      if (end > max) {
        errors.push(`תאריך סיום לא יכול להיות אחרי ${max.toLocaleDateString('he-IL')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TEXT VALIDATION
// ============================================================================

/**
 * Validate text field
 * @param {string} text - Text to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateText(text, options = {}) {
  const {
    required = true,
    minLength = 0,
    maxLength = Infinity,
    pattern = null,
    trim = true
  } = options;

  const errors = [];
  const textStr = trim && text ? text.trim() : text;

  if (required && (!textStr || textStr === '')) {
    errors.push('שדה זה הוא חובה');
    return { valid: false, errors };
  }

  if (!textStr) {
    return { valid: true, errors };
  }

  if (textStr.length < minLength) {
    errors.push(`טקסט חייב להכיל לפחות ${minLength} תווים`);
  }

  if (textStr.length > maxLength) {
    errors.push(`טקסט לא יכול להכיל יותר מ-${maxLength} תווים`);
  }

  if (pattern && !pattern.test(textStr)) {
    errors.push('פורמט טקסט לא תקין');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate description field
 * @param {string} description - Description text
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateDescription(description, options = {}) {
  const {
    required = false,
    maxLength = 500
  } = options;

  return validateText(description, {
    required,
    minLength: 0,
    maxLength
  });
}

// ============================================================================
// NUMBER VALIDATION
// ============================================================================

/**
 * Validate number
 * @param {number} value - Number to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateNumber(value, options = {}) {
  const {
    required = true,
    min = -Infinity,
    max = Infinity,
    integer = false
  } = options;

  const errors = [];

  if (required && (value == null || value === '')) {
    errors.push('שדה זה הוא חובה');
    return { valid: false, errors };
  }

  if (value == null || value === '') {
    return { valid: true, errors };
  }

  const num = Number(value);

  if (isNaN(num)) {
    errors.push('ערך חייב להיות מספר');
  } else {
    if (integer && !Number.isInteger(num)) {
      errors.push('ערך חייב להיות מספר שלם');
    }
    if (num < min) {
      errors.push(`ערך חייב להיות לפחות ${min}`);
    }
    if (num > max) {
      errors.push(`ערך לא יכול להיות יותר מ-${max}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate percentage
 * @param {number} value - Percentage value (0-100)
 * @returns {Object} Validation result
 */
export function validatePercentage(value) {
  return validateNumber(value, {
    required: true,
    min: 0,
    max: 100
  });
}

// ============================================================================
// ISRAELI ID VALIDATION
// ============================================================================

/**
 * Validate Israeli ID number with checksum
 * @param {string} id - Israeli ID number
 * @returns {Object} Validation result
 */
export function validateIsraeliID(id) {
  const errors = [];

  if (!id || id.trim() === '') {
    errors.push('תעודת זהות היא שדה חובה');
    return { valid: false, errors };
  }

  const idStr = id.trim().replace(/\D/g, '');

  if (idStr.length !== 9) {
    errors.push('תעודת זהות חייבת להכיל 9 ספרות');
    return { valid: false, errors };
  }

  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(idStr[i]);
    let step = digit * ((i % 2) + 1);
    sum += step > 9 ? step - 9 : step;
  }

  if (sum % 10 !== 0) {
    errors.push('מספר תעודת זהות לא תקין');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Levenshtein distance for typo detection
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
export function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Validate multiple fields at once
 * @param {Object} fields - Object with field values
 * @param {Object} validations - Object with validation functions
 * @returns {Object} Validation results {valid, errors}
 */
export function validateFields(fields, validations) {
  const errors = {};
  let valid = true;

  for (const [fieldName, validator] of Object.entries(validations)) {
    const fieldValue = fields[fieldName];
    const result = validator(fieldValue);
    
    if (!result.valid) {
      errors[fieldName] = result.errors;
      valid = false;
    }
  }

  return {
    valid,
    errors
  };
}

// Export all validators
export default {
  validateSalary,
  validateSalaryRecord,
  validateSalaryRange,
  validateEmail,
  validateEmailDomain,
  validatePhone,
  validateMobilePhone,
  validateDate,
  validateDateRange,
  validateText,
  validateDescription,
  validateNumber,
  validatePercentage,
  validateIsraeliID,
  levenshteinDistance,
  validateFields
};

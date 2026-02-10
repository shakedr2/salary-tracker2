/**
 * Excel Parser Module
 * Excel and CSV file parser with validation
 */

/**
 * Excel Parser Class
 */
export class ExcelParser {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.supportedFormats = ['xlsx', 'xls', 'csv'];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Parse file (Excel or CSV)
   * @param {File} file - File to parse
   * @returns {Promise<Object>} Parsed data with metadata
   */
  async parseFile(file) {
    this.errors = [];
    this.warnings = [];

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const extension = this.getFileExtension(file.name);
    
    if (extension === 'csv') {
      return await this.parseCSV(file);
    } else {
      return await this.parseExcel(file);
    }
  }

  /**
   * Validate file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('לא נבחר קובץ');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`גודל הקובץ חורג מ-${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.supportedFormats.includes(extension)) {
      errors.push(`פורמט קובץ לא נתמך. פורמטים נתמכים: ${this.supportedFormats.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse CSV file
   * @param {File} file - CSV file
   * @returns {Promise<Object>} Parsed data
   */
  async parseCSV(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('קובץ CSV ריק');
    }

    // Parse header
    const headers = this.parseCSVLine(lines[0]);
    
    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return this.processData(data, {
      fileName: file.name,
      fileSize: file.size,
      rowCount: data.length
    });
  }

  /**
   * Parse CSV line with quote handling
   * @param {string} line - CSV line
   * @returns {Array<string>} Parsed values
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Parse Excel file
   * @param {File} file - Excel file
   * @returns {Promise<Object>} Parsed data
   */
  async parseExcel(file) {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      throw new Error('ספריית XLSX לא נטענה. אנא וודא שהספרייה נכללת בדף.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });

    if (data.length === 0) {
      throw new Error('הגיליון ריק');
    }

    return this.processData(data, {
      fileName: file.name,
      fileSize: file.size,
      sheetName: sheetName,
      rowCount: data.length
    });
  }

  /**
   * Process and clean data
   * @param {Array<Object>} data - Raw data
   * @param {Object} metadata - File metadata
   * @returns {Object} Processed data with metadata
   */
  processData(data, metadata) {
    const processedData = data.map(row => {
      const cleaned = {};
      for (const [key, value] of Object.entries(row)) {
        // Clean key (trim, lowercase)
        const cleanKey = key.trim();
        
        // Clean value (trim, type conversion)
        let cleanValue = typeof value === 'string' ? value.trim() : value;
        
        // Try to convert numeric strings to numbers
        if (typeof cleanValue === 'string' && !isNaN(cleanValue) && cleanValue !== '') {
          cleanValue = Number(cleanValue);
        }
        
        cleaned[cleanKey] = cleanValue;
      }
      return cleaned;
    });

    return {
      data: processedData,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString(),
        columns: Object.keys(processedData[0] || {})
      },
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Parse salary-specific data
   * @param {File} file - File to parse
   * @returns {Promise<Object>} Salary records
   */
  async parseSalaryFile(file) {
    const result = await this.parseFile(file);
    const salaryRecords = this.mapToSalaryRecords(result.data);
    
    return {
      ...result,
      salaryRecords
    };
  }

  /**
   * Map data to salary records
   * @param {Array<Object>} data - Raw data
   * @returns {Array<Object>} Salary records
   */
  mapToSalaryRecords(data) {
    // Field mapping (Hebrew and English)
    const fieldMap = {
      // Gross salary
      'שכר ברוטו': 'grossSalary',
      'ברוטו': 'grossSalary',
      'gross': 'grossSalary',
      'gross salary': 'grossSalary',
      'salary': 'grossSalary',
      
      // Net salary
      'שכר נטו': 'netSalary',
      'נטו': 'netSalary',
      'net': 'netSalary',
      'net salary': 'netSalary',
      
      // Date
      'תאריך': 'date',
      'date': 'date',
      'חודש': 'date',
      'month': 'date',
      
      // Description
      'תיאור': 'description',
      'הערות': 'description',
      'description': 'description',
      'notes': 'description',
      'note': 'description'
    };

    return data.map((row, index) => {
      const record = {
        id: `import_${Date.now()}_${index}`,
        importedAt: new Date().toISOString()
      };

      // Map fields
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.trim().toLowerCase();
        const mappedField = fieldMap[normalizedKey] || normalizedKey;
        
        if (mappedField === 'grossSalary' || mappedField === 'netSalary') {
          // Parse salary value
          let salaryValue = value;
          if (typeof value === 'string') {
            // Remove currency symbols and commas
            salaryValue = value.replace(/[₪,$,\s]/g, '');
            salaryValue = Number(salaryValue);
          }
          record[mappedField] = salaryValue;
        } else if (mappedField === 'date') {
          // Parse date
          record.date = this.parseDate(value);
        } else {
          record[mappedField] = value;
        }
      }

      // Validate required fields
      if (!record.grossSalary && !record.netSalary) {
        this.warnings.push(`שורה ${index + 2}: חסר שכר`);
      }

      return record;
    });
  }

  /**
   * Parse date from various formats
   * @param {string|Date} value - Date value
   * @returns {string} ISO date string
   */
  parseDate(value) {
    if (!value) return new Date().toISOString();
    
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Try parsing as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // Try parsing DD/MM/YYYY format
    const match = String(value).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return new Date(year, month - 1, day).toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * Export data to CSV
   * @param {Array<Object>} data - Data to export
   * @param {string} filename - Output filename
   */
  exportToCSV(data, filename = 'export.csv') {
    if (data.length === 0) {
      throw new Error('אין נתונים לייצוא');
    }

    // Get headers
    const headers = Object.keys(data[0]);
    
    // Build CSV
    let csv = headers.join(',') + '\n';
    
    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header] ?? '';
        
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        
        return value;
      });
      
      csv += values.join(',') + '\n';
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export data to Excel
   * @param {Array<Object>} data - Data to export
   * @param {string} filename - Output filename
   */
  exportToExcel(data, filename = 'export.xlsx') {
    if (typeof XLSX === 'undefined') {
      throw new Error('ספריית XLSX לא נטענה');
    }

    if (data.length === 0) {
      throw new Error('אין נתונים לייצוא');
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Write file
    XLSX.writeFile(wb, filename);
  }

  /**
   * Get file extension
   * @param {string} filename - File name
   * @returns {string} Extension without dot
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  /**
   * Validate data structure
   * @param {Array<Object>} data - Data to validate
   * @returns {Object} Validation result
   */
  validateDataStructure(data) {
    const errors = [];

    if (!Array.isArray(data)) {
      errors.push('הנתונים חייבים להיות מערך');
      return { valid: false, errors };
    }

    if (data.length === 0) {
      errors.push('אין נתונים');
      return { valid: false, errors };
    }

    // Check if all rows have the same keys
    const firstRowKeys = Object.keys(data[0]).sort();
    for (let i = 1; i < data.length; i++) {
      const rowKeys = Object.keys(data[i]).sort();
      if (JSON.stringify(rowKeys) !== JSON.stringify(firstRowKeys)) {
        this.warnings.push(`שורה ${i + 1} יש מבנה שונה מהשורה הראשונה`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: this.warnings
    };
  }
}

export default ExcelParser;

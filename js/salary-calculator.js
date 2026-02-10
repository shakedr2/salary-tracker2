/**
 * Salary Calculator Module
 * Israeli salary calculator with 2026 tax rates
 */

// 2026 Israeli Tax Brackets (in ILS per month)
export const TAX_BRACKETS = [
  { min: 0, max: 7010, rate: 10 },
  { min: 7010, max: 10080, rate: 14 },
  { min: 10080, max: 16170, rate: 20 },
  { min: 16170, max: 22440, rate: 31 },
  { min: 22440, max: 47440, rate: 35 },
  { min: 47440, max: 81320, rate: 47 },
  { min: 81320, max: Infinity, rate: 50 }
];

// National Insurance Rates (in %)
export const NATIONAL_INSURANCE_RATES = {
  employee: 3.95,
  employer: 3.55
};

// Health Insurance Rates (in %)
export const HEALTH_INSURANCE = {
  employee: 3.1,
  employer: 5.0
};

// Pension Rates (in %)
export const PENSION_RATES = {
  employee: 6.0,
  employer: 8.33
};

/**
 * Salary Calculator Class
 */
export class SalaryCalculator {
  /**
   * Calculate income tax
   * @param {number} grossSalary - Gross monthly salary
   * @returns {number} Income tax amount
   */
  static calculateIncomeTax(grossSalary) {
    let tax = 0;
    let remaining = grossSalary;
    
    for (const bracket of TAX_BRACKETS) {
      if (remaining <= 0) break;
      
      const taxableInBracket = Math.min(
        remaining,
        bracket.max === Infinity ? remaining : bracket.max - bracket.min
      );
      
      tax += (taxableInBracket * bracket.rate) / 100;
      remaining -= taxableInBracket;
    }
    
    return tax;
  }

  /**
   * Calculate national insurance
   * @param {number} grossSalary - Gross monthly salary
   * @param {string} type - 'employee' or 'employer'
   * @returns {number} National insurance amount
   */
  static calculateNationalInsurance(grossSalary, type = 'employee') {
    const rate = NATIONAL_INSURANCE_RATES[type] || NATIONAL_INSURANCE_RATES.employee;
    return (grossSalary * rate) / 100;
  }

  /**
   * Calculate health insurance
   * @param {number} grossSalary - Gross monthly salary
   * @param {string} type - 'employee' or 'employer'
   * @returns {number} Health insurance amount
   */
  static calculateHealthInsurance(grossSalary, type = 'employee') {
    const rate = HEALTH_INSURANCE[type] || HEALTH_INSURANCE.employee;
    return (grossSalary * rate) / 100;
  }

  /**
   * Calculate pension contribution
   * @param {number} grossSalary - Gross monthly salary
   * @param {string} type - 'employee' or 'employer'
   * @returns {number} Pension amount
   */
  static calculatePension(grossSalary, type = 'employee') {
    const rate = PENSION_RATES[type] || PENSION_RATES.employee;
    return (grossSalary * rate) / 100;
  }

  /**
   * Calculate gross to net salary
   * @param {number} grossSalary - Gross monthly salary
   * @param {Object} options - Calculation options
   * @returns {Object} Detailed salary breakdown
   */
  static grossToNet(grossSalary, options = {}) {
    const {
      includePension = true,
      includeNationalInsurance = true,
      includeHealthInsurance = true
    } = options;

    const incomeTax = this.calculateIncomeTax(grossSalary);
    const nationalInsurance = includeNationalInsurance 
      ? this.calculateNationalInsurance(grossSalary, 'employee') 
      : 0;
    const healthInsurance = includeHealthInsurance 
      ? this.calculateHealthInsurance(grossSalary, 'employee') 
      : 0;
    const pension = includePension 
      ? this.calculatePension(grossSalary, 'employee') 
      : 0;

    const totalDeductions = incomeTax + nationalInsurance + healthInsurance + pension;
    const netSalary = grossSalary - totalDeductions;

    // Calculate employer costs
    const employerNationalInsurance = includeNationalInsurance 
      ? this.calculateNationalInsurance(grossSalary, 'employer') 
      : 0;
    const employerHealthInsurance = includeHealthInsurance 
      ? this.calculateHealthInsurance(grossSalary, 'employer') 
      : 0;
    const employerPension = includePension 
      ? this.calculatePension(grossSalary, 'employer') 
      : 0;

    const totalEmployerCost = grossSalary + employerNationalInsurance + 
                              employerHealthInsurance + employerPension;

    return {
      grossSalary,
      netSalary,
      deductions: {
        incomeTax,
        nationalInsurance,
        healthInsurance,
        pension,
        total: totalDeductions
      },
      employerCosts: {
        nationalInsurance: employerNationalInsurance,
        healthInsurance: employerHealthInsurance,
        pension: employerPension,
        total: totalEmployerCost
      },
      effectiveTaxRate: (totalDeductions / grossSalary) * 100,
      marginalTaxRate: this.getMarginalTaxRate(grossSalary)
    };
  }

  /**
   * Calculate net to gross salary (iterative method)
   * @param {number} netSalary - Desired net monthly salary
   * @param {Object} options - Calculation options
   * @param {number} maxIterations - Maximum iterations for convergence
   * @returns {Object} Detailed salary breakdown
   */
  static netToGross(netSalary, options = {}, maxIterations = 20) {
    let grossEstimate = netSalary * 1.5; // Initial estimate
    let tolerance = 0.01;
    
    for (let i = 0; i < maxIterations; i++) {
      const result = this.grossToNet(grossEstimate, options);
      const difference = result.netSalary - netSalary;
      
      if (Math.abs(difference) < tolerance) {
        return result;
      }
      
      // Adjust estimate
      grossEstimate -= difference;
    }
    
    // Return best estimate
    return this.grossToNet(grossEstimate, options);
  }

  /**
   * Get marginal tax rate for salary
   * @param {number} grossSalary - Gross monthly salary
   * @returns {number} Marginal tax rate percentage
   */
  static getMarginalTaxRate(grossSalary) {
    for (const bracket of TAX_BRACKETS) {
      if (grossSalary <= bracket.max) {
        return bracket.rate;
      }
    }
    return TAX_BRACKETS[TAX_BRACKETS.length - 1].rate;
  }

  /**
   * Calculate effective tax rate
   * @param {number} grossSalary - Gross monthly salary
   * @returns {number} Effective tax rate percentage
   */
  static getEffectiveTaxRate(grossSalary) {
    const result = this.grossToNet(grossSalary);
    return result.effectiveTaxRate;
  }

  /**
   * Calculate annual salary breakdown
   * @param {number} monthlySalary - Monthly gross salary
   * @param {number} months - Number of months (default: 12)
   * @returns {Object} Annual breakdown
   */
  static calculateAnnual(monthlySalary, months = 12) {
    const monthlyResult = this.grossToNet(monthlySalary);
    
    return {
      annual: {
        grossSalary: monthlyResult.grossSalary * months,
        netSalary: monthlyResult.netSalary * months,
        incomeTax: monthlyResult.deductions.incomeTax * months,
        nationalInsurance: monthlyResult.deductions.nationalInsurance * months,
        healthInsurance: monthlyResult.deductions.healthInsurance * months,
        pension: monthlyResult.deductions.pension * months,
        totalDeductions: monthlyResult.deductions.total * months,
        employerCost: monthlyResult.employerCosts.total * months
      },
      monthly: monthlyResult
    };
  }

  /**
   * Calculate bonus tax
   * @param {number} bonusAmount - Bonus amount
   * @param {number} regularSalary - Regular monthly salary
   * @returns {Object} Bonus tax breakdown
   */
  static calculateBonusTax(bonusAmount, regularSalary) {
    // Israeli bonus tax is calculated on the total (salary + bonus)
    const totalGross = regularSalary + bonusAmount;
    const totalResult = this.grossToNet(totalGross);
    const regularResult = this.grossToNet(regularSalary);
    
    const bonusTax = totalResult.deductions.incomeTax - regularResult.deductions.incomeTax;
    const bonusNet = bonusAmount - bonusTax;
    
    return {
      bonusGross: bonusAmount,
      bonusNet,
      bonusTax,
      effectiveBonusRate: (bonusTax / bonusAmount) * 100,
      totalGross,
      totalNet: totalResult.netSalary,
      totalTax: totalResult.deductions.incomeTax
    };
  }

  /**
   * Compare two salaries
   * @param {number} salary1 - First salary
   * @param {number} salary2 - Second salary
   * @returns {Object} Comparison results
   */
  static compareSalaries(salary1, salary2) {
    const result1 = this.grossToNet(salary1);
    const result2 = this.grossToNet(salary2);
    
    return {
      salary1: result1,
      salary2: result2,
      differences: {
        gross: salary2 - salary1,
        net: result2.netSalary - result1.netSalary,
        tax: result2.deductions.total - result1.deductions.total,
        grossPercentage: ((salary2 - salary1) / salary1) * 100,
        netPercentage: ((result2.netSalary - result1.netSalary) / result1.netSalary) * 100
      }
    };
  }

  /**
   * Calculate salary increase impact
   * @param {number} currentSalary - Current salary
   * @param {number} increasePercentage - Increase percentage
   * @returns {Object} Increase impact analysis
   */
  static calculateIncreaseImpact(currentSalary, increasePercentage) {
    const newSalary = currentSalary * (1 + increasePercentage / 100);
    const comparison = this.compareSalaries(currentSalary, newSalary);
    
    return {
      current: comparison.salary1,
      new: comparison.salary2,
      increase: {
        percentage: increasePercentage,
        grossAmount: comparison.differences.gross,
        netAmount: comparison.differences.net,
        netPercentage: comparison.differences.netPercentage,
        additionalTax: comparison.differences.tax
      }
    };
  }

  /**
   * Calculate take-home percentage
   * @param {number} grossSalary - Gross salary
   * @returns {number} Take-home percentage
   */
  static getTakeHomePercentage(grossSalary) {
    const result = this.grossToNet(grossSalary);
    return (result.netSalary / grossSalary) * 100;
  }

  /**
   * Find salary for target net amount
   * @param {number} targetNet - Target net salary
   * @param {Object} options - Calculation options
   * @returns {Object} Salary breakdown
   */
  static findGrossForNet(targetNet, options = {}) {
    return this.netToGross(targetNet, options);
  }

  /**
   * Calculate hourly rate
   * @param {number} monthlySalary - Monthly salary
   * @param {number} hoursPerMonth - Working hours per month (default: 186)
   * @returns {Object} Hourly rate breakdown
   */
  static calculateHourlyRate(monthlySalary, hoursPerMonth = 186) {
    const result = this.grossToNet(monthlySalary);
    
    return {
      grossHourly: monthlySalary / hoursPerMonth,
      netHourly: result.netSalary / hoursPerMonth,
      monthly: result
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create employee calculator with default settings
 * @returns {Object} Calculator functions
 */
export function createEmployeeCalculator() {
  return {
    grossToNet: (gross) => SalaryCalculator.grossToNet(gross, {
      includePension: true,
      includeNationalInsurance: true,
      includeHealthInsurance: true
    }),
    netToGross: (net) => SalaryCalculator.netToGross(net, {
      includePension: true,
      includeNationalInsurance: true,
      includeHealthInsurance: true
    })
  };
}

/**
 * Create self-employed calculator
 * @returns {Object} Calculator functions
 */
export function createSelfEmployedCalculator() {
  return {
    grossToNet: (gross) => {
      const result = SalaryCalculator.grossToNet(gross, {
        includePension: false,
        includeNationalInsurance: true,
        includeHealthInsurance: true
      });
      
      // Self-employed pay both employee and employer portions
      result.deductions.nationalInsurance = 
        SalaryCalculator.calculateNationalInsurance(gross, 'employee') +
        SalaryCalculator.calculateNationalInsurance(gross, 'employer');
      
      result.deductions.total = 
        result.deductions.incomeTax +
        result.deductions.nationalInsurance +
        result.deductions.healthInsurance;
      
      result.netSalary = gross - result.deductions.total;
      
      return result;
    }
  };
}

/**
 * Create contractor calculator (no deductions)
 * @returns {Object} Calculator functions
 */
export function createContractorCalculator() {
  return {
    grossToNet: (gross) => {
      return {
        grossSalary: gross,
        netSalary: gross,
        deductions: {
          incomeTax: 0,
          nationalInsurance: 0,
          healthInsurance: 0,
          pension: 0,
          total: 0
        },
        effectiveTaxRate: 0,
        marginalTaxRate: 0,
        note: 'Contractor - responsible for own taxes'
      };
    }
  };
}

export default SalaryCalculator;

# מעקב שכר - Salary Tracker

מעקב ומחשבון שכר מתקדם עם מיסוי ישראלי 2026

## תכונות

✅ מחשבון שכר (ברוטו ↔ נטו) עם שיעורי מס ישראליים 2026  
✅ ייבוא קבצי Excel/CSV עם אימות  
✅ דשבורד עם סטטיסטיקות  
✅ ניהול מצב מתקדם עם undo/redo  
✅ תמיכה ב-PWA עם עבודה אופליין  
✅ החלפת ערכת נושא (בהיר/כהה)  
✅ עיצוב רספונסיבי  
✅ אינטגרציה עם AI (מוכן)  
✅ ניווט מבוסס טאבים  
✅ התראות Toast  
✅ קיצורי דרך במקלדת  
✅ שמירה ב-LocalStorage  
✅ Service Worker עם caching  
✅ גרירה ושחרור לקבצים  
✅ אימות נתונים

## הרצת האפליקציה

### באמצעות Python
```bash
python3 -m http.server 8000
```

### באמצעות Node.js
```bash
npx serve .
```

### באמצעות PHP
```bash
php -S localhost:8000
```

לאחר מכן, פתח את הדפדפן בכתובת: `http://localhost:8000`

## מבנה הפרויקט

```
salary-tracker2/
├── index.html              # אפליקציה ראשית
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker
├── css/
│   └── style.css          # עיצוב מלא
└── js/
    ├── config.js          # הגדרות
    ├── utils.js           # פונקציות עזר
    ├── state-manager.js   # ניהול מצב
    ├── salary-calculator.js # מחשבון שכר
    ├── validators.js      # אימותים
    ├── excel-parser.js    # מנתח Excel/CSV
    ├── ai-service.js      # שירות AI
    └── components/
        └── tab-manager.js # ניהול טאבים
```

## שיעורי מס 2026

| טווח הכנסה חודשי (₪) | שיעור מס |
|---------------------|----------|
| 0 - 7,010          | 10%      |
| 7,010 - 10,080     | 14%      |
| 10,080 - 16,170    | 20%      |
| 16,170 - 22,440    | 31%      |
| 22,440 - 47,440    | 35%      |
| 47,440 - 81,320    | 47%      |
| 81,320+            | 50%      |

### ניכויים נוספים
- ביטוח לאומי: 3.95% (עובד), 3.55% (מעביד)
- ביטוח בריאות: 3.1% (עובד), 5% (מעביד)
- פנסיה: 6% (עובד), 8.33% (מעביד)

## דוגמת שימוש

### חישוב שכר
```javascript
import SalaryCalculator from './js/salary-calculator.js';

// חישוב ברוטו לנטו
const result = SalaryCalculator.grossToNet(15000);
console.log(result.netSalary); // ~10,792 ₪

// חישוב נטו לברוטו
const result2 = SalaryCalculator.netToGross(10000);
console.log(result2.grossSalary); // ~13,900 ₪
```

### ייבוא Excel
```javascript
import ExcelParser from './js/excel-parser.js';

const parser = new ExcelParser();
const result = await parser.parseSalaryFile(file);
console.log(result.salaryRecords);
```

## תכונות מתקדמות

### ניהול מצב
```javascript
import StateManager from './js/state-manager.js';

const state = new StateManager();
state.set('records', [...]);
state.undo(); // ביטול
state.redo(); // חזרה
```

### אימות
```javascript
import { validateSalary } from './js/validators.js';

const validation = validateSalary(15000);
if (!validation.valid) {
  console.error(validation.errors);
}
```

## טכנולוגיות

- **ES6 Modules** - ארכיטקטורה מודולרית
- **Service Worker** - PWA ועבודה אופליין
- **LocalStorage** - שמירת נתונים
- **SheetJS** - עיבוד Excel
- **Hebrew Support** - RTL ועברית מלאה

## אבטחה

- הצפנת מפתחות API
- אימות קלט
- בדיקת גודל קבצים
- הגנה מפני XSS
- CSP headers (מומלץ להגדיר בשרת)

## תאימות דפדפנים

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## רישיון

MIT License

## תרומה

תרומות מתקבלות בברכה! אנא פתח Issue או Pull Request.

## יצירת קשר

לשאלות ותמיכה, אנא פתח Issue בגיטהאב.

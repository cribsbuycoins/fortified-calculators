# Buy & Hold Calculator Rebuild Spec

## Changes Required

### 1. Logo
- Use real Fortified color logo: `assets/fortified-logo-color.png` (for dark background header)
- Use white logo: `assets/fortified-logo-white.png` (for dark background, smaller contexts)
- Base64 versions in `assets/fortified-logo-color-base64.txt` and `assets/fortified-logo-white-base64.txt`
- Replace ALL SVG placeholder logos with the real PNG logo
- For the header: use the white logo (it works better at small sizes on dark backgrounds)
- For the PDF: use the color logo on white background

### 2. Footer Contact Info
- Phone: (508) 691-8035 (format as tel:+15086918035)
- NO personal email — remove david@fortifiedrealty.net entirely
- Google My Business review link: https://g.page/r/CbFCYN2LnvC7EAE/review
- Keep "Contact Fortified Realty Group" (not "Contact David Ferreira")
- Keep "Fortified Realty Group, LLC — Fall River, MA"

### 3. Input Styling
- REMOVE all mustard/yellow styling from inputs
- Inputs should be clean white text on a subtle dark background
- Input background: #1e293b (slate-800)
- Input border: #475569 (slate-600)
- Input text: #ffffff (white)
- Labels: #94a3b8 (slate-400, muted gray)
- Focus border: #38bdf8 (teal accent)
- Keep the section headers teal

### 4. Number Formatting
- ALL dollar inputs must show with $ and commas: $350,000 not 350000
- Format on blur (when user leaves the field)
- Strip formatting on focus (so user can type raw numbers)
- Computed values always show formatted: $2,096 etc.

### 5. Income Column — No Scrolling
- Remove the scrollable container (units-scroll class)
- Make the income section static, same as expenses and debt service
- All 20 units show, no scroll

### 6. Buying Range Analysis Table (THE BIG FEATURE)
This is the core value of the sheet. Below the single-deal results, add:

**Three new inputs (in a row above the table):**
- Lowest Offer (default: same as Purchase Price)
- Asking Price (default: Purchase Price + $50K)
- Highest Offer (default: Asking Price + $50K)

**Desired Return Thresholds (small inputs to the right):**
- Min DSCR (default: 1.25)
- Min Cap Rate % (default: 7.00)
- Min Cash on Cash % (default: 5.00)

**The table:**
- Determine increment: if (Highest - Lowest) > $100,000 → $10,000 increments, else $5,000
- Generate columns from Lowest to Highest at that increment
- Each column shows:
  - Purchase Price (header row, bold)
  - Mortgage Amount
  - Down Payment
  - Closing Costs
  - Total Cash to Close
  - Monthly Debt Service (P+I)
  - Yearly Debt Service (P+I)
  - Monthly Cash Flow
  - DSCR
  - Cap Rate
  - Cash on Cash Return

**Conditional formatting on the bottom 4 rows (Cash Flow, DSCR, Cap Rate, CoC):**
- GREEN background: value meets or exceeds the desired threshold
- YELLOW background: value is within 20% below threshold  
- RED background: value is more than 20% below threshold
- The Asking Price column should be highlighted/distinguished (slightly different header styling)

**Also show Monthly NOI and Yearly NOI above the table:**
- Monthly NOI = Total Monthly Income - Total Monthly Expenses
- Yearly NOI = Monthly NOI × 12

### 7. PDF — Light Mode for Printing
- White background (#ffffff)
- Dark text (#1a1a1a)
- Real Fortified color logo at top left (from base64)
- Teal accents for headers (#00344D brand primary)
- The buying range table should be included in the PDF
- Footer: Fortified Realty Group, LLC | (508) 691-8035 | Fall River, MA
- NO dark mode, NO black background — this gets printed on paper

## Spreadsheet Formulas Reference
From the Google Sheet data:
- Ins/Tax Monthly = (Insurance + Taxes) / 12
- Vacancy Monthly = Total Monthly Income × (Vacancy% / 100)
- Management Monthly = Total Monthly Income × (Management% / 100)
- Reserves Monthly = Total Monthly Income × (Reserves% / 100)
- Total Monthly Expenses = sum of all monthly expenses
- Mortgage Amount = Purchase Price × (LTV / 100)
- Down Payment = Purchase Price - Mortgage Amount
- Closing Costs = Purchase Price × (Closing Cost% / 100)
- Total Cash to Close = Down Payment + Closing Costs
- Monthly P+I = standard amortization: M = P[r(1+r)^n] / [(1+r)^n - 1]
- Monthly Cash Flow = Total Monthly Income - Total Monthly Expenses - Monthly P+I
- DSCR = (Total Monthly Income - Total Monthly Expenses) / Monthly P+I
- Cap Rate = ((Total Yearly Income - Total Yearly Expenses) / Purchase Price) × 100
- Cash on Cash = ((Monthly Cash Flow × 12) / Total Cash to Close) × 100

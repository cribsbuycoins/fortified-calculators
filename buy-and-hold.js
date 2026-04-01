// ===== BUY & HOLD ANALYZER — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

  // ===== CONFIGURATION =====
  const NUM_UNITS = 20;

  // ===== HELPERS =====
  function parseNum(val) {
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  function fmt(n) {
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return (n < 0 ? '-$' : '$') + formatted;
  }

  function fmtPct(n) {
    return n.toFixed(2) + '%';
  }

  function fmtRatio(n) {
    return n.toFixed(2) + 'x';
  }

  // ===== GENERATE UNIT INPUTS =====
  const unitsContainer = document.getElementById('unitsContainer');
  if (unitsContainer) {
    let html = '';
    for (let i = 1; i <= NUM_UNITS; i++) {
      const padded = String(i).padStart(2, '0');
      html += `
        <div class="input-row">
          <label for="unit${i}">Unit ${padded}</label>
          <input type="text" id="unit${i}" value="" placeholder="$0" inputmode="numeric" class="unit-input">
        </div>`;
    }
    unitsContainer.innerHTML = html;
  }

  // ===== CALCULATE =====
  function calculate() {
    // --- Income ---
    let totalRent = 0;
    for (let i = 1; i <= NUM_UNITS; i++) {
      const el = document.getElementById('unit' + i);
      if (el) totalRent += parseNum(el.value);
    }
    const otherIncome = parseNum(document.getElementById('otherIncome')?.value);
    const totalMonthlyIncome = totalRent + otherIncome;
    const totalYearlyIncome = totalMonthlyIncome * 12;

    // --- Expenses ---
    const insurance = parseNum(document.getElementById('insurance')?.value);
    const taxes = parseNum(document.getElementById('taxes')?.value);
    const insTaxMonthly = (insurance + taxes) / 12;

    const vacancyPct = parseNum(document.getElementById('vacancyPct')?.value) / 100;
    const vacancyMonthly = totalMonthlyIncome * vacancyPct;

    const managementPct = parseNum(document.getElementById('managementPct')?.value) / 100;
    const managementMonthly = totalMonthlyIncome * managementPct;

    const reservesPct = parseNum(document.getElementById('reservesPct')?.value) / 100;
    const reservesMonthly = totalMonthlyIncome * reservesPct;

    const electric = parseNum(document.getElementById('electric')?.value);
    const waterSewer = parseNum(document.getElementById('waterSewer')?.value);
    const snow = parseNum(document.getElementById('snow')?.value);
    const repairs = parseNum(document.getElementById('repairs')?.value);
    const pmi = parseNum(document.getElementById('pmi')?.value);
    const other1 = parseNum(document.getElementById('other1')?.value);
    const other2 = parseNum(document.getElementById('other2')?.value);
    const other3 = parseNum(document.getElementById('other3')?.value);
    const other4 = parseNum(document.getElementById('other4')?.value);

    const totalMonthlyExpenses = insTaxMonthly + vacancyMonthly + managementMonthly + reservesMonthly +
      electric + waterSewer + snow + repairs + pmi + other1 + other2 + other3 + other4;
    const totalYearlyExpenses = totalMonthlyExpenses * 12;

    // --- Debt Service ---
    const purchasePrice = parseNum(document.getElementById('purchasePrice')?.value);
    const ltvPct = parseNum(document.getElementById('ltv')?.value) / 100;
    const interestRate = parseNum(document.getElementById('interestRate')?.value) / 100;
    const closingCostPct = parseNum(document.getElementById('closingCostPct')?.value) / 100;
    const loanMonths = parseNum(document.getElementById('loanMonths')?.value);

    const mortgageAmount = purchasePrice * ltvPct;
    const downPayment = purchasePrice - mortgageAmount;
    const closingCosts = purchasePrice * closingCostPct;
    const totalCashToClose = downPayment + closingCosts;

    // Monthly P+I (standard amortization)
    let monthlyPI = 0;
    if (mortgageAmount > 0 && interestRate > 0 && loanMonths > 0) {
      const r = interestRate / 12;
      const n = loanMonths;
      monthlyPI = mortgageAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else if (mortgageAmount > 0 && loanMonths > 0) {
      monthlyPI = mortgageAmount / loanMonths;
    }
    const yearlyPI = monthlyPI * 12;

    // --- Results ---
    const monthlyCashFlow = totalMonthlyIncome - totalMonthlyExpenses - monthlyPI;
    const yearlyCashFlow = monthlyCashFlow * 12;

    const noi = totalYearlyIncome - totalYearlyExpenses;
    const dscr = monthlyPI > 0 ? (totalMonthlyIncome - totalMonthlyExpenses) / monthlyPI : 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    const cashOnCash = totalCashToClose > 0 ? (yearlyCashFlow / totalCashToClose) * 100 : 0;

    // ===== UPDATE DOM =====
    setText('totalMonthlyIncome', fmt(totalMonthlyIncome));
    setText('insTaxMonthly', fmt(Math.round(insTaxMonthly)));
    setText('vacancyMonthly', fmt(Math.round(vacancyMonthly)));
    setText('managementMonthly', fmt(Math.round(managementMonthly)));
    setText('reservesMonthly', fmt(Math.round(reservesMonthly)));
    setText('totalMonthlyExpenses', fmt(Math.round(totalMonthlyExpenses)));

    setText('mortgageAmount', fmt(mortgageAmount));
    setText('downPayment', fmt(downPayment));
    setText('closingCosts', fmt(closingCosts));
    setText('totalCashToClose', fmt(totalCashToClose));
    setText('monthlyPI', fmt(Math.round(monthlyPI)));
    setText('yearlyPI', fmt(Math.round(yearlyPI)));

    // Results with conditional formatting
    setResult('monthlyCashFlow', fmt(Math.round(monthlyCashFlow)), monthlyCashFlow);
    setResult('dscr', fmtRatio(dscr), dscr - 1.25);
    setResult('capRate', fmtPct(capRate), capRate - 6);
    setResult('cashOnCash', fmtPct(cashOnCash), cashOnCash - 8);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setResult(id, val, indicator) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.className = 'result-value ' + (indicator >= 0 ? 'positive' : 'negative');
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', (e) => {
    if (e.target.matches('input[type="text"]') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // ===== RESET =====
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('.unit-input').forEach(el => { el.value = ''; });
      document.getElementById('otherIncome').value = '0';
      document.getElementById('insurance').value = '3000';
      document.getElementById('taxes').value = '6000';
      document.getElementById('vacancyPct').value = '10';
      document.getElementById('managementPct').value = '10';
      document.getElementById('reservesPct').value = '3';
      document.getElementById('electric').value = '50';
      document.getElementById('waterSewer').value = '0';
      document.getElementById('snow').value = '0';
      document.getElementById('repairs').value = '200';
      document.getElementById('pmi').value = '0';
      document.getElementById('other1').value = '0';
      document.getElementById('other2').value = '0';
      document.getElementById('other3').value = '0';
      document.getElementById('other4').value = '0';
      document.getElementById('purchasePrice').value = '350000';
      document.getElementById('ltv').value = '90';
      document.getElementById('interestRate').value = '7';
      document.getElementById('closingCostPct').value = '3';
      document.getElementById('loanMonths').value = '360';
      document.getElementById('address').value = '';
      calculate();
    });
  }

  // ===== SAVE AS PDF =====
  const pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', generatePDF);
  }

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const W = 215.9;
    const margin = 16;
    const cw = W - margin * 2;
    let y = 16;

    // Colors
    const darkBg = [2, 6, 23];
    const surfaceBg = [15, 23, 42];
    const teal = [56, 189, 248];
    const white = [226, 232, 240];
    const muted = [148, 163, 184];
    const green = [34, 197, 94];
    const red = [239, 68, 68];
    const gold = [234, 179, 8];

    // Background
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, W, 279.4, 'F');

    // Teal bar
    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 3, 'F');

    // Header
    y = 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...teal);
    doc.text('FORTIFIED REALTY GROUP', margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text('Real Estate Calculators  |  Buy & Hold Analyzer', margin, y);

    // Address
    const address = document.getElementById('address')?.value || 'No address provided';
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(...gold);
    doc.text('PROPERTY ADDRESS', margin, y);
    y += 5;
    doc.setFontSize(12);
    doc.setTextColor(...white);
    doc.text(address, margin, y);

    // Divider
    y += 6;
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 8;

    // === RESULTS SUMMARY ===
    doc.setFillColor(...surfaceBg);
    doc.roundedRect(margin, y, cw, 28, 2, 2, 'F');
    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 28, 2, 2, 'S');

    const cols = [
      { label: 'Monthly Cash Flow', id: 'monthlyCashFlow' },
      { label: 'DSCR', id: 'dscr' },
      { label: 'Cap Rate', id: 'capRate' },
      { label: 'Cash on Cash', id: 'cashOnCash' }
    ];

    const colW = cw / 4;
    cols.forEach((col, i) => {
      const cx = margin + colW * i + colW / 2;
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(col.label.toUpperCase(), cx, y + 8, { align: 'center' });

      const el = document.getElementById(col.id);
      const val = el?.textContent || '--';
      const isNeg = el?.classList.contains('negative');
      doc.setFontSize(16);
      doc.setTextColor(...(isNeg ? red : green));
      doc.text(val, cx, y + 20, { align: 'center' });
    });

    y += 36;

    // === THREE COLUMNS: INCOME | EXPENSES | DEBT ===
    const thirdW = (cw - 8) / 3;

    function drawSection(x, title, rows, total) {
      doc.setFillColor(...surfaceBg);
      const sectionH = 8 + rows.length * 5.5 + 10;
      doc.roundedRect(x, y, thirdW, sectionH, 2, 2, 'F');

      // Header
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(x, y, thirdW, 8, 2, 2, 'F');
      doc.rect(x, y + 4, thirdW, 4, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), x + 4, y + 5.5);

      let ry = y + 12;
      rows.forEach(row => {
        doc.setFontSize(7);
        doc.setTextColor(...(row.computed ? muted : gold));
        doc.text(row.label, x + 4, ry);
        doc.setTextColor(...white);
        doc.text(row.value, x + thirdW - 4, ry, { align: 'right' });
        ry += 5.5;
      });

      // Total bar
      doc.setFillColor(30, 41, 59);
      doc.rect(x, ry, thirdW, 8, 'F');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(total.label.toUpperCase(), x + 4, ry + 5.5);
      doc.setFontSize(10);
      doc.setTextColor(...white);
      doc.text(total.value, x + thirdW - 4, ry + 5.5, { align: 'right' });

      return sectionH;
    }

    // Income rows
    const incomeRows = [];
    for (let i = 1; i <= NUM_UNITS; i++) {
      const el = document.getElementById('unit' + i);
      const v = parseNum(el?.value);
      if (v > 0) incomeRows.push({ label: `Unit ${String(i).padStart(2, '0')}`, value: fmt(v) });
    }
    const otherInc = parseNum(document.getElementById('otherIncome')?.value);
    if (otherInc > 0) incomeRows.push({ label: 'Other', value: fmt(otherInc) });
    if (incomeRows.length === 0) incomeRows.push({ label: 'No units entered', value: '$0', computed: true });

    const expRows = [
      { label: 'Insurance (Yr)', value: '$' + parseNum(document.getElementById('insurance')?.value).toLocaleString() },
      { label: 'Taxes (Yr)', value: '$' + parseNum(document.getElementById('taxes')?.value).toLocaleString() },
      { label: 'Ins/Tax (Mo.)', value: document.getElementById('insTaxMonthly')?.textContent, computed: true },
      { label: 'Vacancy', value: document.getElementById('vacancyMonthly')?.textContent, computed: true },
      { label: 'Management', value: document.getElementById('managementMonthly')?.textContent, computed: true },
      { label: 'Reserves', value: document.getElementById('reservesMonthly')?.textContent, computed: true },
      { label: 'Electric', value: fmt(parseNum(document.getElementById('electric')?.value)) },
      { label: 'Repairs', value: fmt(parseNum(document.getElementById('repairs')?.value)) },
    ];

    const debtRows = [
      { label: 'Purchase Price', value: fmt(parseNum(document.getElementById('purchasePrice')?.value)) },
      { label: 'LTV', value: document.getElementById('ltv')?.value + '%' },
      { label: 'Rate', value: document.getElementById('interestRate')?.value + '%' },
      { label: 'Term', value: document.getElementById('loanMonths')?.value + ' mo.' },
      { label: 'Mortgage', value: document.getElementById('mortgageAmount')?.textContent, computed: true },
      { label: 'Down Payment', value: document.getElementById('downPayment')?.textContent, computed: true },
      { label: 'Closing Costs', value: document.getElementById('closingCosts')?.textContent, computed: true },
      { label: 'Cash to Close', value: document.getElementById('totalCashToClose')?.textContent, computed: true },
      { label: 'Monthly P+I', value: document.getElementById('monthlyPI')?.textContent, computed: true },
    ];

    const maxRows = Math.max(incomeRows.length, expRows.length, debtRows.length);
    // Pad arrays
    while (incomeRows.length < maxRows) incomeRows.push({ label: '', value: '' });
    while (expRows.length < maxRows) expRows.push({ label: '', value: '' });
    while (debtRows.length < maxRows) debtRows.push({ label: '', value: '' });

    const x1 = margin;
    const x2 = margin + thirdW + 4;
    const x3 = margin + (thirdW + 4) * 2;

    drawSection(x1, 'Income', incomeRows, { label: 'Mo. Income', value: document.getElementById('totalMonthlyIncome')?.textContent || '$0' });
    drawSection(x2, 'Expenses', expRows, { label: 'Mo. Expenses', value: document.getElementById('totalMonthlyExpenses')?.textContent || '$0' });
    drawSection(x3, 'Debt Service', debtRows, { label: 'Mo. P+I', value: document.getElementById('monthlyPI')?.textContent || '$0' });

    // Footer
    const fy = 262;
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.5);
    doc.line(margin, fy, W - margin, fy);
    doc.setFontSize(8);
    doc.setTextColor(...teal);
    doc.text('Fortified Realty Group, LLC', margin, fy + 5);
    doc.setTextColor(...muted);
    doc.text('Fall River, MA  |  (508) 762-4777  |  david@fortifiedrealty.net', margin, fy + 10);
    doc.setFontSize(6);
    doc.text('This analysis is for informational purposes only. Not financial advice. Always consult with qualified professionals.', margin, fy + 15);

    // Date
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(today, W - margin, fy + 5, { align: 'right' });

    // Save
    const addrClean = (document.getElementById('address')?.value || 'analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-BuyHold-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

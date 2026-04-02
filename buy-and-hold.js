// ===== BUY & HOLD ANALYZER — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

  const NUM_UNITS = 20;

  // ===== NUMBER FORMATTING =====
  function parseNum(val) {
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  function fmt(n) {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toLocaleString('en-US');
    return (n < 0 ? '-$' : '$') + formatted;
  }

  function fmtPct(n) { return n.toFixed(2) + '%'; }
  function fmtRatio(n) { return n.toFixed(2) + 'x'; }

  function formatMoneyInput(el) {
    const val = parseNum(el.value);
    if (val === 0 && el.classList.contains('unit-input')) {
      el.value = '';
    } else {
      el.value = fmt(val);
    }
  }

  function stripMoneyInput(el) {
    const val = parseNum(el.value);
    if (val === 0 && el.classList.contains('unit-input')) {
      el.value = '';
    } else {
      el.value = val;
    }
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
          <input type="text" id="unit${i}" value="" placeholder="$0" inputmode="numeric" class="unit-input money-input">
        </div>`;
    }
    unitsContainer.insertAdjacentHTML('beforeend', html);
  }

  // ===== MONEY INPUT EVENT HANDLERS =====
  document.querySelectorAll('.money-input').forEach(el => {
    el.addEventListener('focus', () => stripMoneyInput(el));
    el.addEventListener('blur', () => formatMoneyInput(el));
  });

  // ===== AUTO-FILL RANGE FROM LIST PRICE =====
  function syncRangeFromListPrice() {
    const lp = parseNum(document.getElementById('purchasePrice')?.value);
    if (lp > 0) {
      const lowEl = document.getElementById('lowestOffer');
      const highEl = document.getElementById('highestOffer');
      const askEl = document.getElementById('askingPrice');
      if (lowEl) lowEl.value = fmt(lp - 50000);
      if (highEl) highEl.value = fmt(lp + 50000);
      if (askEl) askEl.value = fmt(lp);
      calculate();
    }
  }

  const listPriceEl = document.getElementById('purchasePrice');
  if (listPriceEl) {
    listPriceEl.addEventListener('change', syncRangeFromListPrice);
    listPriceEl.addEventListener('blur', () => {
      formatMoneyInput(listPriceEl);
      syncRangeFromListPrice();
    });
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

    // --- NOI ---
    const monthlyNOI = totalMonthlyIncome - totalMonthlyExpenses;
    const yearlyNOI = monthlyNOI * 12;

    // --- Debt Service (at List Price) ---
    const listPrice = parseNum(document.getElementById('purchasePrice')?.value);
    const ltvPct = parseNum(document.getElementById('ltv')?.value) / 100;
    const interestRate = parseNum(document.getElementById('interestRate')?.value) / 100;
    const closingCostPct = parseNum(document.getElementById('closingCostPct')?.value) / 100;
    const loanMonths = parseNum(document.getElementById('loanMonths')?.value);

    const mortgageAmount = listPrice * ltvPct;
    const downPayment = listPrice - mortgageAmount;
    const closingCosts = listPrice * closingCostPct;
    const totalCashToClose = downPayment + closingCosts;

    let monthlyPI = 0;
    if (mortgageAmount > 0 && interestRate > 0 && loanMonths > 0) {
      const r = interestRate / 12;
      const n = loanMonths;
      monthlyPI = mortgageAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else if (mortgageAmount > 0 && loanMonths > 0) {
      monthlyPI = mortgageAmount / loanMonths;
    }
    const yearlyPI = monthlyPI * 12;

    // --- Results (at List Price) ---
    const monthlyCashFlow = totalMonthlyIncome - totalMonthlyExpenses - monthlyPI;
    const noi = totalYearlyIncome - totalYearlyExpenses;
    const dscr = monthlyPI > 0 ? (totalMonthlyIncome - totalMonthlyExpenses) / monthlyPI : 0;
    const capRate = listPrice > 0 ? (noi / listPrice) * 100 : 0;
    const cashOnCash = totalCashToClose > 0 ? ((monthlyCashFlow * 12) / totalCashToClose) * 100 : 0;

    // ===== UPDATE DOM =====
    setText('totalMonthlyIncome', fmt(totalMonthlyIncome));
    setText('insTaxMonthly', fmt(Math.round(insTaxMonthly)));
    setText('vacancyMonthly', fmt(Math.round(vacancyMonthly)));
    setText('managementMonthly', fmt(Math.round(managementMonthly)));
    setText('reservesMonthly', fmt(Math.round(reservesMonthly)));
    setText('totalMonthlyExpenses', fmt(Math.round(totalMonthlyExpenses)));
    setText('monthlyNOI', fmt(Math.round(monthlyNOI)));
    setText('yearlyNOI', fmt(Math.round(yearlyNOI)));
    setText('mortgageAmount', fmt(mortgageAmount));
    setText('downPayment', fmt(downPayment));
    setText('closingCosts', fmt(closingCosts));
    setText('totalCashToClose', fmt(totalCashToClose));
    setText('monthlyPI', fmt(Math.round(monthlyPI)));
    setText('yearlyPI', fmt(Math.round(yearlyPI)));

    setResult('monthlyCashFlow', fmt(Math.round(monthlyCashFlow)), monthlyCashFlow);
    setResult('dscr', fmtRatio(dscr), dscr - 1.25);
    setResult('capRate', fmtPct(capRate), capRate - 6);
    setResult('cashOnCash', fmtPct(cashOnCash), cashOnCash - 8);

    buildRangeTable(totalMonthlyIncome, totalMonthlyExpenses, ltvPct, interestRate, closingCostPct, loanMonths);
    generateDealSummary({
      monthlyCashFlow, dscr, capRate, cashOnCash,
      totalMonthlyIncome, totalMonthlyExpenses, monthlyPI,
      listPrice, totalCashToClose,
      vacancyPct: parseNum(document.getElementById('vacancyPct')?.value),
      managementPct: parseNum(document.getElementById('managementPct')?.value)
    });
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

  // ===== BUYING RANGE TABLE — 7 FIXED COLUMNS =====
  function calcPI(principal, monthlyRate, months) {
    if (principal <= 0 || months <= 0) return 0;
    if (monthlyRate <= 0) return principal / months;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  }

  function buildRangeTable(totalMonthlyIncome, totalMonthlyExpenses, ltvPct, interestRate, closingCostPct, loanMonths) {
    const low = parseNum(document.getElementById('lowestOffer')?.value);
    const asking = parseNum(document.getElementById('askingPrice')?.value);
    const high = parseNum(document.getElementById('highestOffer')?.value);
    const minDSCR = parseFloat(document.getElementById('minDSCR')?.value) || 1.25;
    const minCapRate = parseNum(document.getElementById('minCapRate')?.value);
    const minCoC = parseNum(document.getElementById('minCoC')?.value);

    if (low <= 0 || high <= 0 || high <= low || asking <= low || asking >= high) return;

    // 7 columns: Low, 2 between low-ask, Ask, 2 between ask-high, High
    const lowStep = (asking - low) / 3;
    const highStep = (high - asking) / 3;
    const prices = [
      Math.round(low),
      Math.round(low + lowStep),
      Math.round(low + lowStep * 2),
      Math.round(asking),
      Math.round(asking + highStep),
      Math.round(asking + highStep * 2),
      Math.round(high)
    ];

    const monthlyRate = interestRate / 12;
    const monthlyNOI = totalMonthlyIncome - totalMonthlyExpenses;
    const yearlyNOI = monthlyNOI * 12;

    const rows = {
      'Purchase Price': [],
      'Mortgage Amount': [],
      'Down Payment': [],
      'Closing Costs': [],
      'Total Cash to Close': [],
      'Monthly P+I': [],
      'Yearly P+I': [],
      'Monthly Cash Flow': [],
      'DSCR': [],
      'Cap Rate': [],
      'Cash on Cash Return': []
    };

    prices.forEach(price => {
      const mortgage = price * ltvPct;
      const dp = price - mortgage;
      const cc = price * closingCostPct;
      const cashToClose = dp + cc;
      const pi = calcPI(mortgage, monthlyRate, loanMonths);
      const cashFlow = monthlyNOI - pi;
      const dscr = pi > 0 ? monthlyNOI / pi : 0;
      const capR = price > 0 ? (yearlyNOI / price) * 100 : 0;
      const coc = cashToClose > 0 ? ((cashFlow * 12) / cashToClose) * 100 : 0;

      rows['Purchase Price'].push(fmt(price));
      rows['Mortgage Amount'].push(fmt(Math.round(mortgage)));
      rows['Down Payment'].push(fmt(Math.round(dp)));
      rows['Closing Costs'].push(fmt(Math.round(cc)));
      rows['Total Cash to Close'].push(fmt(Math.round(cashToClose)));
      rows['Monthly P+I'].push(fmt(Math.round(pi)));
      rows['Yearly P+I'].push(fmt(Math.round(pi * 12)));
      rows['Monthly Cash Flow'].push({ val: fmt(Math.round(cashFlow)), raw: cashFlow, threshold: 0 });
      rows['DSCR'].push({ val: fmtRatio(dscr), raw: dscr, threshold: minDSCR });
      rows['Cap Rate'].push({ val: fmtPct(capR), raw: capR, threshold: minCapRate });
      rows['Cash on Cash Return'].push({ val: fmtPct(coc), raw: coc, threshold: minCoC });
    });

    // Render
    const thead = document.getElementById('rangeHead');
    const tbody = document.getElementById('rangeBody');

    let headHtml = '<tr><th>Metric</th>';
    prices.forEach((price, i) => {
      const isAsking = i === 3; // The 4th column (index 3) is always the list/asking price
      headHtml += `<th${isAsking ? ' class="asking-col"' : ''}>${fmt(price)}</th>`;
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let bodyHtml = '';
    const condRows = ['Monthly Cash Flow', 'DSCR', 'Cap Rate', 'Cash on Cash Return'];

    Object.keys(rows).forEach(label => {
      const isCond = condRows.includes(label);
      bodyHtml += `<tr${isCond ? ' class="results-row"' : ''}>`;
      bodyHtml += `<td>${label}</td>`;
      rows[label].forEach((cell, i) => {
        if (isCond && typeof cell === 'object') {
          const cls = getCondClass(cell.raw, cell.threshold);
          bodyHtml += `<td class="${cls}">${cell.val}</td>`;
        } else {
          bodyHtml += `<td>${typeof cell === 'object' ? cell.val : cell}</td>`;
        }
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  function getCondClass(value, threshold) {
    if (threshold === 0) {
      return value >= 0 ? 'cond-green' : 'cond-red';
    }
    if (value >= threshold) return 'cond-green';
    if (value >= threshold * 0.8) return 'cond-yellow';
    return 'cond-red';
  }

  // ===== DEAL SUMMARY =====
  function generateDealSummary({ monthlyCashFlow, dscr, capRate, cashOnCash, totalMonthlyIncome, totalMonthlyExpenses, monthlyPI, listPrice, totalCashToClose, vacancyPct, managementPct }) {
    const summaryEl = document.getElementById('dealSummary');
    const textEl = document.getElementById('dealSummaryText');
    if (!summaryEl || !textEl) return;

    // Determine scoring tier
    const isStrong = monthlyCashFlow > 0 && dscr >= 1.25 && capRate >= 7 && cashOnCash >= 10;
    const isDecent = !isStrong && monthlyCashFlow > 0 && dscr >= 1.0 && capRate >= 5;
    const isBad = monthlyCashFlow <= 0 || dscr < 1.0;

    // Read buying range data to find break-even and highest profitable price
    const rangeTable = document.getElementById('rangeTable');
    let breakEvenPrice = null;
    let highestProfitablePrice = null;
    let lowestOfferVal = parseNum(document.getElementById('lowestOffer')?.value);
    let allRangeNegative = true;

    if (rangeTable && rangeTable.rows.length > 1) {
      const headRow = rangeTable.querySelector('thead tr');
      const priceHeaders = headRow ? Array.from(headRow.querySelectorAll('th')).slice(1).map(th => parseNum(th.textContent)) : [];
      const cashFlowRow = Array.from(rangeTable.querySelectorAll('tbody tr')).find(tr => tr.cells[0]?.textContent.trim() === 'Monthly Cash Flow');
      if (cashFlowRow && priceHeaders.length) {
        const cfCells = Array.from(cashFlowRow.querySelectorAll('td')).slice(1);
        cfCells.forEach((td, i) => {
          const cfVal = parseNum(td.textContent);
          if (cfVal > 0) {
            allRangeNegative = false;
            highestProfitablePrice = priceHeaders[i];
          } else if (cfVal <= 0 && breakEvenPrice === null && highestProfitablePrice !== null) {
            breakEvenPrice = priceHeaders[i - 1] || highestProfitablePrice;
          }
        });
        // If first column is already negative, breakEvenPrice stays null
        if (allRangeNegative) {
          breakEvenPrice = null;
          highestProfitablePrice = null;
        } else if (breakEvenPrice === null && highestProfitablePrice !== null) {
          // All columns are profitable
          breakEvenPrice = highestProfitablePrice;
        }
      }
    }

    const sentences = [];

    if (isStrong) {
      sentences.push(`At the list price of ${fmt(listPrice)}, this property generates ${fmt(Math.round(monthlyCashFlow))}/month in cash flow with a ${capRate.toFixed(2)}% cap rate and ${cashOnCash.toFixed(2)}% cash-on-cash return.`);
      sentences.push(`The debt service coverage ratio of ${dscr.toFixed(2)}x gives you solid cushion above the 1.25x lender threshold.`);
      if (highestProfitablePrice !== null) {
        sentences.push(`Looking across the buying range, the deal stays cash flow positive all the way up to ${fmt(highestProfitablePrice)}.`);
      }
      sentences.push(`Double check your rent assumptions and expense estimates — if these numbers hold, this looks like a solid buy and hold.`);
    } else if (isDecent) {
      sentences.push(`At ${fmt(listPrice)}, you\'re looking at ${fmt(Math.round(monthlyCashFlow))}/month in cash flow, but the margins are tight.`);
      sentences.push(`Your DSCR of ${dscr.toFixed(2)}x is close to the 1.25x threshold most lenders want to see — not much room for error.`);
      if (capRate < 7) {
        sentences.push(`The ${capRate.toFixed(2)}% cap rate is below the 7% benchmark. This deal leans on your financing terms more than the property\'s income.`);
      }
      if (breakEvenPrice !== null) {
        sentences.push(`In the buying range, the deal starts to go negative above ${fmt(breakEvenPrice)}. You\'d want to come in closer to ${fmt(lowestOfferVal)} to build in some safety margin.`);
      }
    } else {
      // Bad deal
      sentences.push(`At the list price of ${fmt(listPrice)}, this deal shows negative cash flow of ${fmt(Math.round(monthlyCashFlow))}/month. The numbers don\'t work at this price.`);
      if (dscr < 1.0) {
        sentences.push(`Your DSCR is ${dscr.toFixed(2)}x — below 1.0 means the property\'s income doesn\'t cover the debt service.`);
      }
      if (!allRangeNegative && breakEvenPrice !== null) {
        sentences.push(`Looking at the range, you\'d need to get this closer to ${fmt(breakEvenPrice)} before the numbers start working.`);
      } else {
        sentences.push(`Even at the lowest offer of ${fmt(lowestOfferVal)}, cash flow is still negative. The income doesn\'t support any purchase price in this range given your financing terms.`);
      }
    }

    // Additional smart observations
    const totalVacMgmt = vacancyPct + managementPct;
    if (totalVacMgmt > 25) {
      sentences.push(`Note: your vacancy and management assumptions total ${totalVacMgmt}% — that\'s conservative, which is good for underwriting but may understate actual performance.`);
    }
    if (cashOnCash > 30) {
      sentences.push(`A ${cashOnCash.toFixed(2)}% cash-on-cash return is unusually strong — make sure your rent estimates are realistic and not overstated.`);
    }
    if (totalCashToClose > 0 && totalCashToClose < 20000) {
      sentences.push(`With only ${fmt(Math.round(totalCashToClose))} out of pocket, you\'re getting in light. That\'s great for returns but leaves less equity cushion.`);
    }

    // Set class and text
    summaryEl.className = 'deal-summary ' + (isStrong ? 'positive' : isBad ? 'negative' : 'caution');
    textEl.innerHTML = sentences.join(' ');
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
      const defaults = {
        otherIncome: '$0', insurance: '$3,000', taxes: '$6,000',
        vacancyPct: '10', managementPct: '10', reservesPct: '3',
        electric: '$50', waterSewer: '$0', snow: '$0', repairs: '$200',
        pmi: '$0', other1: '$0', other2: '$0', other3: '$0', other4: '$0',
        purchasePrice: '$350,000', ltv: '90', interestRate: '7',
        closingCostPct: '3', loanMonths: '360', address: '',
        lowestOffer: '$300,000', askingPrice: '$350,000', highestOffer: '$400,000',
        minDSCR: '1.25', minCapRate: '7', minCoC: '5'
      };
      Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      calculate();
    });
  }

  // ===== SAVE AS PDF — LIGHT MODE WITH FULL DATA =====
  const pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const W = 279.4;
    const H = 215.9;
    const margin = 12;
    const cw = W - margin * 2;
    let y = margin;

    // Colors — Light mode
    const teal = [0, 52, 77];
    const tealLight = [1, 104, 145];
    const darkText = [26, 26, 26];
    const mutedText = [100, 100, 100];
    const lightBg = [245, 247, 250];
    const white = [255, 255, 255];
    const green = [22, 101, 52];
    const greenBg = [220, 252, 231];
    const yellow = [133, 100, 0];
    const yellowBg = [254, 249, 195];
    const red = [153, 27, 27];
    const redBg = [254, 226, 226];

    // White background
    doc.setFillColor(...white);
    doc.rect(0, 0, W, H, 'F');

    // Teal bar
    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 3, 'F');

    // Logo — use print version with gray "Realty Group LLC" for white paper
    try {
      doc.addImage('./assets/fortified-logo-print.png', 'PNG', margin, y + 1, 50, 9);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...teal);
      doc.text('FORTIFIED REALTY GROUP', margin, y + 8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.text('Buy & Hold Analyzer', W - margin, y + 5, { align: 'right' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    // Address
    const address = document.getElementById('address')?.value || 'No address provided';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...darkText);
    doc.text(address, margin, y);
    y += 4;

    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // ===== THREE-COLUMN DATA SUMMARY =====
    const thirdW = (cw - 8) / 3;
    const colX = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    function drawDataBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), x, startY);

      let iy = startY + 4;
      items.forEach(item => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        const tc = item.bold ? teal : mutedText;
        doc.setTextColor(tc[0], tc[1], tc[2]);
        if (item.bold) doc.setFont('helvetica', 'bold');
        doc.text(item.label, x, iy);
        doc.setTextColor(...darkText);
        doc.text(item.value, x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    // Collect income data
    const incomeItems = [];
    for (let i = 1; i <= NUM_UNITS; i++) {
      const v = parseNum(document.getElementById('unit' + i)?.value);
      if (v > 0) incomeItems.push({ label: `Unit ${String(i).padStart(2, '0')}`, value: fmt(v) });
    }
    const otherVal = parseNum(document.getElementById('otherIncome')?.value);
    if (otherVal > 0) incomeItems.push({ label: 'Other Income', value: fmt(otherVal) });
    incomeItems.push({ label: 'MONTHLY INCOME', value: document.getElementById('totalMonthlyIncome')?.textContent || '$0', bold: true });

    // Expense data
    const expenseItems = [
      { label: 'Insurance (Annual)', value: '$' + parseNum(document.getElementById('insurance')?.value).toLocaleString() },
      { label: 'Taxes (Annual)', value: '$' + parseNum(document.getElementById('taxes')?.value).toLocaleString() },
      { label: 'Ins/Tax (Monthly)', value: document.getElementById('insTaxMonthly')?.textContent },
      { label: 'Vacancy (' + document.getElementById('vacancyPct')?.value + '%)', value: document.getElementById('vacancyMonthly')?.textContent },
      { label: 'Management (' + document.getElementById('managementPct')?.value + '%)', value: document.getElementById('managementMonthly')?.textContent },
      { label: 'Reserves (' + document.getElementById('reservesPct')?.value + '%)', value: document.getElementById('reservesMonthly')?.textContent },
      { label: 'Electric', value: fmt(parseNum(document.getElementById('electric')?.value)) },
      { label: 'Repairs', value: fmt(parseNum(document.getElementById('repairs')?.value)) },
      { label: 'MONTHLY EXPENSES', value: document.getElementById('totalMonthlyExpenses')?.textContent || '$0', bold: true }
    ];

    // Debt data
    const debtItems = [
      { label: 'List Price', value: fmt(parseNum(document.getElementById('purchasePrice')?.value)) },
      { label: 'LTV', value: document.getElementById('ltv')?.value + '%' },
      { label: 'Interest Rate', value: document.getElementById('interestRate')?.value + '%' },
      { label: 'Closing Cost', value: document.getElementById('closingCostPct')?.value + '%' },
      { label: 'Loan Term', value: document.getElementById('loanMonths')?.value + ' months' },
      { label: 'Mortgage Amount', value: document.getElementById('mortgageAmount')?.textContent },
      { label: 'Down Payment', value: document.getElementById('downPayment')?.textContent },
      { label: 'Closing Costs', value: document.getElementById('closingCosts')?.textContent },
      { label: 'CASH TO CLOSE', value: document.getElementById('totalCashToClose')?.textContent || '$0', bold: true }
    ];

    drawDataBlock(colX[0], 'Income', incomeItems, y);
    drawDataBlock(colX[1], 'Expenses', expenseItems, y);
    const endY = drawDataBlock(colX[2], 'Debt Service', debtItems, y);

    y = Math.max(endY, y + incomeItems.length * 3.5 + 6, y + expenseItems.length * 3.5 + 6) + 3;

    // === RESULTS SUMMARY BAR ===
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'F');
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'S');

    const results = [
      { label: 'Monthly NOI', value: document.getElementById('monthlyNOI')?.textContent },
      { label: 'Monthly Cash Flow', value: document.getElementById('monthlyCashFlow')?.textContent },
      { label: 'DSCR', value: document.getElementById('dscr')?.textContent },
      { label: 'Cap Rate', value: document.getElementById('capRate')?.textContent },
      { label: 'Cash on Cash', value: document.getElementById('cashOnCash')?.textContent },
      { label: 'Cash to Close', value: document.getElementById('totalCashToClose')?.textContent }
    ];

    const rColW = cw / results.length;
    results.forEach((r, i) => {
      const cx = margin + rColW * i + rColW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(...mutedText);
      doc.text(r.label.toUpperCase(), cx, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...teal);
      doc.text(r.value || '--', cx, y + 12, { align: 'center' });
    });

    y += 20;

    // === BUYING RANGE TABLE ===
    const table = document.getElementById('rangeTable');
    if (table && table.rows.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...teal);
      doc.text('BUYING RANGE ANALYSIS', margin, y);
      y += 3;

      const headers = [];
      const headRow = table.querySelector('thead tr');
      if (headRow) {
        headRow.querySelectorAll('th').forEach(th => headers.push(th.textContent));
      }

      const bodyData = [];
      const cellStyles = {};
      table.querySelectorAll('tbody tr').forEach((tr, ri) => {
        const row = [];
        tr.querySelectorAll('td').forEach((td, ci) => {
          row.push(td.textContent);
          if (td.classList.contains('cond-green')) {
            if (!cellStyles[ri]) cellStyles[ri] = {};
            cellStyles[ri][ci] = { fillColor: greenBg, textColor: green };
          } else if (td.classList.contains('cond-yellow')) {
            if (!cellStyles[ri]) cellStyles[ri] = {};
            cellStyles[ri][ci] = { fillColor: yellowBg, textColor: yellow };
          } else if (td.classList.contains('cond-red')) {
            if (!cellStyles[ri]) cellStyles[ri] = {};
            cellStyles[ri][ci] = { fillColor: redBg, textColor: red };
          }
        });
        bodyData.push(row);
      });

      doc.autoTable({
        head: [headers],
        body: bodyData,
        startY: y,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          textColor: darkText,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          font: 'helvetica',
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: teal,
          textColor: white,
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 34, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            const style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
          // Highlight asking/list price column header
          if (data.section === 'head' && data.column.index === 4) {
            data.cell.styles.fillColor = tealLight;
          }
        }
      });
    }

    // Footer position
    const fy = H - 10;

    // === BOTTOM ZONE: Deal Summary (left) + QR Code (right) ===
    const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 2 : y + 2;
    const bottomZoneTop = afterTableY;
    const bottomZoneBottom = fy - 2;
    const bottomZoneHeight = bottomZoneBottom - bottomZoneTop;

    // QR code box on the right
    const qrSize = 18;
    const qrX = W - margin - qrSize;
    const qrY = bottomZoneBottom - qrSize - 4;
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.4);
    doc.setFillColor(...lightBg);
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...mutedText);
    doc.text('Scan for', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    doc.text('tutorial', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });

    // Deal summary text box on the left
    const dealSummaryText = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryText && dealSummaryText !== 'Enter your numbers above to see a plain English analysis.' && bottomZoneHeight > 10) {
      const summaryBoxWidth = qrX - margin - 6;

      doc.setDrawColor(...tealLight);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, bottomZoneTop, summaryBoxWidth, bottomZoneHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text('DEAL SUMMARY', margin + 3, bottomZoneTop + 5);

      const textAreaHeight = bottomZoneHeight - 8;
      const textWidth = summaryBoxWidth - 6;
      let fontSize = 6.5;
      let splitText;
      for (const trySize of [6.5, 6, 5.5, 5, 4.5]) {
        doc.setFontSize(trySize);
        splitText = doc.splitTextToSize(dealSummaryText, textWidth);
        if (splitText.length * (trySize * 0.45) <= textAreaHeight) { fontSize = trySize; break; }
        fontSize = trySize;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText, margin + 3, bottomZoneTop + 9);
    }

    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, W - margin, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...teal);
    doc.text('Fortified Realty Group, LLC', margin, fy + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    doc.text('One North Main Street, Fall River, MA 02720  |  (508) 691-8035  |  fortifiedrealty.net', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis is for informational purposes only. Not financial advice. Consult with qualified professionals before making investment decisions.', margin, fy + 7.5);

    const addrClean = (document.getElementById('address')?.value || 'analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-BuyHold-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

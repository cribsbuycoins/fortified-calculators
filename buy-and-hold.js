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

  // Format input value on blur
  function formatMoneyInput(el) {
    const val = parseNum(el.value);
    if (val === 0 && el.classList.contains('unit-input')) {
      el.value = '';
    } else {
      el.value = fmt(val);
    }
  }

  // Strip formatting on focus
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
    const noi = totalYearlyIncome - totalYearlyExpenses;
    const dscr = monthlyPI > 0 ? (totalMonthlyIncome - totalMonthlyExpenses) / monthlyPI : 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
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

    // --- Build Buying Range Table ---
    buildRangeTable(totalMonthlyIncome, totalMonthlyExpenses, ltvPct, interestRate, closingCostPct, loanMonths);
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

  // ===== BUYING RANGE TABLE =====
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

    if (low <= 0 || high <= 0 || high <= low) return;

    const spread = high - low;
    const increment = spread > 100000 ? 10000 : 5000;
    const prices = [];
    for (let p = low; p <= high; p += increment) {
      prices.push(p);
    }
    if (prices[prices.length - 1] !== high) prices.push(high);

    const monthlyRate = interestRate / 12;
    const monthlyNOI = totalMonthlyIncome - totalMonthlyExpenses;
    const yearlyNOI = monthlyNOI * 12;

    // Build table data
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
    prices.forEach(price => {
      const isAsking = Math.abs(price - asking) < increment / 2;
      headHtml += `<th${isAsking ? ' class="asking-col"' : ''}>${fmt(price)}</th>`;
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let bodyHtml = '';
    const condRows = ['Monthly Cash Flow', 'DSCR', 'Cap Rate', 'Cash on Cash Return'];

    Object.keys(rows).forEach(label => {
      const isCond = condRows.includes(label);
      const isResult = isCond;
      bodyHtml += `<tr${isResult ? ' class="results-row"' : ''}>`;
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
      // Cash flow: green if positive, red if negative
      return value >= 0 ? 'cond-green' : 'cond-red';
    }
    if (value >= threshold) return 'cond-green';
    if (value >= threshold * 0.8) return 'cond-yellow';
    return 'cond-red';
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
        lowestOffer: '$350,000', askingPrice: '$400,000', highestOffer: '$450,000',
        minDSCR: '1.25', minCapRate: '7', minCoC: '5'
      };
      Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      calculate();
    });
  }

  // ===== SAVE AS PDF — LIGHT MODE =====
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

    // Teal bar at top
    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 3, 'F');

    // Logo — embed the color logo
    try {
      doc.addImage('./assets/fortified-logo-color.png', 'PNG', margin, y + 1, 50, 9);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...teal);
      doc.text('FORTIFIED REALTY GROUP', margin, y + 8);
    }

    // Right side: subtitle + date
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
    y += 5;

    // Divider
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // === RESULTS SUMMARY BAR ===
    doc.setFillColor(...lightBg);
    doc.roundedRect(margin, y, cw, 18, 2, 2, 'F');
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 18, 2, 2, 'S');

    const results = [
      { label: 'Monthly NOI', value: document.getElementById('monthlyNOI')?.textContent },
      { label: 'Monthly Cash Flow', value: document.getElementById('monthlyCashFlow')?.textContent },
      { label: 'DSCR', value: document.getElementById('dscr')?.textContent },
      { label: 'Cap Rate', value: document.getElementById('capRate')?.textContent },
      { label: 'Cash on Cash', value: document.getElementById('cashOnCash')?.textContent },
      { label: 'Cash to Close', value: document.getElementById('totalCashToClose')?.textContent }
    ];

    const colW = cw / results.length;
    results.forEach((r, i) => {
      const cx = margin + colW * i + colW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...mutedText);
      doc.text(r.label.toUpperCase(), cx, y + 6, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...teal);
      doc.text(r.value || '--', cx, y + 13, { align: 'center' });
    });

    y += 23;

    // === BUYING RANGE TABLE ===
    const table = document.getElementById('rangeTable');
    if (table && table.rows.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...teal);
      doc.text('BUYING RANGE ANALYSIS', margin, y);
      y += 4;

      // Extract table data
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
          fontSize: 6.5,
          cellPadding: 1.5,
          textColor: darkText,
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
          font: 'helvetica',
          halign: 'right',
          valign: 'middle'
        },
        headStyles: {
          fillColor: teal,
          textColor: white,
          fontStyle: 'bold',
          fontSize: 6,
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 32, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            const style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
    }

    // Footer
    const fy = H - 10;
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, W - margin, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...teal);
    doc.text('Fortified Realty Group, LLC', margin, fy + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    doc.text('Fall River, MA  |  (508) 691-8035', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis is for informational purposes only. Not financial advice. Consult with qualified professionals before making investment decisions.', margin, fy + 7.5);

    // Save
    const addrClean = (document.getElementById('address')?.value || 'analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-BuyHold-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

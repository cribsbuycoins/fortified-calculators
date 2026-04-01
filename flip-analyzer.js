// ===== FLIP ANALYZER — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

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

  function formatMoneyInput(el) {
    const val = parseNum(el.value);
    el.value = fmt(val);
  }

  function stripMoneyInput(el) {
    const val = parseNum(el.value);
    el.value = val === 0 ? '0' : val;
  }

  document.querySelectorAll('.money-input').forEach(el => {
    el.addEventListener('focus', () => stripMoneyInput(el));
    el.addEventListener('blur', () => formatMoneyInput(el));
  });

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getVal(id) {
    return parseNum(document.getElementById(id)?.value);
  }

  // ===== MONTHS CONFIG: 2 through 16 =====
  const MONTHS = [2, 4, 6, 8, 10, 12, 14, 16];
  const MONTH_LABELS = MONTHS.map(m => m + ' Mo.');

  // ===== CALCULATE =====
  function calculate() {

    // --- Entry Strategy Inputs ---
    const purchasePrice      = getVal('purchasePrice');
    const rehab              = getVal('rehab');
    const closingInLoan      = getVal('closingInLoan');
    const hmlPointsPct       = getVal('hmlPoints');
    const hmlRatePct         = getVal('hmlRate');
    const hmlLtvPct          = getVal('hmlLtv');
    const otherUpFront       = getVal('otherUpFront');
    const addlRehabNotInLoan = getVal('addlRehabNotInLoan');
    const helocRatePct       = getVal('helocRate');
    const helocAmount        = getVal('helocAmount');

    // --- Holding Cost Inputs ---
    const taxesAnnual        = getVal('taxesAnnual');
    const insuranceAnnual    = getVal('insuranceAnnual');
    const utilitiesMonthly   = getVal('utilitiesMonthly');
    const otherCostAnnual    = getVal('otherCostAnnual');
    const otherCostMonthly   = getVal('otherCostMonthly');

    // --- Exit Strategy Inputs ---
    const arvLow             = getVal('arvLow');
    const arvHigh            = getVal('arvHigh');
    const brokerFeePct       = getVal('brokerFee');
    const otherClosingPct    = getVal('otherClosingPct');

    // ===== ENTRY STRATEGY CALCS =====
    const totalCostBasis = purchasePrice + rehab + closingInLoan;
    const hmlLoan        = totalCostBasis * (hmlLtvPct / 100);
    const pointsUpFront  = hmlLoan * (hmlPointsPct / 100);
    const hmlCashToClose = totalCostBasis - hmlLoan;

    // Cash needed before HELOC offset
    const cashNeeded = hmlCashToClose + pointsUpFront + otherUpFront + addlRehabNotInLoan;

    // HELOC offsets the cash to close
    const adjustedCashToClose = Math.max(0, cashNeeded - helocAmount);

    // Left Over HELOC = whatever HELOC remains after covering cash to close
    const helocUsedForClose = Math.min(helocAmount, cashNeeded);
    const leftOverHeloc     = helocAmount - helocUsedForClose;

    // ===== HOLDING COSTS =====
    const helocPayment     = helocAmount * (helocRatePct / 100) / 12;
    const hmlPayment       = hmlLoan * (hmlRatePct / 100) / 12;
    const totalMonthlyDebt = helocPayment + hmlPayment;
    const monthlyCarryCost = totalMonthlyDebt
                           + (taxesAnnual / 12)
                           + (insuranceAnnual / 12)
                           + utilitiesMonthly
                           + (otherCostAnnual / 12)
                           + otherCostMonthly;

    // ===== EXIT STRATEGY =====
    const totalSellingPct = brokerFeePct + otherClosingPct;

    // ===== UPDATE DOM =====
    setText('totalCostBasis',      fmt(totalCostBasis));
    setText('pointsUpFront',       fmt(Math.round(pointsUpFront)));
    setText('hmlLoan',             fmt(Math.round(hmlLoan)));
    setText('hmlCashToClose',      fmt(Math.round(hmlCashToClose)));
    setText('leftOverHeloc',       fmt(Math.round(leftOverHeloc)));
    setText('adjustedCashToClose', fmt(Math.round(adjustedCashToClose)));
    setText('helocPayment',        fmt(Math.round(helocPayment)));
    setText('hmlPayment',          fmt(Math.round(hmlPayment)));
    setText('totalMonthlyDebt',    fmt(Math.round(totalMonthlyDebt)));
    setText('monthlyCarryCost',    fmt(Math.round(monthlyCarryCost)));
    setText('totalSellingPct',     fmtPct(totalSellingPct));

    // ===== PER-MONTH SUMMARY DATA =====
    // HELOC leftover covers holding costs until depleted
    const summaryData = MONTHS.map(m => {
      const totalHoldingCosts = monthlyCarryCost * m;
      // leftOverHeloc can cover holding costs
      const helocUsedAfterClosing = Math.min(leftOverHeloc, totalHoldingCosts);
      const netCashInDeal = adjustedCashToClose + totalHoldingCosts - helocUsedAfterClosing;
      // HELOC balance owed = what was drawn for close + what was drawn for holding
      const helocBalanceOwed = helocUsedForClose + helocUsedAfterClosing;

      return {
        totalHoldingCosts,
        helocUsedAfterClosing,
        netCashInDeal,
        helocBalanceOwed,
        hmlOwed: hmlLoan
      };
    });

    // ===== ARV ROWS — max 10, evenly spaced =====
    const arvRows = [];
    if (arvLow > 0 && arvHigh > arvLow) {
      const spread = arvHigh - arvLow;
      // 10 rows means 9 intervals
      const rawStep = spread / 9;
      // Round step to nearest clean number (1000, 2500, 5000, 10000, etc.)
      const step = rawStep <= 1000 ? 1000
                 : rawStep <= 2500 ? 2500
                 : rawStep <= 5000 ? 5000
                 : rawStep <= 10000 ? 10000
                 : rawStep <= 25000 ? 25000
                 : 50000;
      for (let arv = arvLow; arv <= arvHigh + 0.01; arv += step) {
        arvRows.push(Math.round(arv));
        if (arvRows.length >= 10) break;
      }
      // Ensure the high end is always included
      if (arvRows[arvRows.length - 1] !== Math.round(arvHigh)) {
        if (arvRows.length >= 10) arvRows[9] = Math.round(arvHigh);
        else arvRows.push(Math.round(arvHigh));
      }
    } else if (arvLow > 0 && arvHigh === arvLow) {
      arvRows.push(Math.round(arvLow));
    }

    // ===== BUILD ALL TABLES =====
    buildProfitTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
    buildSummaryTable(summaryData);
    buildCoCTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
  }

  // ===== GROSS PROFIT FOR A GIVEN ARV AND MONTH INDEX =====
  function calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    const m = MONTHS[mi];
    const totalHoldingCosts = monthlyCarryCost * m;
    const sellingCosts = arv * (totalSellingPct / 100);
    const helocUsedAfterClosing = Math.min(leftOverHeloc, totalHoldingCosts);
    // helocBalanceOwed = what was used at close + what was used for holding
    const helocUsedForClose = helocAmount - leftOverHeloc;
    const helocBalanceOwed = helocUsedForClose + helocUsedAfterClosing;
    // Gross Profit = Sale Price - Selling Costs - HELOC Payback - HML Balance - Holding Costs - Up Front Cash
    const grossProfit = arv - sellingCosts - helocBalanceOwed - hmlLoan - totalHoldingCosts - adjustedCashToClose;
    return grossProfit;
  }

  // ===== PROFIT MATRIX TABLE =====
  function buildProfitTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    const thead = document.getElementById('profitHead');
    const tbody = document.getElementById('profitBody');
    if (!thead || !tbody) return;

    let headHtml = '<tr><th>ARV</th>';
    MONTH_LABELS.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    let bodyHtml = '';
    arvRows.forEach(arv => {
      bodyHtml += '<tr>';
      bodyHtml += `<td>${fmt(arv)}</td>`;
      MONTHS.forEach((m, mi) => {
        const gp = calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
        const cls = gp >= 0 ? 'cond-green' : 'cond-red';
        bodyHtml += `<td class="${cls}">${fmt(Math.round(gp))}</td>`;
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== SUMMARY TABLE =====
  function buildSummaryTable(summaryData) {
    const thead = document.getElementById('summaryHead');
    const tbody = document.getElementById('summaryBody');
    if (!thead || !tbody) return;

    let headHtml = '<tr><th>Summary</th>';
    MONTH_LABELS.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    const rows = [
      { label: 'Total Holding Costs', key: 'totalHoldingCosts' },
      { label: 'HELOC Used After Closing', key: 'helocUsedAfterClosing', negate: true },
      { label: 'Net Cash In Deal', key: 'netCashInDeal', bold: true },
      { label: 'HELOC Balance Owed', key: 'helocBalanceOwed' },
      { label: 'HML Owed', key: 'hmlOwed' }
    ];

    let bodyHtml = '';
    rows.forEach(row => {
      const cls = row.bold ? ' class="results-row"' : '';
      const style = row.bold ? ' style="font-weight:700;"' : '';
      bodyHtml += `<tr${cls}>`;
      bodyHtml += `<td${style}>${row.label}</td>`;
      summaryData.forEach(d => {
        let val = d[row.key];
        // Show HELOC Used as negative (money coming in)
        if (row.negate && val > 0) val = -val;
        bodyHtml += `<td${style}>${fmt(Math.round(val))}</td>`;
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== CASH ON CASH TABLE =====
  function buildCoCTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    const thead = document.getElementById('cocHead');
    const tbody = document.getElementById('cocBody');
    if (!thead || !tbody) return;

    let headHtml = '<tr><th>ARV</th>';
    MONTH_LABELS.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Add Net Cash In Deal row at bottom
    let bodyHtml = '';
    arvRows.forEach(arv => {
      bodyHtml += '<tr>';
      bodyHtml += `<td>${fmt(arv)}</td>`;
      MONTHS.forEach((m, mi) => {
        const gp = calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
        const netCash = summaryData[mi].netCashInDeal;
        const coc = netCash > 0 ? (gp / netCash) * 100 : (gp > 0 ? 999 : 0);

        let cls;
        if (coc >= 20) cls = 'cond-green';
        else if (coc >= 10) cls = 'cond-yellow';
        else cls = 'cond-red';

        bodyHtml += `<td class="${cls}">${fmtPct(coc)}</td>`;
      });
      bodyHtml += '</tr>';
    });

    // Net Cash In Deal footer row
    bodyHtml += '<tr class="results-row">';
    bodyHtml += '<td style="font-weight:700;">Net Cash In Deal</td>';
    summaryData.forEach(d => {
      bodyHtml += `<td style="font-weight:700;">${fmt(Math.round(d.netCashInDeal))}</td>`;
    });
    bodyHtml += '</tr>';

    tbody.innerHTML = bodyHtml;
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
      const defaults = {
        address: '', purchasePrice: '$340,000', rehab: '$100,000',
        closingInLoan: '$0', hmlPoints: '2', hmlRate: '12', hmlLtv: '90',
        otherUpFront: '$2,000', addlRehabNotInLoan: '$0',
        helocRate: '7', helocAmount: '$0',
        taxesAnnual: '$6,500', insuranceAnnual: '$3,000',
        utilitiesMonthly: '$200', otherCostAnnual: '$100', otherCostMonthly: '$0',
        arvLow: '$550,000', arvHigh: '$600,000',
        brokerFee: '5', otherClosingPct: '2'
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

    const teal = [0, 52, 77], tealLight = [1, 104, 145];
    const darkText = [26, 26, 26], mutedText = [100, 100, 100];
    const lightBg = [245, 247, 250], white = [255, 255, 255];
    const green = [22, 101, 52], greenBg = [220, 252, 231];
    const yellow = [133, 100, 0], yellowBg = [254, 249, 195];
    const red = [153, 27, 27], redBg = [254, 226, 226];

    doc.setFillColor(...white);
    doc.rect(0, 0, W, H, 'F');
    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 3, 'F');

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
    doc.text('Flip Analyzer', W - margin, y + 5, { align: 'right' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

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

    // Three-column summary
    const thirdW = (cw - 8) / 3;
    const colX = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    function drawBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), x, startY);
      let iy = startY + 4;
      items.forEach(item => {
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        const tc = item.bold ? teal : mutedText;
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(item.label, x, iy);
        doc.setTextColor(...darkText);
        doc.text(item.value || '', x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    const entryItems = [
      { label: 'Purchase Price', value: fmt(getVal('purchasePrice')) },
      { label: 'Rehab', value: fmt(getVal('rehab')) },
      { label: 'Total Cost Basis', value: document.getElementById('totalCostBasis')?.textContent },
      { label: 'HML Loan (' + getVal('hmlLtv') + '% LTV)', value: document.getElementById('hmlLoan')?.textContent },
      { label: 'Points (' + getVal('hmlPoints') + '%)', value: document.getElementById('pointsUpFront')?.textContent },
      { label: 'HELOC', value: fmt(getVal('helocAmount')) },
      { label: 'ADJUSTED CASH TO CLOSE', value: document.getElementById('adjustedCashToClose')?.textContent, bold: true }
    ];

    const holdItems = [
      { label: 'HELOC Payment', value: document.getElementById('helocPayment')?.textContent },
      { label: 'Hard Money Payment', value: document.getElementById('hmlPayment')?.textContent },
      { label: 'Total Monthly Debt', value: document.getElementById('totalMonthlyDebt')?.textContent },
      { label: 'Taxes (Annual)', value: fmt(getVal('taxesAnnual')) },
      { label: 'Insurance (Annual)', value: fmt(getVal('insuranceAnnual')) },
      { label: 'Utilities (Monthly)', value: fmt(getVal('utilitiesMonthly')) },
      { label: 'MONTHLY CARRY COST', value: document.getElementById('monthlyCarryCost')?.textContent, bold: true }
    ];

    const exitItems = [
      { label: 'ARV Low', value: fmt(getVal('arvLow')) },
      { label: 'ARV High', value: fmt(getVal('arvHigh')) },
      { label: 'Broker Fee', value: getVal('brokerFee') + '%' },
      { label: 'Other Closing Costs', value: getVal('otherClosingPct') + '%' },
      { label: 'TOTAL SELLING COST', value: document.getElementById('totalSellingPct')?.textContent, bold: true }
    ];

    drawBlock(colX[0], 'Entry Strategy', entryItems, y);
    drawBlock(colX[1], 'Holding Costs', holdItems, y);
    drawBlock(colX[2], 'Exit Strategy', exitItems, y);

    y += Math.max(entryItems.length, holdItems.length) * 3.5 + 8;

    // Helper to extract table and render with autoTable
    function renderTable(tableId, title, startY) {
      const table = document.getElementById(tableId);
      if (!table || table.rows.length < 2) return startY;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), margin, startY);

      const headers = [];
      table.querySelector('thead tr')?.querySelectorAll('th').forEach(th => headers.push(th.textContent));

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
        startY: startY + 3,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 5.5,
          cellPadding: 1.2,
          textColor: darkText,
          lineColor: [200, 200, 200],
          lineWidth: 0.15,
          font: 'helvetica',
          halign: 'right',
          valign: 'middle'
        },
        headStyles: {
          fillColor: teal,
          textColor: white,
          fontStyle: 'bold',
          fontSize: 5.5,
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 28, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index]?.[data.column.index]) {
            const style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      return doc.lastAutoTable.finalY + 4;
    }

    y = renderTable('profitTable', 'Pre-Tax Gross Profit', y);
    y = renderTable('summaryTable', 'Summaries', y);

    // Check if CoC table fits on same page
    if (y > H - 60) {
      doc.addPage();
      y = margin + 5;
    }
    y = renderTable('cocTable', 'Cash on Cash Return', y);

    // Footer
    const fy = (doc.internal.getNumberOfPages() > 1 ? doc.internal.pageSize.getHeight() : H) - 10;
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, W - margin, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...teal);
    doc.text('Fortified Realty Group, LLC', margin, fy + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedText);
    doc.text('One North Main Street, Fall River, MA 02720  |  (508) 691-8035', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis is for informational purposes only. Not financial advice.', margin, fy + 7.5);

    const addrClean = (document.getElementById('address')?.value || 'flip-analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-FlipAnalyzer-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

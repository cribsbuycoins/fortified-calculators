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

  // ===== MONEY INPUT EVENT HANDLERS =====
  document.querySelectorAll('.money-input').forEach(el => {
    el.addEventListener('focus', () => stripMoneyInput(el));
    el.addEventListener('blur', () => formatMoneyInput(el));
  });

  // ===== HELPERS =====
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getVal(id) {
    return parseNum(document.getElementById(id)?.value);
  }

  // ===== CALCULATE =====
  function calculate() {

    // --- Entry Strategy Inputs ---
    const purchasePrice       = getVal('purchasePrice');
    const rehab               = getVal('rehab');
    const closingInLoan       = getVal('closingInLoan');
    const hmlPoints           = getVal('hmlPoints');      // percent
    const hmlRate             = getVal('hmlRate');         // percent
    const hmlLtv              = getVal('hmlLtv');          // percent
    const otherUpFront        = getVal('otherUpFront');
    const addlRehabNotInLoan  = getVal('addlRehabNotInLoan');
    const helocRate           = getVal('helocRate');       // percent
    const helocAmount         = getVal('helocAmount');

    // --- Holding Cost Inputs ---
    const taxesAnnual         = getVal('taxesAnnual');
    const insuranceAnnual     = getVal('insuranceAnnual');
    const utilitiesMonthly    = getVal('utilitiesMonthly');
    const otherCostAnnual     = getVal('otherCostAnnual');
    const otherCostMonthly    = getVal('otherCostMonthly');

    // --- Exit Strategy Inputs ---
    const arvLow              = getVal('arvLow');
    const arvHigh             = getVal('arvHigh');
    const brokerFee           = getVal('brokerFee');       // percent
    const otherClosingPct     = getVal('otherClosingPct'); // percent

    // ===== ENTRY STRATEGY =====
    const totalCostBasis      = purchasePrice + rehab + closingInLoan;
    const hmlLoan             = totalCostBasis * (hmlLtv / 100);
    const pointsUpFront       = hmlLoan * (hmlPoints / 100);
    const hmlCashToClose      = totalCostBasis - hmlLoan;
    const leftOverHeloc       = Math.max(0, helocAmount - addlRehabNotInLoan);
    const adjustedCashToClose = hmlCashToClose + pointsUpFront + otherUpFront + addlRehabNotInLoan;

    // ===== HOLDING COSTS =====
    const helocPayment        = helocAmount * (helocRate / 100) / 12;
    const hmlPayment          = hmlLoan * (hmlRate / 100) / 12;
    const totalMonthlyDebt    = helocPayment + hmlPayment;
    const monthlyCarryCost    = totalMonthlyDebt
                               + (taxesAnnual / 12)
                               + (insuranceAnnual / 12)
                               + utilitiesMonthly
                               + (otherCostAnnual / 12)
                               + otherCostMonthly;

    // ===== EXIT STRATEGY =====
    const totalSellingPct     = brokerFee + otherClosingPct;

    // ===== UPDATE ENTRY STRATEGY DOM =====
    setText('totalCostBasis',      fmt(totalCostBasis));
    setText('pointsUpFront',       fmt(pointsUpFront));
    setText('hmlLoan',             fmt(hmlLoan));
    setText('hmlCashToClose',      fmt(hmlCashToClose));
    setText('leftOverHeloc',       fmt(leftOverHeloc));
    setText('adjustedCashToClose', fmt(adjustedCashToClose));

    // ===== UPDATE HOLDING COSTS DOM =====
    setText('helocPayment',        fmt(helocPayment));
    setText('hmlPayment',          fmt(hmlPayment));
    setText('totalMonthlyDebt',    fmt(totalMonthlyDebt));
    setText('monthlyCarryCost',    fmt(monthlyCarryCost));

    // ===== UPDATE EXIT STRATEGY DOM =====
    setText('totalSellingPct',     fmtPct(totalSellingPct));

    // ===== BUILD MATRICES =====
    const months = [2, 4, 6, 8];
    const monthLabels = ['2 Mo.', '4 Mo.', '6 Mo.', '8 Mo.'];

    // Generate ARV rows: low to high in $5,000 steps (11 rows max)
    const arvRows = [];
    if (arvLow > 0 && arvHigh >= arvLow) {
      const step = 5000;
      const rawHigh = arvLow + step * 10; // 11 rows: indices 0–10
      const clampedHigh = Math.min(arvHigh, rawHigh);
      for (let arv = arvLow; arv <= clampedHigh + 0.01; arv += step) {
        arvRows.push(Math.round(arv));
      }
      // If arvHigh is not already the last element, add it
      if (arvRows[arvRows.length - 1] !== Math.round(arvHigh) && arvHigh > arvLow) {
        // Replace last with high only if it fits exactly
      }
    }

    // Pre-compute per-month totals for summary table (fixed, not per ARV)
    // These depend only on months and carry cost
    const summaryData = months.map(m => {
      const totalHoldingCosts = monthlyCarryCost * m;
      const netCashInDeal     = adjustedCashToClose + totalHoldingCosts - leftOverHeloc;
      return {
        totalHoldingCosts,
        leftOverHeloc,
        netCashInDeal,
        helocBalanceOwed: helocAmount,
        hmlOwed: hmlLoan
      };
    });

    // ===== PROFIT MATRIX =====
    buildProfitTable(arvRows, months, monthLabels, monthlyCarryCost, totalSellingPct,
                     helocAmount, hmlLoan, adjustedCashToClose, summaryData);

    // ===== SUMMARY TABLE =====
    buildSummaryTable(months, monthLabels, summaryData);

    // ===== CASH ON CASH TABLE =====
    buildCoCTable(arvRows, months, monthLabels, monthlyCarryCost, totalSellingPct,
                  helocAmount, hmlLoan, adjustedCashToClose, summaryData);
  }

  // ===== PROFIT MATRIX TABLE =====
  function buildProfitTable(arvRows, months, monthLabels, monthlyCarryCost, totalSellingPct,
                            helocAmount, hmlLoan, adjustedCashToClose, summaryData) {
    const thead = document.getElementById('profitHead');
    const tbody  = document.getElementById('profitBody');
    if (!thead || !tbody) return;

    // Header
    let headHtml = '<tr><th>ARV</th>';
    monthLabels.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Body
    let bodyHtml = '';
    arvRows.forEach(arv => {
      bodyHtml += '<tr>';
      bodyHtml += `<td>${fmt(arv)}</td>`;
      months.forEach((m, mi) => {
        const totalHoldingCosts = monthlyCarryCost * m;
        const sellingCosts      = arv * (totalSellingPct / 100);
        const grossProfit       = arv - sellingCosts - helocAmount - hmlLoan - totalHoldingCosts - adjustedCashToClose;
        const cls               = grossProfit > 0 ? 'cond-green' : 'cond-red';
        bodyHtml += `<td class="${cls}">${fmt(grossProfit)}</td>`;
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== SUMMARY TABLE =====
  function buildSummaryTable(months, monthLabels, summaryData) {
    const thead = document.getElementById('summaryHead');
    const tbody  = document.getElementById('summaryBody');
    if (!thead || !tbody) return;

    // Header
    let headHtml = '<tr><th>Summary</th>';
    monthLabels.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Rows
    const rows = [
      {
        label: 'Total Holding Costs',
        values: summaryData.map(d => fmt(d.totalHoldingCosts))
      },
      {
        label: 'HELOC Used After Closing',
        values: summaryData.map(d => fmt(d.leftOverHeloc))
      },
      {
        label: 'Net Cash In Deal',
        values: summaryData.map(d => fmt(d.netCashInDeal)),
        bold: true
      },
      {
        label: 'HELOC Balance Owed',
        values: summaryData.map(d => fmt(d.helocBalanceOwed))
      },
      {
        label: 'HML Owed',
        values: summaryData.map(d => fmt(d.hmlOwed))
      }
    ];

    let bodyHtml = '';
    rows.forEach(row => {
      const boldStyle = row.bold ? ' style="font-weight:700;"' : '';
      bodyHtml += `<tr${row.bold ? ' class="results-row"' : ''}>`;
      bodyHtml += `<td${boldStyle}>${row.label}</td>`;
      row.values.forEach(v => { bodyHtml += `<td${boldStyle}>${v}</td>`; });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== CASH ON CASH TABLE =====
  function buildCoCTable(arvRows, months, monthLabels, monthlyCarryCost, totalSellingPct,
                         helocAmount, hmlLoan, adjustedCashToClose, summaryData) {
    const thead = document.getElementById('cocHead');
    const tbody  = document.getElementById('cocBody');
    if (!thead || !tbody) return;

    // Header
    let headHtml = '<tr><th>ARV</th>';
    monthLabels.forEach(lbl => { headHtml += `<th>${lbl}</th>`; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Body
    let bodyHtml = '';
    arvRows.forEach(arv => {
      bodyHtml += '<tr>';
      bodyHtml += `<td>${fmt(arv)}</td>`;
      months.forEach((m, mi) => {
        const totalHoldingCosts = monthlyCarryCost * m;
        const sellingCosts      = arv * (totalSellingPct / 100);
        const grossProfit       = arv - sellingCosts - helocAmount - hmlLoan - totalHoldingCosts - adjustedCashToClose;
        const netCashInDeal     = summaryData[mi].netCashInDeal;
        const coc               = netCashInDeal !== 0 ? (grossProfit / netCashInDeal) * 100 : 0;

        let cls;
        if (coc >= 20)       cls = 'cond-green';
        else if (coc >= 10)  cls = 'cond-yellow';
        else                  cls = 'cond-red';

        bodyHtml += `<td class="${cls}">${fmtPct(coc)}</td>`;
      });
      bodyHtml += '</tr>';
    });
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
        address:           '',
        purchasePrice:     '$340,000',
        rehab:             '$100,000',
        closingInLoan:     '$0',
        hmlPoints:         '2',
        hmlRate:           '12',
        hmlLtv:            '0',
        otherUpFront:      '$2,000',
        addlRehabNotInLoan:'$0',
        helocRate:         '7',
        helocAmount:       '$0',
        taxesAnnual:       '$6,500',
        insuranceAnnual:   '$3,000',
        utilitiesMonthly:  '$200',
        otherCostAnnual:   '$100',
        otherCostMonthly:  '$0',
        arvLow:            '$550,000',
        arvHigh:           '$600,000',
        brokerFee:         '5',
        otherClosingPct:   '2'
      };
      Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      calculate();
    });
  }

  // ===== SAVE AS PDF =====
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
    const teal      = [0, 52, 77];
    const tealLight = [1, 104, 145];
    const darkText  = [26, 26, 26];
    const mutedText = [100, 100, 100];
    const lightBg   = [245, 247, 250];
    const white     = [255, 255, 255];
    const green     = [22, 101, 52];
    const greenBg   = [220, 252, 231];
    const yellow    = [133, 100, 0];
    const yellowBg  = [254, 249, 195];
    const red       = [153, 27, 27];
    const redBg     = [254, 226, 226];

    // White background
    doc.setFillColor(...white);
    doc.rect(0, 0, W, H, 'F');

    // Teal top bar
    doc.setFillColor(...teal);
    doc.rect(0, 0, W, 3, 'F');

    // Logo
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
    const colX   = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    function drawDataBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), x, startY);

      let iy = startY + 4;
      items.forEach(item => {
        if (item.bold) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...teal);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...mutedText);
        }
        doc.setFontSize(6.5);
        doc.text(item.label, x, iy);
        doc.setTextColor(...darkText);
        doc.text(item.value, x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    // Gather live computed values
    const g = id => document.getElementById(id)?.textContent || '--';
    const v = id => document.getElementById(id)?.value || '--';

    const entryItems = [
      { label: 'Purchase Price',         value: fmt(getVal('purchasePrice')) },
      { label: 'Rehab',                  value: fmt(getVal('rehab')) },
      { label: 'Closing/Addl In Loan',   value: fmt(getVal('closingInLoan')) },
      { label: 'Total Cost Basis (HML)', value: g('totalCostBasis'), bold: true },
      { label: 'HML Points %',           value: v('hmlPoints') + '%' },
      { label: 'HML Rate %',             value: v('hmlRate') + '%' },
      { label: 'HML LTV %',              value: v('hmlLtv') + '%' },
      { label: 'Points Paid Up Front',   value: g('pointsUpFront') },
      { label: 'Hard Money Loan',        value: g('hmlLoan') },
      { label: 'HML Cash to Close',      value: g('hmlCashToClose') },
      { label: 'Other Up Front',         value: fmt(getVal('otherUpFront')) },
      { label: 'Addl Rehab Not In Loan', value: fmt(getVal('addlRehabNotInLoan')) },
      { label: 'HELOC Amount',           value: fmt(getVal('helocAmount')) },
      { label: 'HELOC Rate %',           value: v('helocRate') + '%' },
      { label: 'Left Over HELOC',        value: g('leftOverHeloc') },
      { label: 'ADJUSTED CASH TO CLOSE', value: g('adjustedCashToClose'), bold: true }
    ];

    const holdingItems = [
      { label: 'HELOC Payment',           value: g('helocPayment') },
      { label: 'Hard Money Payment',      value: g('hmlPayment') },
      { label: 'Total Monthly Debt',      value: g('totalMonthlyDebt'), bold: true },
      { label: 'Taxes (Annual)',          value: fmt(getVal('taxesAnnual')) },
      { label: 'Insurance (Annual)',      value: fmt(getVal('insuranceAnnual')) },
      { label: 'Utilities (Monthly)',     value: fmt(getVal('utilitiesMonthly')) },
      { label: 'Other Cost (Annual)',     value: fmt(getVal('otherCostAnnual')) },
      { label: 'Other Cost (Monthly)',    value: fmt(getVal('otherCostMonthly')) },
      { label: 'MONTHLY CARRY COST',      value: g('monthlyCarryCost'), bold: true }
    ];

    const exitItems = [
      { label: 'ARV Low',              value: fmt(getVal('arvLow')) },
      { label: 'ARV High',             value: fmt(getVal('arvHigh')) },
      { label: 'Broker Fee %',         value: v('brokerFee') + '%' },
      { label: 'Other Closing Costs %',value: v('otherClosingPct') + '%' },
      { label: 'TOTAL SELLING COST %', value: g('totalSellingPct'), bold: true }
    ];

    const e1 = drawDataBlock(colX[0], 'Entry Strategy', entryItems, y);
    const e2 = drawDataBlock(colX[1], 'Holding Costs',  holdingItems, y);
    const e3 = drawDataBlock(colX[2], 'Exit Strategy',  exitItems, y);

    y = Math.max(e1, e2, e3) + 4;

    // ===== PROFIT MATRIX TABLE =====
    const profitTable = document.getElementById('profitTable');
    if (profitTable && profitTable.rows.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...teal);
      doc.text('PRE-TAX GROSS PROFIT', margin, y);
      y += 3;

      const { headers: ph, bodyData: pb, cellStyles: ps } = extractTableData(profitTable);

      doc.autoTable({
        head: [ph],
        body: pb,
        startY: y,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
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
          fontSize: 7,
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: makeCellStyler(ps, green, greenBg, yellow, yellowBg, red, redBg)
      });

      y = doc.lastAutoTable.finalY + 5;
    }

    // ===== CASH ON CASH TABLE =====
    const cocTable = document.getElementById('cocTable');
    if (cocTable && cocTable.rows.length > 1) {
      // Check if we need a new page
      if (y > H - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...teal);
      doc.text('CASH ON CASH RETURN', margin, y);
      y += 3;

      const { headers: ch, bodyData: cb, cellStyles: cs } = extractTableData(cocTable);

      doc.autoTable({
        head: [ch],
        body: cb,
        startY: y,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
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
          fontSize: 7,
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: makeCellStyler(cs, green, greenBg, yellow, yellowBg, red, redBg)
      });

      y = doc.lastAutoTable.finalY + 5;
    }

    // ===== FOOTER =====
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
    doc.text('One North Main Street, Fall River, MA 02720  |  (508) 691-8035', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis is for informational purposes only. Not financial advice. Consult with qualified professionals before making investment decisions.', margin, fy + 7.5);

    const addrClean = (document.getElementById('address')?.value || 'flip-analysis')
      .replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-FlipAnalyzer-${addrClean}.pdf`);
  }

  // Helper: extract table data and conditional cell styles from a DOM table
  function extractTableData(table) {
    const headers = [];
    const headRow = table.querySelector('thead tr');
    if (headRow) {
      headRow.querySelectorAll('th').forEach(th => headers.push(th.textContent.trim()));
    }

    const bodyData = [];
    const cellStyles = {};
    table.querySelectorAll('tbody tr').forEach((tr, ri) => {
      const row = [];
      tr.querySelectorAll('td').forEach((td, ci) => {
        row.push(td.textContent.trim());
        if (td.classList.contains('cond-green')) {
          if (!cellStyles[ri]) cellStyles[ri] = {};
          cellStyles[ri][ci] = 'green';
        } else if (td.classList.contains('cond-yellow')) {
          if (!cellStyles[ri]) cellStyles[ri] = {};
          cellStyles[ri][ci] = 'yellow';
        } else if (td.classList.contains('cond-red')) {
          if (!cellStyles[ri]) cellStyles[ri] = {};
          cellStyles[ri][ci] = 'red';
        }
      });
      bodyData.push(row);
    });

    return { headers, bodyData, cellStyles };
  }

  // Helper: return didParseCell function with captured color references
  function makeCellStyler(cellStyles, green, greenBg, yellow, yellowBg, red, redBg) {
    return function (data) {
      if (data.section !== 'body') return;
      const rowStyles = cellStyles[data.row.index];
      if (!rowStyles) return;
      const colorKey = rowStyles[data.column.index];
      if (!colorKey) return;
      if (colorKey === 'green') {
        data.cell.styles.fillColor = greenBg;
        data.cell.styles.textColor = green;
        data.cell.styles.fontStyle = 'bold';
      } else if (colorKey === 'yellow') {
        data.cell.styles.fillColor = yellowBg;
        data.cell.styles.textColor = yellow;
        data.cell.styles.fontStyle = 'bold';
      } else if (colorKey === 'red') {
        data.cell.styles.fillColor = redBg;
        data.cell.styles.textColor = red;
        data.cell.styles.fontStyle = 'bold';
      }
    };
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

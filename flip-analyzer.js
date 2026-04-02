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
    generateDealSummary({
      adjustedCashToClose, monthlyCarryCost,
      arvLow, arvHigh,
      totalSellingPct, hmlLoan, helocAmount,
      hmlRatePct, helocPayment, hmlPayment,
      purchasePrice,
      brokerFeePct
    });
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

  // ===== DEAL SUMMARY =====
  function generateDealSummary(params) {
    const {
      adjustedCashToClose, monthlyCarryCost,
      arvLow, arvHigh,
      totalSellingPct, hmlLoan, helocAmount,
      hmlRatePct, helocPayment, hmlPayment,
      purchasePrice,
      brokerFeePct
    } = params;

    const summaryEl = document.getElementById('dealSummary');
    const summaryText = document.getElementById('dealSummaryText');
    if (!summaryEl || !summaryText) return;

    // Need valid ARV range to do analysis
    if (!arvLow || arvLow <= 0) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    // --- Scan the profit table ---
    const profitTable = document.getElementById('profitTable');
    if (!profitTable || profitTable.rows.length < 2) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    // Collect all profit values from table cells
    const profitRows = []; // profitRows[rowIndex] = [profit at each month]
    const profitArvs = [];  // ARV for each row
    const bodyRows = profitTable.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (!cells.length) return;
      const arv = parseNum(cells[0].textContent);
      profitArvs.push(arv);
      const profits = [];
      for (let ci = 1; ci < cells.length; ci++) {
        profits.push(parseNum(cells[ci].textContent));
      }
      profitRows.push(profits);
    });

    if (!profitRows.length) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    // --- Scan the CoC table ---
    const cocTable = document.getElementById('cocTable');
    let bestCoCPct = 0;
    let bestCoCArv = arvHigh;
    if (cocTable) {
      const cocBodyRows = cocTable.querySelectorAll('tbody tr');
      cocBodyRows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (!cells.length || tr.classList.contains('results-row')) return;
        const arv = parseNum(cells[0].textContent);
        for (let ci = 1; ci < cells.length; ci++) {
          const val = parseFloat(cells[ci].textContent);
          if (!isNaN(val) && val > bestCoCPct) {
            bestCoCPct = val;
            bestCoCArv = arv;
          }
        }
      });
    }

    // --- Analyze overall deal health ---
    let totalCells = 0;
    let greenCells = 0;
    let redCells = 0;

    let bestProfit = -Infinity;
    let worstProfit = Infinity;
    let bestCoCDisplay = 0;

    // Best = highest ARV, fewest months (col 0 = 2 months)
    // Worst = lowest ARV, most months (last col)
    for (let ri = 0; ri < profitRows.length; ri++) {
      for (let ci = 0; ci < profitRows[ri].length; ci++) {
        const p = profitRows[ri][ci];
        totalCells++;
        if (p >= 0) greenCells++;
        else redCells++;
        if (p > bestProfit) bestProfit = p;
        if (p < worstProfit) worstProfit = p;
      }
    }
    // Best case: top-right of table (highest ARV, shortest time = col 0)
    const bestRowIdx = profitRows.length - 1;
    const bestColIdx = 0;
    const bestCaseProfit = profitRows[bestRowIdx]?.[bestColIdx] ?? bestProfit;
    // Worst case: bottom row (lowest ARV row = index 0), last column (most months)
    const worstRowIdx = 0;
    const worstColIdx = (profitRows[0]?.length ?? 1) - 1;
    const worstCaseProfit = profitRows[worstRowIdx]?.[worstColIdx] ?? worstProfit;

    // Best CoC at best case (highest ARV, 2 months)
    if (cocTable) {
      const cocBodyRows = cocTable.querySelectorAll('tbody tr');
      const cocRowsArr = Array.from(cocBodyRows).filter(tr => !tr.classList.contains('results-row'));
      if (cocRowsArr.length > 0) {
        const bestCocRow = cocRowsArr[cocRowsArr.length - 1];
        const cells = bestCocRow.querySelectorAll('td');
        if (cells.length > 1) {
          bestCoCDisplay = parseFloat(cells[1].textContent) || 0;
        }
      }
    }

    const greenRatio = totalCells > 0 ? greenCells / totalCells : 0;

    // Find midpoint ARV row (middle of profitRows)
    const midRowIdx = Math.floor(profitRows.length / 2);
    const midArv = profitArvs[midRowIdx] || ((arvLow + arvHigh) / 2);
    const midProfitArr = profitRows[midRowIdx] || [];
    // Mid profit at ~4 months (index 1)
    const midProfit = midProfitArr[1] !== undefined ? midProfitArr[1] : midProfitArr[0];

    // At low ARV, find max months where profit stays positive (scan across cols)
    const lowArvProfits = profitRows[0] || [];
    let maxProfitableMonths = 0;
    for (let ci = 0; ci < lowArvProfits.length; ci++) {
      if (lowArvProfits[ci] >= 0) maxProfitableMonths = MONTHS[ci];
    }

    // Ideal months: at mid ARV, find break-even
    let idealMonths = MONTHS[0];
    for (let ci = 0; ci < midProfitArr.length; ci++) {
      if (midProfitArr[ci] >= 0) idealMonths = MONTHS[ci];
    }

    // Min profitable ARV: find lowest ARV where any col is positive
    let minProfitableArv = null;
    let maxMonthsBreakEven = MONTHS[MONTHS.length - 1];
    for (let ri = 0; ri < profitRows.length; ri++) {
      if (profitRows[ri].some(p => p >= 0)) {
        minProfitableArv = profitArvs[ri];
        // Find how many months at that ARV
        for (let ci = 0; ci < profitRows[ri].length; ci++) {
          if (profitRows[ri][ci] >= 0) maxMonthsBreakEven = MONTHS[ci];
        }
        break;
      }
    }

    const arvSpread = arvHigh - arvLow;
    const carryPerMonth = monthlyCarryCost;
    const savingsPerPoint = (arvLow + arvHigh) / 2 / 100; // 1% of avg ARV

    // --- Classify deal ---
    let dealClass, sentences = [];

    if (greenRatio >= 0.75) {
      // Strong deal
      dealClass = 'deal-summary positive';

      sentences.push(
        `This flip looks solid across the board. Even at the low ARV of ${fmt(arvLow)} with an ${
          MONTHS[worstColIdx]
        }-month timeline, you\'re still looking at ${fmt(Math.round(worstCaseProfit))} in profit.`
      );
      sentences.push(
        `Your best case — ${fmt(arvHigh)} sold in ${MONTHS[bestColIdx]} months — puts you at ${fmt(Math.round(bestCaseProfit))} with a ${bestCoCDisplay.toFixed(1)}% return on your cash.`
      );
      sentences.push(
        `The monthly carry cost of ${fmt(Math.round(monthlyCarryCost))} gives you room to hold for a while without the deal going sideways.`
      );

    } else if (greenRatio >= 0.3) {
      // Mixed deal
      dealClass = 'deal-summary caution';

      sentences.push(
        `This deal works, but the timeline matters. At ${fmt(arvLow)}, you need to be done and sold within ${
          maxProfitableMonths > 0 ? maxProfitableMonths : MONTHS[0]
        } months to stay profitable.`
      );
      sentences.push(
        `The sweet spot looks like hitting around ${fmt(Math.round(midArv))} ARV and getting out in ${idealMonths} months — that puts you at roughly ${fmt(Math.round(midProfit))} profit.`
      );
      if (arvSpread > 100000) {
        sentences.push(
          `Your ARV range of ${fmt(arvLow)} to ${fmt(arvHigh)} is a ${fmt(arvSpread)} spread — that\'s a lot of uncertainty. The deal really hinges on hitting the upper end of that range.`
        );
      }
      sentences.push(
        `Watch your holding costs — at ${fmt(Math.round(carryPerMonth))}/month, every extra month eats into ${fmt(Math.round(carryPerMonth))} of profit.`
      );

    } else {
      // Bad deal
      dealClass = 'deal-summary negative';

      const allNegative = greenCells === 0;
      if (allNegative) {
        sentences.push(
          `At these numbers, the deal doesn\'t pencil out at any ARV or timeline in the range. You\'d need a lower purchase price or a significantly higher ARV to make this work.`
        );
      } else {
        sentences.push(
          `The numbers are tough on this one. At the list price of ${fmt(Math.round(purchasePrice))}, most scenarios show a loss.`
        );
        if (minProfitableArv !== null) {
          sentences.push(
            `You\'d need to hit ${fmt(Math.round(minProfitableArv))} or higher AND sell within ${maxMonthsBreakEven} months just to break even.`
          );
        }
      }
    }

    // --- Additional smart observations ---
    if (helocAmount > 0) {
      sentences.push(
        `You\'re using ${fmt(Math.round(helocAmount))} in HELOC, which keeps your out-of-pocket cash to ${fmt(Math.round(adjustedCashToClose))}. Just remember that\'s borrowed money — the interest adds ${fmt(Math.round(helocPayment))}/month to your carry.`
      );
    }
    if (hmlLoan > 0 && hmlRatePct >= 12) {
      sentences.push(
        `The ${hmlRatePct}% hard money rate is standard but not cheap. At ${fmt(Math.round(hmlPayment))}/month in interest alone, speed is your friend on this deal.`
      );
    }
    if (totalSellingPct > 8) {
      sentences.push(
        `Your selling costs total ${totalSellingPct.toFixed(1)}% — that\'s on the higher side. If you can negotiate the broker fee down, every point saves you ${fmt(Math.round(savingsPerPoint))} on the exit.`
      );
    }
    if (monthlyCarryCost > 5000) {
      sentences.push(
        `At ${fmt(Math.round(monthlyCarryCost))}/month in carrying costs, time is really working against you. Every month you hold past your target timeline costs you ${fmt(Math.round(monthlyCarryCost))}.`
      );
    }

    summaryEl.className = dealClass;
    summaryText.innerHTML = sentences.join(' ');
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
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: teal,
          textColor: white,
          fontStyle: 'bold',
          fontSize: 5.5,
          halign: 'center'
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

    // ===== DEAL SUMMARY PARAGRAPH =====
    const dealSummaryContent = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryContent && dealSummaryContent.trim() && dealSummaryContent !== 'Enter your numbers above to see a plain English analysis.') {
      // Check if we need more space — add a small gap after last table
      if (y > H - 40) {
        doc.addPage();
        y = margin + 5;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text('DEAL SUMMARY', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...darkText);
      const splitSummary = doc.splitTextToSize(dealSummaryContent.trim(), cw);
      doc.text(splitSummary, margin, y);
      y += splitSummary.length * 3.5 + 4;
    }

    // ===== QR CODE PLACEHOLDER =====
    const fy = (doc.internal.getNumberOfPages() > 1 ? doc.internal.pageSize.getHeight() : H) - 10;
    const qrSize = 15;
    const qrX = W - margin - qrSize;
    const qrY = fy - 18;
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.4);
    doc.setFillColor(...lightBg);
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...mutedText);
    doc.text('Scan for tutorial', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

    // Footer
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
    doc.text('This analysis is for informational purposes only. Not financial advice.', margin, fy + 7.5);

    const addrClean = (document.getElementById('address')?.value || 'flip-analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-FlipAnalyzer-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

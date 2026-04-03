// ===== STORE OF VALUE CALCULATOR — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

  var MAX_INVESTMENTS = 6;

  // ===== NUMBER FORMATTING =====
  function parseNum(val) {
    if (typeof val === 'number') return val;
    var cleaned = String(val).replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned) || 0;
  }

  function fmt(n) {
    var abs = Math.abs(Math.round(n));
    var formatted = abs.toLocaleString('en-US');
    return (n < 0 ? '-$' : '$') + formatted;
  }

  function fmtPct(n) { return (n * 100).toFixed(2) + '%'; }

  function formatMoneyInput(el) {
    var raw = el.value.trim();
    if (raw === '' || raw === '$') return;
    var val = parseNum(el.value);
    if (val === 0) { el.value = ''; return; }
    el.value = fmt(val);
  }

  function stripMoneyInput(el) {
    var val = parseNum(el.value);
    el.value = val === 0 ? '' : val;
  }

  // ===== INVESTMENT GRID =====
  var investBody = document.getElementById('investBody');

  function buildInvestmentRows() {
    investBody.innerHTML = '';
    for (var i = 1; i <= MAX_INVESTMENTS; i++) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><input type="text" class="name-input inv-input" id="invName' + i + '" placeholder="Investment ' + i + '"></td>' +
        '<td><input type="text" class="money-input inv-input" id="invAmount' + i + '" value="" placeholder="" inputmode="numeric"></td>' +
        '<td><input type="text" class="money-input inv-input" id="invPrice' + i + '" value="" placeholder="" inputmode="numeric"></td>' +
        '<td><input type="text" class="money-input inv-input" id="invBear' + i + '" value="" placeholder="" inputmode="numeric"></td>' +
        '<td><input type="text" class="money-input inv-input" id="invExpected' + i + '" value="" placeholder="" inputmode="numeric"></td>' +
        '<td><input type="text" class="money-input inv-input" id="invBull' + i + '" value="" placeholder="" inputmode="numeric"></td>';
      investBody.appendChild(tr);
    }

    // Total row
    var totalTr = document.createElement('tr');
    totalTr.className = 'total-row';
    totalTr.innerHTML =
      '<td>Total</td>' +
      '<td id="invTotalAllocated">$0</td>' +
      '<td></td>' +
      '<td id="invTotalBear">$0</td>' +
      '<td id="invTotalExpected">$0</td>' +
      '<td id="invTotalBull">$0</td>';
    investBody.appendChild(totalTr);

    // Remaining row
    var remTr = document.createElement('tr');
    remTr.className = 'remaining-row';
    remTr.innerHTML =
      '<td style="color:var(--color-text-muted);">Remaining</td>' +
      '<td id="invRemaining" style="color:var(--color-result-warning); font-weight:600;">$0</td>' +
      '<td colspan="4"></td>';
    investBody.appendChild(remTr);

    // Wire events
    var inputs = investBody.querySelectorAll('.inv-input');
    for (var j = 0; j < inputs.length; j++) {
      var inp = inputs[j];
      if (inp.classList.contains('money-input')) {
        inp.addEventListener('focus', function () { stripMoneyInput(this); });
        inp.addEventListener('blur', function () { formatMoneyInput(this); });
      }
      inp.addEventListener('input', recalc);
      inp.addEventListener('change', recalc);
    }
  }

  // ===== WIRE GLOBAL INPUTS =====
  var globalIds = [
    'yearsToHold', 'closingCostPct', 'totalPartners',
    'reCurrentValue', 'reMortgage1', 'reMortgage2',
    'reBearPrice', 'reExpectedPrice', 'reBullPrice',
    'reFutureMortgage1', 'reFutureMortgage2', 'reAdditionalCapital',
    'taxesOwed', 'otherExpenses'
  ];

  function wireInputs() {
    globalIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.classList.contains('money-input')) {
        el.addEventListener('focus', function () { stripMoneyInput(this); });
        el.addEventListener('blur', function () { formatMoneyInput(this); });
      }
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });
  }

  // ===== RECALC ENGINE =====
  function recalc() {
    var years = parseNum(document.getElementById('yearsToHold').value) || 5;
    var closingPct = parseNum(document.getElementById('closingCostPct').value) / 100;
    var partners = Math.max(1, parseNum(document.getElementById('totalPartners').value));

    // ——— REAL ESTATE SIDE ———
    var reCurrentValue = parseNum(document.getElementById('reCurrentValue').value);
    var reMtg1 = parseNum(document.getElementById('reMortgage1').value);
    var reMtg2 = parseNum(document.getElementById('reMortgage2').value);
    var reBear = parseNum(document.getElementById('reBearPrice').value);
    var reExpected = parseNum(document.getElementById('reExpectedPrice').value);
    var reBull = parseNum(document.getElementById('reBullPrice').value);
    var reFutureMtg1 = parseNum(document.getElementById('reFutureMortgage1').value);
    var reFutureMtg2 = parseNum(document.getElementById('reFutureMortgage2').value);
    var reAdditionalCapital = parseNum(document.getElementById('reAdditionalCapital').value);

    // Current equity: sale price - closing costs - mortgages
    var currentClosing = reCurrentValue * closingPct;
    var currentProfit = reCurrentValue - currentClosing - reMtg1 - reMtg2;
    var currentEquityPerPartner = currentProfit / partners;

    document.getElementById('reCurrentEquity').textContent = fmt(currentEquityPerPartner);

    // Future RE scenarios (per partner)
    function calcREScenario(futurePrice) {
      var closingCost = futurePrice * closingPct;
      var profit = futurePrice - closingCost - reFutureMtg1 - reFutureMtg2;
      var netGain = profit - reAdditionalCapital;
      var perPartner = netGain / partners;
      return perPartner;
    }

    var reBearEquity = calcREScenario(reBear);
    var reExpectedEquity = calcREScenario(reExpected);
    var reBullEquity = calcREScenario(reBull);

    // CAGR for RE
    function calcCAGR(start, end, yrs) {
      if (start <= 0 || end <= 0 || yrs <= 0) return 0;
      return Math.pow(end / start, 1 / yrs) - 1;
    }

    var reBase = currentEquityPerPartner;
    var reBearCAGR = calcCAGR(reBase, reBearEquity, years);
    var reExpectedCAGR = calcCAGR(reBase, reExpectedEquity, years);
    var reBullCAGR = calcCAGR(reBase, reBullEquity, years);

    var reBearTotalGain = reBase > 0 ? (reBearEquity - reBase) / reBase : 0;
    var reExpectedTotalGain = reBase > 0 ? (reExpectedEquity - reBase) / reBase : 0;
    var reBullTotalGain = reBase > 0 ? (reBullEquity - reBase) / reBase : 0;

    var reBearAnnualGain = reBearTotalGain / years;
    var reExpectedAnnualGain = reExpectedTotalGain / years;
    var reBullAnnualGain = reBullTotalGain / years;

    // ——— INVESTMENT SIDE ———
    var taxes = parseNum(document.getElementById('taxesOwed').value);
    var otherExp = parseNum(document.getElementById('otherExpenses').value);
    var netGainToday = currentEquityPerPartner;
    var totalToInvest = netGainToday - taxes - otherExp;

    document.getElementById('netGainToday').textContent = fmt(netGainToday);
    document.getElementById('totalToInvest').textContent = fmt(totalToInvest);

    // Gather investments
    var totalAllocated = 0;
    var totalBear = 0;
    var totalExpected = 0;
    var totalBull = 0;

    for (var i = 1; i <= MAX_INVESTMENTS; i++) {
      var name = (document.getElementById('invName' + i).value || '').trim();
      var amount = parseNum(document.getElementById('invAmount' + i).value);
      var price = parseNum(document.getElementById('invPrice' + i).value);
      var bear = parseNum(document.getElementById('invBear' + i).value);
      var expected = parseNum(document.getElementById('invExpected' + i).value);
      var bull = parseNum(document.getElementById('invBull' + i).value);

      totalAllocated += amount;

      if (amount > 0 && price > 0) {
        var shares = amount / price;
        totalBear += shares * bear;
        totalExpected += shares * expected;
        totalBull += shares * bull;
      }
    }

    var remaining = totalToInvest - totalAllocated;

    document.getElementById('invTotalAllocated').textContent = fmt(totalAllocated);
    document.getElementById('invTotalBear').textContent = fmt(totalBear);
    document.getElementById('invTotalExpected').textContent = fmt(totalExpected);
    document.getElementById('invTotalBull').textContent = fmt(totalBull);

    var remEl = document.getElementById('invRemaining');
    remEl.textContent = fmt(remaining);
    remEl.style.color = remaining < 0 ? 'var(--color-result-negative)' :
                        remaining > 0 ? 'var(--color-result-warning)' :
                        'var(--color-result-positive)';

    // Investment gains
    var invBase = totalAllocated;
    var invBearTotalGain = invBase > 0 ? (totalBear - invBase) / invBase : 0;
    var invExpectedTotalGain = invBase > 0 ? (totalExpected - invBase) / invBase : 0;
    var invBullTotalGain = invBase > 0 ? (totalBull - invBase) / invBase : 0;

    var invBearAnnualGain = invBearTotalGain / years;
    var invExpectedAnnualGain = invExpectedTotalGain / years;
    var invBullAnnualGain = invBullTotalGain / years;

    var invBearCAGR = calcCAGR(invBase, totalBear, years);
    var invExpectedCAGR = calcCAGR(invBase, totalExpected, years);
    var invBullCAGR = calcCAGR(invBase, totalBull, years);

    // Delta
    var deltaBear = totalBear - reBearEquity;
    var deltaExpected = totalExpected - reExpectedEquity;
    var deltaBull = totalBull - reBullEquity;

    var deltaBearPct = reBearEquity !== 0 ? (totalBear - reBearEquity) / Math.abs(reBearEquity) : 0;
    var deltaExpectedPct = reExpectedEquity !== 0 ? (totalExpected - reExpectedEquity) / Math.abs(reExpectedEquity) : 0;
    var deltaBullPct = reBullEquity !== 0 ? (totalBull - reBullEquity) / Math.abs(reBullEquity) : 0;

    // ——— BUILD COMPARISON TABLE ———
    var body = document.getElementById('comparisonBody');
    body.innerHTML = '';

    var targetYear = new Date().getFullYear() + years;

    function addSectionLabel(text) {
      var tr = document.createElement('tr');
      tr.className = 'section-label';
      tr.innerHTML = '<td colspan="5">' + text + '</td>';
      body.appendChild(tr);
    }

    function addRow(label, current, bear, expected, bull, cls) {
      var tr = document.createElement('tr');
      if (cls) tr.className = cls;
      tr.innerHTML =
        '<td>' + label + '</td>' +
        '<td>' + current + '</td>' +
        '<td>' + bear + '</td>' +
        '<td>' + expected + '</td>' +
        '<td>' + bull + '</td>';
      body.appendChild(tr);
    }

    function colorVal(n) {
      var color = n > 0 ? 'var(--color-result-positive)' : n < 0 ? 'var(--color-result-negative)' : 'var(--color-text)';
      return '<span style="color:' + color + ';">' + fmt(n) + '</span>';
    }
    function colorPct(n) {
      var color = n > 0 ? 'var(--color-result-positive)' : n < 0 ? 'var(--color-result-negative)' : 'var(--color-text)';
      return '<span style="color:' + color + ';">' + fmtPct(n) + '</span>';
    }

    addSectionLabel('Real Estate — Hold ' + years + ' Years (Sell in ' + targetYear + ')');
    addRow('Net Equity', fmt(currentEquityPerPartner), fmt(reBearEquity), fmt(reExpectedEquity), fmt(reBullEquity));
    addRow('Total Gain', '—', fmtPct(reBearTotalGain), fmtPct(reExpectedTotalGain), fmtPct(reBullTotalGain));
    addRow('Annual Gain', '—', fmtPct(reBearAnnualGain), fmtPct(reExpectedAnnualGain), fmtPct(reBullAnnualGain));
    addRow('CAGR', '—', fmtPct(reBearCAGR), fmtPct(reExpectedCAGR), fmtPct(reBullCAGR));

    addSectionLabel('Alternative Investments — Sell Today &amp; Deploy (' + targetYear + ' Targets)');
    addRow('Portfolio Value', fmt(totalAllocated), fmt(totalBear), fmt(totalExpected), fmt(totalBull));
    addRow('Total Gain', '—', fmtPct(invBearTotalGain), fmtPct(invExpectedTotalGain), fmtPct(invBullTotalGain));
    addRow('Annual Gain', '—', fmtPct(invBearAnnualGain), fmtPct(invExpectedAnnualGain), fmtPct(invBullAnnualGain));
    addRow('CAGR', '—', fmtPct(invBearCAGR), fmtPct(invExpectedCAGR), fmtPct(invBullCAGR));

    addSectionLabel('Delta — Investments vs. Real Estate');
    addRow('Delta $', '—', colorVal(deltaBear), colorVal(deltaExpected), colorVal(deltaBull), 'delta-row');
    addRow('Delta %', '—', colorPct(deltaBearPct), colorPct(deltaExpectedPct), colorPct(deltaBullPct), 'delta-row');

    // Winner row
    function winner(inv, re) {
      if (inv > re) return '<span style="color:var(--color-result-positive); font-weight:700;">Investments Win</span>';
      if (re > inv) return '<span style="color:var(--color-accent); font-weight:700;">Real Estate Wins</span>';
      return '<span style="color:var(--color-text-muted);">Tie</span>';
    }
    addRow('Winner', '—', winner(totalBear, reBearEquity), winner(totalExpected, reExpectedEquity), winner(totalBull, reBullEquity), 'winner-row');

    // ——— DEAL SUMMARY ———
    buildDealSummary(
      years, targetYear, partners,
      currentEquityPerPartner, reBearEquity, reExpectedEquity, reBullEquity,
      totalAllocated, totalBear, totalExpected, totalBull,
      deltaExpected, deltaExpectedPct
    );
  }

  // ===== DEAL SUMMARY (RULE-BASED) =====
  function buildDealSummary(years, targetYear, partners, currentEquity, reBear, reExpected, reBull, invBase, invBear, invExpected, invBull, deltaExpected, deltaExpectedPct) {
    var summary = document.getElementById('dealSummary');
    var text = document.getElementById('dealSummaryText');

    if (currentEquity <= 0 || invBase <= 0) {
      summary.className = 'deal-summary';
      text.innerHTML = 'Enter your property details and investment targets above to see a comparison analysis.';
      return;
    }

    var partnerNote = partners > 1 ? ' (per partner, ' + partners + ' total)' : '';
    var lines = [];

    // Current position
    lines.push('Your current equity position is ' + fmt(currentEquity) + partnerNote + '.');

    // RE outlook
    lines.push('If you hold the property for ' + years + ' years, your expected net equity in ' + targetYear + ' is ' + fmt(reExpected) + ' (bear: ' + fmt(reBear) + ', bull: ' + fmt(reBull) + ').');

    // Investment outlook
    lines.push('If you sell today and deploy ' + fmt(invBase) + ' into alternative investments, the expected portfolio value in ' + targetYear + ' is ' + fmt(invExpected) + ' (bear: ' + fmt(invBear) + ', bull: ' + fmt(invBull) + ').');

    // Delta verdict
    if (deltaExpected > 0) {
      lines.push('In the expected case, selling and redeploying outperforms holding by ' + fmt(Math.abs(deltaExpected)) + ' (' + fmtPct(Math.abs(deltaExpectedPct)) + '). The alternative investments appear to be a stronger store of value over this time horizon.');
      summary.className = 'deal-summary positive';
    } else if (deltaExpected < 0) {
      lines.push('In the expected case, holding the real estate outperforms selling and redeploying by ' + fmt(Math.abs(deltaExpected)) + ' (' + fmtPct(Math.abs(deltaExpectedPct)) + '). The property appears to be the stronger store of value over this time horizon.');
      summary.className = 'deal-summary caution';
    } else {
      lines.push('In the expected case, both strategies produce the same outcome.');
      summary.className = 'deal-summary';
    }

    // Scenario divergence check
    var bearWinner = invBear > reBear ? 'investments' : 'real estate';
    var bullWinner = invBull > reBull ? 'investments' : 'real estate';
    if (bearWinner !== bullWinner) {
      lines.push('Note: the bear and bull cases favor different strategies — ' + bearWinner + ' wins in the bear case while ' + bullWinner + ' wins in the bull case. Your conviction on market direction matters here.');
    }

    text.innerHTML = lines.join(' ');
  }

  // ===== PDF GENERATION =====
  function generatePDF() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

    var address = document.getElementById('address').value || 'Property Analysis';
    var years = parseNum(document.getElementById('yearsToHold').value) || 5;
    var targetYear = new Date().getFullYear() + years;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var margin = 40;

    // Colors
    var darkBg = [2, 6, 23];
    var teal = [56, 189, 248];
    var white = [255, 255, 255];
    var gray = [148, 163, 184];
    var lightGray = [226, 232, 240];
    var green = [34, 197, 94];
    var red = [239, 68, 68];

    // ===== LIGHT MODE PDF FOR PRINTING =====
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Header bar
    doc.setFillColor(0, 52, 77);
    doc.rect(0, 0, pageW, 52, 'F');

    // Logo
    var logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = './assets/fortified-logo-white.png';

    function finishPDF() {
      try { doc.addImage(logoImg, 'PNG', margin, 10, 90, 32); } catch (e) {}

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Store of Value Analysis', margin + 100, 30);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(address, margin + 100, 44);

      // Date
      doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageW - margin, 30, { align: 'right' });
      doc.text(years + '-Year Hold | Target Year: ' + targetYear, pageW - margin, 44, { align: 'right' });

      var y = 68;

      // Comparison table
      var compTable = document.getElementById('comparisonTable');
      var headers = [];
      var thEls = compTable.querySelectorAll('thead th');
      for (var h = 0; h < thEls.length; h++) {
        headers.push(thEls[h].textContent || '');
      }

      var rows = [];
      var rowStyles = [];
      var trEls = compTable.querySelectorAll('tbody tr');
      for (var r = 0; r < trEls.length; r++) {
        var tr = trEls[r];
        if (tr.classList.contains('section-label')) {
          var labelText = tr.querySelector('td').textContent;
          rows.push([{ content: labelText, colSpan: 5, styles: { fillColor: [230, 240, 250], textColor: [0, 52, 77], fontStyle: 'bold', fontSize: 7 } }]);
          rowStyles.push('section');
          continue;
        }
        var cells = tr.querySelectorAll('td');
        var rowData = [];
        for (var c = 0; c < cells.length; c++) {
          rowData.push(cells[c].textContent);
        }
        rows.push(rowData);
        rowStyles.push(tr.classList.contains('delta-row') ? 'delta' : tr.classList.contains('winner-row') ? 'winner' : 'normal');
      }

      doc.autoTable({
        startY: y,
        head: [headers],
        body: rows,
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [200, 210, 220],
          lineWidth: 0.5,
          textColor: [30, 30, 30],
          font: 'helvetica',
          halign: 'center'
        },
        headStyles: {
          fillColor: [0, 52, 77],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 150 }
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            var style = rowStyles[data.row.index];
            if (style === 'delta' || style === 'winner') {
              data.cell.styles.fontStyle = 'bold';
            }
            // Color positive/negative values
            var val = data.cell.raw;
            if (typeof val === 'string') {
              if (val.indexOf('Investments Win') >= 0) {
                data.cell.styles.textColor = green;
              } else if (val.indexOf('Real Estate Wins') >= 0) {
                data.cell.styles.textColor = [0, 52, 77];
              }
              if (val.charAt(0) === '-' && val.charAt(1) === '$') {
                data.cell.styles.textColor = red;
              }
            }
          }
        }
      });

      var afterTable = doc.lastAutoTable.finalY + 12;

      // Investment breakdown
      var invTable = document.getElementById('investGrid');
      var invHeaders = [];
      var invThEls = invTable.querySelectorAll('thead th');
      for (var ih = 0; ih < invThEls.length; ih++) {
        invHeaders.push(invThEls[ih].textContent || '');
      }

      var invRows = [];
      var invTrEls = invTable.querySelectorAll('tbody tr');
      for (var ir = 0; ir < invTrEls.length; ir++) {
        var invTr = invTrEls[ir];
        var invCells = invTr.querySelectorAll('td');
        var invRowData = [];
        for (var ic = 0; ic < invCells.length; ic++) {
          var inp = invCells[ic].querySelector('input');
          invRowData.push(inp ? (inp.value || '—') : invCells[ic].textContent);
        }
        // Skip empty investment rows
        if (!invTr.classList.contains('total-row') && !invTr.classList.contains('remaining-row')) {
          if (!invRowData[0] || invRowData[0] === '—' || invRowData[0].trim() === '') {
            if (!invRowData[1] || invRowData[1] === '—' || invRowData[1] === '$0' || invRowData[1].trim() === '') continue;
          }
        }
        invRows.push(invRowData);
      }

      if (invRows.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 52, 77);
        doc.text('Investment Allocation', margin, afterTable + 2);

        doc.autoTable({
          startY: afterTable + 8,
          head: [invHeaders],
          body: invRows,
          theme: 'grid',
          margin: { left: margin, right: pageW / 2 + 20 },
          styles: {
            fontSize: 7,
            cellPadding: 3,
            lineColor: [200, 210, 220],
            lineWidth: 0.5,
            textColor: [30, 30, 30],
            halign: 'center'
          },
          headStyles: {
            fillColor: [0, 52, 77],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { halign: 'left' }
          }
        });
      }

      // RE assumptions on right side
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 52, 77);
      doc.text('Real Estate Assumptions', pageW / 2 + 40, afterTable + 2);

      var reAssumptions = [
        ['Current Value', document.getElementById('reCurrentValue').value],
        ['1st Mortgage', document.getElementById('reMortgage1').value],
        ['2nd Mortgage', document.getElementById('reMortgage2').value],
        ['Closing Cost %', document.getElementById('closingCostPct').value + '%'],
        ['Partners', document.getElementById('totalPartners').value],
        ['Bear Sale Price', document.getElementById('reBearPrice').value || '—'],
        ['Expected Sale Price', document.getElementById('reExpectedPrice').value || '—'],
        ['Bull Sale Price', document.getElementById('reBullPrice').value || '—'],
        ['Future 1st Mtg Payoff', document.getElementById('reFutureMortgage1').value || '—'],
        ['Additional Capital', document.getElementById('reAdditionalCapital').value || '$0']
      ];

      doc.autoTable({
        startY: afterTable + 8,
        body: reAssumptions,
        theme: 'grid',
        margin: { left: pageW / 2 + 40, right: margin },
        styles: {
          fontSize: 7,
          cellPadding: 3,
          lineColor: [200, 210, 220],
          lineWidth: 0.5,
          textColor: [30, 30, 30]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'right' }
        }
      });

      // Deal summary at bottom
      var summaryText = document.getElementById('dealSummaryText').textContent;
      if (summaryText && summaryText.indexOf('Enter your') < 0) {
        var bottomY = Math.max(doc.lastAutoTable.finalY + 16, pageH - 80);
        doc.setDrawColor(0, 52, 77);
        doc.setLineWidth(1);
        doc.line(margin, bottomY, pageW - margin, bottomY);
        bottomY += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 52, 77);
        doc.text('Deal Summary', margin, bottomY);
        bottomY += 10;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(7);
        var splitText = doc.splitTextToSize(summaryText, pageW - margin * 2);
        doc.text(splitText, margin, bottomY);
      }

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Fortified Realty Group, LLC | One North Main Street, Fall River, MA 02720 | fortifiedrealty.net', margin, pageH - 20);

      // QR placeholder
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(pageW - margin - 50, pageH - 70, 50, 50, 3, 3, 'S');
      doc.setFontSize(5);
      doc.setTextColor(180, 180, 180);
      doc.text('QR CODE', pageW - margin - 25, pageH - 42, { align: 'center' });

      // Save
      var filename = address ? address.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) : 'Property';
      doc.save('StoreOfValue_' + filename + '.pdf');
    }

    logoImg.onload = finishPDF;
    logoImg.onerror = finishPDF;
    // Kick off if already cached
    if (logoImg.complete) { setTimeout(finishPDF, 50); }
  }

  // ===== RESET =====
  function resetAll() {
    document.getElementById('address').value = '';
    document.getElementById('yearsToHold').value = '5';
    document.getElementById('closingCostPct').value = '7';
    document.getElementById('totalPartners').value = '1';
    document.getElementById('reCurrentValue').value = '$725,000';
    document.getElementById('reMortgage1').value = '$459,000';
    document.getElementById('reMortgage2').value = '$0';
    document.getElementById('reBearPrice').value = '';
    document.getElementById('reExpectedPrice').value = '';
    document.getElementById('reBullPrice').value = '';
    document.getElementById('reFutureMortgage1').value = '';
    document.getElementById('reFutureMortgage2').value = '$0';
    document.getElementById('reAdditionalCapital').value = '$0';
    document.getElementById('taxesOwed').value = '$0';
    document.getElementById('otherExpenses').value = '$0';
    buildInvestmentRows();
    recalc();
  }

  // ===== INIT =====
  buildInvestmentRows();
  wireInputs();
  recalc();

  document.getElementById('savePdfBtn').addEventListener('click', generatePDF);
  document.getElementById('resetBtn').addEventListener('click', resetAll);

})();

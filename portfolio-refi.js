// ===== PORTFOLIO REFI ANALYZER — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

  var MAX_PROPERTIES = 10;
  var INITIAL_ROWS = 4;

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

  function fmtPct(n) { return n.toFixed(2) + '%'; }
  function fmtRatio(n) { return n.toFixed(2) + 'x'; }

  function formatMoneyInput(el) {
    var val = parseNum(el.value);
    el.value = fmt(val);
  }

  function stripMoneyInput(el) {
    var val = parseNum(el.value);
    el.value = val === 0 ? '' : val;
  }

  // ===== AMORTIZATION HELPER =====
  function calcPI(principal, annualRate, months) {
    if (principal <= 0 || months <= 0) return 0;
    var r = annualRate / 100 / 12;
    if (r <= 0) return principal / months;
    return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  }

  // ===== GENERATE PROPERTY ROWS =====
  var propertyBody = document.getElementById('propertyBody');
  var propertyCount = 0;

  var defaultRows = [
    {
      addr: '222 Main St, Fall River, MA',
      noi: '$7,000',
      mtg: '$200,000',
      pi: '$3,200',
      units: '6',
      low: '$900,000',
      high: '$1,000,000',
      action: 'Refi'
    }
  ];

  function addPropertyRow(data) {
    if (propertyCount >= MAX_PROPERTIES) return;
    propertyCount++;
    var i = propertyCount;
    var d = data || {};

    var tr = document.createElement('tr');
    tr.id = 'propRow' + i;
    tr.innerHTML =
      '<td>' + i + '</td>' +
      '<td class="col-addr"><input type="text" class="addr-input" id="propAddr' + i + '" value="' + (d.addr || '') + '" placeholder="123 Main St, City, ST"></td>' +
      '<td class="col-money"><input type="text" class="money-input prop-input" id="propNOI' + i + '" value="' + (d.noi || '') + '" placeholder="$0" inputmode="numeric"></td>' +
      '<td class="col-money"><input type="text" class="money-input prop-input" id="propMtg' + i + '" value="' + (d.mtg || '') + '" placeholder="$0" inputmode="numeric"></td>' +
      '<td class="col-money"><input type="text" class="money-input prop-input" id="propPI' + i + '" value="' + (d.pi || '') + '" placeholder="$0" inputmode="numeric"></td>' +
      '<td class="col-units"><input type="number" class="prop-input" id="propUnits' + i + '" value="' + (d.units || '') + '" placeholder="0" min="0" max="999" style="text-align:center;"></td>' +
      '<td class="col-money"><input type="text" class="money-input prop-input" id="propLow' + i + '" value="' + (d.low || '') + '" placeholder="$0" inputmode="numeric"></td>' +
      '<td class="col-money"><input type="text" class="money-input prop-input" id="propHigh' + i + '" value="' + (d.high || '') + '" placeholder="$0" inputmode="numeric"></td>' +
      '<td class="col-action"><select id="propAction' + i + '" class="prop-input">' +
        '<option value="Refi"' + (d.action === 'Refi' || !d.action ? ' selected' : '') + '>Refi</option>' +
        '<option value="Keep"' + (d.action === 'Keep' ? ' selected' : '') + '>Keep</option>' +
        '<option value="Skip"' + (d.action === 'Skip' ? ' selected' : '') + '>Skip</option>' +
      '</select></td>';

    propertyBody.appendChild(tr);

    // Bind money-input formatting
    tr.querySelectorAll('.money-input').forEach(function (el) {
      el.addEventListener('focus', function () { stripMoneyInput(el); });
      el.addEventListener('blur', function () { formatMoneyInput(el); });
    });

    updateAddButton();
    calculate();
  }

  function updateAddButton() {
    var btn = document.getElementById('addPropertyBtn');
    if (btn) {
      btn.style.display = propertyCount >= MAX_PROPERTIES ? 'none' : '';
    }
  }

  // Init rows
  if (propertyBody) {
    // Row 1 with defaults
    addPropertyRow(defaultRows[0]);
    // Rows 2-4 empty
    for (var r = 1; r < INITIAL_ROWS; r++) {
      addPropertyRow(null);
    }
  }

  // Add Property button
  var addBtn = document.getElementById('addPropertyBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      addPropertyRow(null);
    });
  }

  // ===== BIND GLOBAL MONEY INPUTS (underwriting section) =====
  document.querySelectorAll('.range-inputs .money-input').forEach(function (el) {
    el.addEventListener('focus', function () { stripMoneyInput(el); });
    el.addEventListener('blur', function () { formatMoneyInput(el); });
  });

  // ===== GATHER PROPERTY DATA =====
  function getProperties() {
    var props = [];
    for (var i = 1; i <= propertyCount; i++) {
      var actionEl = document.getElementById('propAction' + i);
      var action = actionEl ? actionEl.value : 'Skip';
      if (action === 'Skip') continue;

      var addr = (document.getElementById('propAddr' + i) || {}).value || '';
      var noi = parseNum((document.getElementById('propNOI' + i) || {}).value);
      var mtg = parseNum((document.getElementById('propMtg' + i) || {}).value);
      var pi = parseNum((document.getElementById('propPI' + i) || {}).value);
      var units = parseNum((document.getElementById('propUnits' + i) || {}).value);
      var low = parseNum((document.getElementById('propLow' + i) || {}).value);
      var high = parseNum((document.getElementById('propHigh' + i) || {}).value);

      // Skip truly empty rows (no meaningful data)
      if (noi === 0 && mtg === 0 && pi === 0 && units === 0 && low === 0 && high === 0 && addr === '') continue;

      props.push({
        index: i,
        addr: addr,
        noi: noi,
        mtg: mtg,
        pi: pi,
        units: units,
        low: low,
        high: high,
        action: action,
        mid: (low + high) / 2
      });
    }
    return props;
  }

  // ===== CONDITIONAL CLASS =====
  function condClass(val, threshold, mode) {
    if (mode === 'dscr') {
      if (val >= 1.25) return 'cond-green';
      if (val >= 1.0) return 'cond-yellow';
      return 'cond-red';
    }
    if (mode === 'cashflow' || mode === 'cashout') {
      return val >= 0 ? 'cond-green' : 'cond-red';
    }
    return '';
  }

  // ===== MAIN CALCULATE =====
  function calculate() {
    var props = getProperties();
    var ltv = parseNum(document.getElementById('refiLtv').value) / 100;
    var rate = parseNum(document.getElementById('refiRate').value);
    var term = parseNum(document.getElementById('refiTerm').value);
    var closingCost = parseNum(document.getElementById('refiClosingCost').value);

    // ===== SECTION 3: PORTFOLIO SUMMARY =====
    var totalValueLow = 0, totalValueHigh = 0, totalMtg = 0, totalNOI = 0, totalCurrentPI = 0, totalDoors = 0;

    props.forEach(function (p) {
      totalValueLow += p.low;
      totalValueHigh += p.high;
      totalMtg += p.mtg;
      totalNOI += p.noi;
      totalCurrentPI += p.pi;
      totalDoors += p.units;
    });

    setText('resultValueLow', fmt(totalValueLow));
    setText('resultValueHigh', fmt(totalValueHigh));
    setText('resultMtgBalance', fmt(totalMtg));
    setText('resultTotalNOI', fmt(totalNOI));
    setText('resultCurrentPI', fmt(totalCurrentPI));
    setText('resultTotalDoors', totalDoors > 0 ? totalDoors.toString() : '—');

    // ===== SECTION 4: REFI ANALYSIS =====
    var refiProps = props.filter(function (p) { return p.action === 'Refi'; });
    var refiBody = document.getElementById('refiPropertyBody');
    var html = '';

    var totalNewMtg = 0, totalNewPI = 0, totalCashFlow = 0, totalCashOut = 0;
    var totalRefiNOI = 0, totalRefiCurrentPI = 0, totalRefiCurrentMtg = 0;

    refiProps.forEach(function (p) {
      var newMtg = p.mid * ltv;
      var newPI = calcPI(newMtg, rate, term);
      var cashFlow = p.noi - newPI;
      var dscr = newPI > 0 ? p.noi / newPI : 0;
      var cashOut = newMtg - p.mtg - closingCost;

      totalNewMtg += newMtg;
      totalNewPI += newPI;
      totalCashFlow += cashFlow;
      totalCashOut += cashOut;
      totalRefiNOI += p.noi;
      totalRefiCurrentPI += p.pi;
      totalRefiCurrentMtg += p.mtg;

      var ltvLabel = Math.round(ltv * 100) + '%';

      html += '<tr>';
      html += '<td style="text-align:left; padding-left:var(--space-4); font-weight:600; color:var(--color-text-muted); min-width:160px;">' + (p.addr || 'Property #' + p.index) + '</td>';
      html += '<td>' + fmt(p.mtg) + '</td>';
      html += '<td>' + fmt(p.noi) + '</td>';
      html += '<td>' + fmt(p.mid) + '</td>';
      html += '<td>' + fmt(Math.round(newMtg)) + '</td>';
      html += '<td>' + fmt(Math.round(newPI)) + '</td>';
      html += '<td class="' + condClass(cashFlow, 0, 'cashflow') + '">' + fmt(Math.round(cashFlow)) + '</td>';
      html += '<td class="' + condClass(dscr, 0, 'dscr') + '">' + fmtRatio(dscr) + '</td>';
      html += '<td class="' + condClass(cashOut, 0, 'cashout') + '">' + fmt(Math.round(cashOut)) + '</td>';
      html += '</tr>';
    });

    // Totals row
    var portfolioDSCR = totalNewPI > 0 ? totalRefiNOI / totalNewPI : 0;
    if (refiProps.length > 0) {
      html += '<tr class="totals-row">';
      html += '<td style="text-align:left; padding-left:var(--space-4); font-weight:700;">PORTFOLIO TOTAL</td>';
      html += '<td>' + fmt(totalRefiCurrentMtg) + '</td>';
      html += '<td>' + fmt(totalRefiNOI) + '</td>';
      html += '<td>—</td>';
      html += '<td>' + fmt(Math.round(totalNewMtg)) + '</td>';
      html += '<td>' + fmt(Math.round(totalNewPI)) + '</td>';
      html += '<td class="' + condClass(totalCashFlow, 0, 'cashflow') + '">' + fmt(Math.round(totalCashFlow)) + '</td>';
      html += '<td class="' + condClass(portfolioDSCR, 0, 'dscr') + '">' + fmtRatio(portfolioDSCR) + '</td>';
      html += '<td class="' + condClass(totalCashOut, 0, 'cashout') + '">' + fmt(Math.round(totalCashOut)) + '</td>';
      html += '</tr>';
    }

    if (refiBody) refiBody.innerHTML = html;

    // ===== WORTH IT? ANALYSIS =====
    buildWorthIt(refiProps, totalCashOut, totalNewPI, totalRefiCurrentPI, totalCashFlow, portfolioDSCR, closingCost);

    // ===== SECTION 5: SENSITIVITY TABLE =====
    buildSensitivity(refiProps, ltv, rate, term, closingCost);

    // ===== DEAL SUMMARY =====
    buildDealSummary(props, refiProps, totalValueLow, totalValueHigh, totalMtg, totalDoors, ltv, totalCashOut, closingCost, totalNewPI, totalRefiCurrentPI, totalCashFlow, portfolioDSCR);
  }

  // ===== WORTH IT? CARDS =====
  function buildWorthIt(refiProps, totalCashOut, totalNewPI, totalCurrentPI, totalCashFlow, portfolioDSCR, closingCost) {
    var grid = document.getElementById('worthItGrid');
    if (!grid) return;

    if (refiProps.length === 0) {
      grid.innerHTML = '<p style="color:var(--color-text-muted); font-size:var(--text-sm);">Mark at least one property as "Refi" to see the analysis.</p>';
      return;
    }

    var totalClosing = closingCost * refiProps.length;
    var debtDiff = totalNewPI - totalCurrentPI;
    var cfImprovement = totalCurrentPI - totalNewPI; // Positive = improvement (lower debt)
    // Actually cash flow change = (NOI - newPI) - (NOI - oldPI) = oldPI - newPI
    var monthlyCFChange = totalCurrentPI - totalNewPI;
    var payback = monthlyCFChange > 0 ? totalClosing / monthlyCFChange : -1;

    var worthVerdict = '';
    var verdictClass = '';

    if (totalCashOut > 0 && portfolioDSCR >= 1.25) {
      worthVerdict = 'Yes — positive cash out with strong DSCR';
      verdictClass = 'positive';
    } else if (totalCashOut > 0 && portfolioDSCR >= 1.0) {
      worthVerdict = 'Maybe — positive cash out but DSCR is tight';
      verdictClass = 'caution';
    } else if (totalCashOut <= 0) {
      worthVerdict = 'No — negative cash out at current values';
      verdictClass = 'negative';
    } else {
      worthVerdict = 'No — DSCR below 1.0x';
      verdictClass = 'negative';
    }

    var cards = [
      { label: 'Total Cash Out', value: fmt(Math.round(totalCashOut)), cls: totalCashOut >= 0 ? 'positive' : 'negative' },
      { label: 'New Monthly Debt Service', value: fmt(Math.round(totalNewPI)), cls: '' },
      { label: 'Change in Monthly CF', value: fmt(Math.round(monthlyCFChange)), cls: monthlyCFChange >= 0 ? 'positive' : 'negative' },
      { label: 'Portfolio DSCR', value: fmtRatio(portfolioDSCR), cls: portfolioDSCR >= 1.25 ? 'positive' : portfolioDSCR >= 1.0 ? 'caution' : 'negative' },
      { label: 'Total Closing Costs', value: fmt(totalClosing), cls: '' },
      { label: 'Simple Payback', value: payback > 0 ? Math.ceil(payback) + ' months' : 'N/A', cls: payback > 0 && payback <= 24 ? 'positive' : payback > 24 ? 'caution' : 'negative' }
    ];

    var h = '';
    cards.forEach(function (c) {
      h += '<div class="worth-it-card">';
      h += '<div class="wi-label">' + c.label + '</div>';
      h += '<div class="wi-value ' + c.cls + '">' + c.value + '</div>';
      h += '</div>';
    });

    // Verdict card (full width)
    h += '<div class="worth-it-card" style="grid-column: 1 / -1; border-left: 4px solid ' +
      (verdictClass === 'positive' ? 'var(--color-result-positive)' : verdictClass === 'caution' ? 'var(--color-result-warning)' : 'var(--color-result-negative)') + ';">';
    h += '<div class="wi-label">Is It Worth It?</div>';
    h += '<div class="wi-value ' + verdictClass + '">' + worthVerdict + '</div>';
    h += '</div>';

    grid.innerHTML = h;
  }

  // ===== SENSITIVITY TABLE =====
  function buildSensitivity(refiProps, ltv, rate, term, closingCost) {
    var thead = document.getElementById('sensitivityHead');
    var tbody = document.getElementById('sensitivityBody');
    if (!thead || !tbody) return;

    if (refiProps.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--color-text-muted); padding:var(--space-4); text-align:center;">Mark at least one property as "Refi" to see sensitivity.</td></tr>';
      return;
    }

    // Calculate baseline mid for all refi properties
    var baseTotalMid = 0;
    refiProps.forEach(function (p) { baseTotalMid += p.mid; });

    // 5 steps: -10%, -5%, 0% (mid), +5%, +10%
    var scenarios = [
      { label: '-10%', factor: 0.90 },
      { label: '-5%', factor: 0.95 },
      { label: 'Midpoint', factor: 1.00 },
      { label: '+5%', factor: 1.05 },
      { label: '+10%', factor: 1.10 }
    ];

    thead.innerHTML = '<tr>' +
      '<th style="text-align:left; padding-left:var(--space-4); min-width:120px;">Scenario</th>' +
      '<th>Total New Mortgage</th>' +
      '<th>Total New P+I</th>' +
      '<th>Total Cash Flow</th>' +
      '<th>Portfolio DSCR</th>' +
      '<th>Total Cash Out</th>' +
      '</tr>';

    var bodyHtml = '';
    var totalRefiNOI = 0;
    var totalCurrentMtg = 0;
    refiProps.forEach(function (p) {
      totalRefiNOI += p.noi;
      totalCurrentMtg += p.mtg;
    });

    scenarios.forEach(function (s) {
      var totalNewMtg = 0;
      var totalNewPI = 0;

      refiProps.forEach(function (p) {
        var adjustedMid = p.mid * s.factor;
        var newMtg = adjustedMid * ltv;
        var newPI = calcPI(newMtg, rate, term);
        totalNewMtg += newMtg;
        totalNewPI += newPI;
      });

      var totalCF = totalRefiNOI - totalNewPI;
      var dscr = totalNewPI > 0 ? totalRefiNOI / totalNewPI : 0;
      var totalCashOut = totalNewMtg - totalCurrentMtg - (closingCost * refiProps.length);

      var isMid = s.factor === 1.0;
      var rowClass = isMid ? ' class="results-row"' : '';

      bodyHtml += '<tr' + rowClass + '>';
      bodyHtml += '<td style="text-align:left; padding-left:var(--space-4); font-weight:600; color:var(--color-text-muted);">' + s.label + ' (' + fmt(Math.round(baseTotalMid * s.factor)) + ')</td>';
      bodyHtml += '<td>' + fmt(Math.round(totalNewMtg)) + '</td>';
      bodyHtml += '<td>' + fmt(Math.round(totalNewPI)) + '</td>';
      bodyHtml += '<td class="' + condClass(totalCF, 0, 'cashflow') + '">' + fmt(Math.round(totalCF)) + '</td>';
      bodyHtml += '<td class="' + condClass(dscr, 0, 'dscr') + '">' + fmtRatio(dscr) + '</td>';
      bodyHtml += '<td class="' + condClass(totalCashOut, 0, 'cashout') + '">' + fmt(Math.round(totalCashOut)) + '</td>';
      bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;
  }

  // ===== DEAL SUMMARY =====
  function buildDealSummary(props, refiProps, totalValueLow, totalValueHigh, totalMtg, totalDoors, ltv, totalCashOut, closingCost, totalNewPI, totalCurrentPI, totalCashFlow, portfolioDSCR) {
    var el = document.getElementById('dealSummary');
    var textEl = document.getElementById('dealSummaryText');
    if (!el || !textEl) return;

    if (props.length === 0) {
      el.className = 'deal-summary';
      textEl.textContent = 'Enter your property details above to see a plain English analysis.';
      return;
    }

    var sentences = [];
    var totalClosing = closingCost * refiProps.length;
    var debtDiff = totalNewPI - totalCurrentPI;
    var ltvPctLabel = Math.round(ltv * 100) + '%';

    sentences.push('Across ' + props.length + ' properties (' + totalDoors + ' doors), you have between ' + fmt(totalValueLow) + ' and ' + fmt(totalValueHigh) + ' in portfolio value against ' + fmt(totalMtg) + ' in mortgages.');

    if (refiProps.length > 0) {
      sentences.push('At ' + ltvPctLabel + ' LTV on midpoint appraisals, you could extract ' + fmt(Math.round(totalCashOut)) + ' in equity after paying off existing mortgages and ' + fmt(totalClosing) + ' in closing costs.');
      sentences.push('Your new monthly debt service would be ' + fmt(Math.round(totalNewPI)) + ' vs current ' + fmt(Math.round(totalCurrentPI)) + ' \u2014 a change of ' + fmt(Math.round(debtDiff)) + '/month.');

      // DSCR commentary
      if (portfolioDSCR >= 1.25) {
        sentences.push('Portfolio DSCR after refi: ' + fmtRatio(portfolioDSCR) + ' \u2014 healthy coverage above the 1.25x lender threshold.');
      } else if (portfolioDSCR >= 1.0) {
        sentences.push('Portfolio DSCR after refi: ' + fmtRatio(portfolioDSCR) + ' \u2014 the portfolio covers debt service, but without much cushion. Most lenders want 1.25x or better.');
      } else {
        sentences.push('Portfolio DSCR after refi: ' + fmtRatio(portfolioDSCR) + ' \u2014 below 1.0x. The portfolio won\'t cover debt service after this refi.');
      }

      if (totalCashOut < 0) {
        sentences.push('The numbers don\'t support a cash-out refi at these values. You\'d need higher appraisals or a higher LTV.');
      }

      if (portfolioDSCR < 1.0) {
        sentences.push('Warning: the portfolio won\'t cover debt service after this refi. The NOI isn\'t enough to support this level of borrowing.');
      }
    }

    // Determine class
    var cls = 'deal-summary';
    if (refiProps.length > 0) {
      if (totalCashOut > 0 && portfolioDSCR >= 1.25) {
        cls += ' positive';
      } else if (totalCashOut < 0 || portfolioDSCR < 1.0) {
        cls += ' negative';
      } else {
        cls += ' caution';
      }
    }

    el.className = cls;
    textEl.innerHTML = sentences.join(' ');
  }

  // ===== HELPER =====
  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', function (e) {
    if (e.target.matches('input, select') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.matches('select') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // ===== RESET =====
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      // Clear all property rows
      if (propertyBody) propertyBody.innerHTML = '';
      propertyCount = 0;

      // Reset underwriting
      document.getElementById('refiLtv').value = '75';
      document.getElementById('refiRate').value = '8';
      document.getElementById('refiTerm').value = '360';
      document.getElementById('refiClosingCost').value = '$20,000';

      // Re-create default rows
      addPropertyRow(defaultRows[0]);
      for (var r = 1; r < INITIAL_ROWS; r++) {
        addPropertyRow(null);
      }

      calculate();
    });
  }

  // ===== SAVE AS PDF — LANDSCAPE LETTER =====
  var pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);

  function generatePDF() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    var W = 279.4;
    var H = 215.9;
    var margin = 12;
    var cw = W - margin * 2;
    var y = margin;

    // Colors — Light mode
    var teal = [0, 52, 77];
    var tealLight = [1, 104, 145];
    var darkText = [26, 26, 26];
    var mutedText = [100, 100, 100];
    var lightBg = [245, 247, 250];
    var white = [255, 255, 255];
    var green = [22, 101, 52];
    var greenBg = [220, 252, 231];
    var yellow = [133, 100, 0];
    var yellowBg = [254, 249, 195];
    var red = [153, 27, 27];
    var redBg = [254, 226, 226];

    // White background
    doc.setFillColor.apply(doc, white);
    doc.rect(0, 0, W, H, 'F');

    // Teal bar
    doc.setFillColor.apply(doc, teal);
    doc.rect(0, 0, W, 3, 'F');

    // Logo
    try {
      doc.addImage('./assets/fortified-logo-print.png', 'PNG', margin, y + 1, 50, 9);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor.apply(doc, teal);
      doc.text('FORTIFIED REALTY GROUP', margin, y + 8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, mutedText);
    doc.text('Portfolio Refi Analyzer', W - margin, y + 5, { align: 'right' });
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor.apply(doc, darkText);
    doc.text('Portfolio Refi Analyzer', margin, y);
    y += 4;

    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // ===== PROPERTY GRID TABLE =====
    var props = getProperties();
    if (props.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, teal);
      doc.text('PROPERTY GRID', margin, y);
      y += 3;

      var propHeaders = ['Address', 'Monthly NOI', 'Mtg Balance', 'Monthly P+I', 'Units', 'Low Value', 'High Value', 'Action'];
      var propData = [];
      props.forEach(function (p) {
        propData.push([
          p.addr || 'Property #' + p.index,
          fmt(p.noi), fmt(p.mtg), fmt(p.pi),
          p.units.toString(), fmt(p.low), fmt(p.high), p.action
        ]);
      });

      doc.autoTable({
        head: [propHeaders],
        body: propData,
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: darkText, lineColor: [200, 200, 200], lineWidth: 0.2, font: 'helvetica', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: teal, textColor: white, fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        columnStyles: { 0: { halign: 'left', cellWidth: 50 } },
        alternateRowStyles: { fillColor: [250, 250, 252] }
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // ===== UNDERWRITING CRITERIA =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, teal);
    doc.text('UNDERWRITING CRITERIA', margin, y);
    y += 4;

    var ltv = document.getElementById('refiLtv').value;
    var rate = document.getElementById('refiRate').value;
    var term = document.getElementById('refiTerm').value;
    var cc = document.getElementById('refiClosingCost').value;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, darkText);
    doc.text('LTV: ' + ltv + '%    Rate: ' + rate + '%    Term: ' + term + ' months    Closing Costs: ' + cc + ' per property', margin, y);
    y += 5;

    // ===== PORTFOLIO SUMMARY BAR =====
    doc.setFillColor.apply(doc, lightBg);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'F');
    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'S');

    var summaryCards = [
      { label: 'Value (Low)', value: document.getElementById('resultValueLow').textContent },
      { label: 'Value (High)', value: document.getElementById('resultValueHigh').textContent },
      { label: 'Mtg Balance', value: document.getElementById('resultMtgBalance').textContent },
      { label: 'Monthly NOI', value: document.getElementById('resultTotalNOI').textContent },
      { label: 'Current P+I', value: document.getElementById('resultCurrentPI').textContent },
      { label: 'Doors', value: document.getElementById('resultTotalDoors').textContent }
    ];

    var rColW = cw / summaryCards.length;
    summaryCards.forEach(function (r, i) {
      var cx = margin + rColW * i + rColW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor.apply(doc, mutedText);
      doc.text(r.label.toUpperCase(), cx, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, teal);
      doc.text(r.value || '--', cx, y + 12, { align: 'center' });
    });
    y += 20;

    // ===== REFI BREAKDOWN TABLE =====
    var refiTable = document.getElementById('refiPropertyTable');
    if (refiTable && refiTable.querySelector('tbody tr')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, teal);
      doc.text('REFI ANALYSIS — PER-PROPERTY BREAKDOWN', margin, y);
      y += 3;

      var refiHeaders = [];
      refiTable.querySelectorAll('thead th').forEach(function (th) { refiHeaders.push(th.textContent); });

      var refiData = [];
      var refiCellStyles = {};
      refiTable.querySelectorAll('tbody tr').forEach(function (tr, ri) {
        var row = [];
        tr.querySelectorAll('td').forEach(function (td, ci) {
          row.push(td.textContent);
          if (td.classList.contains('cond-green')) {
            if (!refiCellStyles[ri]) refiCellStyles[ri] = {};
            refiCellStyles[ri][ci] = { fillColor: greenBg, textColor: green };
          } else if (td.classList.contains('cond-yellow')) {
            if (!refiCellStyles[ri]) refiCellStyles[ri] = {};
            refiCellStyles[ri][ci] = { fillColor: yellowBg, textColor: yellow };
          } else if (td.classList.contains('cond-red')) {
            if (!refiCellStyles[ri]) refiCellStyles[ri] = {};
            refiCellStyles[ri][ci] = { fillColor: redBg, textColor: red };
          }
        });
        refiData.push(row);
      });

      doc.autoTable({
        head: [refiHeaders],
        body: refiData,
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 6.5, cellPadding: 1.5, textColor: darkText, lineColor: [200, 200, 200], lineWidth: 0.2, font: 'helvetica', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: teal, textColor: white, fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        columnStyles: { 0: { halign: 'left', cellWidth: 45, textColor: mutedText } },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && refiCellStyles[data.row.index] && refiCellStyles[data.row.index][data.column.index]) {
            var style = refiCellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
          // Bold totals row (last row)
          if (data.section === 'body' && data.row.index === refiData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            if (!refiCellStyles[data.row.index] || !refiCellStyles[data.row.index][data.column.index]) {
              data.cell.styles.fillColor = [235, 240, 245];
              data.cell.styles.textColor = teal;
            }
          }
        }
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Check if we need page 2
    if (y > H - 40) {
      doc.addPage();
      y = margin;
      doc.setFillColor.apply(doc, white);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor.apply(doc, teal);
      doc.rect(0, 0, W, 3, 'F');
      y += 5;
    }

    // ===== DEAL SUMMARY BOX + QR =====
    var fy = H - 10;
    var afterY = y;
    var bottomZoneTop = afterY;
    var bottomZoneBottom = fy - 2;
    var bottomZoneHeight = bottomZoneBottom - bottomZoneTop;

    // QR placeholder
    var qrSize = 18;
    var qrX = W - margin - qrSize;
    var qrY = bottomZoneBottom - qrSize - 4;

    if (bottomZoneHeight > 20) {
      doc.setDrawColor.apply(doc, tealLight);
      doc.setLineWidth(0.4);
      doc.setFillColor.apply(doc, lightBg);
      doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor.apply(doc, mutedText);
      doc.text('Scan for', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
      doc.text('tutorial', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });
    }

    // Deal summary text
    var dealText = document.getElementById('dealSummaryText');
    var dealStr = dealText ? dealText.textContent : '';
    if (dealStr && dealStr !== 'Enter your property details above to see a plain English analysis.' && bottomZoneHeight > 10) {
      var summaryBoxWidth = qrX - margin - 6;
      doc.setDrawColor.apply(doc, tealLight);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, bottomZoneTop, summaryBoxWidth, bottomZoneHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor.apply(doc, teal);
      doc.text('DEAL SUMMARY', margin + 3, bottomZoneTop + 5);

      var textAreaH = bottomZoneHeight - 8;
      var textW = summaryBoxWidth - 6;
      var fontSize = 6.5;
      var splitText;
      [6.5, 6, 5.5, 5, 4.5].forEach(function (trySize) {
        doc.setFontSize(trySize);
        splitText = doc.splitTextToSize(dealStr, textW);
        if (splitText.length * (trySize * 0.45) <= textAreaH) {
          fontSize = trySize;
        }
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText || dealStr, margin + 3, bottomZoneTop + 9);
    }

    // Footer
    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, W - margin, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, teal);
    doc.text('Fortified Realty Group, LLC', margin, fy + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor.apply(doc, mutedText);
    doc.text('One North Main Street, Fall River, MA 02720  |  (508) 691-8035  |  fortifiedrealty.net', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis is for informational purposes only. Not financial advice. Consult with qualified professionals before making investment decisions.', margin, fy + 7.5);

    doc.save('Fortified-PortfolioRefi-Analysis.pdf');
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

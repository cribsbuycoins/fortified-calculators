// ===== FLIP TO BRRRBBR ANALYZER — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

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
    if (val === 0 && el.classList.contains('unit-input')) {
      el.value = '';
    } else {
      el.value = fmt(val);
    }
  }

  function stripMoneyInput(el) {
    var val = parseNum(el.value);
    if (val === 0 && el.classList.contains('unit-input')) {
      el.value = '';
    } else {
      el.value = val === 0 ? '0' : val;
    }
  }

  // Apply money formatting to ALL .money-input elements
  document.querySelectorAll('.money-input').forEach(function (el) {
    el.addEventListener('focus', function () { stripMoneyInput(el); });
    el.addEventListener('blur', function () { formatMoneyInput(el); });
  });

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function getVal(id) {
    return parseNum(document.getElementById(id)?.value);
  }

  // ===== MONTHS CONFIG: 2 through 12 (6 columns) =====
  var MONTHS = [2, 4, 6, 8, 10, 12];
  var MONTH_LABELS = MONTHS.map(function (m) { return m + ' Mo.'; });

  // ===== ARV ROWS — max 10, evenly spaced =====
  function buildArvRows(arvLow, arvHigh) {
    var arvRows = [];
    if (arvLow > 0 && arvHigh > arvLow) {
      var spread = arvHigh - arvLow;
      var rawStep = spread / 9;
      var step = rawStep <= 1000 ? 1000
               : rawStep <= 2500 ? 2500
               : rawStep <= 5000 ? 5000
               : rawStep <= 10000 ? 10000
               : rawStep <= 25000 ? 25000
               : 50000;
      for (var arv = arvLow; arv <= arvHigh + 0.01; arv += step) {
        arvRows.push(Math.round(arv));
        if (arvRows.length >= 10) break;
      }
      if (arvRows[arvRows.length - 1] !== Math.round(arvHigh)) {
        if (arvRows.length >= 10) arvRows[9] = Math.round(arvHigh);
        else arvRows.push(Math.round(arvHigh));
      }
    } else if (arvLow > 0 && arvHigh === arvLow) {
      arvRows.push(Math.round(arvLow));
    }
    return arvRows;
  }

  // ===== AMORTIZATION HELPER =====
  function calcPI(principal, annualRate, months) {
    if (principal <= 0 || months <= 0) return 0;
    var r = annualRate / 100 / 12;
    if (r <= 0) return principal / months;
    return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  }

  // ===== MAIN CALCULATE =====
  function calculate() {

    // =====================================================
    // PART 1: FLIP ANALYZER
    // =====================================================

    // --- Entry Strategy Inputs ---
    var purchasePrice      = getVal('purchasePrice');
    var rehab              = getVal('rehab');
    var closingInLoan      = getVal('closingInLoan');
    var hmlPointsPct       = getVal('hmlPoints');
    var hmlRatePct         = getVal('hmlRate');
    var hmlLtvPct          = getVal('hmlLtv');
    var otherUpFront       = getVal('otherUpFront');
    var addlRehabNotInLoan = getVal('addlRehabNotInLoan');
    var helocRatePct       = getVal('helocRate');
    var helocAmount        = getVal('helocAmount');

    // --- Holding Cost Inputs ---
    var taxesAnnual        = getVal('taxesAnnual');
    var insuranceAnnual    = getVal('insuranceAnnual');
    var utilitiesMonthly   = getVal('utilitiesMonthly');
    var otherCostAnnual    = getVal('otherCostAnnual');
    var otherCostMonthly   = getVal('otherCostMonthly');

    // --- Exit Strategy Inputs ---
    var arvLow             = getVal('arvLow');
    var arvHigh            = getVal('arvHigh');
    var brokerFeePct       = getVal('brokerFee');
    var otherClosingPct    = getVal('otherClosingPct');

    // ===== ENTRY STRATEGY CALCS =====
    var totalCostBasis = purchasePrice + rehab + closingInLoan;
    var hmlLoan        = totalCostBasis * (hmlLtvPct / 100);
    var pointsUpFront  = hmlLoan * (hmlPointsPct / 100);
    var hmlCashToClose = totalCostBasis - hmlLoan;

    var cashNeeded = hmlCashToClose + pointsUpFront + otherUpFront + addlRehabNotInLoan;
    var adjustedCashToClose = Math.max(0, cashNeeded - helocAmount);
    var helocUsedForClose = Math.min(helocAmount, cashNeeded);
    var leftOverHeloc     = helocAmount - helocUsedForClose;

    // ===== HOLDING COSTS =====
    var helocPayment     = helocAmount * (helocRatePct / 100) / 12;
    var hmlPayment       = hmlLoan * (hmlRatePct / 100) / 12;
    var totalMonthlyDebt = helocPayment + hmlPayment;
    var monthlyCarryCost = totalMonthlyDebt
                         + (taxesAnnual / 12)
                         + (insuranceAnnual / 12)
                         + utilitiesMonthly
                         + (otherCostAnnual / 12)
                         + otherCostMonthly;

    // ===== EXIT STRATEGY =====
    var totalSellingPct = brokerFeePct + otherClosingPct;

    // ===== UPDATE DOM — Part 1 =====
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
    var summaryData = MONTHS.map(function (m) {
      var totalHoldingCosts = monthlyCarryCost * m;
      var helocUsedAfterClosing = Math.min(leftOverHeloc, totalHoldingCosts);
      var netCashInDeal = adjustedCashToClose + totalHoldingCosts - helocUsedAfterClosing;
      var helocBalanceOwed = helocUsedForClose + helocUsedAfterClosing;

      return {
        totalHoldingCosts: totalHoldingCosts,
        helocUsedAfterClosing: helocUsedAfterClosing,
        netCashInDeal: netCashInDeal,
        helocBalanceOwed: helocBalanceOwed,
        hmlOwed: hmlLoan
      };
    });

    // ===== ARV ROWS =====
    var arvRows = buildArvRows(arvLow, arvHigh);

    // ===== BUILD PART 1 TABLES =====
    buildProfitTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
    buildSummaryTable(summaryData);
    buildCoCTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);

    // =====================================================
    // PART 2: BRRRBBR ANALYZER
    // =====================================================

    // --- Income ---
    var totalRent = 0;
    for (var i = 1; i <= 20; i++) {
      var el = document.getElementById('brrrUnit' + i);
      if (el) totalRent += parseNum(el.value);
    }
    var brrrOtherIncome = parseNum(document.getElementById('brrrOtherIncome')?.value);
    var brrrTotalMonthlyIncome = totalRent + brrrOtherIncome;
    var brrrTotalYearlyIncome = brrrTotalMonthlyIncome * 12;

    setText('brrrTotalMonthlyIncome', fmt(Math.round(brrrTotalMonthlyIncome)));

    // --- Expenses ---
    var brrrInsurance = parseNum(document.getElementById('brrrInsurance')?.value);
    var brrrTaxes     = parseNum(document.getElementById('brrrTaxes')?.value);
    var brrrInsTaxMonthly = (brrrInsurance + brrrTaxes) / 12;

    var brrrVacancyPct    = parseNum(document.getElementById('brrrVacancyPct')?.value) / 100;
    var brrrVacancyMonthly = brrrTotalMonthlyIncome * brrrVacancyPct;

    var brrrManagementPct    = parseNum(document.getElementById('brrrManagementPct')?.value) / 100;
    var brrrManagementMonthly = brrrTotalMonthlyIncome * brrrManagementPct;

    var brrrReservesPct    = parseNum(document.getElementById('brrrReservesPct')?.value) / 100;
    var brrrReservesMonthly = brrrTotalMonthlyIncome * brrrReservesPct;

    var brrrElectric = parseNum(document.getElementById('brrrElectric')?.value);
    var brrrWater    = parseNum(document.getElementById('brrrWater')?.value);
    var brrrSnow     = parseNum(document.getElementById('brrrSnow')?.value);
    var brrrRepairs  = parseNum(document.getElementById('brrrRepairs')?.value);
    var brrrOther1   = parseNum(document.getElementById('brrrOther1')?.value);
    var brrrOther2   = parseNum(document.getElementById('brrrOther2')?.value);
    var brrrOther3   = parseNum(document.getElementById('brrrOther3')?.value);
    var brrrOther4   = parseNum(document.getElementById('brrrOther4')?.value);
    var brrrOther5   = parseNum(document.getElementById('brrrOther5')?.value);

    var brrrTotalMonthlyExpenses = brrrInsTaxMonthly + brrrVacancyMonthly + brrrManagementMonthly + brrrReservesMonthly
      + brrrElectric + brrrWater + brrrSnow + brrrRepairs
      + brrrOther1 + brrrOther2 + brrrOther3 + brrrOther4 + brrrOther5;
    var brrrTotalYearlyExpenses = brrrTotalMonthlyExpenses * 12;

    // --- NOI ---
    var brrrMonthlyNOI = brrrTotalMonthlyIncome - brrrTotalMonthlyExpenses;
    var brrrYearlyNOI  = brrrMonthlyNOI * 12;

    // Update DOM — Part 2
    setText('brrrInsTaxMonthly',       fmt(Math.round(brrrInsTaxMonthly)));
    setText('brrrVacancyMonthly',      fmt(Math.round(brrrVacancyMonthly)));
    setText('brrrManagementMonthly',   fmt(Math.round(brrrManagementMonthly)));
    setText('brrrReservesMonthly',     fmt(Math.round(brrrReservesMonthly)));
    setText('brrrTotalMonthlyExpenses', fmt(Math.round(brrrTotalMonthlyExpenses)));
    setText('brrrMonthlyNOI',          fmt(Math.round(brrrMonthlyNOI)));
    setText('brrrYearlyNOI',           fmt(Math.round(brrrYearlyNOI)));

    // --- Refinance Terms ---
    var refiLtv          = getVal('refiLtv');
    var refiRate         = getVal('refiRate');
    var refiClosingCost  = getVal('refiClosingCost');
    var refiAmortization = getVal('refiAmortization');
    var minDSCR          = parseFloat(document.getElementById('minDSCR')?.value) || 1.25;
    var minCapRate       = getVal('minCapRate');
    var minCoC           = getVal('minCoC');

    // ===== BUILD PART 2 TABLES =====
    buildRefiTable(arvRows, brrrMonthlyNOI, brrrYearlyNOI, refiLtv, refiRate, refiAmortization, minDSCR, minCapRate);
    var cashOutData = buildCashOutTable(arvRows, adjustedCashToClose, monthlyCarryCost, leftOverHeloc, hmlLoan, helocAmount, refiLtv, refiClosingCost);

    // Bitcoin calculator
    calculateBitcoin(cashOutData);

    // Deal Summary — covers both parts
    generateDealSummary({
      adjustedCashToClose: adjustedCashToClose,
      monthlyCarryCost: monthlyCarryCost,
      arvLow: arvLow,
      arvHigh: arvHigh,
      totalSellingPct: totalSellingPct,
      hmlLoan: hmlLoan,
      helocAmount: helocAmount,
      hmlRatePct: hmlRatePct,
      helocPayment: helocPayment,
      hmlPayment: hmlPayment,
      purchasePrice: purchasePrice,
      brokerFeePct: brokerFeePct,
      leftOverHeloc: leftOverHeloc,
      brrrMonthlyNOI: brrrMonthlyNOI,
      brrrYearlyNOI: brrrYearlyNOI,
      refiLtv: refiLtv,
      refiRate: refiRate,
      refiAmortization: refiAmortization,
      refiClosingCost: refiClosingCost,
      minDSCR: minDSCR,
      arvRows: arvRows,
      cashOutData: cashOutData
    });
  }

  // ===== GROSS PROFIT FOR A GIVEN ARV AND MONTH INDEX =====
  function calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    var m = MONTHS[mi];
    var totalHoldingCosts = monthlyCarryCost * m;
    var sellingCosts = arv * (totalSellingPct / 100);
    var helocUsedAfterClosing = Math.min(leftOverHeloc, totalHoldingCosts);
    var helocUsedForClose = helocAmount - leftOverHeloc;
    var helocBalanceOwed = helocUsedForClose + helocUsedAfterClosing;
    var grossProfit = arv - sellingCosts - helocBalanceOwed - hmlLoan - totalHoldingCosts - adjustedCashToClose;
    return grossProfit;
  }

  // ===== PROFIT MATRIX TABLE =====
  function buildProfitTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    var thead = document.getElementById('profitHead');
    var tbody = document.getElementById('profitBody');
    if (!thead || !tbody) return;

    var headHtml = '<tr><th>Appraised Value</th>';
    MONTH_LABELS.forEach(function (lbl) { headHtml += '<th>' + lbl + '</th>'; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    var bodyHtml = '';
    arvRows.forEach(function (arv) {
      bodyHtml += '<tr>';
      bodyHtml += '<td>' + fmt(arv) + '</td>';
      MONTHS.forEach(function (m, mi) {
        var gp = calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
        var cls = gp >= 0 ? 'cond-green' : 'cond-red';
        bodyHtml += '<td class="' + cls + '">' + fmt(Math.round(gp)) + '</td>';
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== SUMMARY TABLE =====
  function buildSummaryTable(summaryData) {
    var thead = document.getElementById('summaryHead');
    var tbody = document.getElementById('summaryBody');
    if (!thead || !tbody) return;

    var headHtml = '<tr><th>Summary</th>';
    MONTH_LABELS.forEach(function (lbl) { headHtml += '<th>' + lbl + '</th>'; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    var rows = [
      { label: 'Total Holding Costs', key: 'totalHoldingCosts' },
      { label: 'HELOC Used After Closing', key: 'helocUsedAfterClosing', negate: true },
      { label: 'Net Cash In Deal', key: 'netCashInDeal', bold: true },
      { label: 'HELOC Balance Owed', key: 'helocBalanceOwed' },
      { label: 'HML Owed', key: 'hmlOwed' }
    ];

    var bodyHtml = '';
    rows.forEach(function (row) {
      var cls = row.bold ? ' class="results-row"' : '';
      var style = row.bold ? ' style="font-weight:700;"' : '';
      bodyHtml += '<tr' + cls + '>';
      bodyHtml += '<td' + style + '>' + row.label + '</td>';
      summaryData.forEach(function (d) {
        var val = d[row.key];
        if (row.negate && val > 0) val = -val;
        bodyHtml += '<td' + style + '>' + fmt(Math.round(val)) + '</td>';
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== CASH ON CASH TABLE =====
  function buildCoCTable(arvRows, summaryData, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc) {
    var thead = document.getElementById('cocHead');
    var tbody = document.getElementById('cocBody');
    if (!thead || !tbody) return;

    var headHtml = '<tr><th>Appraised Value</th>';
    MONTH_LABELS.forEach(function (lbl) { headHtml += '<th>' + lbl + '</th>'; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    var bodyHtml = '';
    arvRows.forEach(function (arv) {
      bodyHtml += '<tr>';
      bodyHtml += '<td>' + fmt(arv) + '</td>';
      MONTHS.forEach(function (m, mi) {
        var gp = calcGrossProfit(arv, mi, totalSellingPct, helocAmount, hmlLoan, adjustedCashToClose, monthlyCarryCost, leftOverHeloc);
        var netCash = summaryData[mi].netCashInDeal;
        var coc = netCash > 0 ? (gp / netCash) * 100 : (gp > 0 ? 999 : 0);

        var cls;
        if (coc >= 20) cls = 'cond-green';
        else if (coc >= 10) cls = 'cond-yellow';
        else cls = 'cond-red';

        bodyHtml += '<td class="' + cls + '">' + fmtPct(coc) + '</td>';
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== REFINANCE ANALYSIS TABLE =====
  function buildRefiTable(arvRows, brrrMonthlyNOI, brrrYearlyNOI, refiLtv, refiRate, refiAmortization, minDSCR, minCapRate) {
    var thead = document.getElementById('refiHead');
    var tbody = document.getElementById('refiBody');
    if (!thead || !tbody) return;

    thead.innerHTML = '<tr><th>Appraised Value</th><th>Mortgage Amt</th><th>Monthly P+I</th><th>Yearly P+I</th><th>Cash Flow</th><th>DSCR</th><th>Cap Rate</th></tr>';

    var bodyHtml = '';
    arvRows.forEach(function (arv) {
      var mortgageAmount = arv * (refiLtv / 100);
      var monthlyPI = calcPI(mortgageAmount, refiRate, refiAmortization);
      var yearlyPI = monthlyPI * 12;
      var cashFlow = brrrMonthlyNOI - monthlyPI;
      var dscr = monthlyPI > 0 ? brrrMonthlyNOI / monthlyPI : 0;
      var capRate = arv > 0 ? (brrrYearlyNOI / arv) * 100 : 0;

      // Cash Flow coloring
      var cfCls = cashFlow >= 0 ? 'cond-green' : 'cond-red';

      // DSCR coloring
      var dscrCls;
      if (dscr >= minDSCR) dscrCls = 'cond-green';
      else if (dscr >= minDSCR * 0.8) dscrCls = 'cond-yellow';
      else dscrCls = 'cond-red';

      // Cap Rate coloring
      var capCls;
      if (capRate >= minCapRate) capCls = 'cond-green';
      else if (capRate >= minCapRate * 0.8) capCls = 'cond-yellow';
      else capCls = 'cond-red';

      bodyHtml += '<tr>';
      bodyHtml += '<td>' + fmt(arv) + '</td>';
      bodyHtml += '<td>' + fmt(Math.round(mortgageAmount)) + '</td>';
      bodyHtml += '<td>' + fmt(Math.round(monthlyPI)) + '</td>';
      bodyHtml += '<td>' + fmt(Math.round(yearlyPI)) + '</td>';
      bodyHtml += '<td class="' + cfCls + '">' + fmt(Math.round(cashFlow)) + '</td>';
      bodyHtml += '<td class="' + dscrCls + '">' + fmtRatio(dscr) + '</td>';
      bodyHtml += '<td class="' + capCls + '">' + fmtPct(capRate) + '</td>';
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== CASH LEFT OVER TABLE =====
  function buildCashOutTable(arvRows, adjustedCashToClose, monthlyCarryCost, leftOverHeloc, hmlLoan, helocAmount, refiLtv, refiClosingCost) {
    var thead = document.getElementById('cashOutHead');
    var tbody = document.getElementById('cashOutBody');
    if (!thead || !tbody) return [];

    var headHtml = '<tr><th>Appraised Value</th>';
    MONTH_LABELS.forEach(function (lbl) { headHtml += '<th>' + lbl + '</th>'; });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Store all cashLeftOver values for Bitcoin calc
    var allCashLeftOver = [];

    var bodyHtml = '';
    arvRows.forEach(function (arv) {
      bodyHtml += '<tr>';
      bodyHtml += '<td>' + fmt(arv) + '</td>';
      MONTHS.forEach(function (m) {
        var totalCashInDeal = adjustedCashToClose + (monthlyCarryCost * m) - Math.min(leftOverHeloc, monthlyCarryCost * m);
        var hmlOwed = hmlLoan;
        var helocToPayBack = helocAmount;
        var refiMortgage = arv * (refiLtv / 100);
        var totalBreakEven = hmlOwed + helocToPayBack + totalCashInDeal + refiClosingCost;
        var cashLeftOver = refiMortgage - totalBreakEven;

        allCashLeftOver.push(cashLeftOver);

        var cls = cashLeftOver >= 0 ? 'cond-green' : 'cond-red';
        bodyHtml += '<td class="' + cls + '">' + fmt(Math.round(cashLeftOver)) + '</td>';
      });
      bodyHtml += '</tr>';
    });

    // Summary rows
    var summaryRows = [
      { label: 'Total HML Owed', fn: function () { return hmlLoan; } },
      { label: 'Total HELOC Payback', fn: function () { return helocAmount; } },
      { label: 'Total Cash In Deal', fn: function (m) { return adjustedCashToClose + (monthlyCarryCost * m) - Math.min(leftOverHeloc, monthlyCarryCost * m); } },
      { label: 'Refi Closing Costs', fn: function () { return refiClosingCost; } },
      { label: 'Total Break Even', fn: function (m) {
        var totalCashInDeal = adjustedCashToClose + (monthlyCarryCost * m) - Math.min(leftOverHeloc, monthlyCarryCost * m);
        return hmlLoan + helocAmount + totalCashInDeal + refiClosingCost;
      }}
    ];

    summaryRows.forEach(function (row) {
      var isBold = row.label === 'Total Break Even';
      var style = isBold ? ' style="font-weight:700; border-top: 2px solid var(--color-accent);"' : ' style="font-size: 0.8em; color: var(--color-text-muted);"';
      bodyHtml += '<tr>';
      bodyHtml += '<td' + style + '>' + row.label + '</td>';
      MONTHS.forEach(function (m) {
        var val = row.fn(m);
        bodyHtml += '<td' + style + '>' + fmt(Math.round(val)) + '</td>';
      });
      bodyHtml += '</tr>';
    });

    tbody.innerHTML = bodyHtml;
    return allCashLeftOver;
  }

  // ===== BITCOIN CALCULATOR =====
  function calculateBitcoin(cashOutData) {
    var maxCashLeftOver = 0;
    if (cashOutData && cashOutData.length > 0) {
      for (var i = 0; i < cashOutData.length; i++) {
        if (cashOutData[i] > maxCashLeftOver) maxCashLeftOver = cashOutData[i];
      }
    }
    var btcCashOut = Math.max(0, maxCashLeftOver);
    var btcPrice = getVal('btcPrice');
    var btcAmount = btcPrice > 0 ? btcCashOut / btcPrice : 0;

    setText('btcCashOut', fmt(Math.round(btcCashOut)));
    setText('btcAmount', btcAmount.toFixed(8));
  }

  // Bitcoin toggle
  var showBtcCheckbox = document.getElementById('showBtc');
  if (showBtcCheckbox) {
    showBtcCheckbox.addEventListener('change', function () {
      var btcSection = document.getElementById('btcSection');
      if (btcSection) {
        btcSection.style.display = showBtcCheckbox.checked ? '' : 'none';
      }
    });
  }

  // ===== DEAL SUMMARY =====
  function generateDealSummary(params) {
    var adjustedCashToClose = params.adjustedCashToClose;
    var monthlyCarryCost    = params.monthlyCarryCost;
    var arvLow              = params.arvLow;
    var arvHigh             = params.arvHigh;
    var totalSellingPct     = params.totalSellingPct;
    var hmlLoan             = params.hmlLoan;
    var helocAmount         = params.helocAmount;
    var hmlRatePct          = params.hmlRatePct;
    var helocPayment        = params.helocPayment;
    var hmlPayment          = params.hmlPayment;
    var leftOverHeloc       = params.leftOverHeloc;
    var brrrMonthlyNOI      = params.brrrMonthlyNOI;
    var brrrYearlyNOI       = params.brrrYearlyNOI;
    var refiLtv             = params.refiLtv;
    var refiRate            = params.refiRate;
    var refiAmortization    = params.refiAmortization;
    var refiClosingCost     = params.refiClosingCost;
    var minDSCR             = params.minDSCR;
    var arvRows             = params.arvRows;
    var cashOutData         = params.cashOutData;

    var summaryEl = document.getElementById('dealSummary');
    var summaryText = document.getElementById('dealSummaryText');
    if (!summaryEl || !summaryText) return;

    if (!arvLow || arvLow <= 0) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    // --- Scan profit table ---
    var profitTable = document.getElementById('profitTable');
    if (!profitTable || profitTable.rows.length < 2) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    var profitRows = [];
    var profitArvs = [];
    profitTable.querySelectorAll('tbody tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (!cells.length) return;
      profitArvs.push(parseNum(cells[0].textContent));
      var profits = [];
      for (var ci = 1; ci < cells.length; ci++) profits.push(parseNum(cells[ci].textContent));
      profitRows.push(profits);
    });

    if (!profitRows.length) {
      summaryEl.className = 'deal-summary';
      summaryText.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    var numCols = profitRows[0]?.length || 0;
    var arvSpread = arvHigh - arvLow;
    var midRowIdx = Math.floor(profitRows.length / 2);
    var midArv = profitArvs[midRowIdx] || ((arvLow + arvHigh) / 2);

    // Count green/red
    var totalCells = 0, greenCells = 0;
    for (var ri = 0; ri < profitRows.length; ri++) {
      for (var ci = 0; ci < profitRows[ri].length; ci++) {
        totalCells++;
        if (profitRows[ri][ci] >= 0) greenCells++;
      }
    }
    var greenRatio = totalCells > 0 ? greenCells / totalCells : 0;

    // --- Find the SWEET SPOT ---
    var sweetSpotArv = midArv, sweetSpotMonths = MONTHS[1], sweetSpotProfit = 0;
    var bestScore = -Infinity;

    for (var ri2 = 0; ri2 < profitRows.length; ri2++) {
      for (var ci2 = 0; ci2 < numCols; ci2++) {
        var profit = profitRows[ri2][ci2];
        if (profit <= 0) continue;
        var months = MONTHS[ci2];
        var arvDist = Math.abs(profitArvs[ri2] - midArv) / (arvSpread || 1);
        var timePenalty = months <= 6 ? 1.0 : months <= 8 ? 0.85 : months <= 10 ? 0.65 : 0.4;
        var arvBonus = 1.0 - (arvDist * 0.3);
        var score = profit * timePenalty * arvBonus;
        if (score > bestScore) {
          bestScore = score;
          sweetSpotArv = profitArvs[ri2];
          sweetSpotMonths = months;
          sweetSpotProfit = profit;
        }
      }
    }

    // Refi metrics at mid ARV
    var midMortgage = midArv * (refiLtv / 100);
    var midPI = calcPI(midMortgage, refiRate, refiAmortization);
    var midCashFlow = brrrMonthlyNOI - midPI;
    var midDSCR = midPI > 0 ? brrrMonthlyNOI / midPI : 0;

    // Cash left over at mid ARV, mid timeline (index 2 = 6 months)
    var midMonthIdx = 2; // 6 months
    var midMonth = MONTHS[midMonthIdx];
    var midTotalCashInDeal = adjustedCashToClose + (monthlyCarryCost * midMonth) - Math.min(leftOverHeloc, monthlyCarryCost * midMonth);
    var midTotalBreakEven = hmlLoan + helocAmount + midTotalCashInDeal + refiClosingCost;
    var midCashLeftOver = midMortgage - midTotalBreakEven;

    // Find best cash left over
    var bestCashLeftOver = -Infinity;
    if (cashOutData && cashOutData.length > 0) {
      for (var k = 0; k < cashOutData.length; k++) {
        if (cashOutData[k] > bestCashLeftOver) bestCashLeftOver = cashOutData[k];
      }
    }

    // --- Classify and build summary ---
    var dealClass, sentences = [];

    if (greenRatio >= 0.75 && midCashFlow > 0) {
      // STRONG
      dealClass = 'deal-summary positive';

      sentences.push(
        'The flip works well \u2014 sweet spot around ' + fmt(sweetSpotArv) + ' done in ' + sweetSpotMonths + ' months.'
      );
      sentences.push(
        'After refi at ' + refiLtv + '% LTV, you\'re looking at ' + fmt(Math.round(midCashFlow)) + '/month cash flow with a ' + fmtRatio(midDSCR) + ' DSCR.'
      );
      if (bestCashLeftOver > 0) {
        sentences.push(
          'Best case, you\'re pulling out ' + fmt(Math.round(bestCashLeftOver)) + ' at refi \u2014 that\'s your capital back plus profit to redeploy.'
        );
      }
      sentences.push('Double check your rehab budget, ARV comps, and rent assumptions \u2014 if those hold, this BRRRBBR looks solid.');

    } else if (greenRatio >= 0.3) {
      // MIXED
      dealClass = 'deal-summary caution';

      sentences.push(
        'The flip is tight but workable at ' + fmt(sweetSpotArv) + ' within ' + sweetSpotMonths + ' months.'
      );
      sentences.push(
        'The refi numbers depend on your appraisal \u2014 at ' + fmt(midArv) + ', you\'d have ' + fmt(Math.round(midCashFlow)) + '/month cash flow but a ' + fmtRatio(midDSCR) + ' DSCR, which is ' + (midDSCR >= 1.25 ? 'above' : 'below') + ' the 1.25 lender threshold.'
      );
      if (midCashLeftOver < 0) {
        sentences.push(
          'You\'d be leaving ' + fmt(Math.round(Math.abs(midCashLeftOver))) + ' in the deal at this appraisal, so make sure you\'re comfortable with that equity position.'
        );
      }

    } else {
      // BAD
      dealClass = 'deal-summary negative';

      sentences.push(
        'The flip doesn\'t pencil, which means the BRRRBBR strategy doesn\'t work at these numbers either. You\'d need a lower purchase price or higher ARV to make both the flip and the refinance work.'
      );
    }

    // --- Lever-specific observations ---
    if (hmlLoan > 0 && hmlRatePct >= 10) {
      sentences.push(
        'At ' + hmlRatePct + '% hard money, you\'re paying ' + fmt(Math.round(hmlPayment)) + '/month in interest alone \u2014 speed is your friend.'
      );
    }
    if (helocAmount > 0) {
      sentences.push(
        'The ' + fmt(Math.round(helocAmount)) + ' HELOC keeps your out-of-pocket to ' + fmt(Math.round(adjustedCashToClose)) + ', but that\'s still borrowed money at ' + fmt(Math.round(helocPayment)) + '/month.'
      );
    }
    if (monthlyCarryCost > 5000) {
      sentences.push(
        'Your total carry is ' + fmt(Math.round(monthlyCarryCost)) + '/month \u2014 every month past your target eats that straight out of profit.'
      );
    }

    summaryEl.className = dealClass;
    summaryText.innerHTML = sentences.join(' ');
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', function (e) {
    if (e.target.matches('input[type="text"]') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // Also listen for checkbox changes (BTC toggle triggers recalc)
  document.addEventListener('change', function (e) {
    if (e.target.matches('input[type="checkbox"]') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // ===== RESET =====
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var defaults = {
        // Part 1 — Entry
        address: '',
        purchasePrice: '$500,000',
        rehab: '$250,000',
        closingInLoan: '$0',
        hmlPoints: '2',
        hmlRate: '12',
        hmlLtv: '50',
        otherUpFront: '$2,000',
        addlRehabNotInLoan: '$0',
        helocRate: '7',
        helocAmount: '$0',
        // Part 1 — Holding
        taxesAnnual: '$7,000',
        insuranceAnnual: '$8,000',
        utilitiesMonthly: '$200',
        otherCostAnnual: '$100',
        otherCostMonthly: '$0',
        // Part 1 — Exit
        arvLow: '$1,100,000',
        arvHigh: '$1,200,000',
        brokerFee: '0',
        otherClosingPct: '0',
        // Part 2 — Income
        brrrUnit1: '$1,500',
        brrrUnit2: '$1,500',
        brrrUnit3: '$1,500',
        brrrUnit4: '$1,500',
        brrrUnit5: '$1,500',
        brrrUnit6: '$1,500',
        brrrUnit7: '',
        brrrUnit8: '',
        brrrUnit9: '',
        brrrUnit10: '',
        brrrUnit11: '',
        brrrUnit12: '',
        brrrUnit13: '',
        brrrUnit14: '',
        brrrUnit15: '',
        brrrUnit16: '',
        brrrUnit17: '',
        brrrUnit18: '',
        brrrUnit19: '',
        brrrUnit20: '',
        brrrOtherIncome: '$0',
        // Part 2 — Expenses
        brrrInsurance: '$8,000',
        brrrTaxes: '$7,000',
        brrrVacancyPct: '10',
        brrrManagementPct: '10',
        brrrReservesPct: '3',
        brrrElectric: '$50',
        brrrWater: '$150',
        brrrSnow: '$300',
        brrrRepairs: '$300',
        brrrOther1: '$0',
        brrrOther2: '$0',
        brrrOther3: '$0',
        brrrOther4: '$0',
        brrrOther5: '$0',
        // Part 2 — Refi Terms
        refiLtv: '70',
        refiRate: '5',
        refiClosingCost: '$10,000',
        refiAmortization: '360',
        minDSCR: '1.25',
        minCapRate: '7',
        minCoC: '5',
        // Bitcoin
        btcPrice: '$85,000'
      };
      Object.entries(defaults).forEach(function (entry) {
        var id = entry[0], val = entry[1];
        var el = document.getElementById(id);
        if (el) el.value = val;
      });
      // Reset BTC toggle
      var showBtc = document.getElementById('showBtc');
      if (showBtc) {
        showBtc.checked = false;
        var btcSection = document.getElementById('btcSection');
        if (btcSection) btcSection.style.display = 'none';
      }
      calculate();
    });
  }

  // ===== SAVE AS PDF — TWO-PAGE LANDSCAPE =====
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

    var teal = [0, 52, 77], tealLight = [1, 104, 145];
    var darkText = [26, 26, 26], mutedText = [100, 100, 100];
    var lightBg = [245, 247, 250], white = [255, 255, 255];
    var green = [22, 101, 52], greenBg = [220, 252, 231];
    var yellow = [133, 100, 0], yellowBg = [254, 249, 195];
    var red = [153, 27, 27], redBg = [254, 226, 226];

    // Helper: draw page background + teal bar
    function drawPageBg() {
      doc.setFillColor.apply(doc, white);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor.apply(doc, teal);
      doc.rect(0, 0, W, 3, 'F');
    }

    // Helper: render table from DOM to PDF
    function renderTable(tableId, title, startY, opts) {
      var table = document.getElementById(tableId);
      if (!table || table.rows.length < 2) return startY;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor.apply(doc, teal);
      doc.text(title.toUpperCase(), margin, startY);

      var headers = [];
      var headRow = table.querySelector('thead tr');
      if (headRow) {
        headRow.querySelectorAll('th').forEach(function (th) { headers.push(th.textContent); });
      }

      var bodyData = [];
      var cellStyles = {};
      table.querySelectorAll('tbody tr').forEach(function (tr, ri) {
        var row = [];
        tr.querySelectorAll('td').forEach(function (td, ci) {
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

      var fontSize = (opts && opts.fontSize) || 5.5;
      var cellPadding = (opts && opts.cellPadding) || 1.2;
      var col0Width = (opts && opts.col0Width) || 28;

      doc.autoTable({
        head: [headers],
        body: bodyData,
        startY: startY + 3,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
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
          fontSize: fontSize,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: col0Width, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            var style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      return doc.lastAutoTable.finalY + 4;
    }

    // Helper: draw footer on any page
    function drawFooter() {
      var fy = H - 10;
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
      doc.text('This analysis is for informational purposes only. Not financial advice.', margin, fy + 7.5);
      return fy;
    }

    // Helper: draw data block (three-column summary)
    function drawBlock(x, title, items, startY, thirdW) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor.apply(doc, teal);
      doc.text(title.toUpperCase(), x, startY);
      var iy = startY + 4;
      items.forEach(function (item) {
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        var tc = item.bold ? teal : mutedText;
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(item.label, x, iy);
        doc.setTextColor.apply(doc, darkText);
        doc.text(item.value || '', x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    // ============================================
    // PAGE 1: FLIP ANALYZER
    // ============================================
    drawPageBg();

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
    doc.text('Flip to BRRRBBR Analyzer', W - margin, y + 5, { align: 'right' });
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    var address = document.getElementById('address')?.value || 'No address provided';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor.apply(doc, darkText);
    doc.text(address, margin, y);
    y += 4;
    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // Three-column summary
    var thirdW = (cw - 8) / 3;
    var colX = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    var entryItems = [
      { label: 'Purchase Price', value: fmt(getVal('purchasePrice')) },
      { label: 'Rehab', value: fmt(getVal('rehab')) },
      { label: 'Total Cost Basis', value: document.getElementById('totalCostBasis')?.textContent },
      { label: 'HML Loan (' + getVal('hmlLtv') + '% LTV)', value: document.getElementById('hmlLoan')?.textContent },
      { label: 'Points (' + getVal('hmlPoints') + '%)', value: document.getElementById('pointsUpFront')?.textContent },
      { label: 'HELOC', value: fmt(getVal('helocAmount')) },
      { label: 'ADJUSTED CASH TO CLOSE', value: document.getElementById('adjustedCashToClose')?.textContent, bold: true }
    ];

    var holdItems = [
      { label: 'HELOC Payment', value: document.getElementById('helocPayment')?.textContent },
      { label: 'Hard Money Payment', value: document.getElementById('hmlPayment')?.textContent },
      { label: 'Total Monthly Debt', value: document.getElementById('totalMonthlyDebt')?.textContent },
      { label: 'Taxes (Annual)', value: fmt(getVal('taxesAnnual')) },
      { label: 'Insurance (Annual)', value: fmt(getVal('insuranceAnnual')) },
      { label: 'Utilities (Monthly)', value: fmt(getVal('utilitiesMonthly')) },
      { label: 'MONTHLY CARRY COST', value: document.getElementById('monthlyCarryCost')?.textContent, bold: true }
    ];

    var exitItems = [
      { label: 'Appraised Value Low', value: fmt(getVal('arvLow')) },
      { label: 'Appraised Value High', value: fmt(getVal('arvHigh')) },
      { label: 'Broker Fee', value: getVal('brokerFee') + '%' },
      { label: 'Other Closing Costs', value: getVal('otherClosingPct') + '%' },
      { label: 'TOTAL SELLING COST', value: document.getElementById('totalSellingPct')?.textContent, bold: true }
    ];

    drawBlock(colX[0], 'Entry Strategy', entryItems, y, thirdW);
    drawBlock(colX[1], 'Holding Costs', holdItems, y, thirdW);
    drawBlock(colX[2], 'Exit Strategy', exitItems, y, thirdW);

    y += Math.max(entryItems.length, holdItems.length) * 3.5 + 8;

    // Profit Matrix
    y = renderTable('profitTable', 'Pre-Tax Gross Profit', y);

    // Summaries
    y = renderTable('summaryTable', 'Summaries', y);

    // Cash on Cash Return
    y = renderTable('cocTable', 'Cash on Cash Return', y);

    // Page 1 footer
    drawFooter();

    // ============================================
    // PAGE 2: BRRRBBR ANALYSIS
    // ============================================
    doc.addPage('letter', 'landscape');
    drawPageBg();
    y = margin;

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
    doc.text('BRRRBBR Analysis', W - margin, y + 5, { align: 'right' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor.apply(doc, darkText);
    doc.text('BRRRBBR ANALYSIS', margin, y);
    y += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, mutedText);
    doc.text(address, margin, y + 3);
    y += 4;
    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // Three-column summary for BRRRBBR
    // Column 1: Income
    var incomeItems = [];
    for (var i = 1; i <= 20; i++) {
      var v = parseNum(document.getElementById('brrrUnit' + i)?.value);
      if (v > 0) incomeItems.push({ label: 'Unit ' + i, value: fmt(v) });
    }
    var otherIncVal = parseNum(document.getElementById('brrrOtherIncome')?.value);
    if (otherIncVal > 0) incomeItems.push({ label: 'Other Income', value: fmt(otherIncVal) });
    incomeItems.push({ label: 'MONTHLY INCOME', value: document.getElementById('brrrTotalMonthlyIncome')?.textContent || '$0', bold: true });

    // Column 2: Expenses
    var expenseItems = [
      { label: 'Insurance (Annual)', value: fmt(getVal('brrrInsurance')) },
      { label: 'Taxes (Annual)', value: fmt(getVal('brrrTaxes')) },
      { label: 'Ins/Tax (Monthly)', value: document.getElementById('brrrInsTaxMonthly')?.textContent },
      { label: 'Vacancy (' + getVal('brrrVacancyPct') + '%)', value: document.getElementById('brrrVacancyMonthly')?.textContent },
      { label: 'Mgmt (' + getVal('brrrManagementPct') + '%)', value: document.getElementById('brrrManagementMonthly')?.textContent },
      { label: 'Reserves (' + getVal('brrrReservesPct') + '%)', value: document.getElementById('brrrReservesMonthly')?.textContent },
      { label: 'Electric', value: fmt(getVal('brrrElectric')) },
      { label: 'Water/Sewer', value: fmt(getVal('brrrWater')) },
      { label: 'Snow/Landscaping', value: fmt(getVal('brrrSnow')) },
      { label: 'Repairs', value: fmt(getVal('brrrRepairs')) },
      { label: 'MONTHLY EXPENSES', value: document.getElementById('brrrTotalMonthlyExpenses')?.textContent || '$0', bold: true }
    ];

    // Column 3: Refi terms
    var refiItems = [
      { label: 'LTV', value: getVal('refiLtv') + '%' },
      { label: 'Interest Rate', value: getVal('refiRate') + '%' },
      { label: 'Closing Cost', value: fmt(getVal('refiClosingCost')) },
      { label: 'Amortization', value: getVal('refiAmortization') + ' months' },
      { label: 'Min DSCR', value: (parseFloat(document.getElementById('minDSCR')?.value) || 1.25).toFixed(2) + 'x' },
      { label: 'Min Cap Rate', value: getVal('minCapRate') + '%' },
      { label: 'Min CoC', value: getVal('minCoC') + '%' }
    ];

    drawBlock(colX[0], 'Rental Income', incomeItems, y, thirdW);
    drawBlock(colX[1], 'Rental Expenses', expenseItems, y, thirdW);
    drawBlock(colX[2], 'Refinance Terms', refiItems, y, thirdW);

    y += Math.max(incomeItems.length, expenseItems.length, refiItems.length) * 3.5 + 4;

    // NOI bar
    doc.setFillColor.apply(doc, lightBg);
    doc.roundedRect(margin, y, cw, 10, 2, 2, 'F');
    doc.setDrawColor.apply(doc, tealLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 10, 2, 2, 'S');

    var noiResults = [
      { label: 'Monthly NOI', value: document.getElementById('brrrMonthlyNOI')?.textContent || '$0' },
      { label: 'Yearly NOI', value: document.getElementById('brrrYearlyNOI')?.textContent || '$0' }
    ];
    var noiColW = cw / noiResults.length;
    noiResults.forEach(function (r, idx) {
      var cx = margin + noiColW * idx + noiColW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor.apply(doc, mutedText);
      doc.text(r.label.toUpperCase(), cx, y + 3.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, teal);
      doc.text(r.value, cx, y + 8, { align: 'center' });
    });

    y += 14;

    // Refinance Analysis table
    y = renderTable('refiTable', 'Refinance Analysis', y, { fontSize: 5.5, cellPadding: 1.2, col0Width: 28 });

    // Cash Left Over table
    y = renderTable('cashOutTable', 'Cash Left Over to Repeat (or Buy Bitcoin)', y, { fontSize: 5, cellPadding: 1.0, col0Width: 26 });

    // Bottom zone: Deal Summary (left) + QR (right)
    var fy = H - 10;
    var bottomZoneTop = y + 1;
    var bottomZoneBottom = fy - 2;
    var bottomZoneHeight = bottomZoneBottom - bottomZoneTop;

    // QR code placeholder
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

    // Deal summary box
    var dealSummaryContent = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryContent && dealSummaryContent.trim() && dealSummaryContent !== 'Enter your numbers above to see a plain English analysis.' && bottomZoneHeight > 10) {
      var summaryBoxWidth = qrX - margin - 6;

      doc.setDrawColor.apply(doc, tealLight);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, bottomZoneTop, summaryBoxWidth, Math.max(bottomZoneHeight, 12), 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor.apply(doc, teal);
      doc.text('DEAL SUMMARY', margin + 3, bottomZoneTop + 5);

      var textAreaHeight = Math.max(bottomZoneHeight - 8, 6);
      var textWidth = summaryBoxWidth - 6;
      var fontSize = 6.5;
      var splitText;
      var trySizes = [6.5, 6, 5.5, 5, 4.5];
      for (var si = 0; si < trySizes.length; si++) {
        doc.setFontSize(trySizes[si]);
        splitText = doc.splitTextToSize(dealSummaryContent.trim(), textWidth);
        if (splitText.length * (trySizes[si] * 0.45) <= textAreaHeight) { fontSize = trySizes[si]; break; }
        fontSize = trySizes[si];
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText, margin + 3, bottomZoneTop + 9);
    }

    // Footer
    drawFooter();

    // Save
    var addrClean = (document.getElementById('address')?.value || 'brrrbbr-analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save('Fortified-BRRRBBR-' + addrClean + '.pdf');
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

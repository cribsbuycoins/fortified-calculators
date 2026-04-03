// ===== SALE ANALYZER WITH ESTIMATED TAX LIABILITY — FORTIFIED REALTY GROUP =====

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

  function formatMoneyInput(el) {
    var val = parseNum(el.value);
    el.value = fmt(val);
  }

  function stripMoneyInput(el) {
    var val = parseNum(el.value);
    el.value = val;
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ===== CHECKLIST DISMISS =====
  document.getElementById('dismissChecklist')?.addEventListener('click', function () {
    document.getElementById('accountantChecklist').style.display = 'none';
    document.getElementById('calculatorSections').style.display = '';
    calculate();
  });

  // ===== MONEY INPUT EVENT HANDLERS =====
  document.querySelectorAll('.money-input').forEach(function (el) {
    el.addEventListener('focus', function () { stripMoneyInput(el); });
    el.addEventListener('blur', function () { formatMoneyInput(el); });
  });

  // ===== AUTO-FILL RANGE FROM GROSS SALE PRICE =====
  var grossSalePriceEl = document.getElementById('grossSalePrice');
  if (grossSalePriceEl) {
    grossSalePriceEl.addEventListener('blur', function () {
      formatMoneyInput(grossSalePriceEl);
      var gsp = parseNum(grossSalePriceEl.value);
      if (gsp > 0) {
        var lowEl = document.getElementById('saleLow');
        var highEl = document.getElementById('saleHigh');
        if (lowEl) lowEl.value = fmt(gsp - 25000);
        if (highEl) highEl.value = fmt(gsp + 25000);
        calculate();
      }
    });
  }

  // ===== MAIN CALCULATE FUNCTION =====
  function calculate() {
    // --- Section 1: Sale Proceeds ---
    var grossSalePrice    = parseNum(document.getElementById('grossSalePrice')?.value);
    var mortgagePayoff    = parseNum(document.getElementById('mortgagePayoff')?.value);
    var brokerPct         = parseNum(document.getElementById('brokerPct')?.value);
    var deedStampRate     = parseNum(document.getElementById('deedStampRate')?.value);
    var sellerClosingCosts = parseNum(document.getElementById('sellerClosingCosts')?.value);
    var smokeDetectors    = parseNum(document.getElementById('smokeDetectors')?.value);
    var otherCosts        = parseNum(document.getElementById('otherCosts')?.value);

    var commissionDollars = grossSalePrice * (brokerPct / 100);
    var deedStampCost     = grossSalePrice * (deedStampRate / 1000);
    var totalTransactionCosts = deedStampCost + sellerClosingCosts + smokeDetectors + otherCosts;
    var totalDeductions   = commissionDollars + totalTransactionCosts;
    var netSalePrice      = grossSalePrice - totalDeductions;
    var cashToSeller      = netSalePrice - mortgagePayoff;

    setText('commissionDollars', fmt(commissionDollars));
    setText('netAfterCommission', fmt(grossSalePrice - commissionDollars));
    setText('deedStampCost', fmt(deedStampCost));
    setText('totalClosingCosts', fmt(totalTransactionCosts));
    setText('totalDeductions', fmt(totalDeductions));
    setText('netSalePrice', fmt(netSalePrice));
    setText('mortgagePayoffDisplay', fmt(mortgagePayoff));
    setText('cashToSeller', fmt(cashToSeller));

    // --- Section 2: Cost Basis ---
    var purchasePrice       = parseNum(document.getElementById('purchasePrice')?.value);
    var purchaseClosingCosts = parseNum(document.getElementById('purchaseClosingCosts')?.value);
    var capitalImprovements = parseNum(document.getElementById('capitalImprovements')?.value);
    var totalUnits          = parseNum(document.getElementById('totalUnits')?.value);
    var incomeUnits         = parseNum(document.getElementById('incomeUnits')?.value);
    var depreciableBasis    = parseNum(document.getElementById('depreciableBasis')?.value);
    var yearsOwned          = parseNum(document.getElementById('yearsOwned')?.value);

    var initialCostBasis = purchasePrice + purchaseClosingCosts + capitalImprovements;
    var rentalPct = totalUnits > 0 ? incomeUnits / totalUnits : 1;

    var annualDep_building      = depreciableBasis * rentalPct / 27.5;
    var annualDep_closing       = purchaseClosingCosts * rentalPct / 30;
    var annualDep_improvements  = capitalImprovements * rentalPct / 30;
    var totalAnnualDepreciation = annualDep_building + annualDep_closing + annualDep_improvements;
    var totalDepreciationRecapture = totalAnnualDepreciation * yearsOwned;
    var adjustedCostBasis = initialCostBasis - totalDepreciationRecapture;

    setText('initialCostBasis', fmt(initialCostBasis));
    setText('rentalPct', fmtPct(rentalPct * 100));
    setText('annualDepreciation', fmt(totalAnnualDepreciation));
    setText('totalDepreciation', fmt(totalDepreciationRecapture));
    setText('adjustedCostBasis', fmt(adjustedCostBasis));

    // --- Section 3: Tax Calculation at Target Sale Price ---
    var fedCapGainRate      = parseNum(document.getElementById('fedCapGainRate')?.value);
    var niitRate            = parseNum(document.getElementById('niitRate')?.value);
    var fedDepRecaptureRate = parseNum(document.getElementById('fedDepRecaptureRate')?.value);
    var stateCapGainRate    = parseNum(document.getElementById('stateCapGainRate')?.value);

    var taxResult = computeTax(
      netSalePrice, cashToSeller, adjustedCostBasis, totalDepreciationRecapture,
      fedCapGainRate, niitRate, fedDepRecaptureRate, stateCapGainRate, yearsOwned
    );

    setText('resultTotalGain', fmt(taxResult.totalGain));
    setText('resultCapitalGain', fmt(taxResult.capitalGain));
    setText('resultFederalTax', fmt(taxResult.totalFederalTax));
    setText('resultStateTax', fmt(taxResult.totalStateTax));
    setText('resultTotalTax', fmt(taxResult.totalTaxLiability));
    setText('resultNetProceeds', fmt(taxResult.trueNetProceeds));

    // Conditional styling on result cards
    var totalTaxEl = document.getElementById('resultTotalTax');
    if (totalTaxEl) {
      totalTaxEl.className = 'result-value negative';
    }
    var netProceedsEl = document.getElementById('resultNetProceeds');
    if (netProceedsEl) {
      netProceedsEl.className = 'result-value ' + (taxResult.trueNetProceeds >= 0 ? 'positive' : 'negative');
    }

    // --- Section 4: Sale Price Range Table ---
    buildRangeTable(
      mortgagePayoff, brokerPct, deedStampRate, sellerClosingCosts, smokeDetectors, otherCosts,
      adjustedCostBasis, totalDepreciationRecapture,
      fedCapGainRate, niitRate, fedDepRecaptureRate, stateCapGainRate,
      grossSalePrice
    );

    // --- Deal Summary ---
    generateDealSummary({
      grossSalePrice: grossSalePrice,
      netSalePrice: netSalePrice,
      cashToSeller: cashToSeller,
      totalGain: taxResult.totalGain,
      capitalGain: taxResult.capitalGain,
      totalTaxLiability: taxResult.totalTaxLiability,
      trueNetProceeds: taxResult.trueNetProceeds,
      totalDepreciationRecapture: totalDepreciationRecapture,
      fedDepRecaptureTax: taxResult.fedDepRecaptureTax,
      totalFederalTax: taxResult.totalFederalTax,
      yearsOwned: yearsOwned
    });
  }

  // ===== TAX COMPUTATION HELPER =====
  function computeTax(netSalePrice, cashToSeller, adjustedCostBasis, totalDepreciationRecapture,
                      fedCapGainRate, niitRate, fedDepRecaptureRate, stateCapGainRate, yearsOwned) {
    var totalGain   = netSalePrice - adjustedCostBasis;
    var capitalGain = Math.max(0, totalGain - totalDepreciationRecapture);

    // Short-term (< 1 year): taxed at ordinary income rates, not capital gains
    var isShortTerm = (yearsOwned || 99) < 1;
    var effectiveFedRate   = isShortTerm ? 24 : fedCapGainRate;  // ~24% ordinary income estimate
    var effectiveStateRate = isShortTerm ? 12 : stateCapGainRate; // MA short-term = 12%

    var fedDepRecaptureTax = totalDepreciationRecapture * (fedDepRecaptureRate / 100);
    var fedCapGainTax      = capitalGain * ((effectiveFedRate + niitRate) / 100);
    var totalFederalTax    = fedDepRecaptureTax + fedCapGainTax;

    var stateDepRecaptureTax = totalDepreciationRecapture * (effectiveStateRate / 100);
    var stateCapGainTax      = capitalGain * (effectiveStateRate / 100);
    var totalStateTax        = stateDepRecaptureTax + stateCapGainTax;

    var totalTaxLiability = totalFederalTax + totalStateTax;
    var trueNetProceeds   = cashToSeller - totalTaxLiability;

    return {
      totalGain: totalGain,
      capitalGain: capitalGain,
      fedDepRecaptureTax: fedDepRecaptureTax,
      fedCapGainTax: fedCapGainTax,
      totalFederalTax: totalFederalTax,
      stateDepRecaptureTax: stateDepRecaptureTax,
      stateCapGainTax: stateCapGainTax,
      totalStateTax: totalStateTax,
      totalTaxLiability: totalTaxLiability,
      trueNetProceeds: trueNetProceeds
    };
  }

  // ===== SALE PRICE RANGE TABLE — 7 COLUMNS =====
  function buildRangeTable(mortgagePayoff, brokerPct, deedStampRate, sellerClosingCosts, smokeDetectors, otherCosts,
                           adjustedCostBasis, totalDepreciationRecapture,
                           fedCapGainRate, niitRate, fedDepRecaptureRate, stateCapGainRate,
                           targetGrossSalePrice) {
    var low  = parseNum(document.getElementById('saleLow')?.value);
    var high = parseNum(document.getElementById('saleHigh')?.value);

    if (low <= 0 || high <= 0 || high <= low) return;

    // Generate 7 evenly spaced prices with clean increments
    var rawStep = (high - low) / 6;
    // Round step to a clean increment
    var step;
    if (rawStep >= 50000) step = Math.round(rawStep / 25000) * 25000;
    else if (rawStep >= 10000) step = Math.round(rawStep / 5000) * 5000;
    else if (rawStep >= 5000) step = Math.round(rawStep / 2500) * 2500;
    else if (rawStep >= 1000) step = Math.round(rawStep / 1000) * 1000;
    else step = Math.round(rawStep / 500) * 500;
    if (step <= 0) step = rawStep;

    var prices = [];
    for (var i = 0; i < 7; i++) {
      var price = Math.round(low + rawStep * i);
      prices.push(price);
    }
    // Ensure last price is exactly high
    prices[6] = Math.round(high);

    // Find the column closest to target grossSalePrice
    var closestIdx = 0;
    var closestDiff = Math.abs(prices[0] - targetGrossSalePrice);
    for (var ci = 1; ci < prices.length; ci++) {
      var diff = Math.abs(prices[ci] - targetGrossSalePrice);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = ci;
      }
    }

    // Compute data for each price
    var data = prices.map(function (salePrice) {
      var commission = salePrice * (brokerPct / 100);
      var deedStamp  = salePrice * (deedStampRate / 1000);
      var totalClosing = commission + deedStamp + sellerClosingCosts + smokeDetectors + otherCosts;
      var net = salePrice - totalClosing;
      var cash = net - mortgagePayoff;

      var tax = computeTax(
        net, cash, adjustedCostBasis, totalDepreciationRecapture,
        fedCapGainRate, niitRate, fedDepRecaptureRate, stateCapGainRate, yearsOwned
      );

      return {
        grossSalePrice: salePrice,
        netSalePrice: net,
        cashToSeller: cash,
        totalGain: tax.totalGain,
        capitalGain: tax.capitalGain,
        fedDepRecaptureTax: tax.fedDepRecaptureTax,
        fedCapGainTax: tax.fedCapGainTax,
        totalFederalTax: tax.totalFederalTax,
        stateDepRecaptureTax: tax.stateDepRecaptureTax,
        stateCapGainTax: tax.stateCapGainTax,
        totalStateTax: tax.totalStateTax,
        totalTaxLiability: tax.totalTaxLiability,
        trueNetProceeds: tax.trueNetProceeds
      };
    });

    // Table row definitions
    var rowDefs = [
      { label: 'Gross Sale Price',       key: 'grossSalePrice',      isResults: false, cond: null },
      { label: 'Net Sale Price',          key: 'netSalePrice',        isResults: false, cond: null },
      { label: 'Cash to Seller',          key: 'cashToSeller',        isResults: false, cond: null },
      { label: 'Total Gain',             key: 'totalGain',           isResults: false, cond: null },
      { label: 'Capital Gain',           key: 'capitalGain',         isResults: false, cond: null },
      { label: 'Fed. Dep. Recapture Tax', key: 'fedDepRecaptureTax', isResults: false, cond: null },
      { label: 'Fed. Cap Gains Tax',     key: 'fedCapGainTax',       isResults: false, cond: null },
      { label: 'Total Federal Tax',      key: 'totalFederalTax',     isResults: false, cond: null },
      { label: 'State Dep. Recapture Tax', key: 'stateDepRecaptureTax', isResults: false, cond: null },
      { label: 'State Cap Gains Tax',    key: 'stateCapGainTax',     isResults: false, cond: null },
      { label: 'Total State Tax',        key: 'totalStateTax',       isResults: false, cond: null },
      { label: 'TOTAL TAX LIABILITY',    key: 'totalTaxLiability',   isResults: true,  cond: 'red' },
      { label: 'TRUE NET PROCEEDS',      key: 'trueNetProceeds',     isResults: true,  cond: 'dynamic' }
    ];

    // Render table
    var thead = document.getElementById('rangeHead');
    var tbody = document.getElementById('rangeBody');

    var headHtml = '<tr><th>Metric</th>';
    prices.forEach(function (price, i) {
      var cls = i === closestIdx ? ' class="asking-col"' : '';
      headHtml += '<th' + cls + '>' + fmt(price) + '</th>';
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    var bodyHtml = '';
    rowDefs.forEach(function (row) {
      var trClass = row.isResults ? ' class="results-row"' : '';
      bodyHtml += '<tr' + trClass + '>';
      bodyHtml += '<td>' + row.label + '</td>';
      data.forEach(function (d, i) {
        var val = d[row.key];
        var cellClass = '';
        if (row.cond === 'red') {
          cellClass = val > 0 ? 'cond-red' : '';
        } else if (row.cond === 'dynamic') {
          cellClass = val >= 0 ? 'cond-green' : 'cond-red';
        }
        var colClass = i === closestIdx ? 'asking-col' : '';
        var classes = [cellClass, colClass].filter(Boolean).join(' ');
        bodyHtml += '<td' + (classes ? ' class="' + classes + '"' : '') + '>' + fmt(val) + '</td>';
      });
      bodyHtml += '</tr>';
    });
    tbody.innerHTML = bodyHtml;
  }

  // ===== DEAL SUMMARY =====
  function generateDealSummary(d) {
    var summaryEl = document.getElementById('dealSummary');
    var textEl = document.getElementById('dealSummaryText');
    if (!summaryEl || !textEl) return;

    var salePrice = d.grossSalePrice;
    var trueNetProceeds = d.trueNetProceeds;
    var totalTax = d.totalTaxLiability;
    var cashToSeller = d.cashToSeller;
    var totalGain = d.totalGain;

    if (salePrice <= 0) {
      summaryEl.className = 'deal-summary';
      textEl.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    var taxPctOfGain = totalGain > 0 ? (totalTax / totalGain) * 100 : 0;
    var taxPctOfCash = cashToSeller > 0 ? (totalTax / cashToSeller) * 100 : 0;
    var depRecaptureTotalTax = d.fedDepRecaptureTax + (d.totalDepreciationRecapture * 0.05); // state dep recapture approx
    var depRecapturePct = totalTax > 0 ? (depRecaptureTotalTax / totalTax) * 100 : 0;

    var sentences = [];

    // Short-term capital gains warning
    if (d.yearsOwned < 1) {
      sentences.push('WARNING: You\'ve owned this property less than 1 year. This is a short-term capital gain, which is taxed at ordinary income rates (estimated 24% federal + 12% MA) instead of the lower long-term capital gains rates. This significantly increases your tax liability. Consider holding until you hit the 1-year mark if possible.');
    }

    // Strong: net proceeds > 50% of sale price
    if (trueNetProceeds > salePrice * 0.5) {
      sentences.push('At ' + fmt(salePrice) + ', you walk away with ' + fmt(trueNetProceeds) + ' after all costs and taxes. Your total tax bill is ' + fmt(totalTax) + ' (' + taxPctOfGain.toFixed(1) + '% of your gain).');
      if (depRecapturePct > 40) {
        sentences.push('Depreciation recapture accounts for ' + depRecapturePct.toFixed(0) + '% of your tax bill — that\'s the price of the deductions you\'ve taken over ' + d.yearsOwned + ' years.');
      }
      summaryEl.className = 'deal-summary positive';
    }
    // Tight: trueNetProceeds < 20% of sale price
    else if (trueNetProceeds < salePrice * 0.2) {
      sentences.push('Proceeds are thin on this one — ' + fmt(trueNetProceeds) + ' net after ' + fmt(totalTax) + ' in taxes.');
      if (cashToSeller < totalTax) {
        sentences.push('Your tax bill is actually higher than your cash at closing — you may need additional funds to cover the tax liability.');
      }
      summaryEl.className = 'deal-summary negative';
    }
    // Moderate
    else {
      sentences.push('Net proceeds of ' + fmt(trueNetProceeds) + ' on a ' + fmt(salePrice) + ' sale. The tax hit is ' + fmt(totalTax) + ', which eats into about ' + taxPctOfCash.toFixed(1) + '% of your closing cash.');
      if (totalTax > 30000) {
        sentences.push('At this level, it may be worth discussing a 1031 exchange with your accountant to defer the capital gains.');
      }
      summaryEl.className = 'deal-summary caution';
    }

    textEl.innerHTML = sentences.join(' ');
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', function (e) {
    if (e.target.matches('input[type="text"], select') && e.target.closest('.calc-page')) {
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
      var defaults = {
        grossSalePrice: '$650,000',
        mortgagePayoff: '$388,000',
        brokerPct: '6',
        deedStampRate: '4.56',
        sellerClosingCosts: '$2,000',
        smokeDetectors: '$2,000',
        otherCosts: '$0',
        purchasePrice: '$400,000',
        purchaseClosingCosts: '$6,366',
        capitalImprovements: '$0',
        totalUnits: '3',
        incomeUnits: '2',
        depreciableBasis: '$325,000',
        yearsOwned: '3',
        niitRate: '3.8',
        fedDepRecaptureRate: '25',
        stateCapGainRate: '5',
        saleLow: '$625,000',
        saleHigh: '$675,000',
        address: ''
      };
      Object.entries(defaults).forEach(function (pair) {
        var el = document.getElementById(pair[0]);
        if (el) el.value = pair[1];
      });
      // Reset the select dropdown
      var fedCapGainRateEl = document.getElementById('fedCapGainRate');
      if (fedCapGainRateEl) fedCapGainRateEl.value = '15';

      // Re-show the checklist, hide calculator
      var checklist = document.getElementById('accountantChecklist');
      var calc = document.getElementById('calculatorSections');
      if (checklist) checklist.style.display = '';
      if (calc) calc.style.display = 'none';

      calculate();
    });
  }

  // ===== SAVE AS PDF — LANDSCAPE LETTER =====
  var pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);

  function generatePDF() {
    var jsPDFLib = window.jspdf;
    var doc = new jsPDFLib.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    var W = 279.4;
    var H = 215.9;
    var margin = 12;
    var cw = W - margin * 2;
    var y = margin;

    // Colors — Light mode
    var teal      = [0, 52, 77];
    var tealLight = [1, 104, 145];
    var darkText  = [26, 26, 26];
    var mutedText = [100, 100, 100];
    var lightBg   = [245, 247, 250];
    var white     = [255, 255, 255];
    var green     = [22, 101, 52];
    var greenBg   = [220, 252, 231];
    var red       = [153, 27, 27];
    var redBg     = [254, 226, 226];

    // White background
    doc.setFillColor(white[0], white[1], white[2]);
    doc.rect(0, 0, W, H, 'F');

    // Teal bar
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 0, W, 3, 'F');

    // Logo
    try {
      doc.addImage('./assets/fortified-logo-print.png', 'PNG', margin, y + 1, 50, 9);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text('FORTIFIED REALTY GROUP', margin, y + 8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Sale Analyzer with Tax Liability', W - margin, y + 5, { align: 'right' });
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    // Address
    var address = document.getElementById('address')?.value || 'No address provided';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(address, margin, y);
    y += 4;

    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // ===== THREE-COLUMN DATA SUMMARY =====
    var thirdW = (cw - 8) / 3;
    var colX = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    function drawDataBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text(title.toUpperCase(), x, startY);

      var iy = startY + 4;
      items.forEach(function (item) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        var tc = item.bold ? teal : mutedText;
        doc.setTextColor(tc[0], tc[1], tc[2]);
        if (item.bold) doc.setFont('helvetica', 'bold');
        doc.text(item.label, x, iy);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(item.value, x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    // Column 1: Sale Details
    var saleItems = [
      { label: 'Gross Sale Price', value: fmt(parseNum(document.getElementById('grossSalePrice')?.value)) },
      { label: 'Commission (' + document.getElementById('brokerPct')?.value + '%)', value: document.getElementById('commissionDollars')?.textContent || '--' },
      { label: 'Deed Stamps', value: document.getElementById('deedStampCost')?.textContent || '--' },
      { label: 'Seller Closing Costs', value: fmt(parseNum(document.getElementById('sellerClosingCosts')?.value)) },
      { label: 'Smoke/CO Certificate', value: fmt(parseNum(document.getElementById('smokeDetectors')?.value)) },
      { label: 'Other Costs', value: fmt(parseNum(document.getElementById('otherCosts')?.value)) },
      { label: 'Mortgage Payoff', value: fmt(parseNum(document.getElementById('mortgagePayoff')?.value)) },
      { label: 'CASH TO SELLER', value: document.getElementById('cashToSeller')?.textContent || '--', bold: true }
    ];

    // Column 2: Cost Basis
    var basisItems = [
      { label: 'Purchase Price', value: fmt(parseNum(document.getElementById('purchasePrice')?.value)) },
      { label: 'Purchase Closing Costs', value: fmt(parseNum(document.getElementById('purchaseClosingCosts')?.value)) },
      { label: 'Capital Improvements', value: fmt(parseNum(document.getElementById('capitalImprovements')?.value)) },
      { label: 'Initial Cost Basis', value: document.getElementById('initialCostBasis')?.textContent || '--' },
      { label: 'Rental Pct (' + document.getElementById('incomeUnits')?.value + '/' + document.getElementById('totalUnits')?.value + ')', value: document.getElementById('rentalPct')?.textContent || '--' },
      { label: 'Depreciable Basis', value: fmt(parseNum(document.getElementById('depreciableBasis')?.value)) },
      { label: 'Years Owned', value: document.getElementById('yearsOwned')?.value || '--' },
      { label: 'Total Depreciation', value: document.getElementById('totalDepreciation')?.textContent || '--' },
      { label: 'ADJUSTED BASIS', value: document.getElementById('adjustedCostBasis')?.textContent || '--', bold: true }
    ];

    // Column 3: Tax Rates
    var taxRateItems = [
      { label: 'Fed. Cap Gains Rate', value: document.getElementById('fedCapGainRate')?.value + '%' },
      { label: 'NIIT Rate', value: document.getElementById('niitRate')?.value + '%' },
      { label: 'Fed. Dep. Recapture', value: document.getElementById('fedDepRecaptureRate')?.value + '%' },
      { label: 'State Cap Gains Rate', value: document.getElementById('stateCapGainRate')?.value + '%' },
      { label: '', value: '' },
      { label: 'Annual Depreciation', value: document.getElementById('annualDepreciation')?.textContent || '--' },
      { label: 'Net Sale Price', value: document.getElementById('netSalePrice')?.textContent || '--' },
      { label: 'Total Gain', value: document.getElementById('resultTotalGain')?.textContent || '--' },
      { label: 'TOTAL TAX', value: document.getElementById('resultTotalTax')?.textContent || '--', bold: true }
    ];

    var endY1 = drawDataBlock(colX[0], 'Sale Details', saleItems, y);
    var endY2 = drawDataBlock(colX[1], 'Cost Basis', basisItems, y);
    var endY3 = drawDataBlock(colX[2], 'Tax Rates & Results', taxRateItems, y);

    y = Math.max(endY1, endY2, endY3) + 3;

    // === RESULTS SUMMARY BAR ===
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'F');
    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'S');

    var results = [
      { label: 'Cash to Seller', value: document.getElementById('cashToSeller')?.textContent },
      { label: 'Total Gain', value: document.getElementById('resultTotalGain')?.textContent },
      { label: 'Capital Gain', value: document.getElementById('resultCapitalGain')?.textContent },
      { label: 'Federal Tax', value: document.getElementById('resultFederalTax')?.textContent },
      { label: 'State Tax', value: document.getElementById('resultStateTax')?.textContent },
      { label: 'True Net Proceeds', value: document.getElementById('resultNetProceeds')?.textContent }
    ];

    var rColW = cw / results.length;
    results.forEach(function (r, i) {
      var cx = margin + rColW * i + rColW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(r.label.toUpperCase(), cx, y + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text(r.value || '--', cx, y + 12, { align: 'center' });
    });

    y += 20;

    // === SALE PRICE RANGE TABLE ===
    var table = document.getElementById('rangeTable');
    if (table && table.rows.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text('SALE PRICE RANGE ANALYSIS', margin, y);
      y += 3;

      var headers = [];
      var headRow = table.querySelector('thead tr');
      if (headRow) {
        headRow.querySelectorAll('th').forEach(function (th) { headers.push(th.textContent); });
      }

      var bodyData = [];
      var cellStyles = {};
      var askingColIdx = -1;

      // Find the asking/target column
      if (headRow) {
        headRow.querySelectorAll('th').forEach(function (th, idx) {
          if (th.classList.contains('asking-col')) askingColIdx = idx;
        });
      }

      table.querySelectorAll('tbody tr').forEach(function (tr, ri) {
        var row = [];
        tr.querySelectorAll('td').forEach(function (td, ci) {
          row.push(td.textContent);
          if (td.classList.contains('cond-green')) {
            if (!cellStyles[ri]) cellStyles[ri] = {};
            cellStyles[ri][ci] = { fillColor: greenBg, textColor: green };
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
          cellPadding: 1.6,
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
          fontSize: 6.5,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 38, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            var style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
          // Highlight target price column header
          if (data.section === 'head' && askingColIdx > 0 && data.column.index === askingColIdx) {
            data.cell.styles.fillColor = tealLight;
          }
        }
      });
    }

    // Footer position
    var fy = H - 10;

    // === BOTTOM ZONE: Deal Summary (left) + QR Code (right) ===
    var afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 2 : y + 2;
    var bottomZoneTop = afterTableY;
    var bottomZoneBottom = fy - 2;
    var bottomZoneHeight = bottomZoneBottom - bottomZoneTop;

    // QR code box on the right
    var qrSize = 18;
    var qrX = W - margin - qrSize;
    var qrY = bottomZoneBottom - qrSize - 4;
    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.4);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Scan for', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    doc.text('tutorial', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });

    // Deal summary text box on the left
    var dealSummaryText = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryText && dealSummaryText !== 'Enter your numbers above to see a plain English analysis.' && bottomZoneHeight > 10) {
      var summaryBoxWidth = qrX - margin - 6;

      doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, bottomZoneTop, summaryBoxWidth, bottomZoneHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text('DEAL SUMMARY', margin + 3, bottomZoneTop + 5);

      var textAreaHeight = bottomZoneHeight - 8;
      var textWidth = summaryBoxWidth - 6;
      var fontSize = 6.5;
      var splitText;
      var trySizes = [6.5, 6, 5.5, 5, 4.5];
      for (var si = 0; si < trySizes.length; si++) {
        doc.setFontSize(trySizes[si]);
        splitText = doc.splitTextToSize(dealSummaryText, textWidth);
        if (splitText.length * (trySizes[si] * 0.45) <= textAreaHeight) { fontSize = trySizes[si]; break; }
        fontSize = trySizes[si];
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText, margin + 3, bottomZoneTop + 9);
    }

    // Footer
    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, fy, W - margin, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.text('Fortified Realty Group, LLC', margin, fy + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('One North Main Street, Fall River, MA 02720  |  (508) 691-8035  |  fortifiedrealty.net', margin + 42, fy + 4);
    doc.setFontSize(5.5);
    doc.text('This analysis provides estimates only and is not tax advice. Actual tax liability depends on your complete tax situation. Consult a qualified tax professional or CPA before making any decisions.', margin, fy + 7.5);

    var addrClean = (document.getElementById('address')?.value || 'analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save('Fortified-SaleAnalyzer-' + addrClean + '.pdf');
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

// ===== HOME SALE ANALYZER — FORTIFIED REALTY GROUP =====

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
    var grossSalePrice     = parseNum(document.getElementById('grossSalePrice') ? document.getElementById('grossSalePrice').value : 0);
    var mortgagePayoff     = parseNum(document.getElementById('mortgagePayoff') ? document.getElementById('mortgagePayoff').value : 0);
    var brokerPct          = parseNum(document.getElementById('brokerPct') ? document.getElementById('brokerPct').value : 0);
    var deedStampRate      = parseNum(document.getElementById('deedStampRate') ? document.getElementById('deedStampRate').value : 0);
    var sellerClosingCosts = parseNum(document.getElementById('sellerClosingCosts') ? document.getElementById('sellerClosingCosts').value : 0);
    var smokeDetectors     = parseNum(document.getElementById('smokeDetectors') ? document.getElementById('smokeDetectors').value : 0);
    var otherCosts         = parseNum(document.getElementById('otherCosts') ? document.getElementById('otherCosts').value : 0);

    var commissionDollars    = grossSalePrice * (brokerPct / 100);
    var deedStampCost        = grossSalePrice * (deedStampRate / 1000);
    var totalClosingCosts    = deedStampCost + sellerClosingCosts + smokeDetectors + otherCosts;
    var totalCosts           = commissionDollars + totalClosingCosts;
    var netAfterCommission   = grossSalePrice - commissionDollars;
    var netSalePrice         = grossSalePrice - totalCosts;
    var cashToSeller         = netSalePrice - mortgagePayoff;

    // Update computed fields
    setText('commissionDollars', fmt(commissionDollars));
    setText('netAfterCommission', fmt(netAfterCommission));
    setText('deedStampCost', fmt(deedStampCost));
    setText('totalClosingCosts', fmt(totalClosingCosts));

    // Update result cards
    setText('resultGrossSale', fmt(grossSalePrice));
    setText('resultTotalCosts', fmt(totalCosts));
    setText('resultNetSale', fmt(netSalePrice));
    setText('resultCashToSeller', fmt(cashToSeller));

    // Conditional color on cash to seller
    var cashEl = document.getElementById('resultCashToSeller');
    if (cashEl) {
      cashEl.className = 'result-value ' + (cashToSeller >= 0 ? 'positive' : 'negative');
    }

    // Build range table
    buildRangeTable(mortgagePayoff, brokerPct, deedStampRate, sellerClosingCosts, smokeDetectors, otherCosts, grossSalePrice);

    // Deal summary
    generateDealSummary({
      grossSalePrice: grossSalePrice,
      cashToSeller: cashToSeller,
      totalCosts: totalCosts,
      commissionDollars: commissionDollars,
      mortgagePayoff: mortgagePayoff
    });
  }

  // ===== SALE PRICE RANGE TABLE — 7 COLUMNS =====
  function buildRangeTable(mortgagePayoff, brokerPct, deedStampRate, sellerClosingCosts, smokeDetectors, otherCosts, targetGrossSalePrice) {
    var low  = parseNum(document.getElementById('saleLow') ? document.getElementById('saleLow').value : 0);
    var high = parseNum(document.getElementById('saleHigh') ? document.getElementById('saleHigh').value : 0);

    if (low <= 0 || high <= 0 || high <= low) return;

    var rawStep = (high - low) / 6;

    // Generate 7 evenly spaced prices
    var prices = [];
    for (var i = 0; i < 7; i++) {
      prices.push(Math.round(low + rawStep * i));
    }
    prices[6] = Math.round(high);

    // Find column closest to target gross sale price
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
      var commission    = salePrice * (brokerPct / 100);
      var deedStamp     = salePrice * (deedStampRate / 1000);
      var closingCosts  = deedStamp + sellerClosingCosts + smokeDetectors + otherCosts;
      var totalCosts    = commission + closingCosts;
      var netSalePrice  = salePrice - totalCosts;
      var cashToSeller  = netSalePrice - mortgagePayoff;
      return {
        grossSalePrice: salePrice,
        commission: commission,
        deedStamp: deedStamp,
        closingCosts: closingCosts,
        totalCosts: totalCosts,
        netSalePrice: netSalePrice,
        mortgage: mortgagePayoff,
        cashToSeller: cashToSeller
      };
    });

    // Row definitions
    var rowDefs = [
      { label: 'Gross Sale',       key: 'grossSalePrice', cond: null, bold: false },
      { label: 'Commission',       key: 'commission',     cond: null, bold: false },
      { label: 'Deed Stamps',      key: 'deedStamp',      cond: null, bold: false },
      { label: 'Closing Costs',    key: 'closingCosts',   cond: null, bold: false },
      { label: 'Total Costs',      key: 'totalCosts',     cond: null, bold: false },
      { label: 'Net Sale Price',   key: 'netSalePrice',   cond: null, bold: false },
      { label: 'Less: Mortgage',   key: 'mortgage',       cond: null, bold: false },
      { label: 'CASH TO SELLER',   key: 'cashToSeller',   cond: 'dynamic', bold: true }
    ];

    var thead = document.getElementById('rangeHead');
    var tbody = document.getElementById('rangeBody');

    // Header row
    var headHtml = '<tr><th>Metric</th>';
    prices.forEach(function (price, i) {
      var cls = i === closestIdx ? ' class="asking-col"' : '';
      headHtml += '<th' + cls + '>' + fmt(price) + '</th>';
    });
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    // Body rows
    var bodyHtml = '';
    rowDefs.forEach(function (row) {
      var trClass = row.bold ? ' class="results-row"' : '';
      bodyHtml += '<tr' + trClass + '>';
      bodyHtml += '<td>' + row.label + '</td>';
      data.forEach(function (d, i) {
        var val = d[row.key];
        var cellClass = '';
        if (row.cond === 'dynamic') {
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
    var textEl    = document.getElementById('dealSummaryText');
    if (!summaryEl || !textEl) return;

    var salePrice        = d.grossSalePrice;
    var cashToSeller     = d.cashToSeller;
    var totalCosts       = d.totalCosts;
    var commission       = d.commissionDollars;

    if (salePrice <= 0) {
      summaryEl.className = 'deal-summary';
      textEl.innerHTML = 'Enter your numbers above to see a plain English analysis.';
      return;
    }

    var sentences = [];

    // Primary sentence
    if (cashToSeller < 0) {
      sentences.push(
        'At ' + fmt(salePrice) + ', you\'re underwater — you\'d need to bring ' + fmt(Math.abs(cashToSeller)) + ' to closing to pay off the mortgage and cover selling costs.'
      );
      summaryEl.className = 'deal-summary negative';
    } else {
      sentences.push(
        'At ' + fmt(salePrice) + ', you walk away with ' + fmt(cashToSeller) + ' after paying off the mortgage and ' + fmt(totalCosts) + ' in selling costs.'
      );
      summaryEl.className = cashToSeller > salePrice * 0.3 ? 'deal-summary positive' : 'deal-summary caution';
    }

    // Selling costs eat up equity warning
    if (cashToSeller > 0 && totalCosts > cashToSeller * 0.5) {
      sentences.push(
        'Your total selling costs are a significant portion of your equity. Make sure the timing is right.'
      );
    }

    textEl.innerHTML = sentences.join(' ');
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', function (e) {
    if (e.target.matches('input[type="text"]') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // ===== RESET =====
  var resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var defaults = {
        grossSalePrice:     '$500,000',
        mortgagePayoff:     '$300,000',
        brokerPct:          '6',
        deedStampRate:      '4.56',
        sellerClosingCosts: '$2,000',
        smokeDetectors:     '$2,000',
        otherCosts:         '$0',
        saleLow:            '$475,000',
        saleHigh:           '$525,000',
        address:            ''
      };
      Object.keys(defaults).forEach(function (key) {
        var el = document.getElementById(key);
        if (el) el.value = defaults[key];
      });
      calculate();
    });
  }

  // ===== SAVE AS PDF — LANDSCAPE LETTER =====
  var pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);

  function generatePDF() {
    var jsPDFLib = window.jspdf;
    var doc = new jsPDFLib.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    var W      = 279.4;
    var H      = 215.9;
    var margin = 12;
    var cw     = W - margin * 2;
    var y      = margin;

    // Color palette
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

    // Teal header bar
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
    doc.text('Home Sale Analyzer', W - margin, y + 5, { align: 'right' });
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    // Property address
    var address = (document.getElementById('address') ? document.getElementById('address').value : '') || 'No address provided';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(address, margin, y);
    y += 4;

    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, W - margin, y);
    y += 5;

    // ===== TWO-COLUMN DATA SUMMARY =====
    var halfW = (cw - 6) / 2;
    var colX  = [margin, margin + halfW + 6];

    function drawDataBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text(title.toUpperCase(), x, startY);

      var iy = startY + 4;
      items.forEach(function (item) {
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        var tc = item.bold ? teal : mutedText;
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(item.label, x, iy);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text(item.value, x + halfW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    // Sale Details column
    var grossSaleEl   = document.getElementById('grossSalePrice');
    var mortgageEl    = document.getElementById('mortgagePayoff');
    var brokerPctEl   = document.getElementById('brokerPct');
    var commEl        = document.getElementById('commissionDollars');
    var deedEl        = document.getElementById('deedStampCost');
    var sccEl         = document.getElementById('sellerClosingCosts');
    var smokeEl       = document.getElementById('smokeDetectors');
    var otherEl       = document.getElementById('otherCosts');
    var cashEl2       = document.getElementById('resultCashToSeller');

    var saleItems = [
      { label: 'Gross Sale Price',                value: fmt(parseNum(grossSaleEl ? grossSaleEl.value : 0)) },
      { label: 'Commission (' + (brokerPctEl ? brokerPctEl.value : '') + '%)', value: commEl ? commEl.textContent : '--' },
      { label: 'Deed Stamps',                      value: deedEl ? deedEl.textContent : '--' },
      { label: 'Seller\'s Closing Costs',          value: fmt(parseNum(sccEl ? sccEl.value : 0)) },
      { label: 'Smoke/CO Certificate',             value: fmt(parseNum(smokeEl ? smokeEl.value : 0)) },
      { label: 'Other Costs',                      value: fmt(parseNum(otherEl ? otherEl.value : 0)) },
      { label: 'Mortgage Payoff',                  value: fmt(parseNum(mortgageEl ? mortgageEl.value : 0)) },
      { label: 'CASH TO SELLER',                   value: cashEl2 ? cashEl2.textContent : '--', bold: true }
    ];

    // Closing Costs column
    var totalCostsEl   = document.getElementById('resultTotalCosts');
    var netSaleEl      = document.getElementById('resultNetSale');
    var netAfterCommEl = document.getElementById('netAfterCommission');
    var totalClEl      = document.getElementById('totalClosingCosts');
    var deedRateEl     = document.getElementById('deedStampRate');

    var closingItems = [
      { label: 'Deed Stamp Rate (per $1,000)',      value: (deedRateEl ? deedRateEl.value : '') },
      { label: 'Deed Stamp Cost',                   value: deedEl ? deedEl.textContent : '--' },
      { label: 'Seller\'s Closing Costs',           value: fmt(parseNum(sccEl ? sccEl.value : 0)) },
      { label: 'Smoke/CO Certificate',              value: fmt(parseNum(smokeEl ? smokeEl.value : 0)) },
      { label: 'Other Costs',                       value: fmt(parseNum(otherEl ? otherEl.value : 0)) },
      { label: 'Total Closing Costs',               value: totalClEl ? totalClEl.textContent : '--' },
      { label: 'Net After Commission',              value: netAfterCommEl ? netAfterCommEl.textContent : '--' },
      { label: 'NET SALE PRICE',                    value: netSaleEl ? netSaleEl.textContent : '--', bold: true }
    ];

    var endY1 = drawDataBlock(colX[0], 'Sale Details', saleItems, y);
    var endY2 = drawDataBlock(colX[1], 'Closing Costs', closingItems, y);

    y = Math.max(endY1, endY2) + 3;

    // ===== 4-METRIC RESULTS BAR =====
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'F');
    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, cw, 16, 2, 2, 'S');

    var grossSaleResultEl   = document.getElementById('resultGrossSale');
    var totalCostsResultEl  = document.getElementById('resultTotalCosts');
    var netSaleResultEl     = document.getElementById('resultNetSale');
    var cashResultEl        = document.getElementById('resultCashToSeller');

    var results = [
      { label: 'Gross Sale',    value: grossSaleResultEl ? grossSaleResultEl.textContent : '--' },
      { label: 'Total Costs',   value: totalCostsResultEl ? totalCostsResultEl.textContent : '--' },
      { label: 'Net Sale Price', value: netSaleResultEl ? netSaleResultEl.textContent : '--' },
      { label: 'Cash to Seller', value: cashResultEl ? cashResultEl.textContent : '--' }
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

    // ===== SALE PRICE RANGE TABLE =====
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
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 32, textColor: mutedText }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            var style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.section === 'head' && askingColIdx > 0 && data.column.index === askingColIdx) {
            data.cell.styles.fillColor = tealLight;
          }
        }
      });
    }

    // ===== BOTTOM ZONE: Deal Summary + QR placeholder =====
    var fy            = H - 10;
    var afterTableY   = doc.lastAutoTable ? doc.lastAutoTable.finalY + 2 : y + 2;
    var bottomTop     = afterTableY;
    var bottomBottom  = fy - 2;
    var bottomHeight  = bottomBottom - bottomTop;

    // QR placeholder box
    var qrSize = 18;
    var qrX    = W - margin - qrSize;
    var qrY    = bottomBottom - qrSize - 4;
    doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
    doc.setLineWidth(0.4);
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Scan for', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    doc.text('tutorial', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });

    // Deal summary box
    var dealSummaryTextEl = document.getElementById('dealSummaryText');
    var dealSummaryText   = dealSummaryTextEl ? dealSummaryTextEl.textContent : '';
    if (dealSummaryText && dealSummaryText !== 'Enter your numbers above to see a plain English analysis.' && bottomHeight > 10) {
      var summaryBoxWidth = qrX - margin - 6;

      doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, bottomTop, summaryBoxWidth, bottomHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(teal[0], teal[1], teal[2]);
      doc.text('DEAL SUMMARY', margin + 3, bottomTop + 5);

      var textAreaHeight = bottomHeight - 8;
      var textWidth      = summaryBoxWidth - 6;
      var fontSize       = 6.5;
      var splitText;
      var trySizes = [6.5, 6, 5.5, 5, 4.5];
      for (var si = 0; si < trySizes.length; si++) {
        doc.setFontSize(trySizes[si]);
        splitText = doc.splitTextToSize(dealSummaryText, textWidth);
        if (splitText.length * (trySizes[si] * 0.45) <= textAreaHeight) {
          fontSize = trySizes[si];
          break;
        }
        fontSize = trySizes[si];
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText, margin + 3, bottomTop + 9);
    }

    // ===== FOOTER =====
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
    doc.text('This analysis is an estimate for informational purposes only. Consult a licensed real estate professional regarding actual costs in your area.', margin, fy + 7.5);

    // Save
    var addrClean = ((document.getElementById('address') ? document.getElementById('address').value : '') || 'analysis')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 40);
    doc.save('Fortified-HomeSale-' + addrClean + '.pdf');
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

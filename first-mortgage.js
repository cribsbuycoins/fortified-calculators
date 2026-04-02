// ===== MY PATH TO HOMEOWNERSHIP — FORTIFIED REALTY GROUP =====

(function () {
  'use strict';

  // ===== SAVINGS VEHICLE RETURNS =====
  const VEHICLE_RETURNS = {
    savings: { label: 'Savings Account',    rate: 4.0,  risk: 'Low' },
    sp500:   { label: 'S&P 500 Index Fund', rate: 10.0, risk: 'Medium' },
    nasdaq:  { label: 'Nasdaq Index Fund',  rate: 12.0, risk: 'Medium-High' },
    bitcoin: { label: 'Bitcoin',            rate: 17.0, risk: 'Very High' },
    tesla:   { label: 'Tesla (TSLA)',       rate: 20.0, risk: 'Very High' },
    custom:  { label: 'Custom',             rate: 4.0,  risk: 'Varies' }
  };

  // All savings vehicles for scenario table
  const SCENARIO_VEHICLES = [
    { name: 'Savings Account',    rate: 4.0,  risk: 'Low' },
    { name: 'S&P 500 Index Fund', rate: 10.0, risk: 'Medium' },
    { name: 'Nasdaq Index Fund',  rate: 12.0, risk: 'Medium-High' },
    { name: 'Bitcoin',            rate: 17.0, risk: 'Very High' },
    { name: 'Tesla (TSLA)',       rate: 20.0, risk: 'Very High' },
  ];

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

  function fmtDec(n, digits) {
    return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatMoneyInput(el) {
    const val = parseNum(el.value);
    el.value = fmt(val);
  }

  function stripMoneyInput(el) {
    const val = parseNum(el.value);
    el.value = val === 0 ? '' : val;
  }

  // ===== MONEY INPUT EVENT HANDLERS =====
  document.querySelectorAll('.money-input').forEach(el => {
    el.addEventListener('focus', () => stripMoneyInput(el));
    el.addEventListener('blur', () => formatMoneyInput(el));
  });

  // ===== RAMP CARD SELECTION =====
  const rampCards = document.querySelectorAll('.ramp-card');
  rampCards.forEach(card => {
    card.addEventListener('click', () => {
      rampCards.forEach(c => c.style.borderColor = 'var(--color-border)');
      card.style.borderColor = 'var(--color-accent)';
      calculate();
    });
  });

  // ===== SAVINGS VEHICLE DROPDOWN =====
  const vehicleSelect = document.getElementById('savingsVehicle');
  const expectedReturnEl = document.getElementById('expectedReturn');
  let userEditedReturn = false;

  vehicleSelect.addEventListener('change', () => {
    const key = vehicleSelect.value;
    if (key !== 'custom') {
      expectedReturnEl.value = VEHICLE_RETURNS[key] ? VEHICLE_RETURNS[key].rate : 4.0;
      userEditedReturn = false;
    }
    document.getElementById('customNameGroup').style.display =
      key === 'custom' ? '' : 'none';
    calculate();
  });

  expectedReturnEl.addEventListener('input', () => {
    userEditedReturn = true;
    calculate();
  });

  // ===== INPUT LISTENERS =====
  const inputIds = [
    'homePrice', 'downPct', 'closingPct', 'reserveCushion', 'mortgageRate',
    'monthsUntilPurchase', 'homeAppreciation',
    'currentSavings', 'currentRent', 'currentMonthlySavings', 'customName'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', calculate);
    el.addEventListener('blur', () => {
      if (el.classList.contains('money-input')) formatMoneyInput(el);
      calculate();
    });
    el.addEventListener('focus', () => {
      if (el.classList.contains('money-input')) stripMoneyInput(el);
    });
  });

  document.querySelectorAll('input[name="rampStyle"]').forEach(r => {
    r.addEventListener('change', calculate);
  });

  // ===== RAMP-UP ENGINE =====
  /**
   * Build a month-by-month savings schedule using ramp-up style.
   * Returns array of { month, savings, cumulative, balance } objects.
   */
  function buildSchedule(months, startBalance, targetCash, rampStyle, annualReturn, startingSavings) {
    const monthlyRate = annualReturn / 100 / 12;
    const numPhases = Math.ceil(months / 3);

    // Average monthly savings needed (ignoring growth) as a rough starting guess
    const gap = Math.max(0, targetCash - startBalance);
    // Simple average savings (ignoring compound growth for the multiplier baseline)
    const avgSavings = months > 0 ? gap / months : 0;

    // Build phase multipliers based on ramp style
    // Aggressive: start high, increase fast (front-loaded)
    // Moderate: smooth ramp from 70% to 130%
    // Passive: start low, ramp slowly
    function phaseMultiplier(phaseIdx, total, style) {
      const t = total <= 1 ? 0 : phaseIdx / (total - 1); // 0 to 1
      if (style === 'aggressive') {
        // Front-loaded: start at 130%, ends at 70% — WAIT, spec says ramp UP
        // Spec: "start high and increase fast" for aggressive
        // Re-reading: "front-load. First phase = 60% of avg, ramps to 140% by end"
        // So aggressive actually starts lower and ramps UP faster
        return 0.6 + t * 0.8; // 60% -> 140%
      } else if (style === 'moderate') {
        return 0.7 + t * 0.6; // 70% -> 130%
      } else { // passive
        return 0.5 + t * 1.0; // 50% -> 150%
      }
    }

    // Build the schedule month by month
    const schedule = [];
    let balance = startBalance;
    let month = 0;

    for (let p = 0; p < numPhases; p++) {
      const mult = phaseMultiplier(p, numPhases, rampStyle);
      // Monthly savings for this phase, floored to whole dollars
      const phaseSavings = Math.max(0, Math.round(avgSavings * mult));
      const phaseEnd = Math.min((p + 1) * 3, months);

      for (let m = p * 3; m < phaseEnd; m++) {
        balance = balance * (1 + monthlyRate) + phaseSavings;
        month++;
        schedule.push({
          month,
          phase: p + 1,
          phaseStart: p * 3 + 1,
          phaseEnd,
          savings: phaseSavings,
          cumulative: balance - startBalance, // approximate — includes growth
          balance: Math.round(balance)
        });
      }
    }

    return schedule;
  }

  /**
   * Build phase-level summary from a monthly schedule.
   */
  function summarizeByPhase(schedule, months) {
    if (!schedule.length) return [];
    const phases = {};
    schedule.forEach(m => {
      const key = m.phase;
      if (!phases[key]) {
        phases[key] = {
          phase: key,
          monthStart: m.phaseStart,
          monthEnd: m.phaseEnd,
          phaseEnd: m.phaseEnd,
          savings: m.savings,
          phaseTotal: 0,
          endBalance: 0
        };
      }
      phases[key].phaseTotal += m.savings;
      phases[key].endBalance = m.balance;
    });
    return Object.values(phases);
  }

  /**
   * Project balance using flat monthly savings + compounding.
   */
  function projectBalance(months, startBalance, monthlySavings, annualReturn) {
    const r = annualReturn / 100 / 12;
    let balance = startBalance;
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + r) + monthlySavings;
    }
    return balance;
  }

  /**
   * Get current ramp style selection.
   */
  function getRampStyle() {
    const checked = document.querySelector('input[name="rampStyle"]:checked');
    return checked ? checked.value : 'moderate';
  }

  // ===== DATE HELPER =====
  function monthsFromNow(n) {
    const d = new Date();
    d.setMonth(d.getMonth() + Math.round(n));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function monthLabel(offset) {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const yr  = d.getFullYear();
    return `${mon} ${yr}`;
  }

  // ===== MAIN CALCULATE =====
  function calculate() {
    // --- Read Inputs ---
    const homePrice         = parseNum(document.getElementById('homePrice').value);
    const downPct           = parseNum(document.getElementById('downPct').value);
    const closingPct        = parseNum(document.getElementById('closingPct').value);
    const reserveCushion    = parseNum(document.getElementById('reserveCushion').value);
    const mortgageRate      = parseNum(document.getElementById('mortgageRate')?.value) / 100;
    const months            = Math.max(1, Math.round(parseNum(document.getElementById('monthsUntilPurchase').value)));
    const homeAppreciation  = parseNum(document.getElementById('homeAppreciation').value);
    const currentSavings    = parseNum(document.getElementById('currentSavings').value);
    const currentRent       = parseNum(document.getElementById('currentRent').value);
    const currentMonthlySavings = parseNum(document.getElementById('currentMonthlySavings').value);
    const expectedReturn    = parseNum(document.getElementById('expectedReturn').value);
    const rampStyle         = getRampStyle();
    const vehicle           = vehicleSelect.value;
    const customNameVal     = document.getElementById('customName')?.value || 'My Investment';
    const vehicleLabel      = vehicle === 'custom' ? customNameVal : (VEHICLE_RETURNS[vehicle] ? VEHICLE_RETURNS[vehicle].label : 'Custom');

    // --- Col 1 Computed ---
    const downPayment    = homePrice * (downPct / 100);
    const closingDollars = homePrice * (closingPct / 100);
    const totalCashNeeded = downPayment + closingDollars + reserveCushion;

    document.getElementById('downPayment').textContent    = fmt(downPayment);
    document.getElementById('closingDollars').textContent = fmt(closingDollars);
    document.getElementById('totalCashNeeded').textContent = fmt(totalCashNeeded);

    // --- Col 2 Computed ---
    const yrs = months / 12;
    const adjustedHomePrice = homePrice * Math.pow(1 + homeAppreciation / 100, yrs);
    const adjustedDown      = adjustedHomePrice * (downPct / 100);
    const adjustedClosing   = adjustedHomePrice * (closingPct / 100);
    const adjustedCashNeeded = adjustedDown + adjustedClosing + reserveCushion;

    document.getElementById('adjustedHomePrice').textContent  = fmt(adjustedHomePrice);
    document.getElementById('adjustedCashNeeded').textContent = fmt(adjustedCashNeeded);

    // --- Compute Future P+I Payment ---
    // Future payment based on ADJUSTED home price (what they'll actually pay)
    const adjustedLoanAmount = adjustedHomePrice - adjustedDown;
    let futurePI = 0;
    if (adjustedLoanAmount > 0 && mortgageRate > 0) {
      const r = mortgageRate / 12;
      const n = 360;
      futurePI = adjustedLoanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    setText('futurePayment', fmt(Math.round(futurePI)));

    // --- Col 3 Computed ---
    const practiceGap = futurePI - currentRent;
    document.getElementById('practiceGap').textContent = fmt(Math.abs(practiceGap)) + '/mo' + (practiceGap > 0 ? ' more' : ' less');

    // --- Coaching Bar ---
    const coachingText = document.getElementById('coachingText');
    if (practiceGap > 0) {
      coachingText.textContent =
        `Your future housing payment is ${fmt(futurePI)} and your current rent is ${fmt(currentRent)}. ` +
        `That means your practice-payment gap is ${fmt(practiceGap)}/month. ` +
        `If you can redirect that extra ${fmt(practiceGap)} into savings today, you'll be training for your new payment — and turbocharging your down payment fund.`;
    } else if (practiceGap < 0) {
      coachingText.textContent =
        `Your expected payment of ${fmt(futurePI)} is actually less than your current rent of ${fmt(currentRent)}. ` +
        `That's a win — homeownership may cost you less per month! Focus on saving your down payment.`;
    } else {
      coachingText.textContent =
        `Your expected payment matches your current rent exactly at ${fmt(futurePI)}/month. ` +
        `Your monthly budget won't change — now focus on saving your down payment.`;
    }

    // --- Build Ramp Schedule ---
    const schedule = buildSchedule(months, currentSavings, adjustedCashNeeded, rampStyle, expectedReturn, currentMonthlySavings);
    const projectedBalance = schedule.length ? schedule[schedule.length - 1].balance : currentSavings;
    const gap = Math.max(0, adjustedCashNeeded - currentSavings);

    // Average monthly savings needed (simple, not compound-adjusted)
    const avgMonthlyNeeded = months > 0 ? gap / months : 0;

    // On-track based on current pace (flat, no growth)
    const projectedAtCurrentPace = projectBalance(months, currentSavings, currentMonthlySavings, expectedReturn);

    const onTrack = projectedBalance >= adjustedCashNeeded;
    const surplus = projectedBalance - adjustedCashNeeded;

    // --- Result Cards ---
    document.getElementById('resultCashNeeded').textContent       = fmt(adjustedCashNeeded);
    document.getElementById('resultMonthlyTarget').textContent    = fmt(avgMonthlyNeeded) + '/mo avg';
    document.getElementById('resultProjectedBalance').textContent = fmt(projectedBalance);

    const verdictCard = document.getElementById('resultVerdict');
    if (onTrack) {
      verdictCard.textContent = surplus > 0 ? '✓ On Track' : '≈ Just Right';
      verdictCard.style.color = 'var(--color-positive, #34d399)';
    } else {
      verdictCard.textContent = '⚠ Behind';
      verdictCard.style.color = 'var(--color-warning, #fbbf24)';
    }

    // --- Verdict Section ---
    const targetDateStr = monthsFromNow(months);
    const verdictTitle  = document.getElementById('verdictTitle');
    const verdictText   = document.getElementById('verdictText');
    verdictTitle.textContent = onTrack ? 'YOU\'RE ON YOUR WAY' : 'LET\'S CLOSE THE GAP';

    if (onTrack) {
      verdictText.innerHTML =
        `You need <strong>${fmt(adjustedCashNeeded)}</strong> to close on a home by <strong>${targetDateStr}</strong>. ` +
        `With ${rampStyle} savings and ${vehicleLabel} returns, you're projected to have <strong>${fmt(projectedBalance)}</strong> — ` +
        `that's <strong>${fmt(surplus)}</strong> ahead of target. Keep going!`;
    } else {
      const shortfall = adjustedCashNeeded - projectedBalance;
      verdictText.innerHTML =
        `You need <strong>${fmt(adjustedCashNeeded)}</strong> by <strong>${targetDateStr}</strong>, but your current ramp-up plan ` +
        `projects only <strong>${fmt(projectedBalance)}</strong> — a gap of <strong>${fmt(shortfall)}</strong>. ` +
        `Consider saving more aggressively, choosing a higher-yield vehicle, or extending your timeline by 3–6 months.`;
    }

    // --- Ramp-Up Schedule Table ---
    const phases = summarizeByPhase(schedule, months);
    renderScheduleTable(phases, adjustedCashNeeded);

    // --- Scenario Comparison ---
    renderScenarioTable(months, currentSavings, adjustedCashNeeded, rampStyle, vehicle, expectedReturn);

    // --- Deal Summary ---
    renderDealSummary({
      homePrice, adjustedHomePrice, downPct, downPayment: adjustedDown,
      closingPct, closingDollars: adjustedClosing, reserveCushion,
      adjustedCashNeeded, currentSavings, gap, months,
      rampStyle, vehicleLabel, expectedReturn, homeAppreciation,
      projectedBalance, onTrack, surplus, targetDateStr,
      currentMonthlySavings, avgMonthlyNeeded, practiceGap
    });
  }

  // ===== RENDER SCHEDULE TABLE =====
  function renderScheduleTable(phases, targetCash) {
    const head = document.getElementById('scheduleHead');
    const body = document.getElementById('scheduleBody');

    head.innerHTML = `<tr>
      <th>Phase</th>
      <th>Months</th>
      <th>Save / Month</th>
      <th>Phase Total</th>
      <th>Projected Balance</th>
      <th>vs. Target</th>
    </tr>`;

    body.innerHTML = '';
    phases.forEach((p, i) => {
      const diff = p.endBalance - targetCash;
      const isLast = i === phases.length - 1;
      const diffStr = diff >= 0
        ? `<span style="color:var(--color-positive,#34d399)">+${fmt(diff)}</span>`
        : `<span style="color:var(--color-warning,#fbbf24)">${fmt(diff)}</span>`;

      const row = document.createElement('tr');
      if (isLast) row.style.fontWeight = '600';
      row.innerHTML = `
        <td>Phase ${p.phase}</td>
        <td>${p.monthStart}–${p.monthEnd}</td>
        <td>${fmt(p.savings)}</td>
        <td>${fmt(p.phaseTotal)}</td>
        <td>${fmt(p.endBalance)}</td>
        <td>${diffStr}</td>
      `;
      body.appendChild(row);
    });

    // Add a milestone summary row
    if (phases.length) {
      const lastPhase = phases[phases.length - 1];
      const summary = document.createElement('tr');
      summary.style.cssText = 'background:rgba(56,189,248,0.08); font-weight:700;';
      const onTrack = lastPhase.endBalance >= targetCash;
      summary.innerHTML = `
        <td colspan="4" style="color:var(--color-text-muted);">Final Projected Balance</td>
        <td style="color:${onTrack ? 'var(--color-positive,#34d399)' : 'var(--color-warning,#fbbf24)'}">${fmt(lastPhase.endBalance)}</td>
        <td>${onTrack ? '✓ Goal Met' : '⚠ Short'}</td>
      `;
      body.appendChild(summary);
    }
  }

  // ===== RENDER SCENARIO TABLE =====
  function renderScenarioTable(months, startBalance, targetCash, rampStyle, selectedVehicle, selectedReturn) {
    const head = document.getElementById('scenarioHead');
    const body = document.getElementById('scenarioBody');

    head.innerHTML = `<tr>
      <th>Strategy</th>
      <th>Annual Return</th>
      <th>Projected Balance</th>
      <th>Hits Target?</th>
      <th>Risk Level</th>
    </tr>`;

    body.innerHTML = '';

    // Build scenario list from the standard vehicles array
    const selectedVehicleLabel = selectedVehicle === 'custom'
      ? (document.getElementById('customName')?.value || 'My Investment')
      : (VEHICLE_RETURNS[selectedVehicle] ? VEHICLE_RETURNS[selectedVehicle].label : 'Custom');

    // Build scenario rows: use standard list, mark the currently selected one with a star
    // If user selected custom, add it at top with their custom name/rate
    const scenarios = SCENARIO_VEHICLES.map(v => ({ ...v }));

    // Determine which row is selected (match by label or add custom row)
    let selectedIdx = -1;
    if (selectedVehicle === 'custom') {
      // Prepend custom row
      scenarios.unshift({ name: selectedVehicleLabel, rate: parseFloat(selectedReturn) || 4.0, risk: 'Varies', isCustom: true });
      selectedIdx = 0;
    } else {
      // Find matching standard vehicle by key
      const vehicleLabel = VEHICLE_RETURNS[selectedVehicle] ? VEHICLE_RETURNS[selectedVehicle].label : null;
      selectedIdx = scenarios.findIndex(s => s.name === vehicleLabel);
      // Override rate with user's expected return for selected vehicle
      if (selectedIdx >= 0) {
        scenarios[selectedIdx] = { ...scenarios[selectedIdx], rate: parseFloat(selectedReturn) || scenarios[selectedIdx].rate };
      }
    }

    scenarios.forEach((s, i) => {
      const schedule = buildSchedule(months, startBalance, targetCash, rampStyle, s.rate, 0);
      const projected = schedule.length ? schedule[schedule.length - 1].balance : startBalance;
      const hitsTarget = projected >= targetCash;
      const isSelected = i === selectedIdx;

      const row = document.createElement('tr');
      if (isSelected) row.style.background = 'rgba(56,189,248,0.08)';

      row.innerHTML = `
        <td style="font-weight:${isSelected ? '600' : '400'}">${s.name}${isSelected ? ' ★' : ''}</td>
        <td>${fmtDec(s.rate, 1)}%</td>
        <td style="font-weight:600; color:${hitsTarget ? 'var(--color-positive,#34d399)' : 'var(--color-warning,#fbbf24)'}">${fmt(projected)}</td>
        <td style="color:${hitsTarget ? 'var(--color-positive,#34d399)' : 'var(--color-warning,#fbbf24)'}">${hitsTarget ? '✓ Yes' : '✗ Short ' + fmt(targetCash - projected)}</td>
        <td>${s.risk}</td>
      `;
      body.appendChild(row);
    });
  }

  // ===== RENDER DEAL SUMMARY =====
  function renderDealSummary(d) {
    const el = document.getElementById('dealSummaryText');
    const styleLabel = { aggressive: 'Aggressive', moderate: 'Moderate', passive: 'Passive' };

    let text = `Your goal is a home priced around ${fmt(d.homePrice)} today. `;
    text += `By ${d.targetDateStr}, with ${fmtDec(d.homeAppreciation || 3, 1)}% annual appreciation, `;
    text += `you'll need roughly ${fmt(d.adjustedCashNeeded)} at closing — `;
    text += `that covers your ${fmtDec(d.downPct, 0)}% down payment (${fmt(d.downPayment)}), `;
    text += `${fmtDec(d.closingPct, 0)}% closing costs (${fmt(d.closingDollars)}), `;
    text += `and a ${fmt(d.reserveCushion)} reserve cushion. `;
    text += `You're starting with ${fmt(d.currentSavings)}, leaving a gap of ${fmt(d.gap)} to close. `;
    text += `\n\nWith a ${styleLabel[d.rampStyle]} ramp-up strategy and your savings in ${d.vehicleLabel} `;
    text += `(${fmtDec(d.expectedReturn, 1)}% annual return), `;
    text += `you're projected to reach ${fmt(d.projectedBalance)} by ${d.targetDateStr}. `;
    if (d.onTrack) {
      text += `That's ${fmt(d.surplus)} ahead of your goal — you've got this! `;
      text += `Stay the course, automate your transfers, and celebrate each quarterly milestone.`;
    } else {
      const shortfall = d.adjustedCashNeeded - d.projectedBalance;
      text += `That falls ${fmt(shortfall)} short of your goal. `;
      text += `Options to close the gap: (1) increase monthly savings by ${fmt(shortfall / d.months)}/month, `;
      text += `(2) choose a higher-yield savings vehicle, or `;
      text += `(3) extend your timeline by 3–6 months. You can do this — one step at a time.`;
    }

    el.textContent = text;
  }

  // ===== PDF GENERATION =====
  document.getElementById('savePdfBtn').addEventListener('click', generatePDF);

  function generatePDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      alert('PDF library not loaded yet. Please wait a moment and try again.');
      return;
    }

    // Read all inputs for PDF
    const homePrice         = parseNum(document.getElementById('homePrice').value);
    const downPct           = parseNum(document.getElementById('downPct').value);
    const closingPct        = parseNum(document.getElementById('closingPct').value);
    const reserveCushion    = parseNum(document.getElementById('reserveCushion').value);
    const mortgageRatePDF   = parseNum(document.getElementById('mortgageRate')?.value) / 100;
    const months            = Math.max(1, Math.round(parseNum(document.getElementById('monthsUntilPurchase').value)));
    const homeAppreciation  = parseNum(document.getElementById('homeAppreciation').value);
    const currentSavings    = parseNum(document.getElementById('currentSavings').value);
    const currentRent       = parseNum(document.getElementById('currentRent').value);
    const currentMonthlySavings = parseNum(document.getElementById('currentMonthlySavings').value);
    const expectedReturn    = parseNum(document.getElementById('expectedReturn').value);
    const rampStyle         = getRampStyle();
    const vehicle           = vehicleSelect.value;
    const customNamePDF     = document.getElementById('customName')?.value || 'My Investment';
    const vehicleLabel      = vehicle === 'custom' ? customNamePDF : (VEHICLE_RETURNS[vehicle] ? VEHICLE_RETURNS[vehicle].label : 'Custom');

    const yrs = months / 12;
    const adjustedHomePrice  = homePrice * Math.pow(1 + homeAppreciation / 100, yrs);
    const adjustedDown       = adjustedHomePrice * (downPct / 100);
    const adjustedClosing    = adjustedHomePrice * (closingPct / 100);
    const adjustedCashNeeded = adjustedDown + adjustedClosing + reserveCushion;
    const gap                = Math.max(0, adjustedCashNeeded - currentSavings);

    // Compute future P+I for the PDF rent vs payment display
    const mortgageRate = parseNum(document.getElementById('mortgageRate')?.value) / 100;
    const adjustedLoanAmount = adjustedHomePrice - adjustedDown;
    let futurePI = 0;
    if (adjustedLoanAmount > 0 && mortgageRate > 0) {
      const r = mortgageRate / 12;
      const n = 360;
      futurePI = adjustedLoanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    const targetDateStr      = monthsFromNow(months);
    const styleLabel         = { aggressive: 'Aggressive', moderate: 'Moderate', passive: 'Passive' };

    const schedule = buildSchedule(months, currentSavings, adjustedCashNeeded, rampStyle, expectedReturn, currentMonthlySavings);
    const projectedBalance = schedule.length ? schedule[schedule.length - 1].balance : currentSavings;
    const onTrack = projectedBalance >= adjustedCashNeeded;
    const phases = summarizeByPhase(schedule, months);

    // === CREATE PORTRAIT PDF (8.5x11) ===
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();   // 612
    const H = doc.internal.pageSize.getHeight();  // 792
    const margin = 40;
    let y = margin;

    // --- Color Palette ---
    const DARK  = [0, 52, 77];       // Fortified dark navy #00344D
    const TEAL  = [56, 189, 248];    // accent #38bdf8
    const WHITE = [255, 255, 255];
    const GRAY  = [100, 116, 139];
    const LIGHT = [241, 245, 249];
    const GREEN = [16, 185, 129];
    const AMBER = [251, 191, 36];

    function setFont(size, style, color) {
      doc.setFontSize(size);
      doc.setFont('helvetica', style || 'normal');
      doc.setTextColor(...(color || DARK));
    }

    function rect(x, rx, ry, rw, rh, fillColor, cornerRadius) {
      doc.setFillColor(...fillColor);
      if (cornerRadius) {
        doc.roundedRect(rx, ry, rw, rh, cornerRadius, cornerRadius, 'F');
      } else {
        doc.rect(rx, ry, rw, rh, 'F');
      }
    }

    // --- HEADER BAND ---
    rect(0, 0, 0, W, 75, DARK);
    try {
      doc.addImage('./assets/fortified-logo-white.png', 'PNG', margin, 8, 65, 15);
    } catch(e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('FORTIFIED REALTY GROUP', margin, 18);
    }
    setFont(20, 'bold', WHITE);
    doc.text('My Path to Homeownership', W / 2, 38, { align: 'center' });
    setFont(10, 'normal', TEAL);
    doc.text('A personal savings plan prepared by Fortified Realty Group', W / 2, 52, { align: 'center' });
    setFont(9, 'normal', [176, 212, 230]);
    doc.text(`Target: ${fmt(homePrice)} home by ${targetDateStr}`, W / 2, 64, { align: 'center' });
    y = 90;

    // --- GOAL SUMMARY BOX ---
    const boxX = margin;
    const boxW = W - margin * 2;
    rect(0, boxX, y, boxW, 160, LIGHT, 4);

    setFont(11, 'bold', DARK);
    doc.text('Goal Summary', boxX + 12, y + 18);

    const col1X = boxX + 12;
    const col2X = boxX + boxW / 2 + 12;
    let gy = y + 32;
    const lineH = 17;

    function summaryRow(x, label, value, isLast) {
      setFont(8.5, 'normal', GRAY);
      doc.text(label, x, gy);
      // Prevent value text overflow: reduce font size if text is long
      const maxValueW = 70; // approximate pt width available
      const valStr = String(value);
      const fontSize = valStr.length > 22 ? 7 : 9;
      setFont(fontSize, 'bold', DARK);
      doc.text(valStr, x + 140, gy, { maxWidth: maxValueW });
      if (!isLast) {
        doc.setDrawColor(220, 228, 235);
        doc.line(x, gy + 3, x + 200, gy + 3);
      }
    }

    const leftRows = [
      ['Target Home Price', fmt(homePrice)],
      ['Adjusted Price (by ' + targetDateStr + ')', fmt(adjustedHomePrice)],
      ['Down Payment (' + downPct + '%)', fmt(adjustedDown)],
      ['Closing Costs (' + closingPct + '%)', fmt(adjustedClosing)],
      ['Reserve Cushion', fmt(reserveCushion)],
    ];
    const rightRows = [
      ['Total Cash Needed', fmt(adjustedCashNeeded)],
      ['Current Savings', fmt(currentSavings)],
      ['Gap to Close', fmt(gap)],
      ['Savings Style', styleLabel[rampStyle]],
      ['Account / Return', vehicleLabel + ' (' + fmtDec(expectedReturn, 1) + '%)'],
    ];

    leftRows.forEach((r, i) => { summaryRow(col1X, r[0], r[1], i === leftRows.length - 1); gy += lineH; });
    gy = y + 32;
    rightRows.forEach((r, i) => { summaryRow(col2X, r[0], r[1], i === rightRows.length - 1); gy += lineH; });

    y += 172;

    // --- RENT vs FUTURE PAYMENT (big, prominent) ---
    const rentFutureY = y;
    const halfW = (boxW - 10) / 2;

    // Current Rent box
    rect(0, boxX, rentFutureY, halfW, 30, [245, 247, 250], 3);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, rentFutureY, halfW, 30, 3, 3, 'S');
    setFont(8, 'normal', GRAY);
    doc.text('CURRENT RENT', boxX + halfW / 2, rentFutureY + 10, { align: 'center' });
    setFont(16, 'bold', DARK);
    doc.text(fmt(currentRent) + '/mo', boxX + halfW / 2, rentFutureY + 24, { align: 'center' });

    // Future Payment box
    rect(0, boxX + halfW + 10, rentFutureY, halfW, 30, [245, 247, 250], 3);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX + halfW + 10, rentFutureY, halfW, 30, 3, 3, 'S');
    setFont(8, 'normal', GRAY);
    doc.text('FUTURE MORTGAGE PAYMENT', boxX + halfW + 10 + halfW / 2, rentFutureY + 10, { align: 'center' });
    setFont(16, 'bold', DARK);
    doc.text(fmt(Math.round(futurePI)) + '/mo', boxX + halfW + 10 + halfW / 2, rentFutureY + 24, { align: 'center' });

    y = rentFutureY + 38;

    // --- PROJECTED OUTCOME LINE ---
    const badgeColor = onTrack ? GREEN : [200, 80, 30];
    setFont(10, 'bold', badgeColor);
    const outcomeText = onTrack
      ? `Projected to reach ${fmt(projectedBalance)} by ${targetDateStr} — ${fmt(projectedBalance - adjustedCashNeeded)} ahead of goal`
      : `Projected ${fmt(projectedBalance)} by ${targetDateStr} — ${fmt(adjustedCashNeeded - projectedBalance)} short`;
    const checkmark = onTrack ? '✓ ' : '⚠ ';
    doc.text(checkmark + outcomeText, W / 2, y + 4, { align: 'center' });
    y += 14;

    // --- ACTION PLAN HEADER ---
    setFont(13, 'bold', DARK);
    doc.text('Your Action Plan', boxX, y);
    setFont(9, 'normal', GRAY);
    doc.text('Post this on your fridge. Check off each month as you go.', boxX, y + 14);
    y += 28;

    // --- Month-by-month fridge checklist ---
    // Group by phase: show phase header + each month's deposit
    let actionY = y;
    const pageBottom = H - 120; // leave room for footer

    for (let p = 0; p < phases.length; p++) {
      const phase = phases[p];
      const phaseMonthCount = phase.phaseEnd - phase.monthStart + 1;

      // Check page break
      if (actionY + 22 + phaseMonthCount * 16 > pageBottom) {
        doc.addPage();
        actionY = margin + 10;
      }

      // Phase header
      rect(0, boxX, actionY, boxW, 20, DARK, 3);
      setFont(9, 'bold', WHITE);
      doc.text(`Phase ${phase.phase}  |  Months ${phase.monthStart}–${phase.phaseEnd}  |  Save ${fmt(phase.savings)}/month`, boxX + 8, actionY + 13);
      actionY += 30; // gap below phase header before first checkbox line

      // Individual month lines
      for (let mo = phase.monthStart; mo <= phase.phaseEnd; mo++) {
        if (actionY > pageBottom) {
          doc.addPage();
          actionY = margin + 10;
        }
        const monthStr = monthLabel(mo - 1);
        setFont(9, 'normal', DARK);
        // Draw a checkbox square
        doc.setDrawColor(0, 52, 77);
        doc.setLineWidth(0.4);
        doc.setFillColor(255, 255, 255);
        doc.rect(boxX + 4, actionY - 5, 5, 5, 'FD');
        doc.text(`${monthStr}  —  Deposit ${fmt(phase.savings)} into your ${vehicleLabel}`, boxX + 14, actionY + 1);
        actionY += 15;
      }

      // Quarterly milestone: at end of each 2 phases (every ~6 months)
      if ((p + 1) % 2 === 0 || p === phases.length - 1) {
        const balanceAtPhase = phase.endBalance;
        if (actionY + 16 > pageBottom) {
          doc.addPage();
          actionY = margin + 10;
        }
        rect(0, boxX, actionY, boxW, 16, [230, 245, 235], 2);
        setFont(8.5, 'italic', [16, 120, 80]);
        doc.text(
          `Milestone: By ${monthLabel(phase.phaseEnd - 1)}, you should have about ${fmt(balanceAtPhase)} saved. ✓`,
          boxX + 8, actionY + 11
        );
        actionY += 22;
      } else {
        actionY += 4;
      }
    }

    // --- Risk Warning for volatile assets ---
    if (['sp500', 'nasdaq', 'bitcoin', 'tesla'].includes(vehicle)) {
      if (actionY + 40 > pageBottom) { doc.addPage(); actionY = margin + 10; }
      rect(0, boxX, actionY, boxW, 36, [255, 243, 205], 3);
      setFont(8, 'bold', [146, 64, 14]);
      doc.text('⚠  Risk Warning', boxX + 8, actionY + 12);
      setFont(7.5, 'normal', [120, 53, 15]);
      const riskText = vehicle === 'bitcoin'
        ? 'Bitcoin is highly volatile. Values can drop 50%+ in short periods. Only use this for long-term goals, not near-term home purchases.'
        : vehicle === 'tesla'
        ? 'Tesla (TSLA) is a single stock and highly volatile. Values can drop dramatically. Only consider this for long timelines with high risk tolerance.'
        : `${vehicleLabel} investments fluctuate with market conditions. Past returns don't guarantee future results. Consider a stable vehicle like a Savings Account for short timelines.`;
      doc.text(riskText, boxX + 8, actionY + 24, { maxWidth: boxW - 16 });
      actionY += 46;
    }

    // --- FOOTER on all pages ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      rect(0, 0, H - 52, W, 52, DARK);
      setFont(8, 'normal', TEAL);
      doc.text('Fortified Realty Group, LLC  |  One North Main Street, Fall River, MA 02720  |  (508) 691-8035  |  fortifiedrealty.net', W / 2, H - 33, { align: 'center' });
      setFont(7, 'normal', [120, 160, 180]);
      doc.text(
        'This plan is for educational purposes only. Not financial or mortgage advice. Projections are estimates and not guaranteed.',
        W / 2, H - 18, { align: 'center', maxWidth: W - 80 }
      );
      setFont(7.5, 'normal', [120, 160, 180]);
      doc.text(`Page ${pg} of ${totalPages}`, W - margin, H - 33, { align: 'right' });
    }

    doc.save('My-Path-to-Homeownership.pdf');
  }

  // ===== RESET =====
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('homePrice').value            = '$400,000';
    document.getElementById('downPct').value              = '5';
    document.getElementById('closingPct').value           = '3';
    document.getElementById('reserveCushion').value       = '$5,000';
    document.getElementById('mortgageRate').value         = '6.5';
    document.getElementById('monthsUntilPurchase').value  = '24';
    document.getElementById('homeAppreciation').value     = '3';
    document.getElementById('currentSavings').value       = '$5,000';
    document.getElementById('currentRent').value          = '$1,500';
    document.getElementById('currentMonthlySavings').value = '$300';
    document.getElementById('expectedReturn').value       = '4.0';

    // Reset ramp style to moderate
    document.querySelector('input[name="rampStyle"][value="moderate"]').checked = true;
    rampCards.forEach(c => c.style.borderColor = 'var(--color-border)');
    document.getElementById('card-moderate').style.borderColor = 'var(--color-accent)';

    // Reset vehicle
    vehicleSelect.value = 'savings';
    document.getElementById('customNameGroup').style.display = 'none';
    userEditedReturn = false;

    calculate();
  });

  // ===== INITIAL RUN =====
  calculate();

})();

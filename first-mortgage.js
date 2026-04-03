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
    cash:    { label: 'Cash',               rate: 0.0,  risk: 'None' },
    custom:  { label: 'Custom',             rate: 4.0,  risk: 'Varies' }
  };

  // All savings vehicles for scenario table
  const SCENARIO_VEHICLES = [
    { name: 'Cash (0%)',           rate: 0.0,  risk: 'None' },
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

  // Pay frequency dropdown
  document.getElementById('payFrequency')?.addEventListener('change', calculate);

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
  function buildSchedule(months, startBalance, targetCash, rampStyle, annualReturn, startingSavings, practiceGapAmount) {
    const monthlyRate = annualReturn / 100 / 12;
    const numPhases = Math.ceil(months / 3);
    if (numPhases === 0 || months === 0) return [];

    // Style multipliers — shape the curve, all styles hit the same target
    function phaseMultiplier(phaseIdx, total, style) {
      const t = total <= 1 ? 0 : phaseIdx / (total - 1);
      if (style === 'aggressive') return 1.0 + t * 0.6;
      if (style === 'moderate') return 0.7 + t * 0.6;
      return 0.4 + t * 1.0; // passive
    }

    // Pre-compute the multiplier for each phase
    const phaseWeights = [];
    for (let p = 0; p < numPhases; p++) {
      const mult = phaseMultiplier(p, numPhases, rampStyle);
      const phaseMonths = Math.min((p + 1) * 3, months) - p * 3;
      phaseWeights.push({ mult, months: phaseMonths });
    }

    // Goal-seek: find the base amount (X) such that saving X*mult per phase
    // with compound growth lands exactly on targetCash.
    // Simulate with X=1 to get the "shape", then scale.
    function simulate(baseAmt) {
      let bal = startBalance;
      for (let p = 0; p < numPhases; p++) {
        const save = Math.max(startingSavings, Math.round(baseAmt * phaseWeights[p].mult));
        for (let m = 0; m < phaseWeights[p].months; m++) {
          bal = bal * (1 + monthlyRate) + save;
        }
      }
      return bal;
    }

    // Binary search for the right base amount — always meet or exceed target
    let lo = 0, hi = targetCash * 2;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (simulate(mid) < targetCash) lo = mid;
      else hi = mid;
    }
    // Use the high end to ensure we always meet the target (never short)
    const baseSavings = hi;

    // Build the final schedule with the solved base
    const schedule = [];
    let balance = startBalance;
    let month = 0;

    for (let p = 0; p < numPhases; p++) {
      const phaseSavings = Math.max(startingSavings, Math.round(baseSavings * phaseWeights[p].mult));
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
          cumulative: balance - startBalance,
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

    // Pay frequency
    const payFreq = document.getElementById('payFrequency')?.value || 'biweekly';
    const checksPerMonth = payFreq === 'weekly' ? 52/12 : payFreq === 'biweekly' ? 26/12 : 1;
    const freqLabel = payFreq === 'weekly' ? '/week' : payFreq === 'biweekly' ? '/paycheck' : '/month';
    const freqLabelShort = payFreq === 'weekly' ? 'Wk' : payFreq === 'biweekly' ? 'Check' : 'Mo';

    // Per-paycheck current savings
    const perPaycheckCurrent = currentMonthlySavings / checksPerMonth;
    setText('perPaycheckSavings', fmt(Math.round(perPaycheckCurrent)) + freqLabel);

    // --- Coaching Bar ---
    const coachingText = document.getElementById('coachingText');
    if (practiceGap > 0) {
      const gapPerCheck = Math.round(practiceGap / checksPerMonth);
      coachingText.textContent =
        `Your future housing payment is ${fmt(futurePI)} and your current rent is ${fmt(currentRent)}. ` +
        `That means your practice-payment gap is ${fmt(practiceGap)}/month (${fmt(gapPerCheck)}${freqLabel}). ` +
        `If you can redirect that extra ${fmt(gapPerCheck)} from every paycheck into savings, you'll be training for your new payment — and turbocharging your down payment fund.`;
    } else if (practiceGap < 0) {
      coachingText.textContent =
        `Your expected payment of ${fmt(futurePI)} is actually less than your current rent of ${fmt(currentRent)}. ` +
        `That's a win — homeownership may cost you less per month! Focus on saving your down payment.`;
    } else {
      coachingText.textContent =
        `Your expected payment matches your current rent exactly at ${fmt(futurePI)}/month. ` +
        `Your monthly budget won't change — now focus on saving your down payment.`;
    }

    // --- Savings Coaching Blurb (under Current Monthly Savings) ---
    const savingsBlurb = document.getElementById('savingsCoachingBlurb');

    // --- Build Ramp Schedule ---
    const schedule = buildSchedule(months, currentSavings, adjustedCashNeeded, rampStyle, expectedReturn, currentMonthlySavings, practiceGap);
    const projectedBalance = schedule.length ? schedule[schedule.length - 1].balance : currentSavings;
    const gap = Math.max(0, adjustedCashNeeded - currentSavings);

    // Average monthly savings from the actual schedule
    const totalScheduledSavings = schedule.reduce((sum, s) => sum + s.savings, 0);
    const avgMonthlyNeeded = schedule.length > 0 ? Math.round(totalScheduledSavings / schedule.length) : 0;

    // Update the savings coaching blurb
    if (savingsBlurb) {
      if (currentMonthlySavings > 0 && avgMonthlyNeeded > 0) {
        const additional = Math.max(0, avgMonthlyNeeded - currentMonthlySavings);
        if (additional > 0) {
          savingsBlurb.innerHTML = `<strong>You're already saving ${fmt(currentMonthlySavings)}/month.</strong> To hit your goal, you need about ${fmt(Math.round(avgMonthlyNeeded))}/month total — that's only <strong>${fmt(additional)}/month more</strong>. The schedule below shows the additional amount on top of what you're already doing.`;
        } else {
          savingsBlurb.innerHTML = `<strong>Great news!</strong> You're already saving ${fmt(currentMonthlySavings)}/month, which is more than the ${fmt(Math.round(avgMonthlyNeeded))}/month you need. Stay the course and you'll get there ahead of schedule.`;
        }
      } else if (currentMonthlySavings > 0) {
        savingsBlurb.innerHTML = `You're saving ${fmt(currentMonthlySavings)}/month. The schedule below builds on this.`;
      } else {
        savingsBlurb.innerHTML = 'Not saving yet? No worries — the schedule below shows exactly how to start.';
      }
    }

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
    renderScheduleTable(phases, adjustedCashNeeded, currentMonthlySavings, checksPerMonth, freqLabelShort);

    // --- Scenario Comparison ---
    renderScenarioTable(months, currentSavings, adjustedCashNeeded, rampStyle, vehicle, expectedReturn, schedule);

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
  function renderScheduleTable(phases, targetCash, currentMonthlySavings, checksPerMonth, freqLabel) {
    const head = document.getElementById('scheduleHead');
    const body = document.getElementById('scheduleBody');
    const cms = currentMonthlySavings || 0;
    const cpm = checksPerMonth || (26/12);
    const fl = freqLabel || 'Check';

    head.innerHTML = `<tr>
      <th>Phase</th>
      <th>Months</th>
      <th>Total / Month</th>
      <th>Per ${fl}</th>
      ${cms > 0 ? `<th>Additional / ${fl}</th>` : ''}
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
      const additional = Math.max(0, p.savings - cms);
      const perCheck = Math.round(p.savings / cpm);
      const additionalPerCheck = Math.round(additional / cpm);

      const row = document.createElement('tr');
      if (isLast) row.style.fontWeight = '600';
      row.innerHTML = `
        <td>Phase ${p.phase}</td>
        <td>${p.monthStart}–${p.monthEnd}</td>
        <td>${fmt(p.savings)}</td>
        <td style="color:var(--color-accent); font-weight:600;">${fmt(perCheck)}</td>
        ${cms > 0 ? `<td style="color:var(--color-accent); font-weight:600;">${fmt(additionalPerCheck)}</td>` : ''}
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
  function renderScenarioTable(months, startBalance, targetCash, rampStyle, selectedVehicle, selectedReturn, currentSchedule) {
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
      // Use the SAME savings amounts from the current schedule, just different return rate
      const monthlyRate = s.rate / 100 / 12;
      let projected = startBalance;
      if (currentSchedule && currentSchedule.length) {
        for (let m = 0; m < currentSchedule.length; m++) {
          projected = projected * (1 + monthlyRate) + currentSchedule[m].savings;
        }
      }
      projected = Math.round(projected);
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

    const pdfPracticeGap = futurePI - currentRent;
    const schedule = buildSchedule(months, currentSavings, adjustedCashNeeded, rampStyle, expectedReturn, currentMonthlySavings, pdfPracticeGap);
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

    // --- HEADER BAND: Logo left half, Title right half ---
    const headerH = 80;
    rect(0, 0, 0, W, headerH, DARK);
    const halfW = W / 2;

    // Left half: logo centered vertically and horizontally
    try {
      const logoW = 130, logoH = 30;
      const logoX = (halfW - logoW) / 2;
      const logoY = (headerH - logoH) / 2;
      doc.addImage('./assets/fortified-logo-white.png', 'PNG', logoX, logoY, logoW, logoH);
    } catch(e) {
      setFont(14, 'bold', WHITE);
      doc.text('FORTIFIED REALTY GROUP', halfW / 2, headerH / 2, { align: 'center' });
    }

    // Right half: title, subtitle, target — centered in right half
    const rightCenter = halfW + halfW / 2;
    setFont(18, 'bold', WHITE);
    doc.text('My Path to', rightCenter, 22, { align: 'center' });
    doc.text('Homeownership', rightCenter, 40, { align: 'center' });
    setFont(9, 'normal', TEAL);
    doc.text('A personal savings plan by Fortified Realty Group', rightCenter, 54, { align: 'center' });
    setFont(8, 'normal', [176, 212, 230]);
    doc.text(`Target: ${fmt(adjustedHomePrice)} home by ${targetDateStr}`, rightCenter, 66, { align: 'center' });
    y = headerH + 10;

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
      ['Target Home Price (Today)', fmt(homePrice)],
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
    const rentHalfW = (boxW - 10) / 2;

    // Current Rent box
    rect(0, boxX, rentFutureY, rentHalfW, 30, [245, 247, 250], 3);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, rentFutureY, rentHalfW, 30, 3, 3, 'S');
    setFont(8, 'normal', GRAY);
    doc.text('CURRENT RENT', boxX + rentHalfW / 2, rentFutureY + 10, { align: 'center' });
    setFont(16, 'bold', DARK);
    doc.text(fmt(currentRent) + '/mo', boxX + rentHalfW / 2, rentFutureY + 24, { align: 'center' });

    // Future Payment box
    rect(0, boxX + rentHalfW + 10, rentFutureY, rentHalfW, 30, [245, 247, 250], 3);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX + rentHalfW + 10, rentFutureY, rentHalfW, 30, 3, 3, 'S');
    setFont(8, 'normal', GRAY);
    doc.text('FUTURE MORTGAGE PAYMENT', boxX + rentHalfW + 10 + rentHalfW / 2, rentFutureY + 10, { align: 'center' });
    setFont(16, 'bold', DARK);
    doc.text(fmt(Math.round(futurePI)) + '/mo', boxX + rentHalfW + 10 + rentHalfW / 2, rentFutureY + 24, { align: 'center' });

    y = rentFutureY + 38;

    // --- PROJECTED OUTCOME LINE ---
    const badgeColor = onTrack ? GREEN : [200, 80, 30];
    setFont(10, 'bold', badgeColor);
    const outcomeText = onTrack
      ? `Projected to reach ${fmt(projectedBalance)} by ${targetDateStr} — ${fmt(projectedBalance - adjustedCashNeeded)} ahead of goal`
      : `Projected ${fmt(projectedBalance)} by ${targetDateStr} — ${fmt(adjustedCashNeeded - projectedBalance)} short`;
    doc.text(outcomeText, W / 2, y + 4, { align: 'center' });
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
        const addl = Math.max(0, phase.savings - currentMonthlySavings);
        const pdfPayFreq = document.getElementById('payFrequency')?.value || 'biweekly';
        const pdfChecksPerMonth = pdfPayFreq === 'weekly' ? 52/12 : pdfPayFreq === 'biweekly' ? 26/12 : 1;
        const pdfFreqLabel = pdfPayFreq === 'weekly' ? 'week' : pdfPayFreq === 'biweekly' ? 'paycheck' : 'month';
        const pdfPerCheck = fmt(Math.round(phase.savings / pdfChecksPerMonth));
        const depositText = `${monthStr}  —  ${fmt(phase.savings)}/mo (${pdfPerCheck}/${pdfFreqLabel}) into your ${vehicleLabel}`;
        doc.text(depositText, boxX + 14, actionY + 1);
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
          `Milestone: By ${monthLabel(phase.phaseEnd - 1)}, you should have about ${fmt(balanceAtPhase)} saved.`,
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
      doc.text('RISK WARNING', boxX + 8, actionY + 12);
      setFont(7.5, 'normal', [120, 53, 15]);
      const riskText = vehicle === 'bitcoin'
        ? 'Bitcoin is highly volatile. Values can drop 50%+ in short periods. Only use this for long-term goals, not near-term home purchases.'
        : vehicle === 'tesla'
        ? 'Tesla (TSLA) is a single stock and highly volatile. Values can drop dramatically. Only consider this for long timelines with high risk tolerance.'
        : `${vehicleLabel} investments fluctuate with market conditions. Past returns don't guarantee future results. Consider a stable vehicle like a Savings Account for short timelines.`;
      doc.text(riskText, boxX + 8, actionY + 24, { maxWidth: boxW - 16 });
      actionY += 46;
    }

    // --- DEAL SUMMARY on last page ---
    const dealSummaryContent = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryContent && dealSummaryContent !== 'Enter your numbers above to see a plain English analysis.') {
      if (actionY + 60 > pageBottom) { doc.addPage(); actionY = margin + 10; }
      actionY += 10;
      rect(0, boxX, actionY, boxW, 3, TEAL, 0);
      actionY += 16;
      setFont(9, 'bold', DARK);
      doc.text('DEAL SUMMARY', boxX, actionY);
      actionY += 14;
      setFont(8, 'normal', GRAY);
      const splitSummary = doc.splitTextToSize(dealSummaryContent, boxW - 8);
      doc.text(splitSummary, boxX + 4, actionY);
      actionY += splitSummary.length * 10 + 8;
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
    document.getElementById('homePrice').value            = '$500,000';
    document.getElementById('downPct').value              = '3.5';
    document.getElementById('closingPct').value           = '3';
    document.getElementById('reserveCushion').value       = '$10,000';
    document.getElementById('mortgageRate').value         = '6.5';
    document.getElementById('monthsUntilPurchase').value  = '24';
    document.getElementById('homeAppreciation').value     = '10';
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

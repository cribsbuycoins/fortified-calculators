// ===== TRUE REFI BREAK-EVEN CALCULATOR — FORTIFIED REALTY GROUP =====

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

  function fmtMonths(m) {
    if (!isFinite(m) || m <= 0) return 'Never';
    const yrs = Math.floor(m / 12);
    const mos = Math.round(m % 12);
    if (yrs === 0) return mos + ' mo';
    if (mos === 0) return yrs + ' yr';
    return yrs + ' yr ' + mos + ' mo';
  }

  function fmtMonthsLong(m) {
    if (!isFinite(m) || m <= 0) return 'Never';
    const yrs = Math.floor(m / 12);
    const mos = Math.round(m % 12);
    const parts = [];
    if (yrs > 0) parts.push(yrs + (yrs === 1 ? ' year' : ' years'));
    if (mos > 0) parts.push(mos + (mos === 1 ? ' month' : ' months'));
    return parts.join(', ') || '< 1 month';
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

  // ===== NEW LOAN AMOUNT AUTO-FILL TRACKING =====
  // Track whether user has manually changed newLoanAmount
  let newLoanAmountUserEdited = false;

  const newLoanAmountEl = document.getElementById('newLoanAmount');
  if (newLoanAmountEl) {
    newLoanAmountEl.addEventListener('input', () => {
      newLoanAmountUserEdited = true;
    });
  }

  // On currentBalance blur: auto-fill newLoanAmount if user hasn't manually changed it
  const currentBalanceEl = document.getElementById('currentBalance');
  if (currentBalanceEl) {
    currentBalanceEl.addEventListener('blur', () => {
      if (!newLoanAmountUserEdited && newLoanAmountEl) {
        const bal = parseNum(currentBalanceEl.value);
        newLoanAmountEl.value = fmt(bal);
        calculate();
      }
    });
  }

  // ===== AMORTIZATION HELPERS =====

  /**
   * Calculate monthly P+I payment using standard amortization formula.
   */
  function calcMonthlyPI(principal, annualRate, termMonths) {
    if (principal <= 0 || termMonths <= 0) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return principal / termMonths;
    return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  }

  /**
   * Build a full amortization schedule and return monthly snapshots.
   */
  function buildAmortization(principal, annualRate, termMonths) {
    const r = annualRate / 100 / 12;
    const payment = calcMonthlyPI(principal, annualRate, termMonths);
    let balance = principal;
    let cumInterest = 0;
    let cumPayment = 0;
    const schedule = [];

    for (let m = 1; m <= termMonths; m++) {
      const interestPortion = balance * r;
      const principalPortion = payment - interestPortion;
      balance = Math.max(0, balance - principalPortion);
      cumInterest += interestPortion;
      cumPayment += payment;

      schedule.push({
        month: m,
        payment: payment,
        interest: interestPortion,
        principal: principalPortion,
        balance: balance,
        cumInterest: cumInterest,
        cumPayment: cumPayment
      });
    }
    return schedule;
  }

  // Returns the snapshot at month m (capped if loan is paid off)
  function getSnapshot(schedule, term, m) {
    if (m <= 0) {
      return {
        cumPayment: 0,
        balance: schedule[0] ? schedule[0].balance + schedule[0].principal : 0,
        cumInterest: 0,
        interest: schedule[0] ? schedule[0].interest : 0,
        principal: schedule[0] ? schedule[0].principal : 0
      };
    }
    if (m >= term) {
      const last = schedule[schedule.length - 1];
      return {
        cumPayment: last.cumPayment,
        balance: 0,
        cumInterest: last.cumInterest,
        interest: 0,
        principal: 0
      };
    }
    return schedule[m - 1];
  }

  // ===== UTILITY DOM HELPERS =====
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function setValueWithClass(id, val, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.className = 'result-value' + (cls ? ' ' + cls : '');
  }

  function resetResults() {
    ['resultMonthlySavings', 'resultStandardBE', 'resultTrueBreakEven', 'resultNetSavings'].forEach(id => {
      setValueWithClass(id, '—', '');
    });
    const vs = document.getElementById('verdictSection');
    if (vs) vs.className = 'deal-summary';
    setText('verdictTitle', 'THE VERDICT');
    setText('verdictText', 'Enter your loan details above.');
    setText('explanationText', 'The numbers will appear here once you enter your loan details.');
    const thead = document.getElementById('milestoneHead');
    const tbody = document.getElementById('milestoneBody');
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '';
    setText('dealSummaryText', 'Enter your numbers above to see a plain English analysis.');
    lastCalc = null;
  }

  // ===== MAIN CALCULATION =====
  let lastCalc = null; // cache for PDF use

  function calculate() {
    // --- Read inputs ---
    const homeValue      = parseNum(document.getElementById('homeValue')?.value);
    const currentBalance = parseNum(document.getElementById('currentBalance')?.value);
    const currentRate    = parseNum(document.getElementById('currentRate')?.value);
    const remainingTerm  = Math.round(parseNum(document.getElementById('remainingTerm')?.value));
    const currentPMI     = parseNum(document.getElementById('currentPMI')?.value);

    const newRate        = parseNum(document.getElementById('newRate')?.value);
    const newTerm        = Math.round(parseNum(document.getElementById('newTerm')?.value));
    const newPMI         = parseNum(document.getElementById('newPMI')?.value);
    const newLoanAmount  = parseNum(document.getElementById('newLoanAmount')?.value);

    const closingCosts   = parseNum(document.getElementById('closingCosts')?.value);
    const financeClosing = document.getElementById('financeClosing')?.checked;
    const holdingYears   = parseNum(document.getElementById('holdingYears')?.value);
    const holdingMonths  = Math.round(holdingYears * 12);

    // --- Computed values ---
    const currentEquity = homeValue > 0 && currentBalance > 0 ? homeValue - currentBalance : 0;
    const cashOutAtClosing = Math.max(0, newLoanAmount - currentBalance);
    const newEquity = homeValue > 0 && newLoanAmount > 0 ? homeValue - newLoanAmount : 0;

    // Update computed display fields
    if (homeValue > 0 && currentBalance >= 0) {
      setText('currentEquity', fmt(currentEquity));
    }
    if (homeValue > 0 && newLoanAmount >= 0) {
      setText('cashOutAtClosing', fmt(cashOutAtClosing));
      setText('newEquity', fmt(newEquity));
    }

    // --- Guard ---
    const valid = currentBalance > 0 && currentRate > 0 && remainingTerm > 0
                  && newRate > 0 && newTerm > 0 && newLoanAmount > 0;

    // --- Current loan P+I ---
    const currentPI = calcMonthlyPI(currentBalance, currentRate, remainingTerm);
    const currentTotalPayment = currentPI + currentPMI;

    // --- New loan principal (what actually gets borrowed) ---
    // If financing closing costs, they're added on top of newLoanAmount
    const actualRefiLoan = financeClosing ? newLoanAmount + closingCosts : newLoanAmount;
    const upfrontClosingCost = financeClosing ? 0 : closingCosts;

    // --- New loan P+I ---
    const newPI = calcMonthlyPI(actualRefiLoan, newRate, newTerm);
    const newTotalPayment = newPI + newPMI;

    // --- Monthly savings (based on total payments) ---
    const monthlySavings = currentTotalPayment - newTotalPayment;

    // --- Standard break-even ---
    const standardBEMonths = monthlySavings > 0 ? closingCosts / monthlySavings : Infinity;

    // --- Update computed displays ---
    setText('currentPIComputed', valid ? fmt(currentPI) : '—');
    setText('currentTotalPayment', valid ? fmt(currentTotalPayment) : '—');
    setText('newPIComputed', valid ? fmt(newPI) : '—');
    setText('newTotalPayment', valid ? fmt(newTotalPayment) : '—');
    setText('monthlySavings', valid ? fmt(monthlySavings) : '—');
    setText('standardBreakEven', valid ? fmtMonths(standardBEMonths) : '—');

    if (!valid) {
      resetResults();
      return;
    }

    // --- Build amortization paths ---
    const pathA = buildAmortization(currentBalance, currentRate, remainingTerm);
    const pathB = buildAmortization(actualRefiLoan, newRate, newTerm);

    // --- True Break-Even ---
    // Path A total economic cost = cumPayment_A + remaining_balance_A + cumPMI_A
    // Path B total economic cost = cumPayment_B + remaining_balance_B + upfront_closing_cost + cumPMI_B
    // Note: cashOut is value received, so it offsets Path B cost
    let trueBreakEvenMonth = Infinity;
    const maxMonths = Math.max(remainingTerm, newTerm);

    for (let m = 1; m <= maxMonths; m++) {
      const snA = getSnapshot(pathA, remainingTerm, m);
      const snB = getSnapshot(pathB, newTerm, m);

      const cumPMI_A = currentPMI * m;
      const cumPMI_B = newPMI * m;

      const econA = snA.cumPayment + snA.balance + cumPMI_A;
      // cashOut reduces the net cost of the refi (it's money in your pocket)
      const econB = snB.cumPayment + snB.balance + upfrontClosingCost + cumPMI_B - cashOutAtClosing;

      if (econB <= econA) {
        trueBreakEvenMonth = m;
        break;
      }
    }

    // Net savings at holding period
    const snA_hold = getSnapshot(pathA, remainingTerm, holdingMonths);
    const snB_hold = getSnapshot(pathB, newTerm, holdingMonths);
    const cumPMI_A_hold = currentPMI * holdingMonths;
    const cumPMI_B_hold = newPMI * holdingMonths;
    const econA_hold = snA_hold.cumPayment + snA_hold.balance + cumPMI_A_hold;
    const econB_hold = snB_hold.cumPayment + snB_hold.balance + upfrontClosingCost + cumPMI_B_hold - cashOutAtClosing;
    const netSavings = econA_hold - econB_hold;

    // --- Update result cards ---
    const savingsClass = monthlySavings >= 0 ? 'positive' : 'negative';
    setValueWithClass('resultMonthlySavings', fmt(monthlySavings), savingsClass);
    setValueWithClass('resultStandardBE', fmtMonths(standardBEMonths), '');
    setValueWithClass('resultTrueBreakEven', fmtMonths(trueBreakEvenMonth), '');
    const netClass = netSavings > 0 ? 'positive' : netSavings < 0 ? 'negative' : '';
    setValueWithClass('resultNetSavings', fmt(netSavings), netClass);

    // --- Verdict ---
    buildVerdict(monthlySavings, standardBEMonths, trueBreakEvenMonth, holdingMonths, netSavings, cashOutAtClosing, newTerm);

    // --- Explanation text ---
    buildExplanation(
      currentBalance, currentRate, remainingTerm, currentPI, currentPMI,
      actualRefiLoan, newRate, newTerm, newPI, newPMI,
      closingCosts, financeClosing, upfrontClosingCost, cashOutAtClosing,
      monthlySavings, standardBEMonths, trueBreakEvenMonth,
      pathA, pathB
    );

    // --- Milestone table ---
    buildMilestoneTable(pathA, pathB, remainingTerm, newTerm, currentPMI, newPMI, upfrontClosingCost, cashOutAtClosing);

    // --- Deal summary (for PDF) ---
    buildDealSummary(monthlySavings, trueBreakEvenMonth, holdingMonths, netSavings, cashOutAtClosing);

    // Cache for PDF
    lastCalc = {
      homeValue, currentBalance, currentEquity,
      currentRate, remainingTerm, currentPI, currentPMI, currentTotalPayment,
      newLoanAmount, actualRefiLoan, cashOutAtClosing, newEquity,
      newRate, newTerm, newPI, newPMI, newTotalPayment,
      closingCosts, financeClosing, upfrontClosingCost,
      holdingYears, holdingMonths,
      monthlySavings, standardBEMonths, trueBreakEvenMonth, netSavings,
      pathA, pathB
    };
  }

  // ===== VERDICT =====
  function buildVerdict(monthlySavings, standardBE, trueBE, holdingMonths, netSavings, cashOut, newTerm) {
    const vs = document.getElementById('verdictSection');
    const vt = document.getElementById('verdictTitle');
    const vp = document.getElementById('verdictText');
    if (!vs || !vt || !vp) return;

    let cls = 'deal-summary';
    let title = 'THE VERDICT';
    let text = '';

    const cashOutNote = cashOut > 0 ? ` Plus you're walking away with ${fmt(cashOut)} in cash at closing.` : '';

    if (monthlySavings < 0) {
      cls += ' negative';
      title = 'PAYMENT GOES UP';
      text = `Your new payment would be ${fmt(Math.abs(monthlySavings))}/month MORE than your current payment. While your payment is higher, this scenario doesn't save money monthly. The standard break-even doesn't apply here. Consider why you're refinancing — if it's to pay off faster or access equity, the tradeoff may still make sense.${cashOutNote}`;
    } else if (!isFinite(trueBE)) {
      cls += ' negative';
      title = 'BREAK-EVEN NOT REACHED';
      text = `Even over the full life of both loans, the refinance doesn't fully pay for itself on a true economic basis. The standard break-even of ${fmtMonthsLong(standardBE)} only counts payment savings — but resetting to a longer amortization means more total interest. You may still want to refinance for cash flow reasons, but the math doesn't favor it long-term.${cashOutNote}`;
    } else if (trueBE <= 12) {
      cls += ' positive';
      title = 'QUICK WIN';
      text = `You'll reach the true break-even in just ${fmtMonthsLong(trueBE)} — under a year. This is an excellent refinance. Your standard break-even is ${fmtMonthsLong(standardBE)}, but even accounting for the amortization reset, you'll be ahead quickly.${cashOutNote} Net savings at hold period: ${fmt(netSavings)}.`;
    } else if (holdingMonths > trueBE) {
      cls += ' positive';
      title = 'THIS REFI MAKES SENSE';
      text = `This refi makes sense — you'll break even in ${fmtMonthsLong(trueBE)}, which is well within your ${Math.round(holdingMonths / 12)}-year holding period.${cashOutNote} Net savings at hold period: ${fmt(netSavings)}.`;
    } else {
      cls += ' negative';
      const yearsNeeded = Math.ceil(trueBE / 12 * 10) / 10;
      const yearsPlanning = Math.round(holdingMonths / 12 * 10) / 10;
      title = "THIS REFI PROBABLY ISN'T WORTH IT";
      text = `Your true break-even is ${fmtMonthsLong(trueBE)} — but you plan to stay only ${Math.round(holdingMonths / 12)} years. You'd need to stay ${yearsNeeded} years to truly break even, but you plan to stay ${yearsPlanning} years. If you sold at your expected hold date, you'd be ${fmt(Math.abs(netSavings))} worse off after the refi than if you'd kept your current loan. The standard break-even of ${fmtMonthsLong(standardBE)} looks more appealing but misses the amortization reset cost.${cashOutNote}`;
    }

    vs.className = cls;
    vt.textContent = title;
    vp.textContent = text;
  }

  // ===== EXPLANATION TEXT =====
  function buildExplanation(
    curBal, curRate, curTerm, curPI, curPMI,
    newBal, newRate, newTerm, newPI, newPMI,
    closingCosts, financeClosing, upfrontCost, cashOut,
    monthlySavings, standardBE, trueBE,
    pathA, pathB
  ) {
    const el = document.getElementById('explanationText');
    if (!el) return;

    if (pathA.length === 0 || pathB.length === 0) { el.textContent = '—'; return; }

    // Month 1 breakdown for both loans
    const m1A = pathA[0];
    const m1B = pathB[0];

    // Interest difference (new vs current)
    const interestDiff = m1B.interest - m1A.interest;
    const principalDiff = m1A.principal - m1B.principal; // how much less equity you're building

    const paymentChange = fmt(Math.abs(monthlySavings));
    const paymentDir = monthlySavings >= 0 ? 'drops by' : 'increases by';

    const newTermYears = Math.round(newTerm / 12);
    const cashOutPart = cashOut > 0 ? ` and the ${fmt(cashOut)} cash you pulled out` : '';

    const trueVsStd = isFinite(trueBE)
      ? `${fmtMonthsLong(trueBE)} — ${isFinite(standardBE) && trueBE > standardBE ? fmtMonthsLong(trueBE - standardBE) + ' later than the standard calculation suggests' : 'about the same as the standard calculation'}`
      : 'not reached within either loan\'s lifetime';

    el.textContent =
      `Your payment ${paymentDir} ${paymentChange}/month. ` +
      `But here's what most people miss: on your current loan, ${fmt(m1A.interest)} of your payment goes to interest and ${fmt(m1A.principal)} goes to building equity. ` +
      `On the new loan, ${fmt(m1B.interest)} goes to interest and ${fmt(m1B.principal)} goes to equity. ` +
      `That's ${fmt(Math.abs(interestDiff))} ${interestDiff > 0 ? 'MORE' : 'LESS'} going to interest each month and ${fmt(Math.abs(principalDiff))} ${principalDiff > 0 ? 'LESS' : 'MORE'} going to equity — ` +
      `because you reset the amortization clock back to month 1 of a ${newTermYears}-year loan. ` +
      `After factoring in ${fmt(closingCosts)} in closing costs${cashOutPart}, the true break-even is ${trueVsStd}.`;
  }

  // ===== MILESTONE TABLE =====
  function buildMilestoneTable(pathA, pathB, termA, termB, pmiA, pmiB, upfrontCost, cashOut) {
    const thead = document.getElementById('milestoneHead');
    const tbody = document.getElementById('milestoneBody');
    if (!thead || !tbody) return;

    const milestones = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30].filter(yr => {
      const m = yr * 12;
      return m <= Math.max(termA, termB) + 12;
    });

    thead.innerHTML = `<tr>
      <th>Year</th>
      <th>Current Balance</th>
      <th>Refi Balance</th>
      <th>Mo. Interest (Current)</th>
      <th>Mo. Interest (Refi)</th>
      <th>Mo. Principal (Current)</th>
      <th>Mo. Principal (Refi)</th>
      <th>Net Position</th>
    </tr>`;

    let rows = '';
    milestones.forEach(yr => {
      const m = yr * 12;
      const snA = getSnapshot(pathA, termA, m);
      const snB = getSnapshot(pathB, termB, m);
      const cumPMI_A = pmiA * m;
      const cumPMI_B = pmiB * m;

      const econA = snA.cumPayment + snA.balance + cumPMI_A;
      const econB = snB.cumPayment + snB.balance + upfrontCost + cumPMI_B - cashOut;
      const netPos = econA - econB; // positive = refi is ahead
      const netFmt = fmt(Math.abs(netPos));
      const netLabel = netPos > 0 ? `Refi ahead by ${netFmt}` : netPos < 0 ? `Current ahead by ${netFmt}` : 'Even';
      const netClass = netPos > 0 ? 'cond-green' : netPos < 0 ? 'cond-red' : '';

      // Monthly interest and principal AT that year point (not cumulative)
      const moIntA = snA.interest != null ? fmt(snA.interest) : '$0';
      const moIntB = snB.interest != null ? fmt(snB.interest) : '$0';
      const moPrinA = snA.principal != null ? fmt(snA.principal) : '$0';
      const moPrinB = snB.principal != null ? fmt(snB.principal) : '$0';

      rows += `<tr>
        <td><strong>Yr ${yr}</strong></td>
        <td>${fmt(snA.balance)}</td>
        <td>${fmt(snB.balance)}</td>
        <td>${moIntA}</td>
        <td>${moIntB}</td>
        <td>${moPrinA}</td>
        <td>${moPrinB}</td>
        <td class="${netClass}">${netLabel}</td>
      </tr>`;
    });

    tbody.innerHTML = rows;
  }

  // ===== DEAL SUMMARY =====
  function buildDealSummary(monthlySavings, trueBE, holdingMonths, netSavings, cashOut) {
    const el = document.getElementById('dealSummaryText');
    const sec = document.getElementById('dealSummary');
    if (!el || !sec) return;

    const holdYrs = Math.round(holdingMonths / 12);
    const cashOutNote = cashOut > 0 ? ` ${fmt(cashOut)} in cash at closing.` : '';
    let text = '';

    if (monthlySavings < 0) {
      text = `This refinance increases your monthly payment by ${fmt(Math.abs(monthlySavings))}. The standard break-even does not apply.${cashOutNote ? ' However, you receive' + cashOutNote : ''} Over your ${holdYrs}-year hold period, you would be ${fmt(Math.abs(netSavings))} ${netSavings < 0 ? 'worse off' : 'ahead'} compared to keeping your current loan.`;
    } else if (!isFinite(trueBE)) {
      text = `Monthly payment savings of ${fmt(monthlySavings)}/month.${cashOutNote ? ' Cash out at closing:' + cashOutNote : ''} However, the true economic break-even is not reached within the loan lifetimes, due to the amortization reset. Over your ${holdYrs}-year hold, you'd be ${netSavings > 0 ? 'ahead' : 'behind'} by ${fmt(Math.abs(netSavings))}.`;
    } else {
      const ahead = holdingMonths > trueBE;
      text = `Monthly payment savings of ${fmt(monthlySavings)}/month.${cashOutNote ? ' Cash out at closing:' + cashOutNote : ''} True break-even: ${fmtMonthsLong(trueBE)}. You plan to stay ${holdYrs} years — you ${ahead ? 'will' : 'will not'} pass the true break-even before your expected move date. Net position at hold period: ${netSavings > 0 ? 'ahead' : 'behind'} by ${fmt(Math.abs(netSavings))}.`;
    }

    el.textContent = text;
    sec.className = 'deal-summary' + (netSavings > 0 ? ' positive' : netSavings < 0 ? ' negative' : '');
  }

  // ===== EVENT LISTENERS =====
  document.addEventListener('input', (e) => {
    if (e.target.matches('input') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]') && e.target.closest('.calc-page')) {
      calculate();
    }
  });

  // ===== RESET =====
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const defaults = {
        homeValue: '$500,000',
        currentBalance: '$350,000',
        currentRate: '6.5',
        remainingTerm: '300',
        currentPMI: '$0',
        newRate: '5.5',
        newTerm: '360',
        newPMI: '$0',
        newLoanAmount: '$350,000',
        closingCosts: '$8,000',
        holdingYears: '7',
        address: ''
      };
      Object.entries(defaults).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      });
      const fc = document.getElementById('financeClosing');
      if (fc) fc.checked = false;
      // Reset auto-fill flag
      newLoanAmountUserEdited = false;
      calculate();
    });
  }

  // ===== SAVE AS PDF =====
  const pdfBtn = document.getElementById('savePdfBtn');
  if (pdfBtn) pdfBtn.addEventListener('click', generatePDF);

  function generatePDF() {
    if (!window.jspdf) {
      alert('PDF library is still loading. Please try again in a moment.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const W = 279.4;
    const H = 215.9;
    const margin = 12;
    const cw = W - margin * 2;
    let y = margin;

    // Colors
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
    doc.text('True Cost of Your Refi', W - margin, y + 5, { align: 'right' });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, W - margin, y + 10, { align: 'right' });

    y += 16;

    // Address line
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

    // === THREE-COLUMN INPUT SUMMARY ===
    const thirdW = (cw - 8) / 3;
    const colX = [margin, margin + thirdW + 4, margin + (thirdW + 4) * 2];

    function drawDataBlock(x, title, items, startY) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text(title.toUpperCase(), x, startY);
      let iy = startY + 4;
      items.forEach(item => {
        if (item.divider) { iy += 1.5; return; }
        doc.setFont('helvetica', item.bold ? 'bold' : 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...(item.bold ? teal : mutedText));
        doc.text(item.label, x, iy);
        doc.setTextColor(...darkText);
        doc.text(String(item.value || '—'), x + thirdW - 2, iy, { align: 'right' });
        iy += 3.5;
      });
      return iy;
    }

    const c = lastCalc;
    if (!c) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...mutedText);
      doc.text('No data — please run the calculator first.', margin, y + 10);
    } else {
      const colAItems = [
        { label: 'Home Value',        value: fmt(c.homeValue) },
        { label: 'Current Balance',   value: fmt(c.currentBalance) },
        { label: 'Current Equity',    value: fmt(c.currentEquity) },
        { label: 'Current Rate',      value: c.currentRate + '%' },
        { label: 'Remaining Term',    value: c.remainingTerm + ' months' },
        { label: 'Current PMI',       value: fmt(c.currentPMI) },
        { divider: true },
        { label: 'CURRENT MONTHLY P+I',    value: fmt(c.currentPI),           bold: true },
        { label: 'CURRENT TOTAL PAYMENT',  value: fmt(c.currentTotalPayment), bold: true }
      ];
      const colBItems = [
        { label: 'New Loan Amount',   value: fmt(c.newLoanAmount) },
        { label: 'Cash Out at Closing', value: fmt(c.cashOutAtClosing) },
        { label: 'New Equity',        value: fmt(c.newEquity) },
        { label: 'New Rate',          value: c.newRate + '%' },
        { label: 'New Term',          value: c.newTerm + ' months' },
        { label: 'New PMI',           value: fmt(c.newPMI) },
        { divider: true },
        { label: 'NEW MONTHLY P+I',   value: fmt(c.newPI),           bold: true },
        { label: 'NEW TOTAL PAYMENT', value: fmt(c.newTotalPayment), bold: true }
      ];
      const colCItems = [
        { label: 'Closing Costs',           value: fmt(c.closingCosts) },
        { label: 'Finance Closing Costs?',  value: c.financeClosing ? 'Yes (rolled in)' : 'No (paid upfront)' },
        { label: 'Holding Period',          value: c.holdingYears + ' years' },
        { divider: true },
        { label: 'MONTHLY SAVINGS',     value: fmt(c.monthlySavings),            bold: true },
        { label: 'STANDARD BREAK-EVEN', value: fmtMonths(c.standardBEMonths),   bold: true },
        { label: 'TRUE BREAK-EVEN',     value: fmtMonths(c.trueBreakEvenMonth), bold: true }
      ];

      const endA = drawDataBlock(colX[0], 'Current Loan',          colAItems, y);
      const endB = drawDataBlock(colX[1], 'New Loan',              colBItems, y);
      const endC = drawDataBlock(colX[2], 'Transaction & Holding', colCItems, y);
      y = Math.max(endA, endB, endC) + 3;
    }

    // === VERDICT BOX ===
    if (c) {
      const verdictText  = document.getElementById('verdictText')?.textContent  || '';
      const verdictTitle = document.getElementById('verdictTitle')?.textContent || 'THE VERDICT';
      const verdictCls   = document.getElementById('verdictSection')?.className || '';

      let vBg = lightBg, vBorder = tealLight, vTextColor = darkText;
      if (verdictCls.includes('positive'))  { vBg = greenBg;  vBorder = green;  vTextColor = green; }
      else if (verdictCls.includes('negative')) { vBg = redBg; vBorder = red; vTextColor = red; }
      else if (verdictCls.includes('caution'))  { vBg = yellowBg; vBorder = yellow; vTextColor = yellow; }

      const boxH = 20;
      doc.setFillColor(...vBg);
      doc.roundedRect(margin, y, cw, boxH, 2, 2, 'F');
      doc.setDrawColor(...vBorder);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, cw, boxH, 2, 2, 'S');
      doc.setDrawColor(...vBorder);
      doc.setLineWidth(1.5);
      doc.line(margin, y, margin, y + boxH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...vTextColor);
      doc.text(verdictTitle, margin + 4, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...darkText);
      const splitVerdict = doc.splitTextToSize(verdictText, cw - 8);
      doc.text(splitVerdict.slice(0, 4), margin + 4, y + 10);

      y += boxH + 5;
    }

    // === RESULTS BAR ===
    if (c) {
      doc.setFillColor(...lightBg);
      doc.roundedRect(margin, y, cw, 16, 2, 2, 'F');
      doc.setDrawColor(...tealLight);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, cw, 16, 2, 2, 'S');

      const results = [
        { label: 'Monthly Savings',      value: document.getElementById('resultMonthlySavings')?.textContent || '—' },
        { label: 'Standard Break-Even',  value: document.getElementById('resultStandardBE')?.textContent     || '—' },
        { label: 'True Break-Even',      value: document.getElementById('resultTrueBreakEven')?.textContent  || '—' },
        { label: 'Net Savings at Hold',  value: document.getElementById('resultNetSavings')?.textContent     || '—' }
      ];

      const rColW = cw / results.length;
      results.forEach((r, i) => {
        const cx = margin + rColW * i + rColW / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...mutedText);
        doc.text(r.label.toUpperCase(), cx, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...teal);
        doc.text(r.value || '--', cx, y + 12, { align: 'center' });
      });

      y += 20;
    }

    // === MILESTONE TABLE ===
    const milestoneTable = document.getElementById('milestoneTable');
    if (milestoneTable && milestoneTable.rows.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...teal);
      doc.text('YEAR-BY-YEAR COMPARISON', margin, y);
      y += 3;

      const headers = [];
      const headRow = milestoneTable.querySelector('thead tr');
      if (headRow) headRow.querySelectorAll('th').forEach(th => headers.push(th.textContent));

      const bodyData = [];
      const cellStyles = {};
      milestoneTable.querySelectorAll('tbody tr').forEach((tr, ri) => {
        const row = [];
        tr.querySelectorAll('td').forEach((td, ci) => {
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
          fontSize: 6,
          cellPadding: 1.5,
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
          fontSize: 6,
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 14, textColor: mutedText },
          7: { halign: 'center' }
        },
        alternateRowStyles: { fillColor: [250, 250, 252] },
        didParseCell: function (data) {
          if (data.section === 'body' && cellStyles[data.row.index] && cellStyles[data.row.index][data.column.index]) {
            const style = cellStyles[data.row.index][data.column.index];
            data.cell.styles.fillColor = style.fillColor;
            data.cell.styles.textColor = style.textColor;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
    }

    // === BOTTOM ZONE: Deal Summary (left) + QR placeholder (right) ===
    const fy = H - 10;
    const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 3 : y + 3;
    const bottomZoneBottom = fy - 2;
    const bottomZoneHeight = bottomZoneBottom - afterTableY;

    const qrSize = 18;
    const qrX = W - margin - qrSize;
    const qrY = bottomZoneBottom - qrSize - 4;
    doc.setDrawColor(...tealLight);
    doc.setLineWidth(0.4);
    doc.setFillColor(...lightBg);
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...mutedText);
    doc.text('Scan for', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
    doc.text('tutorial', qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center' });

    const dealSummaryText = document.getElementById('dealSummaryText')?.textContent;
    if (dealSummaryText && dealSummaryText !== 'Enter your numbers above to see a plain English analysis.' && bottomZoneHeight > 10) {
      const summaryBoxWidth = qrX - margin - 6;
      doc.setDrawColor(...tealLight);
      doc.setLineWidth(0.3);
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(margin, afterTableY, summaryBoxWidth, bottomZoneHeight, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...teal);
      doc.text('DEAL SUMMARY', margin + 3, afterTableY + 5);
      const textAreaHeight = bottomZoneHeight - 8;
      const textWidth = summaryBoxWidth - 6;
      let fontSize = 6.5;
      let splitText;
      for (const trySize of [6.5, 6, 5.5, 5, 4.5]) {
        doc.setFontSize(trySize);
        splitText = doc.splitTextToSize(dealSummaryText, textWidth);
        if (splitText.length * (trySize * 0.45) <= textAreaHeight) { fontSize = trySize; break; }
        fontSize = trySize;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(60, 60, 60);
      doc.text(splitText, margin + 3, afterTableY + 9);
    }

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
    doc.text('This analysis is for informational purposes only. Not financial advice. Consult with qualified professionals before making investment decisions.', margin, fy + 7.5);

    const addrClean = (document.getElementById('address')?.value || 'refi-analysis').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40);
    doc.save(`Fortified-Refi-${addrClean}.pdf`);
  }

  // ===== INITIAL CALCULATION =====
  calculate();

})();

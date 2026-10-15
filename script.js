window.onload = function() {
    // 날짜 기본값 설정 (계산기 페이지가 아닐 경우 에러 방지)
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        const now = new Date();
        startDateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // 입력을 고치면 오류 안내를 지움
    const form = document.getElementById('calcForm');
    if (form) { form.addEventListener('input', clearFieldErrors); form.addEventListener('change', clearFieldErrors); }

    // 정산표 페이지일 경우 테이블 생성
    if (document.getElementById('tableTabs')) {
        generateAllTables();
    }
}

function inputNumberFormat(obj) { obj.value = comma(uncomma(obj.value)); updateCAGR(); checkInputs(); }
function comma(str) { return String(str).replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,'); }
function uncomma(str) { return String(str).replace(/[^\d]+/g, ''); }
function getNum(id) { 
    const el = document.getElementById(id);
    return el ? (parseFloat(uncomma(el.value)) || 0) : 0;
}
function setNum(id, val) { 
    const el = document.getElementById(id);
    if(el) el.value = comma(Math.round(val)); 
}
function setRate(rate) { document.getElementById('hopeRate').value = rate; clearFieldErrors(); }

// 입력 오류를 팝업 대신 해당 입력칸 바로 아래에 표시
function showFieldError(id, msg) {
    clearFieldErrors();
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    const msgEl = document.createElement('div');
    msgEl.className = 'field-error';
    msgEl.setAttribute('role', 'alert');
    msgEl.textContent = msg;
    (el.closest('.input-group') || el).insertAdjacentElement('afterend', msgEl);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
}
function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(e => e.remove());
    document.querySelectorAll('.is-invalid').forEach(e => { e.classList.remove('is-invalid'); e.removeAttribute('aria-invalid'); });
}

function setLTV(percent) {
    const price = getNum('purchasePrice');
    if (price === 0) { showFieldError('purchasePrice', 'LTV를 고르기 전에 분양가를 먼저 입력해 주세요.'); return; }
    let loan = price * (percent / 100);
    if (loan > 40000) loan = 40000;
    setNum('loanAmount', loan);
    checkInputs();
}

function koreanMoney(val) {
    if (!val || val == 0) return "";
    const eok = Math.floor(val / 10000);
    const man = val % 10000;
    let str = "";
    if (eok > 0) str += `${eok}억 `;
    if (man > 0) str += `${comma(man)}만원`;
    return "(" + str.trim() + ")";
}

function checkInputs() {
    const price = getNum('purchasePrice');
    const loan = getNum('loanAmount');
    const priceText = document.getElementById('text-purchasePrice');
    if (!priceText) return;
    clearFieldErrors();
    priceText.innerText = koreanMoney(price);
    document.getElementById('text-loanAmount').innerText = koreanMoney(loan);
    document.getElementById('ltvDisplay').innerText = (price > 0 && loan > 0) ? `LTV: ${((loan / price) * 100).toFixed(1)}%` : 'LTV: - %';
    document.getElementById('limitWarning').style.display = (loan > 40000) ? 'inline-block' : 'none';
}

function calcDurationAndCAGR() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    const badge = document.getElementById('durationBadge');
    if(!startStr || !endStr) return 0;
    const start = new Date(startStr + "-01");
    const end = new Date(endStr + "-01");
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    if (months <= 0) { badge.innerText = "날짜 오류"; badge.className = "badge bg-danger"; updateCAGR(); return -1; }
    const years = Math.floor(months / 12);
    const remain = months % 12;
    badge.innerText = `${years}년 ${remain}개월`;
    badge.className = "badge bg-success";
    updateCAGR();
    return months / 12; 
}

function updateCAGR(obj) {
    if(obj) inputNumberFormat(obj);
    const buy = getNum('purchasePrice');
    const sell = getNum('sellPrice');
    document.getElementById('text-sellPrice').innerText = koreanMoney(sell);
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    if(!startStr || !endStr) return;
    const start = new Date(startStr + "-01");
    const end = new Date(endStr + "-01");
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    const years = months / 12;
    const display = document.getElementById('cagrDisplay');
    if (buy > 0 && sell > 0 && years >= 1) {
        const cagr = (Math.pow(sell / buy, 1 / years) - 1) * 100;
        display.innerText = `🏠 연평균 상승률: ${cagr.toFixed(2)}%`;
    } else { display.innerText = ""; }
}

// 정산 비율: 수탁은행 상품설명서 별표1(신혼희망타운 공유형 모기지 정산표, 2025.09 개정) 기준
const SHARE_BASE = { 70: [50, 40, 30], 60: [45, 35, 25], 50: [40, 30, 20], 40: [35, 25, 15], 30: [30, 20, 10] };
const SHARE_FLOOR = [20, 15, 10]; // 자녀 0명 / 1명 / 2명 이상, 모든 담보인정비율 공통

// 대출기간 1~9년은 기본 비율, 10년차부터 매년 2%p 인하.
// 최저 비율보다 1%p만 높게 남는 칸은 최저 비율로 적용됨(예: 11% → 10%, 16% → 15%, 21% → 20%).
function tableShareRate(ltvStep, kids, years) {
    const floor = SHARE_FLOOR[kids];
    const rate = SHARE_BASE[ltvStep][kids] - Math.max(0, years - 9) * 2;
    return rate < floor + 2 ? floor : rate;
}

// 담보인정비율이 10% 단위가 아니면(4억 한도 적용 시) 앞뒤 구간 정산 비율을 선형 보간
function shareRateFor(ltvPercent, kids, years) {
    const ltv = Math.min(70, Math.max(30, ltvPercent));
    const lo = Math.floor(ltv / 10) * 10;
    if (lo === ltv) return tableShareRate(ltv, kids, years);
    const rLo = tableShareRate(lo, kids, years);
    const rHi = tableShareRate(lo + 10, kids, years);
    return rLo + (rHi - rLo) * (ltv - lo) / 10;
}

function generateAllTables() {
    [70, 60, 50, 40, 30].forEach(step => {
        const el = document.getElementById(`content-${step}`);
        if(!el) return;
        let html = `<div class="full-table-container"><table class="table table-rate mb-0"><thead><tr><th>대출기간</th><th>0자녀</th><th>1자녀</th><th>2자녀+</th></tr></thead><tbody>`;
        for(let yr = 9; yr <= 30; yr++) {
            const cells = [0, 1, 2].map(kids => {
                const r = tableShareRate(step, kids, yr);
                return `<td class="${r===SHARE_FLOOR[kids]?'text-primary fw-bold':''}">${r}%</td>`;
            }).join('');
            html += `<tr><td><strong>${yr === 9 ? '1~9년' : yr + '년'}</strong></td>${cells}</tr>`;
        }
        html += `</tbody></table></div>`;
        el.innerHTML = html;
    });
}

function calculate() {
    try {
        const price = getNum('purchasePrice');
        const loan = getNum('loanAmount');
        const sell = getNum('sellPrice');
        const kids = parseInt(document.getElementById('kids').value);
        const term = parseInt(document.getElementById('termOptions').value);
        const hopeRate = parseFloat(document.getElementById('hopeRate').value);
        const normRate = parseFloat(document.getElementById('normalRate').value);
        
        const durationYears = calcDurationAndCAGR();

        const resultBox = document.getElementById('resultBox');
        const fail = (id, msg) => { resultBox.style.display = 'none'; showFieldError(id, msg); };
        if (price === 0) return fail('purchasePrice', '분양가를 입력해 주세요.');
        if (!document.getElementById('startDate').value) return fail('startDate', '입주(대출) 시기를 선택해 주세요.');
        if (loan === 0) return fail('loanAmount', '대출 금액을 입력하거나 LTV 버튼을 눌러 주세요.');
        if (isNaN(hopeRate) || hopeRate < 0) return fail('hopeRate', '대출 금리를 입력해 주세요.');
        if (!document.getElementById('endDate').value) return fail('endDate', '예상 매도 시기를 선택해 주세요.');
        if (durationYears <= 0) return fail('endDate', '매도 시기는 입주 시기보다 뒤여야 합니다.');
        if (sell === 0) return fail('sellPrice', '예상 매도 가격을 입력해 주세요.');
        if (isNaN(normRate) || normRate < 0) return fail('normalRate', '비교용 일반 주담대 금리를 입력해 주세요.');
        clearFieldErrors();

        const gain = sell - price;
        // 담보인정비율 = 대출금액 ÷ 분양가 × 100, 소수점 이하 절사 (부동소수 오차 보정)
        const ltvPercent = Math.floor(loan * 100 / price + 1e-9);
        // 손실이 발생한 경우에는 정산하지 않음(기금이 손실을 나눠 부담하지도 않음)
        const shareRate = (gain > 0) ? shareRateFor(ltvPercent, kids, Math.floor(durationYears)) : 0;

        const shareAmount = (gain > 0) ? gain * (shareRate / 100) : 0;
        const hopeResult = calcLoanDetails(loan, hopeRate/100, term, durationYears, 1);
        const normResult = calcLoanDetails(loan, normRate/100, 30, durationYears, 0);

        const hopeProfit = gain - shareAmount - hopeResult.totalInterest;
        const normProfit = gain - normResult.totalInterest;

        document.getElementById('resGain').innerText = comma(gain);
        document.getElementById('resHopeInt').innerText = comma(Math.round(hopeResult.totalInterest));
        document.getElementById('resNormInt').innerText = comma(Math.round(normResult.totalInterest));
        document.getElementById('resShare').innerText = comma(Math.round(shareAmount));
        document.getElementById('resShareRate').innerText = Number(shareRate.toFixed(1));
        document.getElementById('resHopeProfit').innerText = comma(Math.round(hopeProfit));
        document.getElementById('resNormProfit').innerText = comma(Math.round(normProfit));

        const hopeMonthly = Math.round(hopeResult.monthlyFull * 10000);
        const hopeInterestOnly = Math.round(hopeResult.monthlyInterestOnly * 10000);
        const normMonthly = Math.round(normResult.monthlyFull * 10000);
        const diffMonthly = normMonthly - hopeMonthly;

        document.getElementById('pmtInterestOnly').innerText = comma(hopeInterestOnly);
        document.getElementById('pmtFull').innerText = comma(hopeMonthly);
        document.getElementById('normPmtFull').innerText = comma(normMonthly);
        const diffNote = document.getElementById('diffPmtNote');
        if (diffMonthly > 0) { diffNote.className = 'mt-2 text-danger'; diffNote.innerText = `(월 ${comma(diffMonthly)}원 더 냄)`; }
        else if (diffMonthly < 0) { diffNote.className = 'mt-2 text-success'; diffNote.innerText = `(월 ${comma(-diffMonthly)}원 덜 냄)`; }
        else { diffNote.className = 'mt-2 text-muted'; diffNote.innerText = '(월 납부액 동일)'; }

        const diff = hopeProfit - normProfit;
        const vBox = document.getElementById('verdictBox');
        if (diff > 0) { vBox.className = "alert alert-success text-center fw-bold mb-3"; vBox.innerHTML = `신희타가 총 ${comma(Math.round(diff))}만원 더 유리합니다! 🎉`; } 
        else if (diff < 0) { vBox.className = "alert alert-danger text-center fw-bold mb-3"; vBox.innerHTML = `일반대출이 총 ${comma(Math.round(Math.abs(diff)))}만원 더 유리합니다.`; } 
        else { vBox.className = "alert alert-secondary text-center fw-bold mb-3"; vBox.innerText = "수익이 동일합니다."; }

        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (e) { console.error(e); showFieldError('purchasePrice', '계산 중 오류가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.'); }
}

function calcLoanDetails(principal, annualRate, totalYears, holdYears, graceYears) {
    if(principal <= 0) return { totalInterest:0, monthlyInterestOnly:0, monthlyFull:0 };
    const monthlyRate = annualRate / 12;
    const totalMonths = totalYears * 12;
    const graceMonths = graceYears * 12;
    const holdMonths = Math.floor(holdYears * 12);
    const monthlyInterestOnly = principal * monthlyRate;
    const repayMonths = totalMonths - graceMonths;
    let monthlyFull = 0;
    if (repayMonths > 0) monthlyFull = principal * (monthlyRate * Math.pow(1+monthlyRate, repayMonths)) / (Math.pow(1+monthlyRate, repayMonths) - 1);
    
    let totalInterestPaid = 0;
    let balance = principal;

    for(let m=1; m <= holdMonths; m++) {
        if (m <= graceMonths) {
            totalInterestPaid += balance * monthlyRate;
        } else {
            const interest = balance * monthlyRate;
            const principalRepay = monthlyFull - interest;
            totalInterestPaid += interest;
            balance -= principalRepay;
            if(balance <= 0) break;
        }
    }
    return { totalInterest: totalInterestPaid, monthlyInterestOnly: monthlyInterestOnly, monthlyFull: monthlyFull };
}

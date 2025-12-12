window.onload = function() {
    // 날짜 기본값 설정 (계산기 페이지가 아닐 경우 에러 방지)
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        startDateInput.value = new Date().toISOString().slice(0, 7);
    }
    
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
function setRate(rate) { document.getElementById('hopeRate').value = rate; }

function setLTV(percent) {
    const price = getNum('purchasePrice');
    if (price === 0) { alert("분양가를 먼저 입력해주세요"); return; }
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
    if (price > 0 && loan > 0) {
        const ltv = (loan / price) * 100;
        document.getElementById('text-purchasePrice').innerText = koreanMoney(price);
        document.getElementById('text-loanAmount').innerText = koreanMoney(loan);
        document.getElementById('ltvDisplay').innerText = `LTV: ${ltv.toFixed(1)}%`;
        const limitMsg = document.getElementById('limitWarning');
        if (loan > 40000) limitMsg.style.display = 'inline-block'; else limitMsg.style.display = 'none';
    }
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

function generateAllTables() {
    const configs = [
        { id: 'content-70', start: [50, 40, 30], min: [20, 15, 10] },
        { id: 'content-60', start: [45, 35, 25], min: [10, 10, 10] },
        { id: 'content-50', start: [40, 30, 20], min: [10, 10, 10] },
        { id: 'content-40', start: [35, 25, 15], min: [10, 10, 10] },
        { id: 'content-30', start: [30, 20, 10], min: [10, 10, 10] }
    ];
    configs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if(!el) return;
        let html = `<div class="full-table-container"><table class="table table-rate mb-0"><thead><tr><th>보유기간</th><th>0자녀</th><th>1자녀</th><th>2자녀+</th></tr></thead><tbody>`;
        for(let yr = 1; yr <= 30; yr++) {
            let reduce = (yr < 10) ? 0 : (yr - 9) * 2;
            let r0 = Math.max(cfg.min[0], cfg.start[0] - reduce);
            let r1 = Math.max(cfg.min[1], cfg.start[1] - reduce);
            let r2 = Math.max(cfg.min[2], cfg.start[2] - reduce);
            html += `<tr><td><strong>${yr}년</strong></td><td class="${r0===cfg.min[0]?'text-primary fw-bold':''}">${r0}%</td><td class="${r1===cfg.min[1]?'text-primary fw-bold':''}">${r1}%</td><td class="${r2===cfg.min[2]?'text-primary fw-bold':''}">${r2}%</td></tr>`;
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

        if (price === 0 || loan === 0 || sell === 0) { alert("모든 금액을 0원 이상 입력해주세요."); return; }
        if (durationYears <= 0) { alert("매도 시기는 입주 시기보다 미래여야 합니다."); return; }

        const gain = sell - price;
        const ltv = (loan / price) * 100;
        let shareRate = 0;
        
        if (gain > 0 && ltv >= 30) {
            let bucket = Math.ceil(ltv / 10) * 10;
            if(bucket < 30) bucket = 30; if(bucket > 70) bucket = 70;
            const baseRates = { 70: [50, 40, 30], 60: [45, 35, 25], 50: [40, 30, 20], 40: [35, 25, 15], 30: [30, 20, 10] };
            let startRate = baseRates[bucket][kids];
            let reduction = Math.max(0, Math.floor(durationYears) - 9) * 2;
            let calcRate = startRate - reduction;
            let minLimit = 10;
            if (bucket === 70) { if (kids === 0) minLimit = 20; else if (kids === 1) minLimit = 15; }
            shareRate = Math.max(calcRate, minLimit);
        }

        const shareAmount = (gain > 0) ? gain * (shareRate / 100) : 0;
        const hopeResult = calcLoanDetails(loan, hopeRate/100, term, durationYears, 1);
        const normResult = calcLoanDetails(loan, normRate/100, 30, durationYears, 0);

        const hopeProfit = gain - shareAmount - hopeResult.totalInterest;
        const normProfit = gain - normResult.totalInterest;

        document.getElementById('resGain').innerText = comma(gain);
        document.getElementById('resHopeInt').innerText = comma(Math.round(hopeResult.totalInterest));
        document.getElementById('resNormInt').innerText = comma(Math.round(normResult.totalInterest));
        document.getElementById('resShare').innerText = comma(Math.round(shareAmount));
        document.getElementById('resShareRate').innerText = shareRate;
        document.getElementById('resHopeProfit').innerText = comma(Math.round(hopeProfit));
        document.getElementById('resNormProfit').innerText = comma(Math.round(normProfit));

        const hopeMonthly = Math.round(hopeResult.monthlyFull * 10000);
        const hopeInterestOnly = Math.round(hopeResult.monthlyInterestOnly * 10000);
        const normMonthly = Math.round(normResult.monthlyFull * 10000);
        const diffMonthly = normMonthly - hopeMonthly;

        document.getElementById('pmtInterestOnly').innerText = comma(hopeInterestOnly);
        document.getElementById('pmtFull').innerText = comma(hopeMonthly);
        document.getElementById('normPmtFull').innerText = comma(normMonthly);
        document.getElementById('diffPmt').innerText = comma(diffMonthly);

        const diff = hopeProfit - normProfit;
        const vBox = document.getElementById('verdictBox');
        if (diff > 0) { vBox.className = "alert alert-success text-center fw-bold mb-3"; vBox.innerHTML = `신희타가 총 ${comma(Math.round(diff))}만원 더 유리합니다! 🎉`; } 
        else if (diff < 0) { vBox.className = "alert alert-danger text-center fw-bold mb-3"; vBox.innerHTML = `일반대출이 총 ${comma(Math.round(Math.abs(diff)))}만원 더 유리합니다.`; } 
        else { vBox.className = "alert alert-secondary text-center fw-bold mb-3"; vBox.innerText = "수익이 동일합니다."; }

        const resultBox = document.getElementById('resultBox');
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (e) { console.error(e); alert("오류가 발생했습니다."); }
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

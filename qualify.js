// 신혼희망타운 자격·배점 자가진단
// 기준: 마이홈포털 신혼희망타운 안내의 2026년도 적용 소득·자산 기준 (단위: 원)
// 가구원 수(태아 포함)별 전년도 도시근로자 가구당 월평균소득의 비율별 금액
const INCOME_2026 = {
    3: { 70: 5273634, 80: 6027010, 100: 7533763, 110: 8287139, 130: 9793892, 140: 10547268, 200: 15067526 },
    4: { 70: 6161541, 80: 7041762, 100: 8802202, 110: 9682422, 130: 11442863, 140: 12323083, 200: 17604404 },
    5: { 70: 6528890, 80: 7461588, 100: 9326985, 110: 10259684, 130: 12125081, 140: 13057779, 200: 18653970 },
    6: { 70: 6934384, 80: 7925010, 100: 9906263, 110: 10896889, 130: 12878142, 140: 13868768, 200: 19812526 },
    7: { 70: 7339879, 80: 8388433, 100: 10485541, 110: 11534095, 130: 13631203, 140: 14679757, 200: 20971082 },
    8: { 70: 7745373, 80: 8851855, 100: 11064819, 110: 12171301, 130: 14384265, 140: 15490747, 200: 22129638 }
};
const ASSET_LIMIT_2026 = 362000000; // 총자산 3억 6,200만 원 이하
const MORTGAGE_MIN_RATIO = 0.3;     // 총자산 기준을 넘는 주택은 주택가격의 30% 이상 모기지 가입

function qVal(id) { return document.getElementById(id).value; }
function qNum(id) { return Number(String(qVal(id)).replace(/[^\d]/g, '')) || 0; }
function qComma(el) { const n = String(el.value).replace(/[^\d]/g, ''); el.value = n ? Number(n).toLocaleString('ko-KR') : ''; }
function manwon(won) {
    const man = Math.round(won / 10000);
    const eok = Math.floor(man / 10000), rest = man % 10000;
    if (!eok) return man.toLocaleString('ko-KR') + '만 원';
    return eok + '억' + (rest ? ' ' + rest.toLocaleString('ko-KR') + '만' : '') + ' 원';
}

// 신청 유형에 따라 혼인 기간·맞벌이 입력을 보이거나 숨김
function qTypeChanged() {
    const type = qVal('qType');
    document.getElementById('qMarriageWrap').style.display = type === 'newlywed' ? '' : 'none';
    const dual = document.getElementById('qDual');
    if (type === 'single') { dual.value = 'single'; dual.disabled = true; } else { dual.disabled = false; }
}

function qRow(ok, label, detail) {
    const icon = ok === null ? 'bi-dash-circle text-secondary' : (ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger');
    return `<div class="check-list-item"><i class="bi ${icon}"></i><span><strong>${label}</strong> — ${detail}</span></div>`;
}

function qualifyCheck() {
    const type = qVal('qType');
    const marriage = qVal('qMarriage');
    const childAge = qVal('qChildAge');
    const size = Number(qVal('qSize'));
    const dual = type !== 'single' && qVal('qDual') === 'dual';
    const income = qNum('qIncome') * 10000;
    const asset = qNum('qAsset') * 10000;
    const reside = Number(qVal('qReside'));
    const account = Number(qVal('qAccount'));
    const kids = Number(qVal('qKids'));
    const homeless = Number(qVal('qHomeless'));
    const price = qNum('qPrice') * 10000;
    const box = document.getElementById('qResult');

    if (!document.getElementById('qIncome').value || !document.getElementById('qAsset').value) {
        box.style.display = 'block';
        box.innerHTML = '<div class="alert alert-warning small mb-0">월평균 소득과 총자산을 입력해 주세요. 없으면 0을 넣으면 됩니다.</div>';
        return;
    }

    // 1. 신청 자격 (혼인 기간·자녀 나이)
    const childUnder7 = childAge === 'le2' || childAge === 'le6';
    let basicOk, basicText;
    if (type === 'engaged') {
        basicOk = true; basicText = '예비신혼부부는 입주 전까지 혼인 사실을 증명하면 됩니다(2026년 6월 개정).';
    } else if (type === 'single') {
        basicOk = childUnder7; basicText = basicOk ? '만 6세 이하 자녀를 둔 한부모가족입니다.' : '한부모가족은 만 6세 이하 자녀(태아 포함)가 있어야 합니다.';
    } else {
        basicOk = marriage !== 'gt7' || childUnder7;
        basicText = basicOk ? '혼인 7년 이내이거나 만 6세 이하 자녀가 있습니다.' : '혼인 7년을 넘었고 만 6세 이하 자녀가 없으면 신혼부부 자격이 없습니다.';
    }

    // 2. 청약통장, 3. 자산
    const accountOk = account >= 1;
    const assetOk = asset <= ASSET_LIMIT_2026;

    // 4. 소득: 1·2단계(배점)는 130%(맞벌이 140%), 3단계(추첨)는 130%(맞벌이 200%)
    const t = INCOME_2026[size];
    const ratio = income / t[100] * 100;
    const limitScored = dual ? t[140] : t[130];
    const limitLottery = dual ? t[200] : t[130];
    const scoredOk = income <= limitScored;
    const lotteryOk = income <= limitLottery;

    // 공급 단계
    const stage1 = type === 'engaged' || (type === 'newlywed' && marriage === 'le2') || childAge === 'le2';

    // 1단계 배점 (각 3점, 만점 9점)
    let incomePts;
    if (dual) incomePts = income <= t[80] ? 3 : (income <= t[110] ? 2 : 1);
    else incomePts = income <= t[70] ? 3 : (income <= t[100] ? 2 : 1);
    const accountPts = Math.max(account, 0);
    const score1 = incomePts + reside + accountPts;
    // 2단계 가점 (각 3점, 만점 12점)
    const score2 = Math.min(kids, 3) + homeless + reside + accountPts;

    const rows = [
        qRow(basicOk, '신청 자격', basicText),
        qRow(accountOk, '청약통장', accountOk ? '가입 6개월·납입인정 6회 이상을 충족합니다.' : '가입 6개월 경과와 납입인정횟수 6회 이상이 필요합니다.'),
        qRow(assetOk, '총자산', `${manwon(asset)} / 기준 ${manwon(ASSET_LIMIT_2026)} 이하`),
        qRow(scoredOk, '소득(1·2단계)', `${manwon(income)} = 기준소득의 ${ratio.toFixed(1)}% / 한도 ${dual ? '140%' : '130%'} ${manwon(limitScored)} 이하`)
    ];
    if (dual) rows.push(qRow(lotteryOk, '소득(3단계 추첨)', `맞벌이는 200% ${manwon(t[200])} 이하까지 추첨에 신청할 수 있습니다.`));

    let verdictClass, verdict, scoreHtml = '';
    if (!basicOk || !accountOk || !assetOk) {
        verdictClass = 'alert-danger';
        verdict = '표시된 항목 때문에 신청할 수 없습니다. 공고문의 세부 기준으로 다시 확인해 보세요.';
    } else if (!lotteryOk) {
        verdictClass = 'alert-danger';
        verdict = '소득이 기준을 넘어 신청할 수 없습니다.';
    } else if (!scoredOk) {
        verdictClass = 'alert-warning';
        verdict = '1·2단계(배점) 소득 기준은 넘지만, 맞벌이 200% 이하라 <strong>3단계 추첨</strong>에는 신청할 수 있습니다.';
    } else {
        verdictClass = 'alert-success';
        verdict = stage1
            ? '<strong>1단계(우선공급, 물량의 30%)</strong> 대상입니다. 1단계에서 떨어지면 2단계, 이후 3단계 추첨까지 이어집니다.'
            : '<strong>2단계(물량의 60%)</strong> 대상입니다. 2단계에서 떨어지면 3단계 추첨으로 이어집니다.';
        scoreHtml = '<div class="row g-2 mt-1">';
        if (stage1) scoreHtml += `<div class="col-6"><div class="q-score"><span>1단계 배점</span><strong>${score1}<small> / 9점</small></strong><em>소득 ${incomePts} · 거주 ${reside} · 통장 ${accountPts}</em></div></div>`;
        scoreHtml += `<div class="col-6"><div class="q-score"><span>2단계 가점</span><strong>${score2}<small> / 12점</small></strong><em>자녀 ${Math.min(kids, 3)} · 무주택 ${homeless} · 거주 ${reside} · 통장 ${accountPts}</em></div></div>`;
        scoreHtml += '</div>';
    }

    let mortgageHtml = '';
    if (price > 0 && verdictClass !== 'alert-danger') {
        if (price > ASSET_LIMIT_2026) {
            const minLoan = price * MORTGAGE_MIN_RATIO;
            mortgageHtml = `<div class="info-box small mb-0 mt-3"><strong>수익공유형 모기지 의무 가입 대상</strong>입니다. 분양가(${manwon(price)})가 총자산 기준(${manwon(ASSET_LIMIT_2026)})을 넘으므로 입주 전까지 주택가격의 30%인 <strong>${manwon(minLoan)} 이상</strong>을 모기지로 받아야 합니다. 이 대출로 나중에 낼 정산금은 <a href="index.html">모기지 계산기</a>에서 확인할 수 있습니다.</div>`;
        } else {
            mortgageHtml = `<div class="info-box small mb-0 mt-3">분양가(${manwon(price)})는 총자산 기준(${manwon(ASSET_LIMIT_2026)}) 이하이므로 모기지 의무 가입 대상은 아닙니다. 모기지를 쓸지는 <a href="index.html">계산기</a>로 일반 대출과 비교해 정하면 됩니다.</div>`;
        }
    }

    box.style.display = 'block';
    box.innerHTML = `<div class="alert ${verdictClass} small mb-3">${verdict}</div>${scoreHtml}<div class="mt-3">${rows.join('')}</div>${mortgageHtml}
        <p class="small text-muted mt-3 mb-0">입력값은 이 브라우저 안에서만 계산하며 저장하거나 전송하지 않습니다. 실제 자격과 배점은 단지별 입주자모집공고와 LH의 서류 검증 결과로 확정됩니다.</p>`;
}

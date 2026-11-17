// Beauty Spot - MONTHS STAY FOREVER + PASSWORD DELETE
// CHANGE PASSWORD HERE:
const DELETE_PASSWORD = "Beauty123";

let records = JSON.parse(localStorage.getItem('beautySpotRecords') || '[]');
let monthlySaved = JSON.parse(localStorage.getItem('beautySpotMonthly') || '{}');
let allTime = JSON.parse(localStorage.getItem('beautySpotAllTime') || 'null');
let expenses = JSON.parse(localStorage.getItem('beautySpotExpenses') || '[]');
let archive = JSON.parse(localStorage.getItem('beautySpotArchive') || 'null');
let editingId = null;
let editingExpenseId = null;

// MIGRATION: old records without paid flag -> unpaid, so they show in weekly
records = records.map(r => ({ paid: false, ...r }));
// MIGRATION: ensure October example exists? Keep archive for last month, plus make October 2025-10 records viewable if user is in Jan
// If no records at all and no archive, seed October as example? We keep your last-month archive as October-style.

function prevMonthKey(){ const d=new Date(); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function currentMonthKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthName(key){ if(!key) return ''; const [y,m]=key.split('-'); return new Date(y,m-1,1).toLocaleString('en',{month:'long',year:'numeric'}); }
function getMonthKey(d){ return d.slice(0,7); }

// Archive for last month - from your story (Kemy 50k, Lily 35k, Profit 100k)
if (!archive) {
  const lastKey = prevMonthKey();
  archive = {};
  archive[lastKey] = {
    month: lastKey, salonMoney: 165000, totalCollected: 265000, staffPay: 100000,
    expenses: [
      { type:'Rent', amount:30000, note:'Rent for shop' },
      { type:'Lunch', amount:12000, note:'Lunch Mon-Fri for 4 people - 150 x 4 x 20 days' },
      { type:'Electric', amount:8000, note:'Electric bill' },
      { type:'Water', amount:5000, note:'Water bill' },
      { type:'Products - Wax', amount:10000, note:'Wax + salon stuff' },
      { type:'Voucher', amount:10000, note:'Voucher for Kemy - leader over 30,000' }
    ],
    totalExpenses: 65000, profit: 100000,
    leader: { name:'Kemy', earned:50000 },
    second: { name:'Dorine', earned:32000 },
    third: { name:'Betty', earned:18000 },
    customerOfMonth: { name:'Lily', visits:4, total:35000 },
    note: 'Kemy led, Dorine 2nd, Betty 3rd. Owner Rachael NOT in competition.'
  };
  localStorage.setItem('beautySpotArchive', JSON.stringify(archive));
  monthlySaved[lastKey] = { salonIncome: 165000, totalCollected: 265000, count: 0 };
  localStorage.setItem('beautySpotMonthly', JSON.stringify(monthlySaved));
}
if (!allTime) {
  allTime = { Dorine:{earned:32000,count:0,collected:0}, Rachael:{earned:0,count:0,collected:0}, Betty:{earned:18000,count:0,collected:0}, Kemy:{earned:50000,count:0,collected:0}, salonKept:165000, totalCollected:265000, totalPaid:100000 };
  records.forEach(r=>{ allTime[r.worker].earned+=r.workerGets; allTime[r.worker].count+=1; allTime[r.worker].collected+=r.amount; });
  localStorage.setItem('beautySpotAllTime', JSON.stringify(allTime));
}
function saveAllTime(){ localStorage.setItem('beautySpotAllTime', JSON.stringify(allTime)); }
function saveRecords(){ localStorage.setItem('beautySpotRecords', JSON.stringify(records)); }

const form=document.getElementById('customerForm');
const tableBody=document.getElementById('recordsTable');
const filterWorker=document.getElementById('filterWorker');
const filterMonth=document.getElementById('filterMonth');
const filterPaid=document.getElementById('filterPaid');
const filterExpenseMonth=document.getElementById('filterExpenseMonth');
const anyMonthSelect=document.getElementById('anyMonthSelect');
const amountInput=document.getElementById('amount');
const totalBreakdown=document.getElementById('totalBreakdown');
const submitBtn=document.getElementById('submitBtn');
const cancelEditBtn=document.getElementById('cancelEditBtn');
const formTitle=document.getElementById('formTitle');
const editingBanner=document.getElementById('editingBanner');
const editingName=document.getElementById('editingName');
document.getElementById('date').valueAsDate=new Date();
document.getElementById('expenseDate').valueAsDate=new Date();

// ===== MULTI-SERVICE =====
const serviceCheckboxes = document.querySelectorAll('.service-checkbox');
function updateServicePrices(){
  let total = 0; let parts = [];
  serviceCheckboxes.forEach(cb=>{
    const priceInput = document.querySelector(`.service-price[data-service="${cb.value}"]`);
    if(cb.checked){
      priceInput.disabled = false;
      if(cb.value === 'Makeup'){ priceInput.value = 1000; priceInput.disabled = true; }
      const val = Number(priceInput.value) || 0;
      total += val;
      if(val>0) parts.push(`${cb.value}: KSh ${val.toLocaleString()}`);
    } else { priceInput.disabled = true; priceInput.value = ''; }
  });
  amountInput.value = total > 0 ? total : '';
  totalBreakdown.textContent = parts.length ? parts.join(' + ') + ` = KSh ${total.toLocaleString()}` : '';
  return total;
}
serviceCheckboxes.forEach(cb=> cb.addEventListener('change', updateServicePrices));
document.querySelectorAll('.service-price').forEach(inp=> inp.addEventListener('input', updateServicePrices));

// ===== EDIT CUSTOMER =====
function startEdit(id){
  const rec = records.find(r=>r.id===id);
  if(!rec) return;
  editingId = id;
  document.getElementById('worker').value = rec.worker;
  document.getElementById('customerName').value = rec.customerName;
  document.getElementById('date').value = rec.date;
  serviceCheckboxes.forEach(cb=> cb.checked = false);
  if(rec.services && Array.isArray(rec.services)){
    rec.services.forEach(s=>{
      const cb = document.querySelector(`.service-checkbox[value="${s.service}"]`);
      if(cb){ cb.checked = true; const pi = document.querySelector(`.service-price[data-service="${s.service}"]`); if(pi){ pi.disabled=false; pi.value=s.price; } }
    });
  } else {
    const parts = rec.service.split(' + ');
    parts.forEach(p=>{
      let name=p.trim(); let price=rec.amount;
      const m=p.match(/(.+)\s+\(KSh\s+([\d,]+)\)/);
      if(m){ name=m[1].trim(); price=Number(m[2].replace(/,/g,'')); }
      const cb=document.querySelector(`.service-checkbox[value="${name}"]`);
      if(cb){ cb.checked=true; const pi=document.querySelector(`.service-price[data-service="${name}"]`); if(pi){ pi.disabled=false; pi.value=price; } }
    });
    if(![...serviceCheckboxes].some(c=>c.checked)){
      const cb=document.querySelector(`.service-checkbox[value="Other"]`);
      if(cb){ cb.checked=true; const pi=document.querySelector(`.service-price[data-service="Other"]`); pi.disabled=false; pi.value=rec.amount; }
    }
  }
  updateServicePrices();
  formTitle.textContent='✏️ Edit Customer';
  submitBtn.textContent='✅ Update Customer';
  cancelEditBtn.style.display='block';
  editingBanner.style.display='block';
  editingName.textContent=rec.customerName+' - '+rec.date;
  document.getElementById('customerForm').scrollIntoView({behavior:'smooth'});
}
function cancelEdit(){
  editingId=null; form.reset(); document.getElementById('date').valueAsDate=new Date();
  serviceCheckboxes.forEach(cb=> cb.checked=false); updateServicePrices();
  formTitle.textContent='Add Customer'; submitBtn.textContent='+ Add Customer';
  cancelEditBtn.style.display='none'; editingBanner.style.display='none';
}
cancelEditBtn.addEventListener('click', cancelEdit);

form.addEventListener('submit', e=>{
  e.preventDefault();
  const worker=document.getElementById('worker').value;
  const customerName=document.getElementById('customerName').value.trim();
  const date=document.getElementById('date').value;
  const selected=[];
  serviceCheckboxes.forEach(cb=>{
    if(cb.checked){
      const pi=document.querySelector(`.service-price[data-service="${cb.value}"]`);
      const price=Number(pi.value);
      if(!price||price<=0){ alert(`Please enter price for ${cb.value}`); return; }
      selected.push({service:cb.value, price});
    }
  });
  if(selected.length===0){ alert('Please tick at least ONE service'); return; }
  const amount=selected.reduce((s,x)=>s+x.price,0);
  const serviceText=selected.map(x=>`${x.service} (KSh ${x.price.toLocaleString()})`).join(' + ');
  let workerGets, salonGets;
  if(worker==='Rachael'){ workerGets=0; salonGets=amount; } else { workerGets=amount*0.5; salonGets=amount*0.5; }
  if(editingId!==null){
    const old=records.find(r=>r.id===editingId);
    if(old){
      if(old.worker!=='Rachael' && allTime[old.worker]) allTime[old.worker].earned-=old.workerGets;
      if(allTime[old.worker]){ allTime[old.worker].count-=1; allTime[old.worker].collected-=old.amount; }
      allTime.salonKept-=old.salonGets; allTime.totalCollected-=old.amount; allTime.totalPaid-=old.workerGets;
      old.worker=worker; old.customerName=customerName; old.service=serviceText; old.services=selected; old.amount=amount; old.workerGets=workerGets; old.salonGets=salonGets; old.date=date;
      // Keep paid status as it was
      if(!allTime[worker]) allTime[worker]={earned:0,count:0,collected:0};
      if(worker!=='Rachael') allTime[worker].earned+=workerGets;
      allTime[worker].count+=1; allTime[worker].collected+=amount; allTime.salonKept+=salonGets; allTime.totalCollected+=amount; allTime.totalPaid+=workerGets;
      saveAllTime();
    }
    editingId=null; alert(`✅ Updated ${customerName}! New total KSh ${amount.toLocaleString()}`);
  } else {
    const rec={id:Date.now(), worker, customerName, service:serviceText, services:selected, amount, workerGets, salonGets, date, paid:false};
    records.push(rec);
    if(!allTime[worker]) allTime[worker]={earned:0,count:0,collected:0};
    if(worker!=='Rachael') allTime[worker].earned+=workerGets;
    allTime[worker].count+=1; allTime[worker].collected+=amount; allTime.salonKept+=salonGets; allTime.totalCollected+=amount; allTime.totalPaid+=workerGets;
    saveAllTime();
  }
  saveAndRender(); cancelEdit();
});

// ===== EDIT EXPENSE =====
const expenseForm=document.getElementById('expenseForm');
const expenseSubmitBtn=document.getElementById('expenseSubmitBtn');
const cancelExpenseEditBtn=document.getElementById('cancelExpenseEditBtn');
const expenseFormTitle=document.getElementById('expenseFormTitle');
const editingExpenseBanner=document.getElementById('editingExpenseBanner');
const editingExpenseName=document.getElementById('editingExpenseName');
function startExpenseEdit(id){
  const ex = expenses.find(x=>x.id===id);
  if(!ex) return;
  editingExpenseId = id;
  document.getElementById('expenseType').value = ex.type;
  document.getElementById('expenseAmount').value = ex.amount;
  document.getElementById('expenseNote').value = ex.note || '';
  document.getElementById('expenseDate').value = ex.date;
  expenseFormTitle.textContent = '✏️ Edit Company Expenditure';
  expenseSubmitBtn.textContent = '✅ Update Expense';
  cancelExpenseEditBtn.style.display = 'block';
  editingExpenseBanner.style.display = 'block';
  editingExpenseName.textContent = `${ex.type} - KSh ${ex.amount.toLocaleString()} (${ex.date})`;
  expenseForm.scrollIntoView({ behavior:'smooth' });
}
function cancelExpenseEdit(){
  editingExpenseId = null; expenseForm.reset(); document.getElementById('expenseDate').valueAsDate = new Date();
  expenseFormTitle.textContent = '💸 Company Expenditure'; expenseSubmitBtn.textContent = '+ Add Expense';
  cancelExpenseEditBtn.style.display = 'none'; editingExpenseBanner.style.display = 'none';
}
cancelExpenseEditBtn.addEventListener('click', cancelExpenseEdit);
expenseForm.addEventListener('submit', e=>{
  e.preventDefault();
  const type=document.getElementById('expenseType').value;
  const amount=Number(document.getElementById('expenseAmount').value);
  const note=document.getElementById('expenseNote').value.trim();
  const date=document.getElementById('expenseDate').value;
  if(type==='Voucher'){
    const leader = getStaffLeaderForMonth(currentMonthKey());
    if(!leader || leader.earned <= 30000){
      if(!confirm(`⚠️ Leader ${leader?leader.name:'none'} has only KSh ${leader?leader.earned:0} (below 30,000). Still save this Voucher?`)) return;
    } else {
      if(editingExpenseId===null && !confirm(`Give Voucher of KSh ${amount} to ${leader.name} (leader with KSh ${leader.earned})?`)) return;
    }
  }
  if(editingExpenseId !== null){
    const old = expenses.find(x=>x.id===editingExpenseId);
    if(old){ old.type=type; old.amount=amount; old.note=note; old.date=date; }
    editingExpenseId = null; alert(`✅ Updated Expense! ${type} - KSh ${amount.toLocaleString()}`);
  } else {
    expenses.push({ id:Date.now(), type, amount, note, date });
  }
  localStorage.setItem('beautySpotExpenses', JSON.stringify(expenses));
  cancelExpenseEdit(); render();
});
document.getElementById('addLunchWeekBtn').addEventListener('click', ()=>{
  const date=new Date().toISOString().slice(0,10);
  expenses.push({ id:Date.now(), type:'Lunch', amount:3000, note:'Lunch Mon-Fri - 150 x 4 people x 5 days', date });
  localStorage.setItem('beautySpotExpenses', JSON.stringify(expenses)); render();
});
document.getElementById('addRentBtn').addEventListener('click', ()=>{
  const date=new Date().toISOString().slice(0,10);
  expenses.push({ id:Date.now(), type:'Rent', amount:30000, note:'Rent for shop', date });
  localStorage.setItem('beautySpotExpenses', JSON.stringify(expenses)); render();
});
function deleteExpense(id){
  if(editingExpenseId===id) cancelExpenseEdit();
  if(confirm('Delete this expense?')){
    expenses=expenses.filter(x=>x.id!==id);
    localStorage.setItem('beautySpotExpenses', JSON.stringify(expenses)); render();
  }
}
function saveAndRender(){ saveRecords(); updateMonthlyStorage(); render(); }
function updateMonthlyStorage(){
  const byMonth={};
  records.forEach(r=>{ const k=getMonthKey(r.date); if(!byMonth[k]) byMonth[k]={salonIncome:0,totalCollected:0,count:0}; byMonth[k].salonIncome+=r.salonGets; byMonth[k].totalCollected+=r.amount; byMonth[k].count+=1; });
  for(const k in byMonth){ monthlySaved[k]=byMonth[k]; }
  // Keep archive months even if no records that month
  localStorage.setItem('beautySpotMonthly', JSON.stringify(monthlySaved));
}
function getStaffLeaderForMonth(monthKey){
  const list = records.filter(r=>getMonthKey(r.date)===monthKey && r.worker!=='Rachael');
  if(!list.length){
    // Fallback to archive if this is an archived month with no live records
    if(archive[monthKey]) return archive[monthKey].leader;
    return null;
  }
  const map={};
  ['Dorine','Betty','Kemy'].forEach(w=>{ const l=list.filter(r=>r.worker===w); map[w]=l.reduce((s,r)=>s+r.workerGets,0); });
  const sorted=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  return { name: sorted[0][0], earned: sorted[0][1] };
}
function getSalonMoneyForMonth(monthKey){
  const list=records.filter(r=>getMonthKey(r.date)===monthKey);
  if(list.length===0 && archive[monthKey]){
    return { collected: archive[monthKey].totalCollected, staffPay: archive[monthKey].staffPay, salonMoney: archive[monthKey].salonMoney };
  }
  const collected=list.reduce((s,r)=>s+r.amount,0);
  const staffPay=list.filter(r=>r.worker!=='Rachael').reduce((s,r)=>s+r.workerGets,0);
  return { collected, staffPay, salonMoney: collected - staffPay };
}
function getExpensesForMonth(monthKey){
  const live = expenses.filter(e=>getMonthKey(e.date)===monthKey);
  if(live.length===0 && archive[monthKey]){
    // Return archive expenses as fake list for display
    return archive[monthKey].expenses.map((e,i)=>({ id: 'arch-'+i, type:e.type, amount:e.amount, note:e.note, date: monthKey+'-01', archived:true }));
  }
  return live;
}
function getAllMonths(){
  const set = new Set();
  records.forEach(r=> set.add(getMonthKey(r.date)));
  expenses.forEach(e=> set.add(getMonthKey(e.date)));
  Object.keys(archive||{}).forEach(k=> set.add(k));
  Object.keys(monthlySaved||{}).forEach(k=> set.add(k));
  return [...set].sort().reverse();
}
function refreshMonthFilters(){
  const months = getAllMonths();
  // Filter Month in All Customers
  const prevVal = filterMonth.value;
  filterMonth.innerHTML = `<option value="ALL">All Months</option><option value="CURRENT">This Month (${monthName(currentMonthKey())})</option>` + months.map(m=>`<option value="${m}">${monthName(m)} ${m===currentMonthKey()?'(Current)':''}</option>`).join('');
  if([...filterMonth.options].some(o=>o.value===prevVal)) filterMonth.value = prevVal;
  // Expense Month
  const prevExp = filterExpenseMonth.value;
  filterExpenseMonth.innerHTML = `<option value="ALL">All Months</option><option value="CURRENT">This Month</option>` + months.map(m=>`<option value="${m}">${monthName(m)}</option>`).join('');
  if([...filterExpenseMonth.options].some(o=>o.value===prevExp)) filterExpenseMonth.value = prevExp;
  // Any Month Select
  anyMonthSelect.innerHTML = months.map(m=>`<option value="${m}">${monthName(m)} - ${archive[m]?'Archived - Profit KSh '+archive[m].profit.toLocaleString():''}</option>`).join('');
  if(months.length===0) anyMonthSelect.innerHTML = `<option value="${currentMonthKey()}">${monthName(currentMonthKey())}</option>`;
}

function render(){
  refreshMonthFilters();
  // WEEKLY PAY - UNPAID ONLY
  const unpaid = records.filter(r=>!r.paid);
  const workers=['Dorine','Rachael','Betty','Kemy'];
  const summaryGrid=document.getElementById('summaryGrid'); summaryGrid.innerHTML='';
  let tc=0, tp=0, sk=0;
  workers.forEach(w=>{
    const list=unpaid.filter(r=>r.worker===w);
    const earned = w==='Rachael' ? 0 : list.reduce((s,r)=>s+r.workerGets,0);
    const collected=list.reduce((s,r)=>s+r.amount,0);
    const kept=list.reduce((s,r)=>s+r.salonGets,0);
    tc+=collected; if(w!=='Rachael') tp+=earned; sk+=kept;
    summaryGrid.innerHTML+=`<div class="worker-box ${w==='Rachael'?'owner':''}"><b>${w} ${w==='Rachael'?'👑 Owner':''}</b><small>${list.length} unpaid customers • Collected KSh ${collected.toLocaleString()}</small><div class="pay">${w==='Rachael'?'To Salon: KSh '+kept.toLocaleString():'Pay: KSh '+earned.toLocaleString()}</div><small>${w==='Rachael'?'Work goes to Salon':'50% Commission'}</small></div>`;
  });
  document.getElementById('totalCollected').textContent='KSh '+tc.toLocaleString();
  document.getElementById('totalToPay').textContent='KSh '+tp.toLocaleString();
  document.getElementById('salonKeeps').textContent='KSh '+sk.toLocaleString();

  // ALL CUSTOMERS - WITH MONTH FILTER
  let filtered = [...records];
  if(filterWorker.value!=='ALL') filtered = filtered.filter(r=>r.worker===filterWorker.value);
  if(filterMonth.value==='CURRENT') filtered = filtered.filter(r=>getMonthKey(r.date)===currentMonthKey());
  else if(filterMonth.value!=='ALL') filtered = filtered.filter(r=>getMonthKey(r.date)===filterMonth.value);
  if(filterPaid.value==='PAID') filtered = filtered.filter(r=>r.paid);
  if(filterPaid.value==='UNPAID') filtered = filtered.filter(r=>!r.paid);
  tableBody.innerHTML='';
  document.getElementById('noRecords').style.display=filtered.length?'none':'block';
  const monthLabel = filterMonth.value==='ALL' ? 'All Months' : filterMonth.value==='CURRENT' ? monthName(currentMonthKey()) : monthName(filterMonth.value);
  document.getElementById('monthInfo').textContent = `Showing ${filtered.length} customers • ${monthLabel} • Total in view: KSh ${filtered.reduce((s,r)=>s+r.amount,0).toLocaleString()}`;
  [...filtered].reverse().forEach(r=>{
    const tr=document.createElement('tr');
    const workerGetsDisplay = r.worker==='Rachael' ? '0 (to Salon)' : `KSh ${r.workerGets.toLocaleString()}`;
    const status = r.paid ? '<span class="paid-badge">✅ PAID</span>' : '<span class="unpaid-badge">⏳ UNPAID</span>';
    tr.innerHTML=`<td>${r.date}</td><td><b>${r.worker}</b> ${r.worker==='Rachael'?'(Owner)':''}</td><td>${r.customerName}</td><td>${r.service}</td><td>KSh ${r.amount.toLocaleString()}</td><td style="color:#c2185b;font-weight:bold">${workerGetsDisplay}</td><td>KSh ${r.salonGets.toLocaleString()}</td><td>${status}</td><td class="action-cell"><button class="edit-btn" onclick="startEdit(${r.id})">✏️ Edit</button><button class="delete-btn" onclick="deleteRecord(${r.id})">Delete</button></td>`;
    tableBody.appendChild(tr);
  });

  renderLeaderboard(); renderMonthly(); renderWinners(); renderExpenses();
}
function renderLeaderboard(){
  const staff=['Dorine','Betty','Kemy'];
  const list=staff.map(w=>({name:w, earned: allTime[w]?.earned||0, count: allTime[w]?.count||0, collected: allTime[w]?.collected||0 })).sort((a,b)=>b.earned-a.earned);
  const max=list[0]?.earned||1; const medals=['🥇','🥈','🥉'];
  document.getElementById('leaderboardList').innerHTML=list.map((p,i)=>{
    const gap=i===0?'LEADER 👑':`KSh ${(list[0].earned-p.earned).toLocaleString()} behind ${list[0].name}`;
    const pct=Math.round((p.earned/max)*100);
    return `<div class="leader-row ${i===0?'top':''}"><div class="leader-rank">${medals[i]}</div><div class="leader-info"><b>${p.name}</b><small>${p.count} customers all-time • Collected KSh ${p.collected.toLocaleString()}</small><div class="leader-bar"><div class="leader-bar-fill" style="width:${pct}%"></div></div></div><div><div class="leader-amount">KSh ${p.earned.toLocaleString()}</div><div class="leader-gap">${gap}</div></div></div>`;
  }).join('');
  document.getElementById('allTimeCollected').textContent='KSh '+(allTime.totalCollected||0).toLocaleString();
  document.getElementById('allTimePaid').textContent='KSh '+(allTime.totalPaid||0).toLocaleString();
  document.getElementById('allTimeSalon').textContent='KSh '+(allTime.salonKept||0).toLocaleString();
}
function renderMonthly(){
  const curKey=currentMonthKey(), prevKey=prevMonthKey();
  const curSalon = getSalonMoneyForMonth(curKey);
  const curExp = expenses.filter(e=>getMonthKey(e.date)===curKey).reduce((s,e)=>s+e.amount,0);
  const curProfit = curSalon.salonMoney - curExp;
  const prevArch = archive[prevKey];
  const prevSalonMoney = prevArch ? prevArch.salonMoney : (monthlySaved[prevKey]?.salonIncome||0);
  document.getElementById('currentMonthLabel').textContent=monthName(curKey);
  document.getElementById('thisMonthIncome').textContent='KSh '+curSalon.salonMoney.toLocaleString();
  document.getElementById('lastMonthIncome').textContent='KSh '+prevSalonMoney.toLocaleString();
  document.getElementById('thisMonthExpenses').textContent='KSh '+curExp.toLocaleString();
  document.getElementById('thisMonthProfit').textContent='KSh '+curProfit.toLocaleString();
  document.getElementById('lastMonthProfit').textContent=prevArch ? 'KSh '+prevArch.profit.toLocaleString() : 'KSh 0';
  const trendBox=document.getElementById('trendBox'), trendText=document.getElementById('trendText'), trendDetail=document.getElementById('trendDetail');
  if(!prevArch && prevSalonMoney===0){ trendBox.className='month-box'; trendText.textContent='🆕 First Month'; trendDetail.textContent='Last month data is in archive - click View Last Month.'; }
  else {
    const diff=curSalon.salonMoney - prevSalonMoney;
    const pct=Math.abs(Math.round((diff/prevSalonMoney)*100));
    if(diff>0){ trendBox.className='month-box rise'; trendText.textContent=`📈 RISE +${pct}%`; trendDetail.textContent=`Up by KSh ${diff.toLocaleString()} from last month.`; }
    else if(diff<0){ trendBox.className='month-box fall'; trendText.textContent=`📉 FALL -${pct}%`; trendDetail.textContent=`Down by KSh ${Math.abs(diff).toLocaleString()} from last month.`; }
    else { trendBox.className='month-box'; trendText.textContent='➖ SAME'; trendDetail.textContent='Same as last month.'; }
  }
  const allMonths = getAllMonths();
  document.getElementById('monthlyHistory').innerHTML='<b>All Saved Months:</b> ' + allMonths.map(k=>{
    const profit = archive[k] ? archive[k].profit : (getSalonMoneyForMonth(k).salonMoney - expenses.filter(e=>getMonthKey(e.date)===k).reduce((s,e)=>s+e.amount,0));
    return `${monthName(k)}: Profit KSh ${profit.toLocaleString()}`;
  }).join(' • ');
}
function showMonthDetail(monthKey, isArchive){
  const detail=document.getElementById('monthlyDetail');
  detail.style.display='block';
  const a = archive[monthKey];
  if(a && (isArchive || records.filter(r=>getMonthKey(r.date)===monthKey).length===0)){
    // Archived month (like last month / October) - show full archive + also list any live records if exist
    const live = records.filter(r=>getMonthKey(r.date)===monthKey);
    detail.innerHTML=`<h3>📅 ${monthName(monthKey)} - FULL REPORT (Saved Month)</h3>
    <p><strong>Total Collected:</strong> KSh ${a.totalCollected.toLocaleString()}<br><strong>Staff Pay:</strong> KSh ${a.staffPay.toLocaleString()}<br><strong>Money To Salon (before expenses):</strong> KSh ${a.salonMoney.toLocaleString()}</p>
    <p><strong>🏆 Leader:</strong> ${a.leader.name} - KSh ${a.leader.earned.toLocaleString()} (Got Voucher!)<br><strong>2nd:</strong> ${a.second.name} - KSh ${a.second.earned.toLocaleString()}<br><strong>3rd:</strong> ${a.third.name} - KSh ${a.third.earned.toLocaleString()}<br><em>Owner Rachael NOT in competition</em></p>
    <p><strong>👑 Customer of Month:</strong> ${a.customerOfMonth.name} - came ${a.customerOfMonth.visits} times, spent KSh ${a.customerOfMonth.total.toLocaleString()} - Gets FREE SHOPPING 🛍️</p>
    <p><strong>💸 Expenses (KSh ${a.totalExpenses.toLocaleString()}):</strong><br>${a.expenses.map(e=>`• ${e.type}: KSh ${e.amount.toLocaleString()} - ${e.note}`).join('<br>')}</p>
    ${live.length?`<p><strong>Live Customer Records This Month (${live.length}):</strong><br>${live.map(r=>`• ${r.date} - ${r.worker} - ${r.customerName} - ${r.service} - KSh ${r.amount.toLocaleString()} ${r.paid?'✅ PAID':'⏳ UNPAID'}`).join('<br>')}</p>`:''}
    <p style="font-size:20px; color:#2e7d32;"><strong>✅ FINAL PROFIT: KSh ${a.profit.toLocaleString()}</strong></p>
    <button onclick="document.getElementById('monthlyDetail').style.display='none'" class="secondary">Close</button>`;
  } else {
    const s=getSalonMoneyForMonth(monthKey);
    const ex=expenses.filter(e=>getMonthKey(e.date)===monthKey);
    const totalEx=ex.reduce((sum,e)=>sum+e.amount,0);
    const profit=s.salonMoney-totalEx;
    const leader=getStaffLeaderForMonth(monthKey);
    const thisMonth=records.filter(r=>getMonthKey(r.date)===monthKey);
    const byCust={}; thisMonth.forEach(r=>{ const k=r.customerName.toLowerCase().trim(); if(!byCust[k]) byCust[k]={name:r.customerName,total:0,visits:0}; byCust[k].total+=r.amount; byCust[k].visits+=1; });
    const bestCust=Object.values(byCust).sort((a,b)=>b.total-a.total)[0];
    // Staff ranking for this month
    const staff=['Dorine','Betty','Kemy'];
    const ranking=staff.map(w=>{ const l=thisMonth.filter(r=>r.worker===w); return {name:w, earned:l.reduce((sum,r)=>sum+r.workerGets,0), count:l.length}; }).sort((a,b)=>b.earned-a.earned);
    detail.innerHTML=`<h3>📅 ${monthName(monthKey)} - FULL REPORT</h3>
    <p><strong>Total Collected:</strong> KSh ${s.collected.toLocaleString()}<br><strong>Staff Pay:</strong> KSh ${s.staffPay.toLocaleString()}<br><strong>Money To Salon:</strong> KSh ${s.salonMoney.toLocaleString()}</p>
    <p><strong>🏆 Ranking:</strong><br>${ranking.map((r,i)=>`${i+1}. ${r.name} - KSh ${r.earned.toLocaleString()} (${r.count} customers)`).join('<br')}</p>
    <p><strong>👑 Customer of Month:</strong> ${bestCust?bestCust.name+' - '+bestCust.visits+' visits, KSh '+bestCust.total.toLocaleString()+' - Gets FREE SHOPPING 🛍️':'No data'}</p>
    <p><strong>💸 Expenses (KSh ${totalEx.toLocaleString()}):</strong><br>${ex.length?ex.map(e=>`• ${e.type}: KSh ${e.amount.toLocaleString()} - ${e.note||''} (${e.date})`).join('<br>'):'No expenses yet'}</p>
    <p><strong>🧾 All Customers This Month (${thisMonth.length}):</strong><br>${thisMonth.length?thisMonth.map(r=>`• ${r.date} - ${r.worker} - ${r.customerName} - ${r.service} - KSh ${r.amount.toLocaleString()} ${r.paid?'✅ PAID':'⏳ UNPAID'}`).join('<br>'):'No customers yet'}</p>
    <p style="font-size:20px; color:#2e7d32;"><strong>✅ PROFIT: KSh ${profit.toLocaleString()}</strong></p>
    <button onclick="document.getElementById('monthlyDetail').style.display='none'" class="secondary">Close</button>`;
  }
}
document.getElementById('viewLastMonthBtn').addEventListener('click', ()=>showMonthDetail(prevMonthKey(), true));
document.getElementById('viewThisMonthBtn').addEventListener('click', ()=>showMonthDetail(currentMonthKey(), false));
document.getElementById('viewAnyMonthBtn').addEventListener('click', ()=>{
  const m = anyMonthSelect.value;
  if(m) showMonthDetail(m, !!archive[m]);
});
function renderWinners(){
  const curKey=currentMonthKey();
  const thisMonth=records.filter(r=>getMonthKey(r.date)===curKey && r.worker!=='Rachael');
  if(thisMonth.length===0){
    document.getElementById('employeeOfMonth').textContent='No data yet this month';
    document.getElementById('customerOfMonth').textContent='No data yet this month';
    document.getElementById('regularCustomers').textContent='No regulars yet. A customer needs 3+ visits.';
    document.getElementById('employeeRanking').innerHTML='';
    document.getElementById('voucherStatus').innerHTML='';
    return;
  }
  const staff=['Dorine','Betty','Kemy'];
  const ranking=staff.map(w=>{ const list=thisMonth.filter(r=>r.worker===w); return {name:w, earned:list.reduce((s,r)=>s+r.workerGets,0), count:list.length}; }).sort((a,b)=>b.earned-a.earned);
  const top=ranking[0];
  const voucherMsg = top.earned>30000 ? `✅ QUALIFIES FOR VOUCHER! Over 30,000` : `Needs KSh ${(30000-top.earned).toLocaleString()} more to qualify for Voucher`;
  document.getElementById('employeeOfMonth').innerHTML=`🏆 ${top.name}<br><small style="font-weight:normal">Earned KSh ${top.earned.toLocaleString()} • ${top.count} customers<br>${voucherMsg}<br>Company buys lunch for everyone 🍔</small>`;
  document.getElementById('employeeRanking').innerHTML=ranking.map((r,i)=>`<div class="rank-row"><span>${i+1}. ${r.name}</span><span>KSh ${r.earned.toLocaleString()} (${r.count} cust)</span></div>`).join('');
  document.getElementById('voucherStatus').className='voucher-box '+(top.earned>30000?'eligible':'not');
  document.getElementById('voucherStatus').innerHTML=`🎁 Voucher Status: ${top.name} leads with KSh ${top.earned.toLocaleString()} - ${voucherMsg}`;
  const byCustomer={};
  records.filter(r=>getMonthKey(r.date)===curKey).forEach(r=>{ const key=r.customerName.toLowerCase().trim(); if(!byCustomer[key]) byCustomer[key]={name:r.customerName,total:0,visits:0}; byCustomer[key].total+=r.amount; byCustomer[key].visits+=1; });
  const customers=Object.values(byCustomer).sort((a,b)=>b.total-a.total);
  const bestCust=customers[0];
  document.getElementById('customerOfMonth').innerHTML=`👑 ${bestCust.name}<br><small style="font-weight:normal">Paid KSh ${bestCust.total.toLocaleString()} • ${bestCust.visits} visits<br>Gets FREE SHOPPING 🛍️</small>`;
  const allByCust={};
  records.forEach(r=>{ const key=r.customerName.toLowerCase().trim(); if(!allByCust[key]) allByCust[key]={name:r.customerName,visits:0,total:0}; allByCust[key].visits+=1; allByCust[key].total+=r.amount; });
  const regulars=Object.values(allByCust).filter(c=>c.visits>=3).sort((a,b)=>b.visits-a.visits);
  document.getElementById('regularCustomers').innerHTML=regulars.length?regulars.map(c=>`<div class="regular-item"><span><b>${c.name}</b> - ${c.visits} visits • KSh ${c.total.toLocaleString()}</span><span class="soda">🥤 FREE SODA</span></div>`).join(''):'No regulars yet. A customer needs 3+ visits.';
}
function renderExpenses(){
  const tbody=document.getElementById('expenseTable');
  tbody.innerHTML='';
  let filtered = [...expenses];
  if(filterExpenseMonth.value==='CURRENT') filtered = filtered.filter(e=>getMonthKey(e.date)===currentMonthKey());
  else if(filterExpenseMonth.value!=='ALL') filtered = filtered.filter(e=>getMonthKey(e.date)===filterExpenseMonth.value);
  const sorted=[...filtered].reverse();
  document.getElementById('noExpenses').style.display=sorted.length?'none':'block';
  sorted.forEach(e=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${e.date}</td><td>${e.type}</td><td>${e.note||''}</td><td>KSh ${e.amount.toLocaleString()}</td><td class="action-cell"><button class="expense-edit-btn" onclick="startExpenseEdit(${e.id})">✏️ Edit</button><button class="delete-btn" onclick="deleteExpense(${e.id})">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  const total=filtered.reduce((s,e)=>s+e.amount,0);
  document.getElementById('totalExpenses').textContent='KSh '+total.toLocaleString();
}
function deleteRecord(id){
  if(editingId===id) cancelEdit();
  const rec=records.find(r=>r.id===id);
  if(rec && confirm('Delete this customer? This will remove it from Leaderboard too.')){
    if(rec.worker!=='Rachael' && allTime[rec.worker]) allTime[rec.worker].earned-=rec.workerGets;
    if(allTime[rec.worker]){ allTime[rec.worker].count-=1; allTime[rec.worker].collected-=rec.amount; }
    allTime.salonKept-=rec.salonGets; allTime.totalCollected-=rec.amount; allTime.totalPaid-=rec.workerGets;
    saveAllTime();
    records=records.filter(r=>r.id!==id);
    saveAndRender();
  }
}
// MARK WEEK AS PAID - DOES NOT DELETE MONTHS!
document.getElementById('clearWeekBtn').addEventListener('click', ()=>{
  const unpaid = records.filter(r=>!r.paid);
  if(unpaid.length===0){ alert('Nothing to pay - all customers are already marked PAID'); return; }
  if(confirm(`Mark ${unpaid.length} customers as PAID? They will stay in All Customers & Months, but disappear from Weekly Pay.`)){
    records.forEach(r=>{ if(!r.paid) r.paid=true; });
    saveRecords(); render();
    alert(`✅ Paid! ${unpaid.length} customers marked as PAID. Months still saved forever.`);
  }
});
document.getElementById('printBtn').addEventListener('click', ()=>window.print());
filterWorker.addEventListener('change', render);
filterMonth.addEventListener('change', render);
filterPaid.addEventListener('change', render);
filterExpenseMonth.addEventListener('change', render);

// ===== DELETE EVERYTHING - WITH PASSWORD =====
document.getElementById('resetAllBtn').addEventListener('click', ()=>{
  const pass = document.getElementById('deletePassword').value;
  if(pass !== DELETE_PASSWORD){
    alert('❌ WRONG PASSWORD! Cannot delete. Only Rachael knows the password.');
    document.getElementById('deletePassword').value = '';
    return;
  }
  if(!confirm('⚠️ PASSWORD CORRECT. Are you SURE? This deletes EVERYTHING - ALL MONTHS - forever!')) return;
  if(!confirm('Last chance! Press OK again to DELETE ALL for Beauty Spot forever.')) return;
  localStorage.removeItem('beautySpotRecords'); localStorage.removeItem('beautySpotMonthly'); localStorage.removeItem('beautySpotAllTime'); localStorage.removeItem('beautySpotExpenses'); localStorage.removeItem('beautySpotArchive'); localStorage.removeItem('mySalonRecords');
  alert('✅ Everything deleted! Beauty Spot starting fresh.'); location.reload();
});
updateMonthlyStorage();
render();
const availableDates = [
  '2026-09-06',
  '2026-10-04',
  '2026-11-08',
  '2026-12-06',
  '2027-01-31',
  '2027-02-07',
  '2027-03-07'
];

const MAX_DELIVERIES_PER_DAY = 5;

const ORDER_SHEET_ENDPOINT = 'https://sheetdb.io/api/v1/uk1qgq5w9423u';

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;

  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;

  if (/^\d{4,6}(\.\d+)?$/.test(str)) {
    const serial = parseFloat(str);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + serial * 86400000);
    if (!isNaN(d)) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return null;
}

function getDeliveryDateField(row) {
  const key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase() === 'deliverydate');
  return key ? row[key] : null;
}

async function getDateCounts() {
  const counts = {};
  try {
    const res = await fetch(ORDER_SHEET_ENDPOINT);
    if (!res.ok) throw new Error('Could not load existing orders');
    const rows = await res.json();
    rows.forEach(row => {
      const d = normalizeDate(getDeliveryDateField(row));
      if (!d) return;
      counts[d] = (counts[d] || 0) + 1;
    });
  } catch (err) {
    console.error('Could not fetch existing order counts:', err);
  }
  return counts;
}

async function populateDates() {
  const select = document.getElementById('deliveryDate');
  select.innerHTML = '<option disabled selected>Loading available dates...</option>';

  const today = new Date();
  today.setHours(0,0,0,0);
  const futureDates = availableDates.filter(d => new Date(d + 'T00:00:00') >= today);
  const counts = await getDateCounts();

  const openDates = futureDates.filter(d => (counts[d] || 0) < MAX_DELIVERIES_PER_DAY);

  select.innerHTML = '';

  if (openDates.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No dates currently available — please call us';
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }
  openDates.forEach(dateStr => {
    const opt = document.createElement('option');
    opt.value = dateStr;
    const remaining = MAX_DELIVERIES_PER_DAY - (counts[dateStr] || 0);
    const slotNote = remaining <= 2 ? ` (${remaining} slot${remaining === 1 ? '' : 's'} left)` : '';
    opt.textContent = formatDateLabel(dateStr) + slotNote;
    select.appendChild(opt);
  });
}
populateDates();

document.getElementById('orderForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const statusEl = document.getElementById('orderStatus');
  const chosenDate = document.getElementById('deliveryDate').value;

  statusEl.style.color = 'var(--parchment-2)';
  statusEl.textContent = 'Checking availability...';

  const counts = await getDateCounts();
  if ((counts[chosenDate] || 0) >= MAX_DELIVERIES_PER_DAY) {
    statusEl.style.color = '#EFC0B0';
    statusEl.textContent = 'Sorry, that date just filled up. Please pick another date.';
    await populateDates();
    return;
  }

  const order = {
    Timestamp: new Date().toISOString(),
    Name: document.getElementById('custName').value,
    Address: document.getElementById('custAddress').value,
    Phone: document.getElementById('custPhone').value,
    Email: document.getElementById('custEmail').value,
    OrderType: document.getElementById('woodType').value,
    Quantity: document.getElementById('quantity').value,
    DeliveryDate: chosenDate
  };

  statusEl.textContent = 'Sending order...';

  try {
    const response = await fetch(ORDER_SHEET_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [order] })
    });
    if (!response.ok) throw new Error('Request failed');

    statusEl.style.color = '#B7D9A8';
    statusEl.textContent = 'Order placed! We will confirm your delivery shortly.';
    document.getElementById('orderForm').reset();
    populateDates();
  } catch (err) {
    statusEl.style.color = '#EFC0B0';
    statusEl.textContent = 'Something went wrong sending your order — please call or WhatsApp us instead.';
  }
});

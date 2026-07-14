const ORDER_SHEET_ENDPOINT = 'https://sheetdb.io/api/v1/uk1qgq5w9423u';
const LOGGING_AVAILABILITY_ENDPOINT = `${ORDER_SHEET_ENDPOINT}?sheet=LoggingAvailability`;
const LOGGING_JOBS_ENDPOINT = `${ORDER_SHEET_ENDPOINT}?sheet=LoggingJobs`;

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

function getFieldByName(row, name) {
  const key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase() === name.toLowerCase());
  return key ? row[key] : null;
}

async function populateBookingDates() {
  const select = document.getElementById('jobDate');
  select.innerHTML = '<option disabled selected>Loading available dates...</option>';

  try {
    const res = await fetch(LOGGING_AVAILABILITY_ENDPOINT);
    if (!res.ok) throw new Error('Could not load logging availability');
    const rows = await res.json();

    const today = new Date();
    today.setHours(0,0,0,0);

    const dates = [...new Set(
      rows.map(r => normalizeDate(getFieldByName(r, 'date'))).filter(Boolean)
    )].filter(d => new Date(d + 'T00:00:00') >= today).sort();

    select.innerHTML = '';

    if (dates.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No dates currently available — please call us';
      opt.disabled = true;
      select.appendChild(opt);
      return;
    }
    dates.forEach(dateStr => {
      const opt = document.createElement('option');
      opt.value = dateStr;
      opt.textContent = formatDateLabel(dateStr);
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Could not load logging availability:', err);
    select.innerHTML = '<option disabled selected>Could not load dates — please call us</option>';
  }
}
populateBookingDates();

document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const statusEl = document.getElementById('bookingStatus');
  statusEl.style.color = 'var(--parchment-2)';
  statusEl.textContent = 'Sending request...';

  const job = {
    Timestamp: new Date().toISOString(),
    Name: document.getElementById('jobName').value,
    Address: document.getElementById('jobAddress').value,
    Phone: document.getElementById('jobPhone').value,
    Email: document.getElementById('jobEmail').value,
    JobDescription: document.getElementById('jobDescription').value,
    PreferredDate: document.getElementById('jobDate').value
  };

  try {
    const response = await fetch(LOGGING_JOBS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [job] })
    });
    if (!response.ok) throw new Error('Request failed');

    statusEl.style.color = '#B7D9A8';
    statusEl.textContent = 'Request sent! We will confirm the details and price shortly.';
    document.getElementById('bookingForm').reset();
    populateBookingDates();
  } catch (err) {
    statusEl.style.color = '#EFC0B0';
    statusEl.textContent = 'Something went wrong — please call or WhatsApp us instead.';
  }
});

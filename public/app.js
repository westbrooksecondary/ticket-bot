const apiUrl = (window.BLACKLIST_CONFIG?.apiUrl || '').replace(/\/$/, '');
const entryList = document.querySelector('#entry-list');
const searchInput = document.querySelector('#search');
const feedNote = document.querySelector('#feed-note');
let entries = [];
let refreshTimer;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function setStatus(online, label) {
  document.querySelector('#api-dot').classList.toggle('online', online);
  document.querySelector('#api-status').textContent = label;
}

function renderEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = entries.filter((entry) => [
    entry.username, entry.userId, entry.reason, entry.guildName, entry.addedByName,
  ].some((value) => String(value || '').toLowerCase().includes(query)));
  document.querySelector('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;

  if (!filtered.length) {
    entryList.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">/</span><h3>${entries.length ? 'No matching entries' : 'No blacklist entries yet'}</h3><p>${entries.length ? 'Try a different search.' : 'Entries added with the Discord /blacklist command will appear here.'}</p></div>`;
    return;
  }

  entryList.innerHTML = filtered.map((entry, index) => `
    <article class="entry-row">
      <span class="row-number">${String(index + 1).padStart(2, '0')}</span>
      <div class="member-cell"><span class="member-icon" aria-hidden="true">${escapeHTML((entry.username || '?').slice(0, 1).toUpperCase())}</span><div class="member-copy"><strong>${escapeHTML(entry.username || 'Unknown user')}</strong><span>${escapeHTML(entry.userId)}</span></div></div>
      <div class="reason-cell"><span class="mobile-label">REASON</span><p>${escapeHTML(entry.reason || 'No reason provided')}</p></div>
      <div class="server-cell"><span class="mobile-label">SERVER</span><span class="server-tag">${escapeHTML(entry.guildName || 'Unknown server')}</span></div>
      <div class="date-cell"><span class="mobile-label">ADDED</span><time datetime="${escapeHTML(entry.addedAt || '')}">${escapeHTML(formatDate(entry.addedAt))}</time><small>by ${escapeHTML(entry.addedByName || 'moderator')}</small></div>
    </article>`).join('');
}

async function loadBlacklist(showLoading = false) {
  if (!apiUrl || apiUrl.includes('your-blacklist-api.example.com')) {
    setStatus(false, 'API not configured');
    feedNote.hidden = false;
    feedNote.textContent = 'Set the API URL in public/config.js and deploy the blacklist API to publish entries here.';
    entryList.innerHTML = '<div class="empty-state"><span class="empty-mark" aria-hidden="true">!</span><h3>Feed not connected</h3><p>The dashboard needs the public API address to load the registry.</p></div>';
    return;
  }
  if (showLoading) entryList.innerHTML = '<div class="loading-state"><span class="loader"></span>Updating blacklist</div>';
  try {
    const response = await fetch(`${apiUrl}/api/blacklist`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    entries = Array.isArray(data.entries) ? data.entries : [];
    document.querySelector('#entry-count').textContent = String(entries.length).padStart(2, '0');
    document.querySelector('#server-count').textContent = String(new Set(entries.map((entry) => entry.guildId)).size).padStart(2, '0');
    document.querySelector('#last-sync').textContent = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(data.updatedAt || Date.now()));
    feedNote.hidden = true;
    setStatus(true, 'Live feed');
    renderEntries();
  } catch (error) {
    setStatus(false, 'Feed unavailable');
    feedNote.hidden = false;
    feedNote.textContent = 'Could not reach the blacklist API. Check that the service is online and its URL is correct.';
    if (!entries.length) entryList.innerHTML = '<div class="empty-state"><span class="empty-mark" aria-hidden="true">!</span><h3>Feed unavailable</h3><p>Blacklist entries will show here when the API is online.</p></div>';
    console.error('Blacklist fetch failed:', error);
  }
}

searchInput.addEventListener('input', renderEntries);
document.querySelector('#refresh').addEventListener('click', () => loadBlacklist(true));
loadBlacklist(true);
refreshTimer = setInterval(() => loadBlacklist(), 30000);
window.addEventListener('pagehide', () => clearInterval(refreshTimer));
document.title = 'आमंत्रण';

const defaults = {
  groom: 'आकाश', bride: 'वैष्णवी', note: 'आपल्या प्रेमळ उपस्थितीची अपेक्षा आहे.',
  welcomeKicker: 'शुभ मंगल सावधान', welcomeTitle: 'आमच्या शुभविवाहाचे हार्दिक आमंत्रण', welcomeCopy: 'तुमच्या उपस्थितीने आमचा आनंद द्विगुणित होईल.',
  logoInitialLeft: 'अ', logoInitialRight: 'व', surname: 'SHUBH VIVAH', shareUrl: '', couplePhoto: '', weddingBackground: '',
  parents: { title:'आई व वडील', symbol:'♡', fields:[['नावे','श्री. व सौ. आपले नाव']] },
  venue: { title:'विवाह स्थळ', symbol:'⌂', fields:[['स्थळाचे नाव','आपले विवाह स्थळ'],['पूर्ण पत्ता','येथे पूर्ण पत्ता लिहा']], coordinates:{ latitude:'', longitude:'' } },
  datetime: { title:'दिनांक व वेळ', symbol:'◷', fields:[['दिनांक','रविवार, १५ डिसेंबर २०२६'],['वेळ','सायंकाळी ६:०० वाजता']] },
  wellwishers: { title:'आपले कृपाभीलाषी', symbol:'✧', fields:[['नावे','आपले प्रियजन व मित्रपरिवार']] },
  welcome: { title:'स्वागतोत्सुक', symbol:'✤', fields:[['नावे','आपले नाव व कुटुंब']] },
  mama: { title:'आमच्या मामाच्या लग्नाला यायचं हं!', symbol:'☻', fields:[['संदेश','तुमची उपस्थिती आमच्यासाठी खूप खास आहे!']] }
};

const folderOrder = ['parents','venue','datetime','wellwishers','welcome','mama'];
const syncConfig = window.WEDDING_SYNC_CONFIG || {};
const $ = selector => document.querySelector(selector);
let currentFolder = null;
let isAdmin = false;
let remoteWrite = Promise.resolve();
let invitationId = invitationIdFrom(new URLSearchParams(window.location.search).get('invite') || syncConfig.invitationId || 'wedding-invitation');
let state = normaliseState(readLocalState());

function clone(value) { return structuredClone(value); }
function readLocalState() {
  try { return JSON.parse(localStorage.getItem('marathiWeddingInvite') || 'null') || clone(defaults); }
  catch { return clone(defaults); }
}
function normaliseState(saved = {}) {
  const merged = { ...clone(defaults), ...saved };
  folderOrder.forEach(key => { merged[key] = { ...clone(defaults[key]), ...(saved[key] || {}) }; });
  merged.venue.coordinates = { ...clone(defaults.venue.coordinates), ...(saved.venue?.coordinates || {}) };
  return merged;
}
function invitationIdFrom(value) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72);
  return id || 'wedding-invitation';
}
function syncIsConfigured() { return /^https:\/\//i.test(String(syncConfig.databaseUrl || '')); }
function remoteUrl() { return `${String(syncConfig.databaseUrl).replace(/\/+$/, '')}/invitations/${encodeURIComponent(invitationId)}.json`; }
function persist(sync = true) {
  localStorage.setItem('marathiWeddingInvite', JSON.stringify(state));
  if (sync && syncIsConfigured()) queueRemoteSave();
}
function queueRemoteSave() {
  const documentToSave = { state: clone(state), updatedAt: Date.now() };
  remoteWrite = remoteWrite.catch(() => undefined).then(() => fetch(remoteUrl(), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(documentToSave)
  })).then(response => { if (!response.ok) throw new Error('Unable to save invitation online.'); })
    .catch(error => console.warn('Online invitation sync failed:', error));
  return remoteWrite;
}
async function loadRemoteState() {
  if (!syncIsConfigured()) return;
  try {
    const response = await fetch(remoteUrl(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to read invitation online.');
    const documentFromDatabase = await response.json();
    if (documentFromDatabase?.state) applyRemoteState(documentFromDatabase.state);
  } catch (error) { console.warn('Online invitation could not be loaded:', error); }
}
function applyRemoteState(remoteState) {
  state = normaliseState(remoteState); persist(false); loadImages(); updateText(); renderFolders();
  if (currentFolder) openModal(currentFolder);
}
function listenForRemoteChanges() {
  if (!syncIsConfigured() || !window.EventSource) return;
  const stream = new EventSource(remoteUrl());
  stream.addEventListener('put', event => {
    try { const change = JSON.parse(event.data); if (change.path === '/' && change.data?.state) applyRemoteState(change.data.state); }
    catch (error) { console.warn('Online invitation update could not be applied:', error); }
  });
}
function folderPreview(folder) { return state[folder].fields[0]?.[1] || ''; }
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
function renderFolders() {
  $('#folderGrid').innerHTML = folderOrder.map(key => {
    const folder = state[key];
    return `<button class="folder-card" data-folder="${key}" type="button"><span class="folder-icon">${folder.symbol}</span><b>${escapeHTML(folder.title)}</b><small>${escapeHTML(folderPreview(key))}</small><span class="chevron">›</span></button>`;
  }).join('');
  document.querySelectorAll('[data-folder]').forEach(element => element.addEventListener('click', () => openModal(element.dataset.folder)));
}
function loadImages() {
  const couple = state.couplePhoto || localStorage.getItem('couplePhoto');
  const background = state.weddingBackground || localStorage.getItem('weddingBackground');
  $('#welcomeBackdrop').style.backgroundImage = couple ? `linear-gradient(145deg,rgba(60,43,35,.4),rgba(88,31,37,.25)),url(${couple})` : '';
  $('#heroImage').style.backgroundImage = background ? `url(${background})` : (couple ? `url(${couple})` : '');
}
function updateText() {
  document.querySelectorAll('[data-key]').forEach(element => { element.textContent = state[element.dataset.key] || defaults[element.dataset.key]; });
  $('#notePreview').textContent = state.note;
}
function setAdminMode(enabled) {
  isAdmin = enabled;
  $('#couplePhotoBtn').classList.toggle('hidden', !enabled); $('#backgroundBtn').classList.toggle('hidden', !enabled);
  $('#adminLogout').classList.toggle('hidden', !enabled); $('#editToggle').classList.toggle('hidden', !enabled);
  $('#guestWhatsAppShare').classList.toggle('hidden', enabled);
  $('#adminHomePanel').classList.toggle('hidden', !enabled); $('#showAdminLogin').classList.toggle('hidden', enabled);
  document.querySelectorAll('[data-key]').forEach(element => { element.contentEditable = enabled ? 'true' : 'false'; element.title = enabled ? 'नाव बदलण्यासाठी टॅप करा' : ''; });
}
function openModal(key) {
  currentFolder = key;
  const folder = key === 'note' ? { title:'टीप', symbol:'✦', fields:[['आपली टीप',state.note]] } : state[key];
  $('#modalSymbol').textContent = folder.symbol; $('#modalKicker').textContent = key === 'note' ? 'विशेष संदेश' : 'विवाह सोहळा'; $('#modalTitle').textContent = folder.title;
  $('#modalFields').innerHTML = ''; $('#venueTabs').classList.toggle('hidden', key !== 'venue'); $('#mapPanel').classList.add('hidden');
  folder.fields.forEach(([label, value]) => addField(label, value, key === 'note'));
  if (key === 'venue') { addCoordinateField('Latitude', 'latitude', state.venue.coordinates.latitude); addCoordinateField('Longitude', 'longitude', state.venue.coordinates.longitude); renderMapPanel(); showVenueTab('location'); }
  $('#addDetail').classList.toggle('hidden', key === 'note' || !isAdmin); $('#saveDetail').classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('#modalFields input, #modalFields textarea').forEach(element => { element.disabled = !isAdmin; });
  document.querySelectorAll('.remove-detail').forEach(element => element.classList.toggle('hidden', !isAdmin));
  $('#detailModal').classList.remove('hidden');
}
function addField(label = 'माहितीचे शीर्षक', value = '', isNote = false) {
  const field = document.createElement('div'); field.className = 'field';
  if (isNote || ['पूर्ण पत्ता', 'संदेश'].includes(label)) field.classList.add('full-width');
  field.innerHTML = isNote ? `<label>आपली टीप</label><textarea data-value>${escapeHTML(value)}</textarea>` : `<input class="field-label-input" data-label value="${escapeHTML(label)}" aria-label="माहितीचे शीर्षक" /><input data-value value="${escapeHTML(value)}" aria-label="तपशील" /><button class="remove-detail" type="button" aria-label="ही माहिती काढा">×</button>`;
  $('#modalFields').append(field);
}
function addCoordinateField(label, key, value) {
  const field = document.createElement('div'); field.className = 'field coordinate-field';
  field.innerHTML = `<label>${label}</label><input data-coordinate="${key}" type="text" inputmode="decimal" value="${escapeHTML(value)}" placeholder="उदा. 18.5204" aria-label="${label}" />`;
  $('#modalFields').append(field);
}
function coordinatesAreValid() {
  const { latitude, longitude } = state.venue.coordinates; const lat = Number(latitude); const lng = Number(longitude);
  return latitude !== '' && longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
function googleMapsUrl() { const { latitude, longitude } = state.venue.coordinates; return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`; }
function renderMapPanel() {
  $('#mapPanel').innerHTML = coordinatesAreValid() ? `<p>जतन केलेले ठिकाण पाहण्यासाठी Google Maps उघडा.</p><a class="google-maps-link" href="${googleMapsUrl()}" target="_blank" rel="noopener">Google Maps उघडा ↗</a>` : '<p>अचूक नकाशा पाहण्यासाठी Admin ने Latitude आणि Longitude जतन करावे.</p>';
}
function showVenueTab(tab) {
  if (currentFolder !== 'venue') return;
  const showMap = tab === 'maps';
  document.querySelectorAll('[data-venue-tab]').forEach(button => { const active = button.dataset.venueTab === tab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $('#modalFields').classList.toggle('hidden', showMap); $('#mapPanel').classList.toggle('hidden', !showMap);
  $('#addDetail').classList.toggle('hidden', showMap || !isAdmin); $('#saveDetail').classList.toggle('hidden', showMap || !isAdmin);
}
function closeModal() { $('#detailModal').classList.add('hidden'); currentFolder = null; }
function fileToStore(input, key) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    try { state[key] = reader.result; localStorage.setItem(key, reader.result); persist(); loadImages(); }
    catch { alert('फोटोचा आकार खूप मोठा आहे. कृपया छोटा फोटो निवडा.'); }
  }; reader.readAsDataURL(file);
}
function showInvitation(name, admin = false) {
  setAdminMode(admin); $('#guestGreeting').textContent = admin ? 'प्रिय आयोजक' : (name ? `प्रिय ${name}` : 'प्रिय पाहुणे');
  $('#welcomeScreen').classList.add('hidden'); $('#adminScreen').classList.add('hidden'); $('#invitationScreen').classList.remove('hidden');
}
function suggestedShareUrl() {
  if (!/^https?:$/.test(window.location.protocol)) return '';
  const url = new URL(window.location.href); url.searchParams.set('invite', invitationId); return url.toString();
}
function normaliseShareUrl(value) {
  const url = new URL(value.trim()); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('कृपया वैध वेब लिंक द्या.');
  url.searchParams.set('invite', invitationId); return url.toString();
}
function openShareModal() { $('#shareError').classList.add('hidden'); $('#shareLinkInput').value = state.shareUrl || suggestedShareUrl(); $('#shareModal').classList.remove('hidden'); }
function closeShareModal() { $('#shareModal').classList.add('hidden'); }
function saveShareLink() {
  try { state.shareUrl = normaliseShareUrl($('#shareLinkInput').value); $('#shareLinkInput').value = state.shareUrl; persist(); $('#shareError').classList.add('hidden'); return true; }
  catch (error) { $('#shareError').textContent = error.message; $('#shareError').classList.remove('hidden'); return false; }
}
function shareOnWhatsApp() {
  if (!saveShareLink()) return;
  if (!syncIsConfigured()) { $('#shareError').textContent = 'ही लिंक सर्व उपकरणांवर अद्ययावत ठेवण्यासाठी sync-config.js मध्ये online database URL जोडा.'; $('#shareError').classList.remove('hidden'); return; }
  queueRemoteSave().then(() => window.open(`https://wa.me/?text=${encodeURIComponent(`आपल्यासाठी शुभविवाहाचे आमंत्रण: ${state.shareUrl}`)}`, '_blank', 'noopener'));
}
function shareSavedLinkAsGuest() {
  if (!state.shareUrl) {
    alert('Admin ने अद्याप WhatsApp शेअर लिंक जतन केलेली नाही.');
    return;
  }
  const message = `आपल्यासाठी शुभविवाहाचे आमंत्रण: ${state.shareUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

$('#guestForm').addEventListener('submit', event => { event.preventDefault(); showInvitation($('#guestName').value.trim()); });
$('#backBtn').addEventListener('click', () => { $('#invitationScreen').classList.add('hidden'); $('#welcomeScreen').classList.remove('hidden'); });
$('#showAdminLogin').addEventListener('click', () => { $('#welcomeScreen').classList.add('hidden'); $('#adminScreen').classList.remove('hidden'); $('#adminPassword').focus(); });
$('#adminBackBtn').addEventListener('click', () => { $('#adminScreen').classList.add('hidden'); $('#welcomeScreen').classList.remove('hidden'); });
$('#adminForm').addEventListener('submit', event => {
  event.preventDefault(); const savedPassword = localStorage.getItem('weddingAdminPassword') || 'admin123';
  if ($('#adminPassword').value !== savedPassword) { $('#loginError').classList.remove('hidden'); return; }
  $('#loginError').classList.add('hidden'); $('#adminPassword').value = ''; setAdminMode(true); $('#adminScreen').classList.add('hidden'); $('#welcomeScreen').classList.remove('hidden');
});
$('#adminLogout').addEventListener('click', () => { setAdminMode(false); $('#invitationScreen').classList.add('hidden'); $('#welcomeScreen').classList.remove('hidden'); });
$('#editCeremonyBtn').addEventListener('click', () => showInvitation('', true)); $('#whatsappShareBtn').addEventListener('click', openShareModal); $('#homeLogoutBtn').addEventListener('click', () => setAdminMode(false));
$('#guestWhatsAppShare').addEventListener('click', shareSavedLinkAsGuest);
$('#couplePhotoBtn').addEventListener('click', () => $('#couplePhotoInput').click()); $('#backgroundBtn').addEventListener('click', () => $('#backgroundInput').click());
$('#couplePhotoInput').addEventListener('change', event => fileToStore(event.target, 'couplePhoto')); $('#backgroundInput').addEventListener('change', event => fileToStore(event.target, 'weddingBackground'));
$('#addDetail').addEventListener('click', () => addField(['parents', 'wellwishers', 'welcome'].includes(currentFolder) ? 'नाव' : 'माहितीचे शीर्षक'));
$('#modalFields').addEventListener('click', event => { if (event.target.matches('.remove-detail')) event.target.closest('.field').remove(); });
$('#saveDetail').addEventListener('click', () => {
  if (currentFolder === 'note') state.note = $('#modalFields [data-value]').value.trim() || defaults.note;
  else {
    const fields = [...document.querySelectorAll('#modalFields .field:not(.coordinate-field)')].map(field => [field.querySelector('[data-label]').value.trim() || 'माहिती', field.querySelector('[data-value]').value.trim()]).filter(([, value]) => value);
    state[currentFolder].fields = fields.length ? fields : [['माहिती','']];
    if (currentFolder === 'venue') { state.venue.coordinates.latitude = $('#modalFields [data-coordinate="latitude"]').value.trim(); state.venue.coordinates.longitude = $('#modalFields [data-coordinate="longitude"]').value.trim(); }
  }
  persist(); updateText(); renderFolders(); closeModal();
});
document.querySelectorAll('[data-close]').forEach(element => element.addEventListener('click', closeModal)); document.querySelectorAll('[data-share-close]').forEach(element => element.addEventListener('click', closeShareModal));
document.querySelectorAll('[data-venue-tab]').forEach(button => button.addEventListener('click', () => showVenueTab(button.dataset.venueTab)));
$('#editToggle').addEventListener('click', () => openModal('note')); $('#saveShareLink').addEventListener('click', saveShareLink); $('#sendWhatsApp').addEventListener('click', shareOnWhatsApp);
document.querySelectorAll('[data-key]').forEach(element => element.addEventListener('blur', () => { if (!isAdmin) return; state[element.dataset.key] = element.textContent.trim() || defaults[element.dataset.key]; persist(); }));

async function initialiseApp() { loadImages(); updateText(); renderFolders(); setAdminMode(false); await loadRemoteState(); listenForRemoteChanges(); }
initialiseApp();

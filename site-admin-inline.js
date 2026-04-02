(function () {
  const STORAGE_KEY = 'mukhlis-admin-content';
  const SESSION_KEY = 'mukhlis-admin-inline-session';
  const DEFAULT_PIN = 'mukhlis2026';
  const DEFAULT_REMOTE_DOC_PATH = 'siteContent/main';

  let firebaseSettings = null;

  const state = {
    mode: 'local',
    firebaseReady: false,
    backendReady: false,
    firestore: null,
    auth: null,
    docRef: null,
    helpers: null,
    user: null,
    storeCache: {},
    remoteDocPath: DEFAULT_REMOTE_DOC_PATH,
    editMode: false,
    launcherVisible: false
  };

  function isLauncherAllowed() {
    return window.location.search.includes('admin=1') || sessionStorage.getItem('mukhlis-admin-launcher') === 'visible';
  }

  function showLauncher() {
    const entry = document.querySelector('.admin-entry-link');
    if (!entry) {
      return;
    }

    state.launcherVisible = true;
    entry.hidden = false;
    document.body.classList.add('admin-launcher-visible');
    sessionStorage.setItem('mukhlis-admin-launcher', 'visible');
  }

  function injectLauncherHotspot() {
    if (document.getElementById('adminLauncherHotspot')) {
      return;
    }

    const hotspot = document.createElement('button');
    hotspot.type = 'button';
    hotspot.id = 'adminLauncherHotspot';
    hotspot.className = 'admin-launcher-hotspot';
    hotspot.setAttribute('aria-label', 'Hidden admin launcher');
    hotspot.title = 'Hidden admin launcher';
    hotspot.addEventListener('dblclick', () => {
      showLauncher();
    });

    document.body.appendChild(hotspot);
  }

  function loadLocalStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function saveLocalStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function removeLocalStore() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function loadOptionalFirebaseConfig() {
    if (window.MUKHLIS_ADMIN_FIREBASE_CONFIG) {
      firebaseSettings = window.MUKHLIS_ADMIN_FIREBASE_CONFIG;
      return;
    }

    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'firebase-config.js';
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });

    firebaseSettings = window.MUKHLIS_ADMIN_FIREBASE_CONFIG || null;
  }

  async function initBackend() {
    if (state.backendReady) {
      return;
    }

    const firebaseEnabled = Boolean(
      firebaseSettings &&
      firebaseSettings.enabled &&
      firebaseSettings.apiKey &&
      firebaseSettings.authDomain &&
      firebaseSettings.projectId &&
      firebaseSettings.appId
    );

    state.remoteDocPath = firebaseSettings && firebaseSettings.docPath ? firebaseSettings.docPath : DEFAULT_REMOTE_DOC_PATH;

    if (!firebaseEnabled) {
      state.mode = 'local';
      state.backendReady = true;
      state.storeCache = loadLocalStore();
      return;
    }

    try {
      const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js')
      ]);

      const app = initializeApp({
        apiKey: firebaseSettings.apiKey,
        authDomain: firebaseSettings.authDomain,
        projectId: firebaseSettings.projectId,
        appId: firebaseSettings.appId,
        storageBucket: firebaseSettings.storageBucket || undefined,
        messagingSenderId: firebaseSettings.messagingSenderId || undefined
      });

      state.auth = authModule.getAuth(app);
      state.firestore = firestoreModule.getFirestore(app);
      state.docRef = firestoreModule.doc(state.firestore, state.remoteDocPath);
      state.helpers = {
        getDoc: firestoreModule.getDoc,
        setDoc: firestoreModule.setDoc,
        onAuthStateChanged: authModule.onAuthStateChanged,
        signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
        signOut: authModule.signOut
      };

      state.mode = 'firebase';
      state.firebaseReady = true;
      state.backendReady = true;

      state.helpers.onAuthStateChanged(state.auth, (user) => {
        state.user = user || null;
        updateInlineAdminView();
      });

      state.storeCache = await loadRemoteStore();
      saveLocalStore(state.storeCache);
    } catch (error) {
      console.error('Firebase init failed:', error);
      state.mode = 'local';
      state.firebaseReady = false;
      state.backendReady = true;
      state.storeCache = loadLocalStore();
    }
  }

  async function loadRemoteStore() {
    if (!state.firebaseReady || !state.docRef || !state.helpers) {
      return loadLocalStore();
    }

    try {
      const snapshot = await state.helpers.getDoc(state.docRef);
      if (!snapshot.exists()) {
        return {};
      }

      const data = snapshot.data();
      return data && data.content ? data.content : {};
    } catch (error) {
      console.error('Failed to load Firestore content:', error);
      return loadLocalStore();
    }
  }

  async function saveStore(store) {
    state.storeCache = { ...store };
    saveLocalStore(state.storeCache);

    if (!state.firebaseReady || !state.docRef || !state.helpers) {
      return;
    }

    if (!state.user) {
      throw new Error('Anda perlu login untuk simpan ke Firebase.');
    }

    await state.helpers.setDoc(state.docRef, {
      content: state.storeCache,
      updatedAt: new Date().toISOString(),
      updatedBy: state.user.email || 'admin'
    }, { merge: true });
  }

  async function resetStore() {
    state.storeCache = {};
    removeLocalStore();

    if (!state.firebaseReady || !state.docRef || !state.helpers) {
      return;
    }

    if (!state.user) {
      throw new Error('Anda perlu login untuk reset data di Firebase.');
    }

    await state.helpers.setDoc(state.docRef, {
      content: {},
      updatedAt: new Date().toISOString(),
      updatedBy: state.user.email || 'admin'
    }, { merge: true });
  }

  function getAdminElements() {
    return Array.from(document.querySelectorAll('[data-admin-key]'));
  }

  function setElementValue(element, type, value) {
    switch (type) {
      case 'src':
        element.src = value;
        break;
      case 'href':
        element.href = value;
        break;
      case 'value':
        element.value = value;
        break;
      case 'phone':
        element.dataset.phoneNumber = value;
        if (element.hasAttribute('data-phone-display')) {
          element.textContent = value;
        }
        break;
      default:
        element.textContent = value;
        break;
    }
  }

  function getElementValue(element) {
    const type = element.dataset.adminType || 'text';
    switch (type) {
      case 'src':
        return element.getAttribute('src') || '';
      case 'href':
        return element.getAttribute('href') || '';
      case 'value':
        return element.value || '';
      case 'phone':
        return element.dataset.phoneNumber || '';
      default:
        return element.textContent.trim();
    }
  }

  function applyStoredContent(store) {
    const content = store || state.storeCache || {};
    getAdminElements().forEach((element) => {
      const key = element.dataset.adminKey;
      if (Object.prototype.hasOwnProperty.call(content, key)) {
        setElementValue(element, element.dataset.adminType || 'text', content[key]);
      }
    });
  }

  function syncStoreFromPage() {
    const nextStore = { ...state.storeCache };
    getAdminElements().forEach((element) => {
      nextStore[element.dataset.adminKey] = getElementValue(element);
    });
    state.storeCache = nextStore;
    return nextStore;
  }

  function handleInlineFieldAction(element) {
    const key = element.dataset.adminKey;
    const type = element.dataset.adminType || 'text';

    if (type === 'src') {
      const next = window.prompt('Masukkan URL gambar baru', element.getAttribute('src') || '');
      if (next !== null) {
        element.src = next.trim();
        state.storeCache[key] = next.trim();
      }
      return;
    }

    if (type === 'href') {
      const next = window.prompt('Masukkan link baru', element.getAttribute('href') || '');
      if (next !== null) {
        element.href = next.trim();
        state.storeCache[key] = next.trim();
      }
      return;
    }

    if (type === 'phone') {
      const next = window.prompt('Masukkan nombor telefon', element.dataset.phoneNumber || '');
      if (next !== null) {
        element.dataset.phoneNumber = next.trim();
        state.storeCache[key] = next.trim();
      }
    }
  }

  function enableEditMode() {
    state.editMode = true;
    document.body.classList.add('admin-inline-active');

    getAdminElements().forEach((element) => {
      const type = element.dataset.adminType || 'text';
      element.classList.add('admin-editable');

      if (type === 'text') {
        element.contentEditable = 'true';
        element.spellcheck = false;
      }

      if (type === 'value' && element.tagName === 'TEXTAREA') {
        element.readOnly = false;
      }

      if (type === 'src' || type === 'href' || type === 'phone') {
        element.dataset.adminClickable = 'true';
      }
    });
  }

  function disableEditMode() {
    state.editMode = false;
    document.body.classList.remove('admin-inline-active');

    getAdminElements().forEach((element) => {
      const type = element.dataset.adminType || 'text';
      element.classList.remove('admin-editable');
      element.removeAttribute('data-admin-clickable');

      if (type === 'text') {
        element.removeAttribute('contenteditable');
      }

      if (type === 'value' && element.tagName === 'TEXTAREA') {
        element.readOnly = true;
      }
    });
  }

  function injectInlineAdmin() {
    const entry = document.querySelector('.admin-entry-link');
    if (!entry || document.getElementById('inlineAdminPanel')) {
      return;
    }

    entry.setAttribute('href', '#');
    entry.setAttribute('aria-label', 'Open inline editor');
    entry.setAttribute('title', 'Edit Site');
    entry.hidden = !isLauncherAllowed();
    state.launcherVisible = !entry.hidden;

    if (state.launcherVisible) {
      document.body.classList.add('admin-launcher-visible');
    }
    entry.innerHTML = '<span aria-hidden="true">✎</span>';

    const panel = document.createElement('aside');
    panel.id = 'inlineAdminPanel';
    panel.className = 'inline-admin-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="inline-admin-card">
        <div class="inline-admin-head">
          <div>
            <p class="inline-admin-kicker">Site Admin</p>
            <h2>Edit terus pada halaman ini</h2>
          </div>
          <button type="button" class="inline-admin-close" id="inlineAdminClose" aria-label="Close admin panel">&times;</button>
        </div>
        <div class="inline-admin-mode" id="inlineAdminMode">Local Mode</div>
        <p class="inline-admin-note" id="inlineAdminNote">Login dan hidupkan edit mode untuk ubah kandungan terus pada tempat asal.</p>

        <form id="inlineAdminLoginForm" class="inline-admin-form">
          <div id="inlineAdminPinField">
            <input id="inlineAdminPin" class="admin-input" type="password" placeholder="Masukkan PIN admin" autocomplete="current-password">
          </div>
          <div id="inlineAdminEmailField" hidden>
            <input id="inlineAdminEmail" class="admin-input" type="email" placeholder="Admin email Firebase" autocomplete="username">
          </div>
          <div id="inlineAdminPasswordField" hidden>
            <input id="inlineAdminPassword" class="admin-input" type="password" placeholder="Admin password Firebase" autocomplete="current-password">
          </div>
          <button type="submit" class="btn inline-admin-submit">Login</button>
        </form>

        <div id="inlineAdminControls" hidden>
          <div class="inline-admin-actions">
            <button type="button" class="btn" id="inlineAdminToggleEdit">Start Editing</button>
            <button type="button" class="admin-secondary-btn" id="inlineAdminSave">Save</button>
            <button type="button" class="admin-secondary-btn" id="inlineAdminReset">Reset</button>
            <button type="button" class="admin-secondary-btn" id="inlineAdminLogout">Logout</button>
          </div>
          <p class="inline-admin-help">Teks boleh edit terus. Untuk gambar, link, dan nombor telefon, klik item itu semasa edit mode aktif.</p>
        </div>

        <p class="inline-admin-status" id="inlineAdminStatus"></p>
      </div>
    `;

    document.body.appendChild(panel);

    entry.addEventListener('click', (event) => {
      event.preventDefault();
      panel.hidden = !panel.hidden;
    });

    document.getElementById('inlineAdminClose').addEventListener('click', () => {
      panel.hidden = true;
    });
  }

  function updateInlineAdminView() {
    const panel = document.getElementById('inlineAdminPanel');
    if (!panel) {
      return;
    }

    const mode = document.getElementById('inlineAdminMode');
    const note = document.getElementById('inlineAdminNote');
    const loginForm = document.getElementById('inlineAdminLoginForm');
    const controls = document.getElementById('inlineAdminControls');
    const pinField = document.getElementById('inlineAdminPinField');
    const emailField = document.getElementById('inlineAdminEmailField');
    const passwordField = document.getElementById('inlineAdminPasswordField');
    const toggleEdit = document.getElementById('inlineAdminToggleEdit');

    const loggedIn = state.mode === 'firebase' ? Boolean(state.user) : sessionStorage.getItem(SESSION_KEY) === 'active';

    mode.textContent = state.mode === 'firebase' ? 'Firebase Mode' : 'Local Mode';
    note.textContent = state.mode === 'firebase'
      ? 'Cloud sync aktif. Login dan edit terus atas page ini.'
      : 'Perubahan disimpan dalam browser semasa. Layout asal page tidak diubah.';

    pinField.hidden = state.mode === 'firebase';
    emailField.hidden = state.mode !== 'firebase';
    passwordField.hidden = state.mode !== 'firebase';

    loginForm.hidden = loggedIn;
    controls.hidden = !loggedIn;
    toggleEdit.textContent = state.editMode ? 'Stop Editing' : 'Start Editing';
  }

  async function handleInlineLogin(event) {
    event.preventDefault();
    const status = document.getElementById('inlineAdminStatus');
    const pin = document.getElementById('inlineAdminPin');
    const email = document.getElementById('inlineAdminEmail');
    const password = document.getElementById('inlineAdminPassword');

    status.textContent = '';

    try {
      if (state.mode === 'firebase') {
        await state.helpers.signInWithEmailAndPassword(state.auth, email.value, password.value);
        state.storeCache = await loadRemoteStore();
        applyStoredContent(state.storeCache);
      } else if (pin.value === DEFAULT_PIN) {
        sessionStorage.setItem(SESSION_KEY, 'active');
      } else {
        status.textContent = 'PIN tidak tepat.';
      }
    } catch (error) {
      status.textContent = 'Login gagal.';
    }

    updateInlineAdminView();
  }

  async function bindInlineAdminActions() {
    const form = document.getElementById('inlineAdminLoginForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', handleInlineLogin);

    document.getElementById('inlineAdminToggleEdit').addEventListener('click', () => {
      if (state.editMode) {
        disableEditMode();
      } else {
        enableEditMode();
      }
      updateInlineAdminView();
    });

    document.getElementById('inlineAdminSave').addEventListener('click', async () => {
      const status = document.getElementById('inlineAdminStatus');
      try {
        await saveStore(syncStoreFromPage());
        status.textContent = state.mode === 'firebase'
          ? 'Perubahan berjaya disimpan ke Firebase.'
          : 'Perubahan berjaya disimpan.';
      } catch (error) {
        status.textContent = error.message || 'Simpan gagal.';
      }
    });

    document.getElementById('inlineAdminReset').addEventListener('click', async () => {
      const status = document.getElementById('inlineAdminStatus');
      try {
        await resetStore();
        applyStoredContent(state.storeCache);
        status.textContent = 'Perubahan custom telah dibuang.';
      } catch (error) {
        status.textContent = error.message || 'Reset gagal.';
      }
    });

    document.getElementById('inlineAdminLogout').addEventListener('click', async () => {
      const status = document.getElementById('inlineAdminStatus');
      status.textContent = '';
      disableEditMode();

      if (state.mode === 'firebase' && state.user) {
        await state.helpers.signOut(state.auth);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }

      updateInlineAdminView();
    });

    document.addEventListener('focusout', (event) => {
      const element = event.target.closest('[data-admin-key]');
      if (!state.editMode || !element) {
        return;
      }

      const type = element.dataset.adminType || 'text';
      if (type === 'text' || type === 'value') {
        state.storeCache[element.dataset.adminKey] = getElementValue(element);
      }
    });

    document.addEventListener('click', (event) => {
      const element = event.target.closest('[data-admin-key]');
      if (!state.editMode || !element) {
        return;
      }

      const type = element.dataset.adminType || 'text';
      if (type === 'src' || type === 'href' || type === 'phone') {
        event.preventDefault();
        event.stopPropagation();
        handleInlineFieldAction(element);
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey && event.shiftKey && key === 'a') || (event.altKey && event.shiftKey && key === 'e')) {
        event.preventDefault();
        showLauncher();
      }
    });
  }

  function syncLocalContentToPage() {
    if (state.mode !== 'local' || state.editMode) {
      return;
    }

    state.storeCache = loadLocalStore();
    applyStoredContent(state.storeCache);
  }

  async function boot() {
    injectInlineAdmin();
    injectLauncherHotspot();
    await loadOptionalFirebaseConfig();
    await initBackend();
    applyStoredContent(state.storeCache);
    await bindInlineAdminActions();
    updateInlineAdminView();
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      syncLocalContentToPage();
    }
  });
})();

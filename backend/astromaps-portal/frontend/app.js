// LocalStorage Session Helpers
function getToken() {
  return localStorage.getItem('astromaps_token');
}

function getUser() {
  const user = localStorage.getItem('astromaps_user');
  return user ? JSON.parse(user) : null;
}

function setSession(token, user) {
  localStorage.setItem('astromaps_token', token);
  localStorage.setItem('astromaps_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('astromaps_token');
  localStorage.removeItem('astromaps_user');
}

// Global Map & State Handles
let map;
let activeMarker = null;
let authMode = 'login';

function initCelestialMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof L === 'undefined') return;

  map = L.map('map', {
    center: [0, 0],
    zoom: 3,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 200);
}

function plotTarget(name, ra, dec) {
  if (!map) return;

  const lat = dec;
  const lng = ra > 180 ? ra - 360 : ra;

  if (activeMarker) {
    map.removeLayer(activeMarker);
  }

  activeMarker = L.marker([lat, lng]).addTo(map)
    .bindPopup(`<b style="color: #4f46e5;">${name}</b><br>RA: ${ra}°<br>Dec: ${dec}°`)
    .openPopup();

  map.setView([lat, lng], 6);
}

function updateAuthUI() {
  const user = getUser();
  const openAuthBtn = document.getElementById('openAuthBtn');
  const userInfo = document.getElementById('userInfo');
  const userGreeting = document.getElementById('userGreeting');
  const tabSolve = document.getElementById('tabSolve');
  const panelSolve = document.getElementById('panelSolve');

  if (user) {
    if (openAuthBtn) openAuthBtn.classList.add('hidden');
    if (userInfo) userInfo.classList.remove('hidden');
    if (userGreeting) userGreeting.textContent = `👤 ${user.username}`;
    if (tabSolve) tabSolve.classList.remove('hidden');
  } else {
    if (openAuthBtn) openAuthBtn.classList.remove('hidden');
    if (userInfo) userInfo.classList.add('hidden');
    if (tabSolve) tabSolve.classList.add('hidden');
    if (panelSolve) panelSolve.classList.add('hidden');

    switchTab('search');
  }
}

// Tab Switching
window.switchTab = function(tabName) {
  const tabSearch = document.getElementById('tabSearch');
  const tabSaved = document.getElementById('tabSaved');
  const tabSolve = document.getElementById('tabSolve');

  const panelSearch = document.getElementById('panelSearch');
  const panelSaved = document.getElementById('panelSaved');
  const panelSolve = document.getElementById('panelSolve');

  [tabSearch, tabSaved, tabSolve].forEach(tab => {
    if (tab) {
      tab.classList.remove('text-indigo-400', 'border-indigo-500');
      tab.classList.add('text-slate-400', 'border-transparent');
    }
  });

  [panelSearch, panelSaved, panelSolve].forEach(panel => {
    if (panel) panel.classList.add('hidden');
  });

  if (tabName === 'search' && tabSearch && panelSearch) {
    tabSearch.classList.add('text-indigo-400', 'border-indigo-500');
    panelSearch.classList.remove('hidden');
  } else if (tabName === 'saved' && tabSaved && panelSaved) {
    tabSaved.classList.add('text-indigo-400', 'border-indigo-500');
    panelSaved.classList.remove('hidden');
  } else if (tabName === 'solve' && tabSolve && panelSolve) {
    tabSolve.classList.add('text-indigo-400', 'border-indigo-500');
    panelSolve.classList.remove('hidden');
  }
};

// Modal Controls
window.openAuthModal = function(mode) {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    setAuthMode(mode || 'login');
    authModal.classList.remove('hidden');
  }
};

window.closeAuthModal = function() {
  const authModal = document.getElementById('authModal');
  const authError = document.getElementById('authError');
  if (authModal) authModal.classList.add('hidden');
  if (authError) authError.classList.add('hidden');
};

window.setAuthMode = function(mode) {
  authMode = mode;
  const authError = document.getElementById('authError');
  const modeLoginBtn = document.getElementById('modeLoginBtn');
  const modeRegisterBtn = document.getElementById('modeRegisterBtn');
  const usernameGroup = document.getElementById('usernameGroup');
  const authSubmitBtn = document.getElementById('authSubmitBtn');

  if (authError) authError.classList.add('hidden');

  if (mode === 'login') {
    if (modeLoginBtn) {
      modeLoginBtn.classList.add('text-indigo-400', 'border-indigo-500');
      modeLoginBtn.classList.remove('text-slate-400', 'border-transparent');
    }
    if (modeRegisterBtn) {
      modeRegisterBtn.classList.remove('text-indigo-400', 'border-indigo-500');
      modeRegisterBtn.classList.add('text-slate-400', 'border-transparent');
    }
    if (usernameGroup) usernameGroup.classList.add('hidden');
    if (authSubmitBtn) authSubmitBtn.textContent = 'Sign In';
  } else {
    if (modeRegisterBtn) {
      modeRegisterBtn.classList.add('text-indigo-400', 'border-indigo-500');
      modeRegisterBtn.classList.remove('text-slate-400', 'border-transparent');
    }
    if (modeLoginBtn) {
      modeLoginBtn.classList.remove('text-indigo-400', 'border-indigo-500');
      modeLoginBtn.classList.add('text-slate-400', 'border-transparent');
    }
    if (usernameGroup) usernameGroup.classList.remove('hidden');
    if (authSubmitBtn) authSubmitBtn.textContent = 'Create Account';
  }
};

window.handleLogout = function() {
  clearSession();
  updateAuthUI();
};

window.performSearch = async function() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  if (!searchInput || !searchResults) return;

  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(`/api/astro/catalog/search?query=${encodeURIComponent(query)}`);
    const data = await res.json();

    searchResults.innerHTML = '';
    if (!data || data.length === 0) {
      searchResults.innerHTML = '<p class="text-slate-400">No objects found matching query.</p>';
      return;
    }

    data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-slate-800 border border-slate-700 rounded p-2 hover:border-indigo-500 cursor-pointer transition';
      card.innerHTML = `
        <div class="font-bold text-indigo-300">${item.catalog_id} - ${item.object_name}</div>
        <div class="text-slate-400 text-xs">Type: ${item.type} | RA: ${item.ra}° | Dec: ${item.dec}°</div>
      `;
      card.addEventListener('click', () => plotTarget(`${item.catalog_id} - ${item.object_name}`, item.ra, item.dec));
      searchResults.appendChild(card);
    });
  } catch (err) {
    searchResults.innerHTML = `<p class="text-rose-400">Search error: ${err.message}</p>`;
  }
};

// Form Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initCelestialMap();
  updateAuthUI();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  const authForm = document.getElementById('authForm');
  const authError = document.getElementById('authError');

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      const username = document.getElementById('authUsername').value;

      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' ? { email, password } : { username, email, password };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        setSession(data.token, data.user);
        updateAuthUI();
        closeAuthModal();
        authForm.reset();
      } catch (err) {
        if (authError) {
          authError.textContent = err.message;
          authError.classList.remove('hidden');
        }
      }
    });
  }

  const solveForm = document.getElementById('solveForm');
  const solveStatus = document.getElementById('solveStatus');
  const solveResult = document.getElementById('solveResult');

  if (solveForm) {
    solveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('imageFile');
      if (!fileInput || !fileInput.files[0]) return;

      const formData = new FormData();
      formData.append('image', fileInput.files[0]);

      if (solveStatus) {
        solveStatus.textContent = 'Solving celestial field...';
        solveStatus.classList.remove('hidden');
      }
      if (solveResult) solveResult.classList.add('hidden');

      try {
        const response = await fetch('/api/solver/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          },
          body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Plate solving failed');

        if (solveStatus) solveStatus.classList.add('hidden');

        if (solveResult) {
          solveResult.innerHTML = `
            <p class="font-bold text-emerald-400">Match Found: ${data.matched_object}</p>
            <p class="text-slate-300">RA: ${data.solved_center.ra_deg}° | Dec: ${data.solved_center.dec_deg}°</p>
            <p class="text-xs text-slate-400">Engine: ${data.solver_engine}</p>
          `;
          solveResult.classList.remove('hidden');
        }

        if (data.solved_center) {
          plotTarget(data.matched_object, data.solved_center.ra_deg, data.solved_center.dec_deg);
        }

      } catch (err) {
        if (solveStatus) {
          solveStatus.textContent = `Error: ${err.message}`;
          solveStatus.classList.remove('hidden');
        }
      }
    });
  }
});
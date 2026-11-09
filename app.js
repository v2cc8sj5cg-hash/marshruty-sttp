const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([59.9386, 30.3141], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const layers = {
  routes: L.geoJSON(null, {style: f => ({color: f.properties?.color || '#2774b8', weight: 5, opacity: .9})}),
  wires: L.geoJSON(null, {style: f => ({color: f.properties?.status === 'removed' ? '#999' : '#e18b36', weight: 3, opacity: .95, dashArray: f.properties?.status === 'removed' ? '6 7' : null})}),
  nodes: L.geoJSON(null, {pointToLayer: (f, latlng) => {
    const type = f.properties?.type || 'node';
    const color = type === 'switch' ? '#e18b36' : type === 'crossing' ? '#8d5cb5' : type === 'pole_off' ? '#d97706' : type === 'pole_on' ? '#168b87' : '#455a64';
    const radius = (type === 'pole_off' || type === 'pole_on') ? 9 : 6;
    return L.circleMarker(latlng, {radius, color:'#fff', weight:2, fillColor:color, fillOpacity:1});
  }, onEachFeature: (f,l) => l.on('click', () => showFeature(f.properties || {}))}),
  stops: L.geoJSON(null, {pointToLayer: (f, latlng) => L.circleMarker(latlng, {radius:4,color:'#fff',weight:1,fillColor:'#278c75',fillOpacity:1}), onEachFeature:(f,l)=>l.on('click',()=>showFeature(f.properties||{}))})
};
Object.values(layers).forEach(layer => layer.addTo(map));

const routeList = document.getElementById('routeList');
const routeSearch = document.getElementById('routeSearch');
let routeFeatures = [];
let selectedRoute = null;

function showFeature(p) {
  document.getElementById('featureContent').innerHTML =
    `<h3>${escapeHtml(p.name || p.type || 'Объект сети')}</h3><p>${escapeHtml(p.description || 'Описание объекта пока не добавлено.')}</p>` +
    (p.route ? `<p><b>Маршрут:</b> ${escapeHtml(String(p.route))}</p>` : '') +
    (p.direction ? `<p><b>Направление:</b> ${escapeHtml(p.direction)}</p>` : '') +
    (p.status ? `<p><b>Статус:</b> ${escapeHtml(p.status)}</p>` : '');
  document.getElementById('featureCard').classList.remove('hidden');
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderRoutes(filter='') {
  const q = filter.trim().toLowerCase();
  const found = routeFeatures.filter(f => {
    const p = f.properties || {};
    return String(p.number || '').toLowerCase().includes(q) ||
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.termini || '').toLowerCase().includes(q);
  });
  document.getElementById('routeCount').textContent = found.length;
  routeList.innerHTML = found.length ? '' : '<div class="empty">Совпадений нет. Маршрутные данные будут добавлены после проверки.</div>';
  found.forEach(f => {
    const p = f.properties || {};
    const item = document.createElement('div');
    item.className = 'route-item' + (selectedRoute === String(p.number) ? ' active' : '');
    item.innerHTML = `<span class="route-number">${escapeHtml(p.number || '?')}</span><span class="route-info"><b>Троллейбус ${escapeHtml(p.number || '')}</b><small>${escapeHtml(p.termini || p.name || 'Трасса уточняется')}</small></span>`;
    item.addEventListener('click', () => {
      selectedRoute = String(p.number);
      renderRoutes(routeSearch.value);
      layers.routes.setStyle(feature => ({
        color: String(feature.properties?.number) === selectedRoute ? (feature.properties?.color || '#2774b8') : '#aebbc2',
        weight: String(feature.properties?.number) === selectedRoute ? 7 : 3,
        opacity: String(feature.properties?.number) === selectedRoute ? 1 : .35
      }));
      const b = L.geoJSON(f).getBounds();
      if (b.isValid()) map.fitBounds(b.pad(.15));
      showFeature({name:`Маршрут №${p.number}`,description:p.description || 'Трасса и направления будут добавлены после оцифровки.',termini:p.termini});
    });
    routeList.appendChild(item);
  });
}

async function loadLayer(name, path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    layers[name].addData(data);
    if (name === 'routes') {
      routeFeatures = data.features || [];
      renderRoutes();
    }
  } catch (e) {
    console.warn(`Не удалось загрузить ${path}`, e);
  }
}
loadLayer('routes','./data/routes.geojson');
loadLayer('wires','./data/contact-network.geojson');
loadLayer('nodes','./data/network-elements.geojson');
loadLayer('stops','./data/stops.geojson');

[['routesToggle','routes'],['wiresToggle','wires'],['nodesToggle','nodes'],['stopsToggle','stops']].forEach(([id,key]) => {
  document.getElementById(id).addEventListener('change', e => {
    if (e.target.checked) map.addLayer(layers[key]); else map.removeLayer(layers[key]);
  });
});
routeSearch.addEventListener('input', e => renderRoutes(e.target.value));
document.getElementById('featureClose').addEventListener('click',()=>document.getElementById('featureCard').classList.add('hidden'));
document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.add('open'));
document.getElementById('closeBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.remove('open'));

if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.error));

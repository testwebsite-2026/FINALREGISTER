(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var TEXT_FIELDS = ['projectName', 'title', 'date', 'startTime', 'endTime', 'venue', 'verse', 'verseRef', 'tagline', 'contactEmail', 'closedMessage', 'onlineClosedMessage'];
  var CHECK_FIELDS = ['showBanner', 'registrationOpen', 'onlineOpen'];
  var ALL_FIELDS = TEXT_FIELDS.concat(CHECK_FIELDS);

  /* ------------------------------------------------------------- api */

  function api(method, url, body) {
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-P77-Admin': '1' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    });
  }

  /* ----------------------------------------------------------- views */

  var sections = ['loading', 'view-setup', 'view-login', 'view-dash'];
  function showOnly(id) {
    sections.forEach(function (s) { $(s).hidden = s !== id; });
    $('btn-logout').hidden = id !== 'view-dash';
  }

  function showLogin(message) {
    showOnly('view-login');
    var box = $('login-alert');
    box.hidden = !message;
    box.textContent = message || '';
    $('password').value = '';
    $('password').focus();
  }

  /* ----------------------------------------------------------- login */

  $('login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('btn-login');
    btn.disabled = true;
    api('POST', '/api/admin/login', { password: $('password').value }).then(function (r) {
      btn.disabled = false;
      if (r.data && r.data.ok) return loadDashboard();
      showLogin((r.data && r.data.message) || 'Could not sign in.');
    }).catch(function () {
      btn.disabled = false;
      showLogin('Cannot reach the server. Check your connection.');
    });
  });

  $('btn-logout').addEventListener('click', function () {
    api('POST', '/api/admin/logout').then(function () { showLogin(''); });
  });

  function sessionExpired() { showLogin('Your session ended. Please sign in again.'); }

  /* ---------------------------------------------------------- tabs */

  var TABS = ['event', 'regs', 'reports'];
  function selectTab(which) {
    TABS.forEach(function (t) {
      $('tab-' + t).setAttribute('aria-selected', String(t === which));
      $('panel-' + t).hidden = t !== which;
    });
    if (which !== 'event') loadRegistrations();
  }
  TABS.forEach(function (t) {
    $('tab-' + t).addEventListener('click', function () { selectTab(t); });
  });

  /* ------------------------------------------------------- event form */

  function fmtDate(iso) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  function fmtTime(t) {
    var p = t.split(':').map(Number);
    return (p[0] % 12 || 12) + ':' + String(p[1]).padStart(2, '0') + ' ' + (p[0] >= 12 ? 'PM' : 'AM');
  }

  function updatePreview() {
    var d = $('date').value, s = $('startTime').value, e = $('endTime').value;
    var parts = [];
    if (d) { try { parts.push(fmtDate(d)); } catch (x) { /* ignore */ } }
    if (s && e) parts.push(fmtTime(s) + ' to ' + fmtTime(e));
    $('preview').textContent = parts.length ? 'Will show as: ' + parts.join(', ') : '';
  }
  ['date', 'startTime', 'endTime'].forEach(function (id) { $(id).addEventListener('input', updatePreview); });

  function fillForm(ev) {
    TEXT_FIELDS.forEach(function (k) { $(k).value = ev[k] == null ? '' : ev[k]; });
    CHECK_FIELDS.forEach(function (k) { $(k).checked = !!ev[k]; });
    updatePreview();
  }

  function clearErrors() {
    document.querySelectorAll('#event-form .field').forEach(function (f) {
      f.classList.remove('invalid');
      var e = f.querySelector('.err');
      if (e) e.textContent = '';
    });
    $('event-alert').hidden = true;
  }

  function showFieldErrors(errors) {
    var first = null;
    Object.keys(errors).forEach(function (k) {
      var wrap = document.querySelector('#event-form [data-field="' + k + '"]');
      if (!wrap) return;
      wrap.classList.add('invalid');
      var e = wrap.querySelector('.err');
      if (e) e.textContent = errors[k];
      if (!first) first = wrap.querySelector('input, textarea');
    });
    if (first) first.focus();
  }

  $('event-form').addEventListener('input', function () { $('save-status').textContent = ''; });

  $('event-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var payload = {};
    TEXT_FIELDS.forEach(function (k) { payload[k] = $(k).value; });
    CHECK_FIELDS.forEach(function (k) { payload[k] = $(k).checked; });

    var btn = $('btn-save');
    var status = $('save-status');
    status.className = 'status';
    btn.disabled = true;
    btn.textContent = 'Saving\u2026';

    api('PUT', '/api/admin/event', payload).then(function (r) {
      if (r.status === 401) return sessionExpired();
      if (r.data && r.data.ok) {
        fillForm(r.data.event);
        status.textContent = 'Saved. Both links are updated.';
        return;
      }
      if (r.data && r.data.errors) showFieldErrors(r.data.errors);
      status.className = 'status error';
      status.textContent = (r.data && r.data.message) || 'Could not save.';
    }).catch(function () {
      status.className = 'status error';
      status.textContent = 'Cannot reach the server. Check your connection.';
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Save changes';
    });
  });

  /* ---------------------------------------------------- share links */

  function setupLinks() {
    var base = location.origin;
    $('share-link').value = base + '/';
    $('btn-open').href = base + '/';
    $('share-link-online').value = base + '/online';
    $('btn-open-online').href = base + '/online';
  }

  function wireCopy(btnId, inputId) {
    var btn = $(btnId);
    var input = $(inputId);
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy link'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(done, function () { input.select(); document.execCommand('copy'); done(); });
      } else {
        input.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* user can copy manually */ }
      }
    });
    input.addEventListener('focus', function () { this.select(); });
  }
  wireCopy('btn-copy', 'share-link');
  wireCopy('btn-copy-online', 'share-link-online');

  /* ---------------------------------------------------- responses */

  var MODE_LABEL = { face: 'Face-to-face', online: 'Online' };
  var YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
  var allRegs = [];

  function td(text, cls) {
    var el = document.createElement('td');
    el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }

  function modeCell(mode) {
    var el = document.createElement('td');
    var badge = document.createElement('span');
    badge.className = 'badge ' + mode;
    badge.textContent = MODE_LABEL[mode] || MODE_LABEL.face;
    el.appendChild(badge);
    return el;
  }

  function renderTable() {
    var filter = $('reg-filter').value;
    var list = allRegs.filter(function (r) { return filter === 'all' || r.mode === filter; });
    var body = $('reg-body');
    body.textContent = '';
    list.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.appendChild(td(r.ref));
      tr.appendChild(modeCell(r.mode));
      tr.appendChild(td(r.fullName));
      tr.appendChild(td(r.course + ' \u2013 ' + r.yearLevel));
      tr.appendChild(td(r.section));
      tr.appendChild(td(r.contact));
      tr.appendChild(td(r.email));
      tr.appendChild(td(new Date(r.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })));
      var act = document.createElement('td');
      act.className = 'actions';
      var del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Delete';
      del.setAttribute('aria-label', 'Delete registration ' + r.ref + ' for ' + r.fullName);
      del.addEventListener('click', function () {
        if (!confirm('Delete the registration of ' + r.fullName + '? This cannot be undone.')) return;
        api('DELETE', '/api/admin/registrations?ref=' + encodeURIComponent(r.ref)).then(function (res) {
          if (res.status === 401) return sessionExpired();
          loadRegistrations();
        });
      });
      act.appendChild(del);
      tr.appendChild(act);
      body.appendChild(tr);
    });
    $('reg-empty').hidden = list.length > 0;
    $('reg-summary').textContent = filter === 'all'
      ? allRegs.length + ' in total'
      : list.length + ' of ' + allRegs.length + ' shown';
  }

  function pct(n, total) { return total ? Math.round((n / total) * 100) + '%' : '0%'; }

  function renderReport() {
    var counts = { face: 0, online: 0 };
    var byYear = {};
    allRegs.forEach(function (r) {
      var m = r.mode === 'online' ? 'online' : 'face';
      counts[m]++;
      var y = r.yearLevel || 'Other';
      if (!byYear[y]) byYear[y] = { face: 0, online: 0 };
      byYear[y][m]++;
    });
    var total = allRegs.length;

    ['face', 'online'].forEach(function (m) {
      $('rep-' + m).textContent = String(counts[m]);
      $('rep-' + m + '-pct').textContent = total ? pct(counts[m], total) + ' of all' : '';
      $('bar-' + m).style.width = total ? (counts[m] / total * 100) + '%' : '0%';
    });
    $('rep-total').textContent = String(total);

    var years = YEARS.concat(Object.keys(byYear).filter(function (y) { return YEARS.indexOf(y) === -1; }));
    var body = $('rep-years');
    body.textContent = '';
    var sum = { face: 0, online: 0 };
    years.forEach(function (y) {
      var c = byYear[y] || { face: 0, online: 0 };
      var row = document.createElement('tr');
      row.appendChild(td(y));
      row.appendChild(td(String(c.face)));
      row.appendChild(td(String(c.online)));
      row.appendChild(td(String(c.face + c.online), 'strong'));
      body.appendChild(row);
      sum.face += c.face; sum.online += c.online;
    });
    var foot = document.createElement('tr');
    foot.className = 'sumrow';
    foot.appendChild(td('All years'));
    foot.appendChild(td(String(sum.face)));
    foot.appendChild(td(String(sum.online)));
    foot.appendChild(td(String(sum.face + sum.online)));
    body.appendChild(foot);
  }

  function setRegs(list) {
    allRegs = list;
    $('reg-count').textContent = String(list.length);
    renderTable();
    renderReport();
  }

  $('reg-filter').addEventListener('change', renderTable);

  function loadRegistrations() {
    return api('GET', '/api/admin/registrations').then(function (r) {
      if (r.status === 401) return sessionExpired();
      if (r.data && r.data.ok) setRegs(r.data.registrations);
    });
  }

  /* --------------------------------------------------------- start up */

  function loadDashboard() {
    return api('GET', '/api/admin/event').then(function (r) {
      if (r.status === 401) return showLogin('');
      if (!(r.data && r.data.ok)) return showLogin('Could not load the settings.');
      fillForm(r.data.event);
      setupLinks();
      showOnly('view-dash');
      selectTab('event');
      return api('GET', '/api/admin/registrations').then(function (rr) {
        if (rr.data && rr.data.ok) setRegs(rr.data.registrations);
      });
    });
  }

  api('GET', '/api/admin/status').then(function (r) {
    if (!r.data.configured) return showOnly('view-setup');
    if (r.data.loggedIn) return loadDashboard();
    showLogin('');
  }).catch(function () {
    $('loading').textContent = 'Cannot reach the server. Please refresh.';
  });
})();

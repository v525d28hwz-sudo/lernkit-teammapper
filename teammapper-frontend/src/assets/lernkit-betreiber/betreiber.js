// lernkit: Betreiber-Löschung gemeldeter Mindmaps (DELETE /api/lernkit/betreiber/maps/:id)
(function () {
  const $ = (id) => document.getElementById(id);
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  let mapId = '';
  const melde = (text, art) => { $('meldung').textContent = text; $('meldung').className = art || ''; };

  $('pruefen').addEventListener('click', () => {
    const m = ($('link').value || '').match(UUID);
    if (!m) { melde('Im Link wurde keine Mindmap-ID gefunden.', 'fehler'); return; }
    if (!$('token').value) { melde('Bitte den Betreiber-Schlüssel eingeben.', 'fehler'); return; }
    mapId = m[0].toLowerCase();
    $('mapid').textContent = mapId;
    $('frage').hidden = false;
    melde('');
  });
  $('nein').addEventListener('click', () => { $('frage').hidden = true; });
  $('ja').addEventListener('click', async () => {
    $('frage').hidden = true;
    melde('Wird gelöscht …');
    try {
      const res = await fetch('../../api/lernkit/betreiber/maps/' + encodeURIComponent(mapId), {
        method: 'DELETE', headers: { 'X-Lernkit-Betreiber-Token': $('token').value },
      });
      if (res.ok) { melde('Die Mindmap wurde gelöscht.', 'ok'); $('link').value = ''; }
      else if (res.status === 401) melde('Betreiber-Schlüssel ist falsch.', 'fehler');
      else if (res.status === 404) melde('Mindmap nicht gefunden (bereits gelöscht?) oder Löschfunktion auf dem Server nicht eingerichtet.', 'fehler');
      else melde('Fehler ' + res.status + '.', 'fehler');
    } catch (e) { melde('Server nicht erreichbar.', 'fehler'); }
  });
})();

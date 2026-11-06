/**
 * AuraGram — push-ретранслятор на Google Apps Script.
 *
 * Как работает: клиент после отправки сообщения шлёт сюда POST {idToken, receiverId, preview}.
 * Скрипт 1) проверяет Firebase ID-токен отправителя, 2) читает FCM-токены получателя из Firestore,
 * 3) отправляет push через FCM HTTP v1 от имени сервисного аккаунта.
 *
 * Script properties (Project Settings → Script properties):
 *   SERVICE_ACCOUNT_JSON — весь JSON-ключ сервисного аккаунта Firebase
 *   WEB_API_KEY          — Web API key проекта Firebase (тот же, что VITE_FIREBASE_API_KEY)
 *   APP_URL              — адрес приложения со слэшем на конце, напр. https://LOGIN.github.io/auragram/
 */

var RATE_LIMIT_PER_MIN = 40; // не больше push-запросов в минуту от одного пользователя

function doGet() {
  return json_({ ok: true, service: 'auragram-push' });
}

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var body = JSON.parse(e.postData.contents);

    var senderUid = verifyIdToken_(String(body.idToken || ''), props.getProperty('WEB_API_KEY'));
    if (!senderUid) return json_({ ok: false, error: 'auth' });

    var receiverId = String(body.receiverId || '');
    if (!/^[A-Za-z0-9]{6,128}$/.test(receiverId) || receiverId === senderUid) return json_({ ok: false, error: 'receiver' });
    if (!allow_(senderUid)) return json_({ ok: false, error: 'rate' });

    var sa = JSON.parse(props.getProperty('SERVICE_ACCOUNT_JSON'));
    var projectId = sa.project_id;
    var token = accessToken_(sa);

    var receiver = getUserFields_(receiverId, token, projectId);
    var tokens = receiver && receiver.fcmTokens && receiver.fcmTokens.arrayValue && receiver.fcmTokens.arrayValue.values
      ? receiver.fcmTokens.arrayValue.values.map(function (v) { return v.stringValue; }).filter(Boolean)
      : [];
    if (!tokens.length) return json_({ ok: true, sent: 0 });

    var sender = getUserFields_(senderUid, token, projectId);
    var title = sender && sender.name && sender.name.stringValue ? sender.name.stringValue : 'Новое сообщение';
    var preview = String(body.preview || '').slice(0, 120) || 'Новое сообщение';
    var link = props.getProperty('APP_URL') || '';

    var sent = 0;
    tokens.forEach(function (t) {
      var code = sendPush_(t, token, projectId, title, preview, link);
      if (code === 200) sent++;
      else if (code === 404) removeToken_(receiverId, t, token, projectId); // токен устарел
    });
    return json_({ ok: true, sent: sent });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

// ---------- проверки ----------

function verifyIdToken_(idToken, apiKey) {
  if (!idToken || !apiKey) return null;
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  var users = JSON.parse(res.getContentText()).users;
  return users && users[0] ? users[0].localId : null;
}

function allow_(uid) {
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + uid;
  var n = Number(cache.get(key) || 0);
  if (n >= RATE_LIMIT_PER_MIN) return false;
  cache.put(key, String(n + 1), 60);
  return true;
}

// ---------- Google API ----------

function accessToken_(sa) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('sa_token');
  if (cached) return cached;

  var now = Math.floor(Date.now() / 1000);
  var unsigned = b64url_(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url_(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  }));
  var signature = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, sa.private_key)).replace(/=+$/, '');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + signature }
  });
  var data = JSON.parse(res.getContentText());
  if (!data.access_token) throw new Error('OAuth: ' + res.getContentText());
  cache.put('sa_token', data.access_token, 3000);
  return data.access_token;
}

function getUserFields_(uid, token, projectId) {
  var res = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/users/' + encodeURIComponent(uid), {
    headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true
  });
  return res.getResponseCode() === 200 ? (JSON.parse(res.getContentText()).fields || {}) : null;
}

function sendPush_(fcmToken, token, projectId, title, body, link) {
  var res = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title: title, body: body },
        webpush: {
          fcm_options: link ? { link: link } : undefined,
          notification: { icon: link ? link + 'icon-192.png' : undefined, tag: 'aura-chat' }
        }
      }
    })
  });
  return res.getResponseCode();
}

function removeToken_(uid, fcmToken, token, projectId) {
  UrlFetchApp.fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents:commit', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ writes: [{ transform: {
      document: 'projects/' + projectId + '/databases/(default)/documents/users/' + uid,
      fieldTransforms: [{ fieldPath: 'fcmTokens', removeAllFromArray: { values: [{ stringValue: fcmToken }] } }]
    } }] })
  });
}

function b64url_(s) {
  return Utilities.base64EncodeWebSafe(s, Utilities.Charset.UTF_8).replace(/=+$/, '');
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

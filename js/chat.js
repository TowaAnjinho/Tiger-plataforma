/* =========================================================
   6726.Bet — chat.js
   Renderiza chats usuário ↔ admin.
   ========================================================= */
(function (global) {
  "use strict";

  var Chat = {};

  Chat.ensureThread = function (username, type) {
    return DB.getOrCreateThread(username, type);
  };

  Chat.renderThread = function (container, threadId, role, onUpdate) {
    var thread = DB.getChats()[threadId];
    if (!thread) {
      container.innerHTML = '<div class="muted center">Conversa não encontrada.</div>';
      return;
    }

    container.innerHTML = "";
    var head = U.el("div", {
      cls: "chat-header",
      html:
        '<div><strong>' + U.escapeHtml(thread.id) + '</strong>' +
        '<div class="small muted">' + (thread.type === "DEPOSITO" ? "Depósito" : thread.type === "SAQUE" ? "Saque" : "Suporte") +
        ' — ' + U.escapeHtml(thread.username) + '</div></div>' +
        '<div class="pill">' + thread.messages.length + ' msgs</div>'
    });
    container.appendChild(head);

    var body = U.el("div", { cls: "chat-body", attrs: { id: "chat-body" } });
    container.appendChild(body);

    var form = U.el("form", { cls: "chat-input" });
    var input = U.el("input", { attrs: { type: "text", placeholder: "Digite sua mensagem...", maxlength: "500", autocomplete: "off" } });
    var send = U.el("button", { cls: "btn primary", text: "Enviar", attrs: { type: "submit" } });
    form.appendChild(input); form.appendChild(send);
    container.appendChild(form);

    function render() {
      body.innerHTML = "";
      var t = DB.getChats()[threadId];
      if (!t || !t.messages.length) {
        body.innerHTML = '<div class="muted small center mt-16">Envie a primeira mensagem. O suporte responderá em breve.</div>';
        return;
      }
      t.messages.forEach(function (m) {
        var mine = m.from === role;
        var cls = "msg " + (mine ? "me" : "them");
        if (m.from === "system") cls = "msg them";
        var ava;
        if (m.from === "admin" || m.from === "system") {
          ava = (window.Assets ? Assets.emblem() : "");
        } else {
          ava = (window.Assets ? Assets.avatar(t.username) : "");
        }
        var avaImg = ava ? '<img class="avatar-img" src="' + ava + '" alt=""/>' : "";
        var bubble =
          '<div class="bubble">' +
          U.escapeHtml(m.text).replace(/\n/g, "<br>") +
          '<span class="ts">' + U.fmtTime(m.ts) + (m.from === "system" ? " • sistema" : (mine ? "" : " • suporte")) + "</span>" +
          "</div>";
        var d = U.el("div", { cls: cls, html: avaImg + bubble });
        body.appendChild(d);
      });
      body.scrollTop = body.scrollHeight;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = String(input.value || "").trim();
      if (!text) return;
      DB.postMessage(threadId, role === "admin" ? "admin" : "user", text);
      input.value = "";
      render();
      DB.markThreadRead(threadId, role);
      if (role === "user") {
        DB.addNotification("__admin__", { title: "Nova mensagem", body: thread.id, kind: "info" });
      } else if (role === "admin") {
        DB.addNotification(thread.username, { title: "Suporte respondeu", body: thread.id, kind: "info" });
      }
      if (typeof onUpdate === "function") onUpdate();
    });

    DB.markThreadRead(threadId, role);
    render();

    // Polling para novas mensagens (mesma aba)
    var last = (DB.getChats()[threadId] || { last_ts: 0 }).last_ts;
    var poll = setInterval(function () {
      var t = DB.getChats()[threadId];
      if (!t) { clearInterval(poll); return; }
      if (t.last_ts !== last) {
        last = t.last_ts;
        render();
        DB.markThreadRead(threadId, role);
      }
    }, 1200);

    // Retornar cleanup
    return function cleanup() { clearInterval(poll); };
  };

  Chat.renderList = function (container, username, role, onOpen) {
    var threads = role === "admin" ? DB.allThreads() : DB.userThreads(username);
    container.innerHTML = "";
    if (!threads.length) {
      container.innerHTML = '<div class="muted small center mt-16">Sem conversas.</div>';
      return;
    }
    threads.forEach(function (t) {
      var last = t.messages[t.messages.length - 1];
      var unread = 0;
      t.messages.forEach(function (m) {
        if (role === "user" && !m.read_user && m.from !== "user") unread++;
        if (role === "admin" && !m.read_admin && m.from !== "admin") unread++;
      });
      var lastPreview = last ? (last.from === role ? "Você: " : "") + last.text : "Sem mensagens.";
      var ava = window.Assets ? Assets.avatar(t.username) : "";
      var avaImg = ava ? '<img class="avatar-img sm" src="' + ava + '" alt="" style="margin-right:10px"/>' : '<div class="ava">' + (t.type === "DEPOSITO" ? "D" : t.type === "SAQUE" ? "S" : "?") + '</div>';
      var typeChip = '<span class="pill" style="margin-left:6px">' + (t.type || "CHAT") + '</span>';
      var div = U.el("div", {
        cls: "chat-list-item",
        html:
          avaImg +
          '<div class="meta"><div class="t">' + U.escapeHtml(t.id) + typeChip + '</div><div class="p">' + U.escapeHtml(lastPreview).slice(0, 60) + '</div></div>' +
          (unread ? '<div class="unread">' + unread + '</div>' : '')
      });
      div.addEventListener("click", function () { onOpen(t.id); });
      container.appendChild(div);
    });
  };

  global.Chat = Chat;
})(window);

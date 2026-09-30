const $ = (id) => document.getElementById(id);

const elements = {
  chatView: $("chat-view"),
  extractView: $("extract-view"),
  ragView: $("rag-view"),
  chatFrame: $("chat-frame"),
  railItems: Array.from(document.querySelectorAll(".rail-item")),
  chatStatus: $("chat-status"),
  extractStatus: $("extract-status"),
  newChat: $("new-chat"),
  newConversation: $("new-conversation"),
  conversationSidebar: $("conversation-sidebar"),
  conversationList: $("conversation-list"),
  deleteDialog: $("delete-dialog"),
  deleteDialogError: $("delete-dialog-error"),
  deleteCancel: $("delete-cancel"),
  deleteConfirm: $("delete-confirm"),
  sessionId: $("session-id"),
  copySession: $("copy-session"),
  chatMessage: $("chat-message"),
  chatCount: $("chat-count"),
  chatError: $("chat-error"),
  sendChat: $("send-chat"),
  stopChat: $("stop-chat"),
  chatLog: $("chat-log"),
  extractForm: $("extract-form"),
  extractText: $("extract-text"),
  extractTextError: $("extract-text-error"),
  extractErrorSummary: $("extract-error-summary"),
  runExtract: $("run-extract"),
  extractEmpty: $("extract-empty"),
  extractResult: $("extract-result"),
  resultOrder: $("result-order"),
  resultType: $("result-type"),
  resultSolution: $("result-solution"),
  copyResult: $("copy-result"),
  ragStatus: $("rag-status"),
  ragRefresh: $("rag-refresh"),
  ragRebuild: $("rag-rebuild"),
  ragBuild: $("rag-build"),
  ragMine: $("rag-mine"),
  ragSearchForm: $("rag-search-form"),
  ragQuery: $("rag-query"),
  ragSearch: $("rag-search"),
  ragSearchResults: $("rag-search-results"),
  ragChunkList: $("rag-chunk-list"),
  ragChunkCount: $("rag-chunk-count"),
  ragStatDocuments: $("rag-stat-documents"),
  ragStatChunks: $("rag-stat-chunks"),
  ragStatVectorized: $("rag-stat-vectorized"),
  ragStatPending: $("rag-stat-pending"),
  ragStatFailed: $("rag-stat-failed"),
};

const state = {
  sessionId: localStorage.getItem("ihelp-session") || "",
  streaming: false,
  abortController: null,
  lastResult: null,
  pendingOrderId: "",
  conversations: [],
  loadingConversationId: "",
  pendingDeleteConversation: null,
};

// Older builds stored the default conversation owner as "访客". Reuse that
// demo key so sessions created before Ch07 remain visible after the upgrade.
const userKey = "访客";
localStorage.setItem("ihelp-user-key", userKey);

function makeSessionId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function ensureSessionId() {
  if (!state.sessionId) {
    state.sessionId = makeSessionId();
  }
  elements.sessionId.value = state.sessionId;
  localStorage.setItem("ihelp-session", state.sessionId);
}

function setChatStatus(message) {
  elements.chatStatus.textContent = message;
}

function setExtractStatus(message) {
  elements.extractStatus.textContent = message;
}

function showEmptyLog() {
  elements.chatLog.innerHTML = `
    <div class="chat-empty">
      <span class="empty-icon-tile" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      </span>
      <span>等待输入消息</span>
    </div>`;
}

function clearChatLog() {
  elements.chatLog.innerHTML = "";
  showEmptyLog();
}

function formatConversationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function renderConversationList() {
  elements.conversationList.replaceChildren();
  if (!state.conversations.length) {
    const empty = document.createElement("p");
    empty.className = "conversation-empty";
    empty.textContent = "暂无历史会话";
    elements.conversationList.appendChild(empty);
    return;
  }

  for (const conversation of state.conversations) {
    const row = document.createElement("div");
    row.className = "conversation-row";
    row.classList.toggle(
      "is-active",
      conversation.id === state.sessionId
    );

    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-item";
    button.classList.toggle("is-active", conversation.id === state.sessionId);
    button.disabled = conversation.id === state.loadingConversationId;

    const top = document.createElement("span");
    top.className = "conversation-item-top";
    const preview = document.createElement("span");
    preview.className = "conversation-preview";
    preview.textContent = conversation.preview || "新会话";
    const badge = document.createElement("span");
    badge.className = "conversation-badge";
    badge.textContent = conversation.summarized ? "已摘要" : "原文";
    badge.hidden = !conversation.summarized;
    top.append(preview, badge);

    const time = document.createElement("time");
    time.className = "conversation-time";
    time.textContent = formatConversationTime(
      conversation.updated_at || conversation.created_at
    );

    button.append(top, time);
    button.addEventListener("click", () => selectConversation(conversation));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete";
    deleteButton.disabled = conversation.id !== state.sessionId;
    deleteButton.tabIndex = conversation.id === state.sessionId ? 0 : -1;
    deleteButton.setAttribute(
      "aria-label",
      `永久删除会话：${conversation.preview || conversation.id}`
    );
    deleteButton.title = "永久删除会话";
    deleteButton.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M19 6 18 21H6L5 6"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>`;
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openDeleteDialog(conversation);
    });

    row.append(button, deleteButton);
    elements.conversationList.appendChild(row);
  }
}

function openDeleteDialog(conversation) {
  state.pendingDeleteConversation = conversation;
  elements.deleteDialogError.textContent = "";
  elements.deleteConfirm.disabled = false;
  elements.deleteCancel.disabled = false;
  elements.deleteConfirm.textContent = "确认删除";
  elements.deleteDialog.hidden = false;
  elements.deleteConfirm.focus();
}

function closeDeleteDialog() {
  state.pendingDeleteConversation = null;
  elements.deleteDialog.hidden = true;
  elements.deleteDialogError.textContent = "";
}

async function confirmDeleteConversation() {
  const conversation = state.pendingDeleteConversation;
  if (!conversation) return;

  elements.deleteConfirm.disabled = true;
  elements.deleteCancel.disabled = true;
  elements.deleteConfirm.textContent = "删除中…";
  elements.deleteDialogError.textContent = "";
  try {
    const response = await fetch(
      `/api/conversations/${encodeURIComponent(conversation.id)}?user_key=${encodeURIComponent(userKey)}`,
      { method: "DELETE" }
    );
    if (response.status !== 204) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || "删除会话失败");
    }

    const wasActive = conversation.id === state.sessionId;
    state.conversations = state.conversations.filter(
      (item) => item.id !== conversation.id
    );
    closeDeleteDialog();
    setChatStatus("会话已永久删除");

    if (wasActive && state.conversations.length) {
      await selectConversation(state.conversations[0]);
    } else if (wasActive) {
      startNewConversation();
    } else {
      renderConversationList();
      loadConversations();
    }
  } catch (error) {
    elements.deleteDialogError.textContent =
      error.message || "删除会话失败";
    elements.deleteConfirm.disabled = false;
    elements.deleteCancel.disabled = false;
    elements.deleteConfirm.textContent = "重试删除";
  }
}

async function loadConversations() {
  try {
    const response = await fetch(
      `/api/conversations?user_key=${encodeURIComponent(userKey)}`
    );
    if (!response.ok) throw new Error("conversation list unavailable");
    state.conversations = await response.json();
    elements.conversationSidebar.hidden = false;
    renderConversationList();
  } catch {
    elements.conversationSidebar.hidden = true;
  }
}

async function selectConversation(conversation) {
  if (!conversation || conversation.id === state.loadingConversationId) return;
  if (state.streaming) return;
  state.loadingConversationId = conversation.id;
  renderConversationList();
  clearChatError();
  try {
    const response = await fetch(
      `/api/conversations/${encodeURIComponent(conversation.id)}/messages?user_key=${encodeURIComponent(userKey)}`
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || "历史消息加载失败");
    }
    const messages = await response.json();
    state.sessionId = conversation.id;
    elements.sessionId.value = conversation.id;
    localStorage.setItem("ihelp-session", conversation.id);
    elements.chatLog.replaceChildren();
    if (!messages.length) {
      showEmptyLog();
    } else {
      for (const item of messages) {
        appendMessage(item.role, item.content, false, item.created_at);
      }
    }
    setChatStatus("历史会话已回载");
    renderConversationList();
  } catch (error) {
    showChatError(error.message || "历史消息加载失败");
  } finally {
    state.loadingConversationId = "";
    renderConversationList();
  }
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const MESSAGE_ICONS = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  assistant: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
};

function buildAvatar(kind) {
  const avatar = document.createElement("span");
  avatar.className = `avatar ${kind}`;
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerHTML = MESSAGE_ICONS[kind] || "";
  return avatar;
}

function buildMeta(role, createdAt = null) {
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const name = document.createElement("span");
  name.className = "meta-label";
  name.textContent = role === "user" ? "你" : "iHelp";
  const time = document.createElement("time");
  const now = createdAt ? new Date(createdAt) : new Date();
  time.dateTime = now.toISOString();
  time.textContent = formatTime(now);
  meta.append(name, time);
  return meta;
}

function scrollChatToEnd() {
  elements.chatFrame.scrollTop = elements.chatFrame.scrollHeight;
}

function updateChatCount() {
  elements.chatCount.textContent = String(elements.chatMessage.value.length);
}

function appendMessage(role, text, isError = false, createdAt = null) {
  const empty = elements.chatLog.querySelector(".chat-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = `message-row ${role}${isError ? " error" : ""}`;
  const avatar = buildAvatar(role);
  const stack = document.createElement("div");
  stack.className = "message-stack";
  const meta = buildMeta(role, createdAt);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  stack.append(meta, bubble);
  if (role === "user") row.append(stack, avatar);
  else row.append(avatar, stack);
  elements.chatLog.appendChild(row);
  scrollChatToEnd();
  return bubble;
}

function appendAssistantStreamBubble() {
  const empty = elements.chatLog.querySelector(".chat-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = "message-row assistant";
  const avatar = buildAvatar("assistant");
  const stack = document.createElement("div");
  stack.className = "message-stack";
  const meta = buildMeta("assistant");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.setAttribute("aria-busy", "true");
  const typing = document.createElement("span");
  typing.className = "typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  bubble.appendChild(typing);
  stack.append(meta, bubble);
  row.append(avatar, stack);
  elements.chatLog.appendChild(row);
  scrollChatToEnd();
  return { row, bubble, typing };
}

function setAssistantText(bubble, text, error = false) {
  bubble.textContent = text || (error ? "请求失败" : "（空回复）");
  bubble.setAttribute("aria-busy", "false");
  if (error) bubble.closest(".message-row").classList.add("error");
  scrollChatToEnd();
}

function ensureCitationDrawer() {
  let drawer = document.getElementById("citation-drawer");
  if (drawer) return drawer;

  drawer = document.createElement("aside");
  drawer.id = "citation-drawer";
  drawer.hidden = true;
  drawer.setAttribute("aria-live", "polite");
  document.body.appendChild(drawer);
  return drawer;
}

function openCitation(citation) {
  const drawer = ensureCitationDrawer();
  drawer.replaceChildren();

  const close = document.createElement("button");
  close.type = "button";
  close.className = "citation-close";
  close.setAttribute("aria-label", "关闭来源");
  close.textContent = "×";

  const path = document.createElement("div");
  path.className = "citation-path";
  path.textContent = citation.section_path || citation.chunk_id || "来源";

  const text = document.createElement("div");
  text.className = "citation-text";
  text.textContent = citation.text || "";

  close.addEventListener("click", () => {
    drawer.hidden = true;
  });
  drawer.append(close, path, text);
  drawer.hidden = false;
}

function renderAssistantContent(bubble, text, citations) {
  if (!citations.length) {
    bubble.textContent = text;
    bubble.setAttribute("aria-busy", "false");
    scrollChatToEnd();
    return;
  }

  bubble.replaceChildren();
  const nodes = [];
  const pattern = /(\[\d+\])/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) {
      nodes.push(document.createTextNode(text.slice(last, match.index)));
    }
    const citationId = Number(match[0].slice(1, -1));
    const citation = citations.find((item) => Number(item.id) === citationId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "citation-chip";
    button.textContent = match[0];
    if (citation) {
      button.addEventListener("click", () => openCitation(citation));
    } else {
      button.disabled = true;
    }
    nodes.push(button);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(document.createTextNode(text.slice(last)));
  }
  bubble.append(...nodes);
  bubble.setAttribute("aria-busy", "false");
  scrollChatToEnd();
}

function addFeedback(bubble) {
  const stack = bubble.closest(".message-stack");
  if (!stack || stack.querySelector(".feedback")) return;

  const group = document.createElement("div");
  group.className = "feedback";
  const up = document.createElement("button");
  up.type = "button";
  up.className = "feedback-btn";
  up.setAttribute("aria-label", "有帮助");
  up.textContent = "👍";
  const down = document.createElement("button");
  down.type = "button";
  down.className = "feedback-btn";
  down.setAttribute("aria-label", "没帮助");
  down.textContent = "👎";
  const label = document.createElement("span");
  label.className = "feedback-label";

  const lock = (selected) => {
    up.disabled = true;
    down.disabled = true;
    selected.classList.add("is-active");
    label.textContent = "已反馈";
  };
  up.addEventListener("click", () => lock(up));
  down.addEventListener("click", () => lock(down));
  group.append(up, down, label);
  stack.appendChild(group);
}

function renderReplyOptions(stack, options, userMessage) {
  if (!stack || !options.length) return;

  const group = document.createElement("div");
  group.className = "message-actions";

  for (const option of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-btn";
    button.textContent = option.label;

    if (option.id === "human_transfer") {
      button.addEventListener("click", async () => {
        const originalLabel = button.textContent;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "转接中…";
        const completed = await runChatRequest({
          message: "转人工",
          userLabel: "转人工",
          appendUser: true,
        });
        if (completed) {
          button.textContent = "已转人工";
        } else {
          button.disabled = false;
          button.textContent = originalLabel;
          showChatError("转人工请求失败，请重试");
        }
        button.setAttribute("aria-busy", "false");
      });
    }

    if (option.id === "create_ticket") {
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        const originalLabel = button.textContent;
        button.textContent = "建单中…";

        try {
          const response = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: elements.sessionId.value.trim() || state.sessionId,
              description: userMessage,
              ticket_type: "投诉",
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.detail || "建单失败");
          button.textContent = `已建单 ${payload.ticket_id}`;
        } catch (error) {
          button.disabled = false;
          button.textContent = originalLabel;
          showChatError(error.message || "建单失败");
        } finally {
          button.setAttribute("aria-busy", "false");
        }
      });
    }

    if (option.id === "apply_refund") {
      button.addEventListener("click", () => {
        button.disabled = true;
        button.textContent = "填写退款单";
        renderRefundForm(stack, state.pendingOrderId);
      });
    }

    group.appendChild(button);
  }

  if (group.childElementCount) {
    stack.appendChild(group);
    scrollChatToEnd();
  }
}

function renderTicketConfirmation(stack, payload) {
  if (!stack || !payload?.tool_call_id) return;
  const existing = Array.from(
    elements.chatLog.querySelectorAll(".ticket-confirmation-card")
  ).find((item) => item.dataset.toolCallId === payload.tool_call_id);
  if (existing) return;

  const card = document.createElement("section");
  card.className = "ticket-confirmation-card";
  card.dataset.toolCallId = payload.tool_call_id;

  const head = document.createElement("div");
  head.className = "ticket-confirmation-head";
  const title = document.createElement("strong");
  title.textContent = "请确认您的问题：";
  const type = document.createElement("span");
  type.className = "ticket-confirmation-type";
  type.textContent = payload.ticket_type || "其他";
  const originalType = type.textContent;
  head.append(title, type);

  const description = document.createElement("p");
  description.className = "ticket-confirmation-description";
  description.textContent = payload.description || "未填写问题描述";

  const actions = document.createElement("div");
  actions.className = "ticket-confirmation-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-ghost";
  cancel.textContent = "取消";
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "btn btn-primary";
  confirm.textContent = "确认提交";
  actions.append(cancel, confirm);
  card.append(head, description, actions);
  stack.appendChild(card);
  scrollChatToEnd();

  const decide = async (decision, label) => {
    cancel.disabled = true;
    confirm.disabled = true;
    card.classList.add("is-decided");
    type.textContent = label;
    const completed = await runChatRequest({
      resume: {
        type: decision,
        tool_call_id: payload.tool_call_id,
      },
      appendUser: false,
    });
    if (!completed) {
      cancel.disabled = false;
      confirm.disabled = false;
      card.classList.remove("is-decided");
      type.textContent = originalType;
      showChatError("工单确认请求失败，请重试");
    }
  };

  cancel.addEventListener("click", () => decide("ticket_cancelled", "已取消"));
  confirm.addEventListener("click", () =>
    decide("ticket_confirmed", "已确认")
  );
}

function renderOrderSelector(stack, orders) {
  if (!stack || !Array.isArray(orders) || !orders.length) return;

  const group = document.createElement("div");
  group.className = "order-selector";

  for (const order of orders) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "order-card";
    card.dataset.orderId = order.order_id;

    const head = document.createElement("span");
    head.className = "order-card-head";
    const orderId = document.createElement("strong");
    orderId.textContent = `订单 ${order.order_id}`;
    const status = document.createElement("span");
    status.className = "order-card-status";
    status.textContent = order.status || "状态未知";
    head.append(orderId, status);

    const product = document.createElement("span");
    product.className = "order-card-product";
    product.textContent = order.product_name || "商品信息";

    const meta = document.createElement("span");
    meta.className = "order-card-meta";
    const signedAt = order.signed_at ? `签收 ${order.signed_at}` : "尚未签收";
    const amount = Number(order.amount || 0).toFixed(2);
    meta.textContent = `${signedAt} · ¥${amount}`;

    card.append(head, product, meta);
    card.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((item) => {
        item.disabled = true;
      });
      card.classList.add("is-selected");
      state.pendingOrderId = order.order_id;
      runChatRequest({
        resume: { type: "order_selected", order_id: order.order_id },
        userLabel: `已选择订单 ${order.order_id}`,
        appendUser: true,
      });
    });
    group.appendChild(card);
  }

  stack.appendChild(group);
  scrollChatToEnd();
}

async function renderRefundForm(stack, orderId) {
  if (!stack || !orderId || stack.querySelector(".refund-form")) return;

  const form = document.createElement("form");
  form.className = "refund-form";

  const label = document.createElement("label");
  label.className = "refund-form-label";
  label.textContent = "退款原因";

  const select = document.createElement("select");
  select.required = true;
  select.disabled = true;
  label.appendChild(select);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "action-btn refund-submit";
  submit.disabled = true;
  submit.textContent = "提交退款单";

  form.append(label, submit);
  stack.appendChild(form);
  scrollChatToEnd();

  try {
    const response = await fetch("/api/refunds/reasons");
    const reasons = await response.json();
    if (!response.ok) throw new Error(reasons.detail || "退款原因加载失败");
    select.replaceChildren();
    for (const reason of reasons) {
      const option = document.createElement("option");
      option.value = reason;
      option.textContent = reason;
      select.appendChild(option);
    }
    select.disabled = false;
    submit.disabled = false;
  } catch (error) {
    showChatError(error.message || "退款原因加载失败");
    submit.textContent = "加载失败";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    select.disabled = true;
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "提交中…";
    try {
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: elements.sessionId.value.trim() || state.sessionId,
          order_id: orderId,
          reason: select.value,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "退款单提交失败");
      submit.textContent = `已提交 ${payload.ticket_id}`;
    } catch (error) {
      select.disabled = false;
      submit.disabled = false;
      submit.textContent = "重试提交";
      showChatError(error.message || "退款单提交失败");
    } finally {
      submit.setAttribute("aria-busy", "false");
    }
  });
}

async function renderExchangeForm(stack, payload) {
  if (
    !stack ||
    !payload?.order_id ||
    stack.querySelector(".exchange-form")
  ) {
    return;
  }

  const form = document.createElement("form");
  form.className = "exchange-form";

  const label = document.createElement("label");
  label.className = "exchange-form-label";
  label.textContent = "换货原因";

  const select = document.createElement("select");
  select.required = true;
  select.disabled = true;
  label.appendChild(select);

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "action-btn exchange-submit";
  submit.disabled = true;
  submit.textContent = "提交换货单";

  form.append(label, submit);
  stack.appendChild(form);
  scrollChatToEnd();

  try {
    let reasons = Array.isArray(payload.reasons) ? payload.reasons : [];
    if (!reasons.length) {
      const response = await fetch("/api/exchanges/reasons");
      reasons = await response.json();
      if (!response.ok) throw new Error(reasons.detail || "换货原因加载失败");
    }
    select.replaceChildren();
    for (const reason of reasons) {
      const option = document.createElement("option");
      option.value = reason;
      option.textContent = reason;
      select.appendChild(option);
    }
    select.disabled = false;
    submit.disabled = false;
  } catch (error) {
    showChatError(error.message || "换货原因加载失败");
    submit.textContent = "加载失败";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    select.disabled = true;
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    submit.textContent = "提交中…";
    try {
      const response = await fetch("/api/exchanges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: elements.sessionId.value.trim() || state.sessionId,
          order_id: payload.order_id,
          reason: select.value,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "换货单提交失败");
      submit.textContent = `已提交 ${result.ticket_id}`;
    } catch (error) {
      select.disabled = false;
      submit.disabled = false;
      submit.textContent = "重试提交";
      showChatError(error.message || "换货单提交失败");
    } finally {
      submit.setAttribute("aria-busy", "false");
    }
  });
}

function upsertToolBadge(stack, toolName, status, message = "") {
  let badge = stack.querySelector(".tool-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = `tool-badge ${status}`;

    const icon = document.createElement("span");
    icon.className = "tool-badge-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "T";

    const text = document.createElement("span");
    text.className = "tool-badge-text";

    badge.append(icon, text);
    const bubble = stack.querySelector(".bubble");
    stack.insertBefore(badge, bubble);
  }

  badge.className = `tool-badge ${status}`;
  const label = status === "running" ? "执行中" : status === "success" ? "完成" : "失败";
  badge.querySelector(".tool-badge-text").textContent = `${toolName} · ${label}`;
  badge.title = `${toolName}${message ? `：${message}` : ""}`;
}

function showChatError(message) {
  elements.chatError.textContent = message;
}

function clearChatError() {
  elements.chatError.textContent = "";
}

function setStreaming(active) {
  state.streaming = active;
  elements.sendChat.disabled = active;
  elements.newChat.disabled = active;
  elements.stopChat.hidden = !active;
  elements.sendChat.setAttribute("aria-busy", String(active));
}

function stopStreaming() {
  if (state.abortController) state.abortController.abort();
}

function switchView(name) {
  elements.chatView.hidden = name !== "chat";
  elements.extractView.hidden = name !== "extract";
  elements.ragView.hidden = name !== "rag";
  elements.railItems.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.view === name);
    item.setAttribute("aria-selected", String(item.dataset.view === name));
  });
  if (name === "rag") {
    loadRagDashboard();
  }
}

function setRagStatus(message) {
  elements.ragStatus.textContent = message;
}

function renderRagStats(stats) {
  elements.ragStatDocuments.textContent = String(stats.documents ?? 0);
  elements.ragStatChunks.textContent = String(stats.chunks ?? 0);
  elements.ragStatVectorized.textContent = String(stats.vectorized ?? 0);
  elements.ragStatPending.textContent = String(stats.pending ?? 0);
  elements.ragStatFailed.textContent = String(stats.failed ?? 0);
}

function renderRagChunks(chunks) {
  elements.ragChunkCount.textContent = `${chunks.length} 条`;
  elements.ragChunkList.replaceChildren();
  if (!chunks.length) {
    elements.ragChunkList.innerHTML = '<div class="rag-empty">暂无知识块</div>';
    return;
  }

  for (const chunk of chunks) {
    const item = document.createElement("article");
    item.className = "rag-chunk";

    const head = document.createElement("div");
    head.className = "rag-chunk-head";
    const title = document.createElement("span");
    title.className = "rag-chunk-title";
    title.textContent = chunk.section_path || chunk.category;
    const status = document.createElement("span");
    status.className = `status-pill ${chunk.vector_status}`;
    status.textContent = chunk.vector_status;
    head.append(title, status);

    const text = document.createElement("p");
    text.textContent = chunk.answer;
    item.append(head, text);
    elements.ragChunkList.appendChild(item);
  }
}

function renderRagResults(hits) {
  elements.ragSearchResults.replaceChildren();
  if (!hits.length) {
    elements.ragSearchResults.innerHTML = '<div class="rag-empty">没有召回结果</div>';
    return;
  }

  for (const hit of hits) {
    const item = document.createElement("article");
    item.className = "rag-result";
    const head = document.createElement("div");
    head.className = "rag-result-head";
    const title = document.createElement("span");
    title.className = "rag-result-title";
    title.textContent = hit.category || hit.chunk_id;
    const score = document.createElement("span");
    score.className = "rag-score";
    score.textContent = Number(hit.distance).toFixed(4);
    head.append(title, score);
    const text = document.createElement("p");
    text.textContent = hit.text;
    item.append(head, text);
    elements.ragSearchResults.appendChild(item);
  }
}

async function loadRagDashboard() {
  setRagStatus("正在读取知识库状态…");
  try {
    const [statsResponse, chunksResponse] = await Promise.all([
      fetch("/api/knowledge/stats"),
      fetch("/api/knowledge/chunks?limit=40"),
    ]);
    if (!statsResponse.ok || !chunksResponse.ok) {
      throw new Error("知识库接口不可用");
    }
    renderRagStats(await statsResponse.json());
    renderRagChunks(await chunksResponse.json());
    setRagStatus("知识库状态已同步");
  } catch (error) {
    setRagStatus(error.message || "知识库读取失败");
  }
}

async function runRagBuild() {
  elements.ragBuild.disabled = true;
  elements.ragBuild.setAttribute("aria-busy", "true");
  setRagStatus(elements.ragRebuild.checked ? "正在重建知识库…" : "正在补齐待向量化块…");
  try {
    const response = await fetch("/api/knowledge/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rebuild: elements.ragRebuild.checked }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "建库失败");
    const successMessage = `建库完成：新增 ${payload.inserted}，同步 ${payload.synced}，失败 ${payload.failed}`;
    setRagStatus("正在刷新知识库状态…");
    await loadRagDashboard();
    setRagStatus(successMessage);
  } catch (error) {
    setRagStatus(error.message || "建库失败");
  } finally {
    elements.ragBuild.disabled = false;
    elements.ragBuild.setAttribute("aria-busy", "false");
  }
}

async function runRagMine() {
  elements.ragMine.disabled = true;
  elements.ragMine.setAttribute("aria-busy", "true");
  setRagStatus("正在挖掘历史对话知识…");
  try {
    const response = await fetch("/api/knowledge/mine", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "知识挖掘失败");
    setRagStatus(`挖掘完成：抽取 ${payload.extracted}，入库 ${payload.inserted}`);
    await loadRagDashboard();
  } catch (error) {
    setRagStatus(error.message || "知识挖掘失败");
  } finally {
    elements.ragMine.disabled = false;
    elements.ragMine.setAttribute("aria-busy", "false");
  }
}

async function runRagSearch(event) {
  event.preventDefault();
  const query = elements.ragQuery.value.trim();
  if (!query) {
    setRagStatus("请输入检索问题");
    elements.ragQuery.focus();
    return;
  }

  elements.ragSearch.disabled = true;
  setRagStatus("正在执行语义检索…");
  try {
    const response = await fetch("/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: 5 }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "检索失败");
    renderRagResults(payload);
    setRagStatus(`召回 ${payload.length} 条知识`);
  } catch (error) {
    setRagStatus(error.message || "检索失败");
  } finally {
    elements.ragSearch.disabled = false;
  }
}

async function streamChat() {
  const message = elements.chatMessage.value.trim();
  if (!message) {
    showChatError("请输入消息");
    elements.chatMessage.focus();
    return;
  }

  elements.chatMessage.value = "";
  updateChatCount();
  await runChatRequest({
    message,
    userLabel: message,
    appendUser: true,
  });
}

async function runChatRequest({
  message = "",
  resume = null,
  userLabel = "",
  appendUser = false,
}) {
  clearChatError();
  if (appendUser) {
    appendMessage("user", userLabel || message);
  }
  const { bubble } = appendAssistantStreamBubble();
  setChatStatus("正在连接模型…");
  setStreaming(true);
  state.abortController = new AbortController();

  try {
    const requestBody = {
      session_id: elements.sessionId.value.trim() || state.sessionId,
      user_key: userKey,
    };
    if (resume) {
      requestBody.resume = resume;
    } else {
      requestBody.message = message;
    }
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: state.abortController.signal,
    });

    if (!response.ok || !response.body) {
      let detail = "模型暂时不可用";
      try {
        const payload = await response.json();
        detail = payload.detail || detail;
      } catch {
        // keep fallback message
      }
      throw new Error(detail);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    let streamError = "";
    let citations = [];
    let replyOptions = [];
    let orderSelectors = [];
    let refundForms = [];
    let exchangeForms = [];
    let ticketConfirmations = [];

    const processFrame = (frame) => {
      let eventType = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      if (!data) return;
      if (data === "[DONE]") {
        done = true;
        return;
      }
      try {
        const payload = JSON.parse(data);
        if (eventType === "error") {
          streamError = payload.message || "模型暂时不可用";
        } else if (payload.type === "tool_status") {
          const stack = bubble.closest(".message-row")?.querySelector(".message-stack");
          if (stack) {
            upsertToolBadge(stack, payload.tool_name, payload.status, payload.message);
          }
        } else if (payload.type === "citations") {
          citations = Array.isArray(payload.citations) ? payload.citations : [];
        } else if (payload.type === "reply_options") {
          replyOptions = Array.isArray(payload.options) ? payload.options : [];
        } else if (payload.type === "order_selector") {
          orderSelectors = Array.isArray(payload.orders) ? [payload.orders] : [];
        } else if (payload.type === "order_selected") {
          state.pendingOrderId = payload.order_id || state.pendingOrderId;
        } else if (payload.type === "refund_form") {
          refundForms.push(payload);
        } else if (payload.type === "exchange_form") {
          exchangeForms.push(payload);
        } else if (payload.type === "ticket_confirmation") {
          ticketConfirmations.push(payload);
        } else if (
          typeof payload.delta === "string" ||
          typeof payload.text === "string"
        ) {
          const delta =
            typeof payload.delta === "string" ? payload.delta : payload.text;
          const current = bubble.textContent === "" ? "" : bubble.textContent;
          bubble.textContent = current + delta;
          scrollChatToEnd();
        }
      } catch {
        // ignore malformed frames
      }
    };

    while (!done) {
      const { done: readerDone, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !readerDone });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) processFrame(frame);
      if (readerDone) {
        if (buffer.trim()) processFrame(buffer);
        break;
      }
    }

    if (streamError) {
      setAssistantText(bubble, streamError, true);
      setChatStatus("上游返回错误");
      return false;
    } else {
      const stack = bubble.closest(".message-stack");
      const hasStructuredCard =
        orderSelectors.length > 0 ||
        refundForms.length > 0 ||
        exchangeForms.length > 0 ||
        ticketConfirmations.length > 0;
      if (bubble.textContent || !hasStructuredCard) {
        renderAssistantContent(bubble, bubble.textContent, citations);
      } else {
        bubble.setAttribute("aria-busy", "false");
        bubble.remove();
      }
      for (const orders of orderSelectors) {
        renderOrderSelector(stack, orders);
      }
      renderReplyOptions(stack, replyOptions, message || userLabel);
      for (const refundForm of refundForms) {
        renderRefundForm(stack, refundForm.order_id);
      }
      for (const exchangeForm of exchangeForms) {
        renderExchangeForm(stack, exchangeForm);
      }
      for (const confirmation of ticketConfirmations) {
        renderTicketConfirmation(stack, confirmation);
      }
      if (bubble.isConnected) {
        addFeedback(bubble);
      }
      setChatStatus("回复完成");
      return true;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      setAssistantText(bubble, bubble.textContent || "已停止");
      setChatStatus("已停止");
    } else {
      setAssistantText(bubble, error.message || "模型暂时不可用", true);
      setChatStatus("请求失败");
    }
    return false;
  } finally {
    setStreaming(false);
    state.abortController = null;
    loadConversations();
  }
}

function resetExtractFeedback() {
  elements.extractTextError.textContent = "";
  elements.extractErrorSummary.hidden = true;
  elements.extractErrorSummary.innerHTML = "";
}

function showExtractValidationError() {
  elements.extractTextError.textContent = "请输入售后描述";
  elements.extractErrorSummary.hidden = false;
  elements.extractErrorSummary.innerHTML =
    '<ul><li><a href="#extract-text">请输入售后描述</a></li></ul>';
  elements.extractErrorSummary.focus();
}

async function runExtract() {
  const text = elements.extractText.value.trim();
  resetExtractFeedback();

  if (!text) {
    showExtractValidationError();
    return;
  }

  elements.runExtract.disabled = true;
  elements.runExtract.setAttribute("aria-busy", "true");
  elements.extractEmpty.hidden = false;
  elements.extractResult.hidden = true;
  setExtractStatus("正在提取…");

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "提取失败");
    }

    state.lastResult = payload;
    elements.resultOrder.textContent = payload.order_id || "null";
    elements.resultType.textContent = payload.request_type || "-";
    elements.resultSolution.textContent = payload.expected_solution || "-";
    elements.extractEmpty.hidden = true;
    elements.extractResult.hidden = false;
    setExtractStatus("提取完成");
  } catch (error) {
    elements.extractEmpty.hidden = false;
    elements.extractResult.hidden = true;
    elements.extractErrorSummary.hidden = false;
    elements.extractErrorSummary.textContent = error.message || "提取失败";
    setExtractStatus("提取失败");
  } finally {
    elements.runExtract.disabled = false;
    elements.runExtract.setAttribute("aria-busy", "false");
  }
}

async function copyResult() {
  if (!state.lastResult) return;
  const text = JSON.stringify(state.lastResult, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    setExtractStatus("已复制");
  } catch {
    setExtractStatus("复制失败");
  }
}

elements.railItems.forEach((item) => {
  item.addEventListener("click", () => switchView(item.dataset.view));
});

function startNewConversation() {
  if (state.streaming) stopStreaming();
  state.sessionId = makeSessionId();
  ensureSessionId();
  clearChatLog();
  setChatStatus("新会话已创建");
  renderConversationList();
  loadConversations();
}

elements.newChat.addEventListener("click", startNewConversation);
elements.newConversation.addEventListener("click", startNewConversation);
elements.deleteCancel.addEventListener("click", closeDeleteDialog);
elements.deleteConfirm.addEventListener("click", confirmDeleteConversation);
elements.deleteDialog.addEventListener("click", (event) => {
  if (event.target === elements.deleteDialog) closeDeleteDialog();
});

elements.sendChat.addEventListener("click", streamChat);
elements.stopChat.addEventListener("click", stopStreaming);
elements.extractForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runExtract();
});
elements.copyResult.addEventListener("click", copyResult);
elements.ragRefresh.addEventListener("click", loadRagDashboard);
elements.ragBuild.addEventListener("click", runRagBuild);
elements.ragMine.addEventListener("click", runRagMine);
elements.ragSearchForm.addEventListener("submit", runRagSearch);

elements.chatMessage.addEventListener("input", updateChatCount);
elements.copySession.addEventListener("click", async () => {
  const sessionValue = elements.sessionId.value.trim() || state.sessionId;
  try {
    await navigator.clipboard.writeText(sessionValue);
    setChatStatus("会话 ID 已复制");
  } catch {
    setChatStatus("复制失败，请手动选择复制");
  }
});

elements.chatMessage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    streamChat();
  }
});

ensureSessionId();
clearChatLog();
switchView("chat");
loadConversations();

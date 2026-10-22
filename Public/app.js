const $ = (s) => document.querySelector(s);
const input = $("#promptInput");
const conversation = $("#conversation");
const sendButton = $("#sendButton");
const suggestions = $("#suggestions");
const STORAGE_KEY = "nexa-ai-chats-v1";
let messages = [];
let activeMode = "Chat";
let busy = false;
let toastTimer;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function readChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveChats() {
  if (!messages.length) return;
  const chats = readChats();
  const id = window.currentChatId || crypto.randomUUID();
  window.currentChatId = id;
  const title = (messages.find(m => m.role === "user")?.content || "New chat").slice(0, 48);
  const existing = chats.findIndex(c => c.id === id);
  const chat = { id, title, messages, updatedAt: Date.now() };
  if (existing >= 0) chats[existing] = chat; else chats.unshift(chat);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 30)));
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function renderMessage(message, index) {
  const isUser = message.role === "user";
  const el = document.createElement("article");
  el.className = `message ${isUser ? "user" : "assistant"}`;
  el.innerHTML = `<div class="message-avatar">${isUser ? "Y" : "N"}</div><div class="message-body"><div class="message-meta">${isUser ? "You" : "Nexa AI"}</div><div class="message-text">${escapeHtml(message.content)}</div>${isUser ? "" : `<div class="message-actions"><button data-copy="${index}">Copy response</button></div>`}</div>`;
  return el;
}
function renderConversation() {
  conversation.innerHTML = "";
  messages.forEach((m, i) => conversation.appendChild(renderMessage(m, i)));
  conversation.querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(messages[Number(btn.dataset.copy)].content); showToast("Response copied"); }
    catch { showToast("Copy not available in this browser"); }
  }));
  suggestions.style.display = messages.length ? "none" : "flex";
}
function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  sendButton.textContent = value ? "…" : "↑";
}
async function sendMessage(text) {
  const content = (text ?? input.value).trim();
  if (!content || busy) return;
  messages.push({ role: "user", content });
  input.value = "";
  input.style.height = "auto";
  renderConversation();
  const pending = document.createElement("article");
  pending.className = "message assistant";
  pending.innerHTML = `<div class="message-avatar">N</div><div class="message-body"><div class="message-meta">Nexa AI</div><div class="typing">•••</div></div>`;
  conversation.appendChild(pending);
  pending.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setBusy(true);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    messages.push({ role: "assistant", content: data.answer });
  } catch (err) {
    messages.push({ role: "assistant", content: `Sorry, ${err.message || "kuch problem aa gayi"}` });
  } finally {
    pending.remove();
    setBusy(false);
    renderConversation();
    saveChats();
    conversation.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}
function newChat() {
  messages = [];
  window.currentChatId = crypto.randomUUID();
  renderConversation();
  input.value = "";
  input.focus();
  $("#sidebar").classList.remove("open");
}
$("#newChat").addEventListener("click", newChat);
$("#topNewChat").addEventListener("click", () => { newChat(); input.focus(); });
$("#bannerChat").addEventListener("click", () => { input.focus(); window.scrollTo({top:0,behavior:"smooth"}); });
sendButton.addEventListener("click", () => sendMessage());
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight,180)}px`; });
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
document.querySelectorAll("[data-prompt]").forEach(btn => btn.addEventListener("click", () => {
  const prompt = btn.dataset.prompt;
  input.value = prompt;
  input.focus();
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight,180)}px`;
  if (btn.classList.contains("tool-card")) window.scrollTo({top:0,behavior:"smooth"});
}));
document.querySelectorAll(".mode").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".mode").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  activeMode = btn.dataset.mode;
  const hints = {
    Chat: "Message Nexa AI...",
    Study: "What topic should we learn together?",
    Code: "What are you building or debugging?",
    Create: "What would you like to create?"
  };
  input.placeholder = hints[activeMode];
}));
$("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#historyButton").addEventListener("click", () => {
  const chats = readChats();
  if (!chats.length) return showToast("Abhi koi saved chat nahi hai");
  const picker = chats.map((c, i) => `${i + 1}. ${c.title}`).join("\n");
  const choice = prompt("Recent chats (number type karo):\n" + picker);
  const selected = chats[Number(choice) - 1];
  if (selected) {
    messages = selected.messages || [];
    window.currentChatId = selected.id;
    renderConversation();
    $("#sidebar").classList.remove("open");
    document.querySelector(".welcome-line").scrollIntoView({behavior:"smooth",block:"start"});
  }
});
$("#savedButton").addEventListener("click", () => showToast("Chats isi device ke browser mein save hote hain."));
$("#toolsButton").addEventListener("click", () => { $("#tools").scrollIntoView({behavior:"smooth"}); $("#sidebar").classList.remove("open"); });
$("#aboutButton").addEventListener("click", () => { $("#about").scrollIntoView({behavior:"smooth"}); $("#sidebar").classList.remove("open"); });
renderConversation();

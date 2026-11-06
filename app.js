const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const toastEl = $("#toast");
let toastTimer = null;
function toast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  }
}

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.remove("is-active");
      panel.hidden = true;
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    const panel = document.getElementById(tab.dataset.tab);
    panel.classList.add("is-active");
    panel.hidden = false;
  });
});

// Translator
const deeplKeyInput = $("#deeplKey");
const deeplEndpointSelect = $("#deeplEndpoint");
const deeplStatus = $("#deeplStatus");

function syncDeeplStatus() {
  const key = localStorage.getItem("deeplApiKey");
  if (key) {
    $("#deeplKey").value = key;
    $("#deeplEndpoint").value = localStorage.getItem("deeplEndpoint") || "free";
    deeplStatus.textContent = "DeepL подключён. Перевод попробует использовать DeepL.";
    deeplStatus.className = "status success";
  } else {
    deeplStatus.textContent = "DeepL не подключён: перевод через MyMemory.";
    deeplStatus.className = "status info";
  }
}
syncDeeplStatus();

$("#saveDeepl").addEventListener("click", () => {
  const key = deeplKeyInput.value.trim();
  if (!key) {
    toast("Введи ключ DeepL");
    return;
  }
  localStorage.setItem("deeplApiKey", key);
  localStorage.setItem("deeplEndpoint", deeplEndpointSelect.value);
  syncDeeplStatus();
  toast("Ключ сохранён");
});

$("#clearDeepl").addEventListener("click", () => {
  localStorage.removeItem("deeplApiKey");
  localStorage.removeItem("deeplEndpoint");
  deeplKeyInput.value = "";
  syncDeeplStatus();
  toast("Ключ удалён");
});

function deepLUrl(endpoint) {
  return endpoint === "pro"
    ? "https://api.deepl.com/v2/translate"
    : "https://api-free.deepl.com/v2/translate";
}

async function translateWithDeepL(text, source, target, key, endpoint) {
  const params = new URLSearchParams();
  params.append("text", text);
  params.append("target_lang", target.toUpperCase());
  if (source && source !== "AUTO") params.append("source_lang", source.toUpperCase());

  const response = await fetch(deepLUrl(endpoint), {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `DeepL error ${response.status}`);
  }
  const data = await response.json();
  return data.translations?.[0]?.text || "";
}

async function translateWithMyMemory(text, source, target) {
  const sourceCode = source === "AUTO" ? "autodetect" : source.toLowerCase();
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sourceCode + "|" + target.toLowerCase())}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MyMemory error ${response.status}`);
  const data = await response.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || "MyMemory error");
  return data.responseData.translatedText;
}

$("#translateBtn").addEventListener("click", async () => {
  const text = $("#sourceText").value.trim();
  const source = $("#srcLang").value;
  const target = $("#dstLang").value;
  const result = $("#resultText");
  if (!text) {
    toast("Введите текст для перевода");
    return;
  }
  if (source !== "AUTO" && source === target) {
    toast("Источник и цель совпадают");
    return;
  }

  $("#translateBtn").disabled = true;
  result.value = "Переводим...";

  const key = localStorage.getItem("deeplApiKey");
  const endpoint = localStorage.getItem("deeplEndpoint") || "free";
  try {
    if (key) {
      try {
        result.value = await translateWithDeepL(text, source, target, key, endpoint);
        toast("Переведено через DeepL");
        return;
      } catch (error) {
        console.warn(error);
        toast("DeepL недоступен, откат к MyMemory");
      }
    }
    result.value = await translateWithMyMemory(text, source, target);
    toast("Переведено через MyMemory");
  } catch (error) {
    console.error(error);
    result.value = "";
    toast("Ошибка перевода");
  } finally {
    $("#translateBtn").disabled = false;
  }
});

$("#swapBtn").addEventListener("click", () => {
  const src = $("#srcLang");
  const dst = $("#dstLang");
  const text = $("#sourceText");
  const result = $("#resultText");
  const tmp = src.value === "AUTO" ? dst.value : src.value;
  src.value = dst.value;
  dst.value = tmp === "AUTO" ? "EN" : tmp;
  if (result.value) {
    text.value = result.value;
    result.value = "";
  }
});

$("#copyTranslation").addEventListener("click", async () => {
  const ok = await copyText($("#resultText").value);
  toast(ok ? "Перевод скопирован" : "Не удалось скопировать");
});

// Currency
const currencyList = ["AUD","BGN","BRL","CAD","CHF","CNY","CZK","DKK","EUR","GBP","HKD","HUF","IDR","ILS","INR","ISK","JPY","KRW","MXN","MYR","NOK","NZD","PHP","PLN","RON","SEK","SGD","THB","TRY","USD","ZAR"];
const fromSelect = $("#fromCurrency");
const toSelect = $("#toCurrency");

function populateCurrencies() {
  currencyList.forEach((code) => {
    const fromOption = new Option(code, code);
    const toOption = new Option(code, code);
    fromSelect.add(fromOption);
    toSelect.add(toOption);
  });
  fromSelect.value = "USD";
  toSelect.value = "EUR";
}
populateCurrencies();

$("#swapCurrencies").addEventListener("click", () => {
  const tmp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = tmp;
});

$("#convertBtn").addEventListener("click", async () => {
  const amount = Number($("#amount").value);
  const from = fromSelect.value;
  const to = toSelect.value;
  const result = $("#currencyResult");
  const meta = $("#currencyMeta");

  if (!Number.isFinite(amount) || amount < 0) {
    toast("Введите корректную сумму");
    return;
  }
  result.textContent = "Считаем...";
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (!response.ok) throw new Error(`Frankfurter ${response.status}`);
    const data = await response.json();
    const converted = data.rates?.[to];
    if (converted === undefined) throw new Error("Нет курса");
    result.textContent = `${amount.toLocaleString("ru-RU")} ${from} = ${Number(converted).toLocaleString("ru-RU", { maximumFractionDigits: 4 })} ${to}`;
    meta.textContent = `Курс на ${data.date}, базовая валюта ${data.base}.`;
    toast("Готово");
  } catch (error) {
    console.error(error);
    result.textContent = "—";
    meta.textContent = "Не удалось получить курс. Проверьте сеть.";
    toast("Ошибка конвертации");
  }
});

// Password generator
const lower = "abcdefghijklmnopqrstuvwxyz";
const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const digits = "0123456789";
const symbols = "!@#$%^&*()-_=+[]{};:,.?";

function cryptoRandom(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function generatePassword(length, options) {
  let alphabet = "";
  if (options.lower) alphabet += lower;
  if (options.upper) alphabet += upper;
  if (options.digits) alphabet += digits;
  if (options.symbols) alphabet += symbols;
  if (!alphabet) return "";
  const chars = [];
  for (let i = 0; i < length; i++) {
    chars.push(alphabet[cryptoRandom(alphabet.length)]);
  }
  // Guarantee at least one char from every selected group.
  const groups = [options.lower && lower, options.upper && upper, options.digits && digits, options.symbols && symbols].filter(Boolean);
  groups.forEach((group, index) => {
    chars[index] = group[cryptoRandom(group.length)];
  });
  for (let i = chars.length - 1; i > 0; i--) {
    const j = cryptoRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  if (score >= 7) return ["Отличная", "success"];
  if (score >= 4) return ["Хорошая", "warning"];
  return ["Слабая", "danger"];
}

const pwdOutput = $("#pwdOutput");
const pwdLength = $("#pwdLength");
const pwdLengthValue = $("#pwdLengthValue");
pwdLength.addEventListener("input", () => pwdLengthValue.textContent = pwdLength.value);

$("#genPwdBtn").addEventListener("click", () => {
  const length = Number(pwdLength.value);
  const count = Math.min(10, Math.max(1, Number($("#pwdCount").value)));
  const options = {
    lower: $("#pwdLower").checked,
    upper: $("#pwdUpper").checked,
    digits: $("#pwdDigits").checked,
    symbols: $("#pwdSymbols").checked,
  };
  if (!Object.values(options).some(Boolean)) {
    toast("Выберите хотя бы один тип символов");
    return;
  }
  const passwords = Array.from({ length: count }, () => generatePassword(length, options));
  pwdOutput.textContent = passwords.join("\n");
  const [label, className] = passwordStrength(passwords[0]);
  const strength = $("#pwdStrength");
  strength.textContent = `Сила пароля: ${label}`;
  strength.className = `status ${className}`;
});

$("#copyPwdBtn").addEventListener("click", async () => {
  const first = pwdOutput.textContent.split("\n")[0];
  const ok = await copyText(first);
  toast(ok ? "Пароль скопирован" : "Сначала сгенерируйте пароль");
});

generatePassword && $("#genPwdBtn").click();

// QR
const qrCanvas = $("#qrCanvas");
$("#qrBtn").addEventListener("click", () => {
  const text = $("#qrText").value.trim();
  if (!text) {
    toast("Введите текст для QR");
    return;
  }
  const size = Number($("#qrSize").value);
  const bg = $("#qrBg").value;
  qrCanvas.width = size;
  qrCanvas.height = size;
  if (typeof QRCode === "undefined") {
    toast("Библиотека QR не загрузилась");
    return;
  }
  QRCode.toCanvas(qrCanvas, text, {
    width: size,
    margin: 2,
    color: { dark: "#05111f", light: bg },
  }, (error) => {
    if (error) {
      console.error(error);
      toast("Ошибка генерации QR");
    } else {
      toast("QR создан");
    }
  });
});

$("#downloadQr").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "qrcode.png";
  link.href = qrCanvas.toDataURL("image/png");
  link.click();
  toast("PNG скачан");
});

// JSON
function renderJsonStatus(message, className) {
  const status = $("#jsonStatus");
  status.textContent = message;
  status.className = `status ${className}`;
}

$("#formatJson").addEventListener("click", () => {
  const input = $("#jsonInput").value;
  try {
    const parsed = JSON.parse(input);
    $("#jsonOutput").value = JSON.stringify(parsed, null, 2);
    renderJsonStatus("JSON валидный: отформатировано", "success");
  } catch (error) {
    $("#jsonOutput").value = "";
    renderJsonStatus(`Ошибка: ${error.message}`, "danger");
  }
});

$("#minifyJson").addEventListener("click", () => {
  const input = $("#jsonInput").value;
  try {
    const parsed = JSON.parse(input);
    $("#jsonOutput").value = JSON.stringify(parsed);
    renderJsonStatus("JSON валидный: минифицирован", "success");
  } catch (error) {
    $("#jsonOutput").value = "";
    renderJsonStatus(`Ошибка: ${error.message}`, "danger");
  }
});

$("#copyJson").addEventListener("click", async () => {
  const ok = await copyText($("#jsonOutput").value);
  toast(ok ? "JSON скопирован" : "Сначала создайте результат");
});

(function () {
  const CHANNEL = "fatesystem/native-roll";
  const estado = { forca: 0, magia: 0, agilidade: 0, sorte: 0 };
  const labels = {
    forca: "Força",
    magia: "Magia",
    agilidade: "Agilidade",
    sorte: "Sorte",
  };
  const maxPorAtributo = 20;

  const status = document.getElementById("status-texto");
  const resumo = document.getElementById("resumo-dados");
  const botaoRolar = document.getElementById("btn-rolar");

  let popup = document.getElementById("dice-popup");
  let popupSub = document.getElementById("popup-sub");
  let popupList = document.getElementById("popup-list");
  let popupTotal = document.getElementById("popup-total");
  let popupClose = document.getElementById("popup-close");

  function ensurePopupElements() {
    if (popup && popup.isConnected && popupSub && popupList && popupTotal && popupClose) return;

    const style = document.createElement("style");
    style.innerText = `
      #dice-popup{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
      #dice-popup.visible{display:flex}
      .popup-card{width:min(460px,95vw);background:#111822;border:1px solid #2e3a4e;border-radius:12px;padding:14px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
      .popup-title{margin:0 0 8px;font-size:16px;text-transform:uppercase}
      .popup-sub{margin:0 0 12px;color:#9fb2d1;font-size:12px}
      .popup-list{display:grid;gap:8px}
      .popup-row{display:flex;justify-content:space-between;align-items:center;background:#1a2433;border-radius:8px;padding:8px 10px;border-left:4px solid #888}
      .popup-row.forca{border-left-color:#ff3b3b}.popup-row.magia{border-left-color:#3f7dff}.popup-row.agilidade{border-left-color:#b14dff}.popup-row.sorte{border-left-color:#33cc66}
      .popup-values{font-weight:700}.popup-total{margin-top:12px;font-weight:800;text-align:right}
      .popup-close{width:100%;margin-top:12px;border:0;border-radius:8px;background:#2f7bff;color:#fff;font-weight:700;padding:9px;cursor:pointer}
    `;
    document.head.appendChild(style);

    popup = document.createElement("div");
    popup.id = "dice-popup";
    popup.setAttribute("aria-hidden", "true");
    popup.innerHTML = `
      <div class="popup-card">
        <h3 class="popup-title">Resultado da rolagem</h3>
        <p class="popup-sub" id="popup-sub"></p>
        <div class="popup-list" id="popup-list"></div>
        <div class="popup-total" id="popup-total"></div>
        <button type="button" class="popup-close" id="popup-close">Fechar</button>
      </div>
    `;

    document.body.appendChild(popup);

    popupSub = popup.querySelector("#popup-sub");
    popupList = popup.querySelector("#popup-list");
    popupTotal = popup.querySelector("#popup-total");
    popupClose = popup.querySelector("#popup-close");

    popupClose.addEventListener("click", closePopup);
    popup.addEventListener("click", (e) => {
      if (e.target === popup) closePopup();
    });
  }

  function getOBR() {
    if (globalThis.OBR) return globalThis.OBR;
    try {
      if (globalThis.parent && globalThis.parent !== globalThis && globalThis.parent.OBR) {
        return globalThis.parent.OBR;
      }
    } catch (_) {
      // Ignora erro de acesso cross-origin
    }
    return null;
  }

  function setStatus(texto, cor) {
    if (!status) return;
    status.innerText = texto;
    if (cor) status.style.color = cor;
  }

  function atualizarUI() {
    Object.keys(estado).forEach((attr) => {
      const valor = estado[attr];
      const contador = document.getElementById(`count-${attr}`);
      if (contador) contador.innerText = String(valor);

      const bloco = document.querySelector(`[data-attr="${attr}"]`);
      if (!bloco) return;

      const btnMenos = bloco.querySelector('[data-action="decrement"]');
      const btnMais = bloco.querySelector('[data-action="increment"]');

      if (btnMenos) btnMenos.disabled = valor <= 0;
      if (btnMais) btnMais.disabled = valor >= maxPorAtributo;
    });

    const total = Object.values(estado).reduce((acc, n) => acc + n, 0);
    if (resumo) resumo.innerText = `Total de dados: ${total}`;
  }

  function limparSelecao() {
    Object.keys(estado).forEach((attr) => {
      estado[attr] = 0;
    });
    atualizarUI();
  }

  function ajustarAtributo(attr, acao) {
    if (!(attr in estado)) return;
    if (acao === "increment" && estado[attr] < maxPorAtributo) estado[attr] += 1;
    if (acao === "decrement" && estado[attr] > 0) estado[attr] -= 1;
    atualizarUI();
  }

  function rolarD20() {
    return Math.floor(Math.random() * 20) + 1;
  }

  function gerarResultado() {
    const attributes = [];
    let total = 0;

    Object.entries(estado).forEach(([attr, qtd]) => {
      if (qtd <= 0) return;
      const rolls = Array.from({ length: qtd }, () => rolarD20());
      const subtotal = rolls.reduce((a, b) => a + b, 0);
      total += subtotal;
      attributes.push({ attr, label: labels[attr], qtd, rolls, subtotal });
    });

    return {
      channel: CHANNEL,
      createdAt: new Date().toISOString(),
      source: "Rolador d20 Nativo",
      attributes,
      total,
    };
  }

  function renderPopup(result) {
    ensurePopupElements();
    if (!popup || !popupSub || !popupList || !popupTotal) return;

    popupSub.innerText = `Enviado por ${result.source} • ${new Date(result.createdAt).toLocaleTimeString()}`;
    popupList.innerHTML = "";

    result.attributes.forEach((item) => {
      const row = document.createElement("div");
      row.className = `popup-row ${item.attr}`;

      const left = document.createElement("span");
      left.innerText = `${item.label} (${item.qtd}d20)`;

      const right = document.createElement("span");
      right.className = "popup-values";
      right.innerText = `${item.rolls.join(" + ")} = ${item.subtotal}`;

      row.appendChild(left);
      row.appendChild(right);
      popupList.appendChild(row);
    });

    popupTotal.innerText = `Total Geral: ${result.total}`;
    popup.classList.add("visible");
    popup.setAttribute("aria-hidden", "false");
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove("visible");
    popup.setAttribute("aria-hidden", "true");
  }

  function extractBroadcastPayload(eventOrData) {
    if (!eventOrData) return null;
    const payload = eventOrData.data ?? eventOrData;
    if (!payload || !Array.isArray(payload.attributes)) return null;
    return payload;
  }

  async function sendToPlayers(result) {
    const OBR = getOBR();
    if (!OBR?.broadcast?.sendMessage) return false;

    try {
      await OBR.broadcast.sendMessage(CHANNEL, result);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function showNative3DDiceIfAvailable() {
    const OBR = getOBR();
    if (!OBR?.dice?.roll) return false;

    let rolled = false;
    for (const qtd of Object.values(estado)) {
      if (qtd <= 0) continue;
      try {
        await OBR.dice.roll(`${qtd}d20`);
        rolled = true;
      } catch (_) {
        // Continua para tentar os demais atributos.
      }
    }

    return rolled;
  }

  function setupBroadcastListener() {
    const OBR = getOBR();
    if (!OBR?.broadcast?.onMessage) return;

    OBR.broadcast.onMessage(CHANNEL, (event) => {
      const data = extractBroadcastPayload(event);
      if (!data) return;
      renderPopup(data);
    });
  }

  document.querySelectorAll(".atributo").forEach((bloco) => {
    const attr = bloco.dataset.attr;
    bloco.querySelectorAll(".btn-ajuste").forEach((botao) => {
      botao.addEventListener("click", (event) => {
        event.preventDefault();
        ajustarAtributo(attr, botao.dataset.action);
      });
    });
  });

  if (popupClose) popupClose.addEventListener("click", closePopup);
  if (popup) {
    popup.addEventListener("click", (e) => {
      if (e.target === popup) closePopup();
    });
  }

  if (botaoRolar) {
    botaoRolar.addEventListener("click", async (event) => {
      event.preventDefault();

      const totalSelecionado = Object.values(estado).reduce((acc, n) => acc + n, 0);
      if (!totalSelecionado) {
        setStatus("Não há dados selecionados. Escolha pelo menos 1.", "#ff6868");
        return;
      }

      const result = gerarResultado();
      renderPopup(result);

      const has3D = await showNative3DDiceIfAvailable();
      const sent = await sendToPlayers(result);
      if (sent && has3D) {
        setStatus("Rolagem enviada para os jogadores e dados 3D acionados.", "#66dd66");
      } else if (sent) {
        setStatus("Rolagem enviada para os jogadores (3D indisponível).", "#f0b90b");
      } else if (has3D) {
        setStatus("Rolagem local com dados 3D locais (broadcast indisponível).", "#f0b90b");
      } else {
        setStatus("Rolagem local feita (broadcast/3D indisponíveis).", "#f0b90b");
      }

      limparSelecao();
    });
  }

  (function initOBR() {
    const OBR = getOBR();
    if (!OBR || typeof OBR.onReady !== "function") {
      setStatus("Modo local: OBR não detectado.", "#f0b90b");
      return;
    }

    OBR.onReady(() => {
      setupBroadcastListener();

      const hasBroadcast = Boolean(OBR?.broadcast?.sendMessage && OBR?.broadcast?.onMessage);
      const hasDice = Boolean(OBR?.dice?.roll);

      if (hasBroadcast && hasDice) {
        setStatus("Conectado ao Owlbear. Broadcast + Dado 3D prontos.", "#66dd66");
      } else if (hasBroadcast) {
        setStatus("Conectado ao Owlbear. Broadcast pronto, dado 3D indisponível.", "#f0b90b");
      } else if (hasDice) {
        setStatus("Conectado ao Owlbear. Dado 3D pronto, broadcast indisponível.", "#f0b90b");
      } else {
        setStatus("Conectado ao Owlbear, mas sem APIs de broadcast/dado 3D.", "#f0b90b");
      }
    });
  })();

  atualizarUI();
})();

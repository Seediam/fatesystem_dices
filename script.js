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

  const popup = document.getElementById("dice-popup");
  const popupSub = document.getElementById("popup-sub");
  const popupList = document.getElementById("popup-list");
  const popupTotal = document.getElementById("popup-total");
  const popupClose = document.getElementById("popup-close");

  function getOBR() {
    if (globalThis.OBR) return globalThis.OBR;
    try {
      if (globalThis.parent && globalThis.parent !== globalThis && globalThis.parent.OBR) {
        return globalThis.parent.OBR;
      }
    } catch (_) {}
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
      createdAt: new Date().toISOString(),
      source: "Rolador d20 Nativo",
      attributes,
      total,
    };
  }

  function renderPopup(result) {
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
    if (!OBR?.dice?.roll) return;

    for (const qtd of Object.values(estado)) {
      if (qtd > 0) {
        await OBR.dice.roll(`${qtd}d20`);
      }
    }
  }

  function setupBroadcastListener() {
    const OBR = getOBR();
    if (!OBR?.broadcast?.onMessage) return;

    OBR.broadcast.onMessage(CHANNEL, (event) => {
      const data = event?.data;
      if (!data || !Array.isArray(data.attributes)) return;
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
  if (popup) popup.addEventListener("click", (e) => {
    if (e.target === popup) closePopup();
  });

  if (botaoRolar) {
    botaoRolar.addEventListener("click", async (event) => {
      event.preventDefault();

      const totalSelecionado = Object.values(estado).reduce((acc, n) => acc + n, 0);
      if (!totalSelecionado) {
        setStatus("Não Há Dados Selecionados , Selecione pelo menos 1", "#ff6868");
        return;
      }

      const result = gerarResultado();
      renderPopup(result);

      await showNative3DDiceIfAvailable();
      const sent = await sendToPlayers(result);
      setStatus(sent ? "Rolagem enviada para os jogadores." : "Rolagem local feita (broadcast indisponível).", sent ? "#66dd66" : "#f0b90b");
      limparSelecao();
    });
  }

  (function initOBR() {
    const OBR = getOBR();
    if (!OBR || typeof OBR.onReady !== "function") return;
    OBR.onReady(() => {
      setupBroadcastListener();
      setStatus("Conectado ao Owlbear. Pronto para rolar.", "#66dd66");
    });
  })();

  atualizarUI();
})();

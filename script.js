(function () {
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

  function waitForOBRReady(timeoutMs) {
    return new Promise((resolve) => {
      const OBR = globalThis.OBR;
      if (!OBR || typeof OBR.onReady !== "function") {
        resolve(false);
        return;
      }

      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };

      OBR.onReady(() => finish(true));
      setTimeout(() => finish(false), timeoutMs);
    });
  }

  async function sendRumbleDiceViaMetadata(notation, senderName) {
    const OBR = globalThis.OBR;
    if (!OBR?.player?.setMetadata) {
      throw new Error("OBR.player.setMetadata indisponível");
    }

    const payload = {
      "com.battle-system.friends/metadata_diceroll": {
        notation,
        created: new Date().toISOString(),
        sender: senderName,
      },
    };

    await OBR.player.setMetadata(payload);
  }

  async function sendRumbleChatViaMetadata(texto, senderName) {
    const OBR = globalThis.OBR;
    if (!OBR?.player?.setMetadata) return;

    const payload = {
      "com.battle-system.friends/metadata_chatlog": {
        chatlog: texto,
        created: new Date().toISOString(),
        sender: senderName,
        targetId: "0000",
      },
    };

    await OBR.player.setMetadata(payload);
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

  if (botaoRolar) {
    botaoRolar.addEventListener("click", async (event) => {
      event.preventDefault();

      const total = Object.values(estado).reduce((acc, n) => acc + n, 0);
      if (!total) {
        setStatus("Não Há Dados Selecionados , Selecione pelo menos 1", "#ff6868");
        return;
      }

      try {
        const ready = await waitForOBRReady(2500);
        if (!ready) {
          setStatus("OBR indisponível. Abra dentro da sala do Owlbear.", "#f0b90b");
          return;
        }

        setStatus("Enviando rolagens para o Rumble...", "#66dd66");

        const envios = [];
        for (const [attr, qtd] of Object.entries(estado)) {
          if (qtd <= 0) continue;
          envios.push(sendRumbleDiceViaMetadata(`${qtd}d20`, labels[attr]));
        }

        await Promise.all(envios);

        const resumoEnvio = Object.entries(estado)
          .filter(([, qtd]) => qtd > 0)
          .map(([attr, qtd]) => `${labels[attr]}: ${qtd}d20`)
          .join(" | ");

        await sendRumbleChatViaMetadata(`Rolagem enviada: ${resumoEnvio}`, "Rolador d20");
        limparSelecao();
        setStatus("Dados enviados para o Rumble.", "#66dd66");
      } catch (erro) {
        setStatus(`Erro ao enviar para o Rumble: ${erro}`, "#ff6868");
      }
    });
  }

  atualizarUI();
})();

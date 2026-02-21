const estado = {
  forca: 0,
  magia: 0,
  agilidade: 0,
  sorte: 0,
};

const maxPorAtributo = 20;
const status = document.getElementById("status-texto");
const resumo = document.getElementById("resumo-dados");
const botaoRolar = document.getElementById("btn-rolar");

function getOBR() {
  return globalThis.OBR ?? null;
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

function montarExpressaoDddice() {
  const expr = [];
  if (estado.forca > 0) expr.push(`${estado.forca}d20@dddice-red`);
  if (estado.magia > 0) expr.push(`${estado.magia}d20@dddice-blue`);
  if (estado.agilidade > 0) expr.push(`${estado.agilidade}d20@dddice-purple`);
  if (estado.sorte > 0) expr.push(`${estado.sorte}d20@dddice-green`);
  return expr.join(" + ");
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

document.querySelectorAll(".atributo").forEach((bloco) => {
  const attr = bloco.dataset.attr;

  bloco.querySelectorAll(".btn-ajuste").forEach((botao) => {
    botao.addEventListener("click", (event) => {
      event.preventDefault();
      const acao = botao.dataset.action;
      ajustarAtributo(attr, acao);
    });
  });
});

if (botaoRolar) {
  botaoRolar.addEventListener("click", async (event) => {
    event.preventDefault();
    const equacao = montarExpressaoDddice();

    if (!equacao) {
      status.innerText = "Não Há Dados Selecionados , Selecione pelo menos 1";
      status.style.color = "#ff6868";
      return;
    }

    status.innerText = `Rolando: ${equacao}`;
    status.style.color = "#66dd66";

    const OBR = getOBR();

    try {
      if (OBR?.isAvailable) {
        OBR.broadcast.sendMessage("dddice/roll", { equation: equacao });
        limparSelecao();
        status.innerText = "Dados enviados para rolagem.";
      } else {
        status.innerText = "OBR indisponível aqui. Abra pela extensão no Owlbear.";
        status.style.color = "#f0b90b";
      }
    } catch (erro) {
      status.innerText = `Erro ao rolar: ${erro}`;
      status.style.color = "#ff6868";
    }
  });
}

atualizarUI();

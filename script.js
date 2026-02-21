import OBR from "https://cdn.jsdelivr.net/npm/@owlbear-rodeo/sdk@3.1.0/lib/index.mjs";

const estado = {
  forca: 0,
  magia: 0,
  agilidade: 0,
  sorte: 0,
};

const maxPorAtributo = 20;
const status = document.getElementById("status-texto");
const resumo = document.getElementById("resumo-dados");

function atualizarUI() {
  Object.keys(estado).forEach((attr) => {
    const valor = estado[attr];
    document.getElementById(`count-${attr}`).innerText = valor;

    const bloco = document.querySelector(`[data-attr="${attr}"]`);
    const btnMenos = bloco.querySelector('[data-action="decrement"]');
    const btnMais = bloco.querySelector('[data-action="increment"]');

    btnMenos.disabled = valor <= 0;
    btnMais.disabled = valor >= maxPorAtributo;
  });

  const total = Object.values(estado).reduce((acc, n) => acc + n, 0);
  resumo.innerText = `Total de dados: ${total}`;
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

document.querySelectorAll(".atributo").forEach((bloco) => {
  const attr = bloco.dataset.attr;

  bloco.querySelectorAll(".btn-ajuste").forEach((botao) => {
    botao.addEventListener("click", () => {
      const acao = botao.dataset.action;
      if (acao === "increment" && estado[attr] < maxPorAtributo) estado[attr] += 1;
      if (acao === "decrement" && estado[attr] > 0) estado[attr] -= 1;
      atualizarUI();
    });
  });
});

document.getElementById("btn-rolar").addEventListener("click", async () => {
  const equacao = montarExpressaoDddice();

  if (!equacao) {
    status.innerText = "⚠️ Escolha pelo menos 1 dado d20.";
    status.style.color = "#ff6868";
    return;
  }

  status.innerText = `Rolando: ${equacao}`;
  status.style.color = "#66dd66";

  try {
    if (OBR.isAvailable) {
      OBR.broadcast.sendMessage("dddice/roll", { equation: equacao });
      limparSelecao();
    } else {
      status.innerText = "Extensão aberta fora do Owlbear (teste local).";
      status.style.color = "#f0b90b";
    }
  } catch (erro) {
    status.innerText = `Erro ao rolar: ${erro}`;
    status.style.color = "#ff6868";
  }
});

atualizarUI();

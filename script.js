// Carrega o vídeo do YouTube só quando a pessoa clica (deixa o site mais leve)
document.querySelectorAll(".player").forEach((botao) => {
  botao.addEventListener("click", () => {
    const id = botao.dataset.id;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = botao.getAttribute("aria-label").replace("Reproduzir: ", "");
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;

    botao.replaceChildren(iframe);
    botao.disabled = true;
    botao.style.cursor = "default";
  });
});

// Destaca no menu a seção que está na tela
const links = document.querySelectorAll(".topo nav a");
const secoes = [...links].map((a) => document.querySelector(a.getAttribute("href")));

const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        links.forEach((a) =>
          a.classList.toggle("ativo", a.getAttribute("href") === `#${entrada.target.id}`)
        );
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);

secoes.forEach((s) => s && observador.observe(s));

// Ano atual no rodapé
document.getElementById("ano").textContent = new Date().getFullYear();


/* =====================================================
   PORTFÓLIOS E CALENDÁRIOS
   -----------------------------------------------------
   1) Arquivos FIXOS (aparecem para todo mundo):
      coloque o PDF na pasta "portfolios/" ou "calendarios/"
      e adicione uma linha nas listas abaixo.
      "capa" é opcional: sem ela, a capa é gerada da 1ª página do PDF.
   2) Arquivos enviados pelo formulário ficam salvos
      apenas neste navegador/aparelho.
   ===================================================== */
const ARQUIVOS_FIXOS = {
  portfolios: [
    // { nome: "Portfólio 2024", arquivo: "portfolios/portfolio-2024.pdf" },
    // { nome: "Portfólio 2023", arquivo: "portfolios/portfolio-2023.pdf", capa: "portfolios/capa-2023.png" },
  ],
  calendarios: [
    // { nome: "Calendário de treinos", arquivo: "calendarios/treinos.png" },
  ],
};

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const LIMITE_MB = 50;

// ---- Armazenamento local (IndexedDB) ----
const bancoPronto = new Promise((ok, falha) => {
  try {
    const req = indexedDB.open("ampharos-site", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("itens", { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => falha(req.error);
  } catch (e) {
    falha(e);
  }
});

async function operar(modo, fn) {
  const banco = await bancoPronto;
  return new Promise((ok, falha) => {
    const t = banco.transaction("itens", modo);
    const req = fn(t.objectStore("itens"));
    t.oncomplete = () => ok(req && req.result);
    t.onerror = () => falha(t.error);
  });
}

const salvarItem = (item) => operar("readwrite", (s) => s.add(item));
const listarItens = () => operar("readonly", (s) => s.getAll());
const removerItem = (id) => operar("readwrite", (s) => s.delete(id));

// ---- Capa a partir da 1ª página de um PDF ----
async function capaDoPdf(origem) {
  const pdf = await pdfjsLib.getDocument(origem).promise;
  const pagina = await pdf.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const vp = pagina.getViewport({ scale: 520 / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  await pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}

// ---- Cartão de arquivo ----
function criarCartao({ nome, href, capa, id, tipo }) {
  const fig = document.createElement("figure");
  fig.className = "arquivo";

  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.setAttribute("aria-label", `Abrir ${nome}`);

  const img = document.createElement("img");
  img.className = "capa";
  img.alt = `Capa de ${nome}`;
  if (capa) img.src = capa;
  link.append(img);

  const legenda = document.createElement("figcaption");
  const span = document.createElement("span");
  span.textContent = nome;
  legenda.append(span);

  if (id !== undefined) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remover";
    btn.textContent = "Remover";
    btn.setAttribute("aria-label", `Remover ${nome}`);
    btn.addEventListener("click", async () => {
      if (confirm(`Remover "${nome}" deste navegador?`)) {
        await removerItem(id);
        desenhar(tipo);
      }
    });
    legenda.append(btn);
  }

  fig.append(link, legenda);
  return { fig, img };
}

async function desenhar(tipo) {
  const lista = document.getElementById(`lista-${tipo}`);
  lista.replaceChildren();

  // Fixos
  for (const f of ARQUIVOS_FIXOS[tipo]) {
    const ehPdf = f.arquivo.toLowerCase().endsWith(".pdf");
    const { fig, img } = criarCartao({
      nome: f.nome,
      href: f.arquivo,
      capa: f.capa || (ehPdf ? "" : f.arquivo),
      tipo,
    });
    lista.append(fig);
    if (!f.capa && ehPdf && window.pdfjsLib) {
      capaDoPdf({ url: f.arquivo }).then((c) => (img.src = c)).catch(() => {});
    }
  }

  // Enviados neste navegador
  let salvos = [];
  try {
    salvos = (await listarItens()).filter((i) => i.tipo === tipo);
  } catch (e) {
    /* navegador sem IndexedDB (ex.: aba anônima): mostra só os fixos */
  }
  for (const item of salvos) {
    const url = URL.createObjectURL(item.arquivo);
    const capa = item.capa || url;
    lista.append(criarCartao({ nome: item.nome, href: url, capa, id: item.id, tipo }).fig);
  }

  if (!lista.children.length) {
    const p = document.createElement("p");
    p.className = "vazio";
    p.textContent = "Nenhum arquivo por enquanto. Use o formulário abaixo para adicionar.";
    lista.append(p);
  }
}

// ---- Formulários ----
document.querySelectorAll(".form-envio").forEach((form) => {
  const tipo = form.dataset.tipo;
  const msg = form.querySelector(".msg");
  const mostrar = (texto, erro = false) => {
    msg.textContent = texto;
    msg.classList.toggle("erro", erro);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const arquivo = form.arquivo.files[0];
    if (!nome || !arquivo) return;

    const ehPdf = arquivo.type === "application/pdf";
    const ehImagem = arquivo.type.startsWith("image/");
    if (!ehPdf && !(tipo === "calendarios" && ehImagem)) {
      return mostrar("Tipo de arquivo não aceito aqui.", true);
    }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      return mostrar(`O arquivo passa de ${LIMITE_MB} MB.`, true);
    }

    mostrar("Enviando…");
    try {
      const capa = ehPdf && window.pdfjsLib
        ? await capaDoPdf({ data: await arquivo.arrayBuffer() }).catch(() => null)
        : null;
      await salvarItem({ tipo, nome, arquivo, capa, data: Date.now() });
      form.reset();
      mostrar("Adicionado!");
      desenhar(tipo);
    } catch (err) {
      mostrar("Não foi possível salvar. Verifique se o navegador permite armazenamento (fora de aba anônima).", true);
    }
  });
});

desenhar("portfolios");
desenhar("calendarios");

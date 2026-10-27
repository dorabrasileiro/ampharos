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

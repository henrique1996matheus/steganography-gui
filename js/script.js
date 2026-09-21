const inputArquivos = document.getElementById("arquivos");
const divPreview = document.getElementById("preview");
const buttonAnalisar = document.getElementById("analisar");
const divErros = document.getElementById("erros");
const divResultados = document.getElementById("resultados");

let arquivosSelecionados = [];

inputArquivos.addEventListener("change", function () {
    let erroQuantidade = false;

    for (const arquivo of inputArquivos.files) {
        const nome = arquivo.name.toLowerCase();

        if (nome.endsWith(".jpg") || nome.endsWith(".jpeg")) {
            if (arquivosSelecionados.length < 15) {
                arquivosSelecionados.push(arquivo);
            } else {
                erroQuantidade = true;
            }
        } else {
            adicionarErro(`O arquivo "${arquivo.name}" não é JPG ou JPEG.`);
        }
    }

    inputArquivos.value = "";

    if (erroQuantidade) {
        adicionarErro('Não é possível selecionar mais que 15 imagens ao mesmo tempo.');
    }

    mostrarPreviews();
});

buttonAnalisar.addEventListener("click", async function () {
    console.log(arquivosSelecionados);

    if (buttonAnalisar.disabled) {
        return;
    }

    if (arquivosSelecionados.length === 0) {
        adicionarErro("Selecione pelo menos uma imagem.");
        return;
    }

    buttonAnalisar.disabled = true;
    buttonAnalisar.textContent = "Analisando...";
    buttonAnalisar.classList.add("botao-desabilitado");

    const formData = new FormData();

    for (const arquivo of arquivosSelecionados) {
        formData.append("files", arquivo);
    }

    try {
        const resposta = await fetch("http://localhost:8000/analisar-imagens", {
            method: "POST",
            body: formData
        });

        if (!resposta.ok) {
            throw new Error("Erro ao enviar as imagens.");
        }

        const resultado = await resposta.json();

        console.log(resultado);
        
        const idAnalise = resultado.id_analise;
        
        console.log(idAnalise);

        acompanharAnalise(idAnalise);

    } catch (erro) {
        console.error(erro);
        adicionarErro("Não foi possível enviar as imagens.");
    } finally {
        analisar.disabled = false;
        buttonAnalisar.textContent = "Analisar imagens";
        buttonAnalisar.classList.remove("botao-desabilitado");
    }
});

async function acompanharAnalise(idAnalise) {

    async function consultarProgresso() {
        console.log("Consultando progresso...");

        const resposta = await fetch(
            `http://localhost:8000/analisar/${idAnalise}/progresso`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao consultar progresso.");
        }

        const progresso = await resposta.json();

        console.log(progresso);

        if (progresso.status === "concluido") {
            progresso.id_analise = idAnalise;
            adicionarResultado(progresso);
            return true; // terminou
        }

        return false; // ainda processando
    }

    try {
        // Primeira consulta imediata
        const concluido = await consultarProgresso();

        if (concluido) {
            return;
        }

        // Só entra no intervalo se ainda não concluiu
        const intervalo = setInterval(async () => {
            try {
                const concluido = await consultarProgresso();

                if (concluido) {
                    clearInterval(intervalo);
                }

            } catch (erro) {
                console.error(erro);
                clearInterval(intervalo);
                adicionarErro("Erro ao consultar o progresso da análise.");
            }
        }, 1000);

    } catch (erro) {
        console.error(erro);
        adicionarErro("Erro ao consultar o progresso da análise.");
    }
}

function adicionarResultado(progresso) {

    const card = document.createElement("div");
    card.className = "resultado-card";

    // ---------- Cabeçalho ----------
    const topo = document.createElement("div");
    topo.className = "resultado-topo";

    topo.innerHTML = `
        <div>
            <h2>Análise concluída</h2>
            <p><strong>ID:</strong> ${progresso.id_analise}</p>
        </div>

        <span class="status-sucesso">
            ${progresso.progresso}% concluído
        </span>
    `;

    card.appendChild(topo);

    // ---------- Informações ----------
    const info = document.createElement("div");
    info.className = "resultado-info";

    info.innerHTML = `
        <p><strong>Total:</strong> ${progresso.total}</p>
        <p><strong>Concluídas:</strong> ${progresso.concluidas}</p>
    `;

    card.appendChild(info);

    // ---------- Botões ----------
    const botoes = document.createElement("div");
    botoes.className = "botoes-relatorio";

    const botaoPdf = document.createElement("button");
    botaoPdf.className = "botao-relatorio pdf";
    botaoPdf.textContent = "Relatório PDF";

    botaoPdf.addEventListener("click", () => {
            baixarRelatorio(progresso.id_analise, "pdf");

    });

    const botaoTxt = document.createElement("button");
    botaoTxt.className = "botao-relatorio txt";
    botaoTxt.textContent = "Relatório TXT";

    botaoTxt.addEventListener("click", () => {
            baixarRelatorio(progresso.id_analise, "txt");

    });

    botoes.appendChild(botaoPdf);
    botoes.appendChild(botaoTxt);

    card.appendChild(botoes);

    // ---------- Dropdown por arquivo ----------
    progresso.arquivos.forEach((arquivo) => {

        const details = document.createElement("details");
        details.className = "arquivo-dropdown";

        const summary = document.createElement("summary");

        summary.textContent = arquivo.nome;

        details.appendChild(summary);

        const conteudo = document.createElement("div");
        conteudo.className = "arquivo-conteudo";

        if (arquivo.erro) {

            conteudo.innerHTML = `
                <p class="status-erro">${arquivo.erro}</p>
            `;

        } else {

            const r = arquivo.resultado;

            conteudo.innerHTML = `
                <p><strong>Status:</strong> ${arquivo.status}</p>

                <p><strong>Classificação:</strong><br>${r.classificacao}</p>

                <p><strong>Detecção estatística:</strong>
                    ${r.deteccao_estatistica ? "Positiva para STEGO" : "Negativa para STEGO"}
                </p>

                <p><strong>Característica:</strong> ${r.feature}</p>

                <p><strong>Qui-quadrado:</strong> ${r.valor_qui}</p>

                <p><strong>Limiar:</strong> ${r.limiar}</p>

                <p><strong>Direção:</strong> ${r.direcao}</p>
            `;

            if (r.mensagem_recuperada) {

                const mensagem = document.createElement("div");
                mensagem.className = "mensagem-extraida";

                mensagem.innerHTML = `
                    <strong>Mensagem extraída</strong><br><br>
                    ${r.mensagem}<br><br>
                    <strong>CRC:</strong> ${r.crc}
                `;

                conteudo.appendChild(mensagem);

            } else if (r.erro_extracao) {

                const erro = document.createElement("p");
                erro.className = "status-erro";
                erro.textContent = r.erro_extracao;

                conteudo.appendChild(erro);
            }
        }

        details.appendChild(conteudo);
        card.appendChild(details);

    });

    // Coloca a análise mais recente no topo.
    divResultados.prepend(card);
}

async function baixarRelatorio(idAnalise, tipo) {
    try {
        const resposta = await fetch(
            `http://localhost:8000/relatorio/${idAnalise}/${tipo}`
        );

        if (!resposta.ok) {
            throw new Error(`Erro ao baixar relatório ${tipo}.`);
        }

        // Converte a resposta em arquivo (Blob)
        const arquivo = await resposta.blob();

        // Cria uma URL temporária para download
        const url = URL.createObjectURL(arquivo);

        const link = document.createElement("a");
        link.href = url;
        link.download = `relatorio_${idAnalise}.${tipo}`;

        document.body.appendChild(link);
        link.click();

        // Limpeza
        link.remove();
        URL.revokeObjectURL(url);

    } catch (erro) {
        console.error(erro);
        adicionarErro(`Não foi possível baixar o relatório ${tipo.toUpperCase()}.`);
    }
}

function mostrarPreviews() {
    divPreview.innerHTML = "";

    arquivosSelecionados.forEach((arquivo, index) => {
        const divContainer = document.createElement("div");
        divContainer.classList.add("imagem-container");

        const imgImagem = document.createElement("img");
        imgImagem.src = URL.createObjectURL(arquivo);

        const buttonRemover = document.createElement("button");
        buttonRemover.textContent = "Remover";

        buttonRemover.addEventListener("click", function () {
            arquivosSelecionados.splice(index, 1);
            mostrarPreviews();
        });

        divContainer.appendChild(imgImagem);
        divContainer.appendChild(buttonRemover);

        divPreview.appendChild(divContainer);
    });
}

function adicionarErro(mensagem) {
    const divLinha = document.createElement("div");
    divLinha.classList.add("mensagem-erro");

    const spanTexto = document.createElement("span");
    spanTexto.textContent = mensagem;

    const botaoRemover = document.createElement("button");
    botaoRemover.textContent = "Remover";

    botaoRemover.addEventListener("click", function () {
        divLinha.remove();
    });

    divLinha.appendChild(spanTexto);
    divLinha.appendChild(botaoRemover);
    divErros.appendChild(divLinha);
}
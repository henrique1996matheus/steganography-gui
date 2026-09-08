const inputArquivos = document.getElementById("arquivos");
const divPreview = document.getElementById("preview");
const buttonAnalisar = document.getElementById("analisar");
const divErros = document.getElementById("erros");

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
        formData.append("imagens", arquivo);
    }

    try {
        const resposta = await fetch("http://localhost:8080/api/analisar", {
            method: "POST",
            body: formData
        });

        if (!resposta.ok) {
            throw new Error("Erro ao enviar as imagens.");
        }

        const resultado = await resposta.json();

        console.log(resultado);

    } catch (erro) {
        console.error(erro);
        adicionarErro("Não foi possível enviar as imagens.");
    } finally {
        analisar.disabled = false;
        buttonAnalisar.textContent = "Analisar imagens";
        buttonAnalisar.classList.remove("botao-desabilitado");
    }
});

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
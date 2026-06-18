# Ajuste — OS DOCX real sem dependência externa

## Objetivo

Gerar a Ordem de Serviço como `.docx` real, com o brasão embutido no arquivo, sem depender de CDN, biblioteca externa, banco de dados ou link de imagem.

## Por que este ajuste foi necessário

As tentativas anteriores podiam falhar por dois motivos:

1. Word ignorando imagem base64 em `.doc` criado por HTML.
2. CDN/biblioteca `docx` podendo não carregar corretamente no ambiente.

Este ajuste cria o `.docx` manualmente no navegador usando OOXML + ZIP simples, incluindo o brasão em:

`word/media/brasao.png`

## Arquivos alterados

- `index.html`
- `js/os-documento.js`

## SQL necessário

Não precisa rodar SQL.

## Validação

1. Abrir chamado com `OS emitida`.
2. Clicar em `Baixar OS`.
3. Conferir que o arquivo baixado é `.docx`.
4. Abrir no Word.
5. Confirmar que o brasão aparece no topo.


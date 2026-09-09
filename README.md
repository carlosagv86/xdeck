# xdeck

Um painel para a timeline do X (Twitter): reaproveita a largura desperdiçada, transforma mídia em miniatura clicável e mantém um radar dos posts que chegam sem aparecer na tela.

Em telas largas o X mantém a coluna de posts travada em 600px, gasta o resto com sidebars e deixa uma foto empurrar a barra de ações 600px para baixo — cabem dois posts na tela. Este script resolve as duas coisas e é todo opcional: cada parte liga e desliga num painel flutuante, e "Restaurar padrão do X" devolve o layout original sem desinstalar nada.

## Instalação

1. Instale o [Tampermonkey](https://www.tampermonkey.net/).
2. Ícone da extensão → **Criar novo script**.
3. Apague o conteúdo, cole o [`xdeck.user.js`](xdeck.user.js), `Ctrl+S`.
4. Recarregue o X.

> Se você já usava a versão anterior (`X (Twitter) Full-Width`), **apague-a** no Tampermonkey: o par nome + namespace mudou, então o gerenciador trata esta como um script novo e os dois rodariam juntos. As preferências e o buffer são preservados — as chaves em `localStorage` continuam as mesmas.

## O que faz

Um botão flutuante no canto inferior direito abre o painel de opções:

| Opção | Efeito |
| --- | --- |
| **Largura total** | A timeline ocupa a largura livre em vez dos 600px fixos. |
| **Ocultar sidebar direita** | Remove trends, "quem seguir" e a busca. |
| **Nav esquerda compacta** | Menu só com ícones, 88px. |
| **Mídia como miniatura** | Foto/vídeo viram uma miniatura clicável ao lado do texto, com tamanho ajustável. É o que multiplica quantos posts cabem na tela. |
| **Radar de novos posts** | Modal com estatísticas e a lista dos posts capturados. |

### Visualizador de mídia

O `⤢` na miniatura abre a mídia centralizada, com tela cheia, navegação em galerias de várias fotos e player próprio para vídeo (play/pause, barra de progresso, tempo, volume).

Atalhos: `Esc` fecha (o primeiro `Esc` sai da tela cheia), `F` alterna tela cheia, `espaço` toca/pausa, `←`/`→` pulam 5s no vídeo ou trocam de foto na galeria.

### Radar de novos posts

Estatísticas de volume e ritmo, autores, engajamento e conteúdo, mais um card "Vale o clique" com os posts de maior tração e uma lista filtrável por texto, autor e mídia. Com o modal aberto, uma barra avisa quando chegam posts novos e oferece atualizar a lista ou acionar o "Mostrar N posts" do próprio X.

Atalho global: `Alt+W` liga e desliga o modo largo inteiro.

## Como funciona

Alguns detalhes que não são óbvios e que explicam por que o código é do jeito que é.

**O teto de 600px é uma classe atômica gerada no build.** Além do limite na `primaryColumn`, o X aplica um segundo teto num wrapper interno via uma classe do tipo `r-1ye8kvj`, cujo nome muda a cada release. Em vez de fixá-la, o script varre as classes dentro da coluna em runtime, testa qual produz `max-width` entre 480 e 720px e cacheia o resultado.

**A altura da mídia vem de caixas de proporção.** São `padding-bottom` em porcentagem, que resolve contra a largura do **pai** — limitar a largura da própria imagem não muda nada. O teto tem que ir no elemento pai.

**A miniatura é marcada por JS, não por CSS.** A coluna de conteúdo do tweet vira um grid de duas colunas, mas o CSS sozinho não consegue isolá-la: `:has()` aninhado é proibido e todo ancestral casaria com o mesmo seletor. Os dois elementos são marcados por JS.

**O player do X não sobrevive à mudança de contexto.** O vídeo é MSE — `src` e `<source>` são `blob:`, então não dá para recriar o player, só mover o elemento original. Mas fora do `<article>` a UI do X não funciona: a barra de controles não é montada e o botão de play não dispara nem com clique real. O elemento `<video>` em si continua íntegro, então o visualizador esconde a UI do X e dirige o `<video>` direto.

**"Novo" é medido por renderização.** Um post entra no buffer como não lido e sai da conta quando o X o renderiza como `<article>`. Cortar por `created_at` não funciona — a timeline não é cronológica e um poll traz posts com horário anterior ao topo já renderizado. Inferir pela requisição também não: o poll do X refaz a busca do topo **sem cursor**, idêntico a um render.

**A captura é passiva.** Hooks em XHR e `fetch` instalados em `document-start` leem as respostas de `HomeTimeline`/`HomeLatestTimeline` de passagem. Nada é requisitado pelo script e nada no DOM é alterado pelo radar. O buffer fica em `localStorage`, com teto de 1200 posts e 36h.

## Limitações

- O radar só enxerga o que o X baixa. Com a aba ociosa o X pesquisa pouco, então o buffer enche no ritmo dele.
- O contador conta tudo que foi baixado e nunca exibido, o que costuma ser maior que o "Mostrar N posts" do X.
- A classe que mantém o `<video>` visível no visualizador fica em nós administrados pelo React; se o X re-renderizar esse trecho com o visualizador aberto, o vídeo pode piscar.
- O script depende de `data-testid` do X. Eles são estáveis há anos, mas uma mudança grande do front-end pode exigir ajuste.

## Compatibilidade

Chrome com Tampermonkey. Usa `:has()` e CSS grid, então precisa de um navegador atual.

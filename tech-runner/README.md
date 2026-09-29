# Tech Runner — Jogo 2D Educacional de Corrida + Quiz de Inglês Técnico

Um jogo 2D educativo de corrida infinita (estilo *runner*) com obstáculos e quiz de inglês técnico voltado para estudantes de Ciência da Computação e tecnologia.

Construído de forma 100% didática utilizando apenas **Node.js nativo** no backend e **HTML5 Canvas + Vanilla JavaScript** no frontend, sem dependência de bibliotecas ou frameworks externos.

---

## Estrutura do Projeto

```text
projeto/
├── server.js
├── package.json
├── README.md
└── public/
    ├── index.html
    ├── style.css
    ├── script.js
    └── questions.json
```

---

## Requisitos e Instalação

* **Node.js** (versão 16 ou superior instalada na máquina).
* Nenhum pacote adicional via `npm install` é necessário, pois o projeto utiliza exclusivamente os módulos nativos do Node.js (`http`, `fs`, `path`).

---

## Execução

1. No terminal, navegue até a pasta raiz do projeto:
   ```bash
   node server.js
   ```
2. Abra seu navegador de preferência e acesse:
   ```text
   http://localhost:3000
   ```

---

## Controles

* <kbd>Espaço</kbd> → Pular obstáculo / coletar itens no ar
* <kbd>↑</kbd> (Seta para cima) → Pular
* <kbd>A</kbd>, <kbd>B</kbd>, <kbd>C</kbd>, <kbd>D</kbd> (ou teclas <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>4</kbd>) → Selecionar alternativa no Quiz
* <kbd>Enter</kbd> → Continuar após o feedback do Quiz
* **Dispositivos Móveis / Touch:** Botão de toque "PULAR" na parte inferior da tela e botões de resposta clicáveis.

---

## Objetivo do Jogo

O objetivo do jogador é desviar de obstáculos enquanto corre e acumula moedas. Ao colidir com um obstáculo, o jogo é pausado e uma questão de inglês técnico é apresentada:

* **Acertou a questão:** O jogador avança no contador de acertos e o jogo retoma.
* **Errou a questão:** O jogador perde 1 vida (começa com 3 vidas) e recebe feedback explicativo com a regra gramatical.
* **Progressão de Dificuldade com o Tempo:** Conforme o tempo avança, a velocidade da corrida aumenta gradualmente e o intervalo de surgimento de obstáculos diminui, gerando mais obstáculos na tela simultaneamente.
* **Condição de Vitória (Zerar o Jogo):** O jogador vence e zera o jogo se atingir um total de **10 questões acertadas**, sendo obrigatório ainda possuir vidas disponíveis (`vidas > 0`).
* **Game Over:** Ocorre se o jogador esgotar todas as vidas disponíveis antes de atingir os 10 acertos.

---

## Conteúdo Gramatical Abordado

O banco possui 40 questões divididas em quatro tópicos fundamentais da computação em inglês:

1. **Aula 01 — Simple Present + Verbo To Be** (10 questões): rotinas de sistemas, terceira pessoa com *s*, auxiliares *do/does/don't/doesn't*.
2. **Aula 02 — Present Continuous + Simple Present** (10 questões): ações em andamento agora (*am/is/are + verb-ing*), regras ortográficas (*run -> running*, *make -> making*).
3. **Aula 03 — Simple Past + Past Participle** (10 questões): verbos regulares (*-ed*), verbos irregulares básicos (*went*, *saw*, *ate*, *had*), auxiliar *did/didn't* e marcadores como *yesterday*.
4. **Aula 05 — Present Perfect** (10 questões): estrutura *have/has + particípio*, marcadores *just*, *already*, *yet*, *ever*, *never*, *since*, *for*.

---

## Como Adicionar ou Modificar Questões

Para alterar ou acrescentar perguntas, basta editar o arquivo:

```text
public/questions.json
```

Cada pergunta deve seguir exatamente este formato JSON:

```json
{
  "id": 41,
  "lesson": 1,
  "question": "Complete: 'The database ___ online.'",
  "options": [
    "is",
    "are",
    "am",
    "be"
  ],
  "correct": 0,
  "explanation": "Usamos 'is' para a terceira pessoa do singular (the database = it)."
}
```

* `correct` representa o índice numérico da alternativa correta no array `options` (`0 = A`, `1 = B`, `2 = C`, `3 = D`).
* **Não é necessário reiniciar o servidor** ao modificar o arquivo `questions.json`, pois o jogo carrega as questões dinamicamente via `fetch()` a cada nova partida.

---

## Conceitos de Programação e Computação Aplicados

* **Game Loop via `requestAnimationFrame`**: sincronização fluida com a taxa de atualização do monitor (~60 FPS) e conservação de CPU/bateria quando em segundo plano.
* **Detecção de Colisão AABB (Axis-Aligned Bounding Box)**: algoritmo geométrico veloz para checar interseção de retângulos alinhados aos eixos X e Y.
* **Física Simplificada**: modelo vetorial com aceleração de gravidade e verificação de piso (*ground clamping*).
* **Algoritmo Fisher-Yates (Knuth Shuffle)**: permutação imparcial e uniforme com complexidade linear $O(n)$ para sortear 10 perguntas sem repetição.
* **Segurança no Backend**: normalização de caminho e bloqueio de ataques do tipo *Directory Traversal*.

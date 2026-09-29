/**
 * TECH RUNNER — Jogo 2D Educacional de Corrida + Quiz de Inglês Técnico
 * Projeto didático para estudantes de Ciência da Computação.
 * Utiliza exclusivamente HTML5 Canvas e JavaScript puro (Vanilla JS).
 */

// ==========================================================================
// CONFIGURAÇÕES
// ==========================================================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320; // Posição vertical Y da superfície do chão

const PHYSICS = {
    gravity: 0.65,      // Aceleração constante da gravidade aplicada a cada frame
    jumpForce: -13.5,   // Força de impulso vertical aplicada instantaneamente no pulo
    initialSpeed: 5.2,  // Velocidade horizontal inicial de deslocamento do cenário/objetos
    maxSpeed: 14.0      // Velocidade máxima estendida para progressão intensa e contínua
};

const WIN_TARGET_QUESTIONS = 10; // Meta de acertos para zerar e vencer o jogo (10 acertos mantendo vidas > 0)
const TOTAL_GAME_QUESTIONS = 10; // Quantidade de acertos necessários para vitória

// ==========================================================================
// ESTADO DO JOGO
// ==========================================================================
/**
 * Objeto central que armazena todo o estado mutável da partida.
 * Facilita a leitura, depuração e reinicialização completa do jogo.
 */
const gameState = {
    running: false,                // Se a partida está em andamento
    paused: false,                 // Se o jogo está temporariamente pausado (ex: durante o quiz)
    gameOver: false,               // Se o jogador perdeu todas as vidas
    victory: false,                // Se o jogador alcançou a meta de 10 acertos sem perder as vidas

    score: 0,                      // Pontuação acumulada por distância percorrida
    elapsedTime: 0,                // Tempo de jogo decorrido em segundos (controla a progressão gradual)
    lives: 3,                      // Vidas restantes (inicia com 3 vidas)
    coins: 0,                      // Moedas coletadas pelo jogador

    questionsAnswered: 0,          // Contador de acertos de perguntas (meta de 10 acertos para zerar)
    currentQuestionIndex: 0,       // Índice da questão atual dentro do array selecionado

    speed: PHYSICS.initialSpeed,   // Velocidade atual do jogo (aumenta gradualmente com o tempo)

    extraLifeAvailable: true,      // Controla se a vida extra ainda pode surgir nesta partida
    extraLifeSpawned: false,       // Se a vida extra já foi gerada no cenário

    allQuestions: [],              // Banco com todas as 40 questões carregadas do JSON
    selectedQuestions: []          // Questões sorteadas para a partida
};

// ==========================================================================
// ELEMENTOS DO DOM
// ==========================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// HUD
const hudLivesEl = document.getElementById('hudLives');
const hudScoreEl = document.getElementById('hudScore');
const hudCoinsEl = document.getElementById('hudCoins');
const hudQuestionsEl = document.getElementById('hudQuestions');

// Telas (Overlays)
const screenStart = document.getElementById('screenStart');
const screenGameOver = document.getElementById('screenGameOver');
const screenVictory = document.getElementById('screenVictory');
const screenQuiz = document.getElementById('screenQuiz');

// Botões principais
const btnStart = document.getElementById('btnStart');
const btnRestartGameOver = document.getElementById('btnRestartGameOver');
const btnRestartVictory = document.getElementById('btnRestartVictory');
const btnContinueQuiz = document.getElementById('btnContinueQuiz');
const btnMobileJump = document.getElementById('btnMobileJump');

// Elementos do Quiz Modal
const quizLessonBadge = document.getElementById('quizLessonBadge');
const quizProgressEl = document.getElementById('quizProgress');
const quizQuestionEl = document.getElementById('quizQuestion');
const quizOptionsEl = document.getElementById('quizOptions');
const quizFeedbackEl = document.getElementById('quizFeedback');
const feedbackTitleEl = document.getElementById('feedbackTitle');
const feedbackTextEl = document.getElementById('feedbackText');

// Elementos de Estatísticas Finais
const finalScoreGameOver = document.getElementById('finalScoreGameOver');
const finalCoinsGameOver = document.getElementById('finalCoinsGameOver');
const finalQuestionsGameOver = document.getElementById('finalQuestionsGameOver');
const finalScoreVictory = document.getElementById('finalScoreVictory');
const finalCoinsVictory = document.getElementById('finalCoinsVictory');

// ==========================================================================
// CARREGAMENTO DAS QUESTÕES
// ==========================================================================
/**
 * Carrega o arquivo questions.json usando a Fetch API nativa.
 * Inclui tratamento de erros com exibição de mensagem clara na interface.
 */
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`Falha HTTP ao carregar perguntas: status ${response.status}`);
        }
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length < 10) {
            throw new Error('Formato de questions.json inválido ou número insuficiente de questões.');
        }

        gameState.allQuestions = data;
        console.log(`Sucesso: ${data.length} questões carregadas.`);
    } catch (error) {
        console.error('Erro ao carregar questions.json:', error);
        alert('Não foi possível carregar as questões do jogo. Verifique se questions.json está presente na pasta public.');
    }
}

// ==========================================================================
// SORTEIO (FISHER-YATES SHUFFLE)
// ==========================================================================
/**
 * Algoritmo Fisher-Yates (ou Knuth Shuffle):
 * Percorre o array de trás para frente, trocando o elemento atual por outro
 * escolhido aleatoriamente entre os índices anteriores.
 * 
 * Complexidade: O(n) no tempo e O(1) no espaço adicional.
 * Garante distribuição estatisticamente uniforme e justa, sem repetição.
 */
function shuffleQuestions(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        // Escolhe um índice aleatório de 0 até i
        const j = Math.floor(Math.random() * (i + 1));
        // Realiza a troca (swap) entre os elementos na posição i e j
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }
    return copy;
}

/**
 * Prepara a lista de questões para a partida a partir do banco de 40 questões.
 */
function setupMatchQuestions() {
    if (gameState.allQuestions.length === 0) {
        console.warn('Banco de questões vazio ao preparar partida.');
        return;
    }
    // Embaralha todas as questões para garantir variedade e disponibilidade até os 10 acertos
    gameState.selectedQuestions = shuffleQuestions(gameState.allQuestions);
    gameState.currentQuestionIndex = 0;
    gameState.questionsAnswered = 0;
}

// ==========================================================================
// PLAYER (PERSONAGEM)
// ==========================================================================
/**
 * Definição do jogador com suas propriedades de posição, dimensões e física.
 */
const player = {
    x: 80,
    y: GROUND_Y - 50,
    width: 44,
    height: 52,
    velocityY: 0,
    isGrounded: true,
    runFrame: 0,

    /**
     * Atualização da física vertical:
     * 1. A velocidade vertical aumenta progressivamente pela gravidade.
     * 2. A posição Y é deslocada pela velocidade vertical resultante.
     * 3. Quando o personagem atinge ou ultrapassa o chão, o movimento vertical cessa
     *    e a posição é fixada exatamente no chão (impede atravessar o chão).
     */
    update() {
        // Aplicação da aceleração gravitacional
        this.velocityY += PHYSICS.gravity;
        this.y += this.velocityY;

        // Verificação de contato com a superfície do chão
        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // Animação de corrida quando no chão
        if (this.isGrounded) {
            this.runFrame += 0.2;
        }
    },

    /**
     * Aplica o salto caso o jogador esteja devidamente apoiado no chão.
     * Impede saltos infinitos no ar (double jump não autorizado).
     */
    jump() {
        if (this.isGrounded && !gameState.paused && gameState.running) {
            this.velocityY = PHYSICS.jumpForce;
            this.isGrounded = false;
        }
    },

    /**
     * Renderização gráfica do personagem diretamente no Canvas via desenho vetorial.
     * Não utiliza imagens externas, garantindo autonomia e portabilidade.
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Sombra suave sob o personagem no chão
        if (this.isGrounded) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(this.width / 2, this.height + 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corpo (Jaqueta / Moletom de tecnologia em azul ciano)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(6, 16, 32, 24, 6);
        ctx.fill();

        // Detalhe tecnológico no peito (Faixa neon)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(10, 24, 24, 4);

        // Cabeça
        ctx.fillStyle = '#fde047'; // Tom de pele vibrante
        ctx.beginPath();
        ctx.arc(22, 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Viseira / Óculos tech escuros
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(20, 9, 12, 5);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(26, 10, 4, 3); // Brilho na lente

        // Pernas com alternância de corrida (ou esticadas no ar durante o pulo)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        const legOffset = this.isGrounded ? Math.sin(this.runFrame) * 8 : 4;

        // Perna esquerda
        ctx.beginPath();
        ctx.moveTo(14, 40);
        ctx.lineTo(14 - legOffset, 50);
        ctx.stroke();

        // Perna direita
        ctx.beginPath();
        ctx.moveTo(30, 40);
        ctx.lineTo(30 + legOffset, 50);
        ctx.stroke();

        ctx.restore();
    }
};

// ==========================================================================
// OBSTÁCULOS
// ==========================================================================
const obstacles = [];
let nextObstacleTimer = 80;

/**
 * Gera um novo obstáculo de forma pseudoaleatória.
 * Tipos disponíveis:
 * - 'box': Caixa de equipamento / servidor
 * - 'cone': Cone de trânsito técnico
 * - 'rock': Bloco de pedra / erro de compilação
 */
function spawnObstacle() {
    const types = ['box', 'cone', 'rock'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let width = 34;
    let height = 40;

    if (chosenType === 'cone') {
        width = 28;
        height = 36;
    } else if (chosenType === 'rock') {
        width = 42;
        height = 34;
    }

    obstacles.push({
        x: CANVAS_WIDTH + 20,
        y: GROUND_Y - height,
        width: width,
        height: height,
        type: chosenType,
        passed: false
    });
}

/**
 * Desenha cada tipo de obstáculo utilizando primitivas do Canvas 2D.
 */
function drawObstacle(obs, ctx) {
    ctx.save();
    ctx.translate(obs.x, obs.y);

    if (obs.type === 'box') {
        // Caixa de madeira / servidor de dados
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(0, 0, obs.width, obs.height, 4);
        ctx.fill();

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Detalhes em X na caixa
        ctx.beginPath();
        ctx.moveTo(4, 4);
        ctx.lineTo(obs.width - 4, obs.height - 4);
        ctx.moveTo(obs.width - 4, 4);
        ctx.lineTo(4, obs.height - 4);
        ctx.stroke();
    } else if (obs.type === 'cone') {
        // Cone de trânsito em laranja e branco
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(obs.width / 2, 0);
        ctx.lineTo(obs.width, obs.height);
        ctx.lineTo(0, obs.height);
        ctx.closePath();
        ctx.fill();

        // Faixa reflexiva branca no cone
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(obs.width * 0.35, obs.height * 0.45);
        ctx.lineTo(obs.width * 0.65, obs.height * 0.45);
        ctx.lineTo(obs.width * 0.75, obs.height * 0.65);
        ctx.lineTo(obs.width * 0.25, obs.height * 0.65);
        ctx.closePath();
        ctx.fill();
    } else {
        // Bloco de pedra texturizado
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(obs.width - 6, 2);
        ctx.lineTo(obs.width, obs.height);
        ctx.lineTo(0, obs.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#475569';
        ctx.fillRect(8, 8, 12, 10);
    }

    ctx.restore();
}

// ==========================================================================
// MOEDAS
// ==========================================================================
const coins = [];
let nextCoinTimer = 60;
const visualParticles = []; // Efeitos visuais de brilho ao coletar

function spawnCoin() {
    // Alterna a altura da moeda: no chão ou alta (necessita pulo para coletar)
    const inAir = Math.random() > 0.45;
    const yPos = inAir ? GROUND_Y - 95 : GROUND_Y - 32;

    coins.push({
        x: CANVAS_WIDTH + 20,
        y: yPos,
        width: 22,
        height: 22,
        rotation: 0
    });
}

function drawCoin(coin, ctx) {
    ctx.save();
    ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
    
    // Efeito de rotação 3D estreitando a largura aparente
    const scaleX = Math.cos(coin.rotation);
    ctx.scale(scaleX, 1);

    // Moeda dourada exterior
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Borda da moeda
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Símbolo central
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¢', 0, 1);

    ctx.restore();
}

// ==========================================================================
// VIDA EXTRA
// ==========================================================================
let extraLife = null;

/**
 * Gera a vida extra uma única vez por partida quando o jogador atinge 500 pontos.
 */
function spawnExtraLife() {
    extraLife = {
        x: CANVAS_WIDTH + 30,
        y: GROUND_Y - 90, // Altura que requer um salto para coletar
        width: 26,
        height: 26,
        pulse: 0
    };
    gameState.extraLifeSpawned = true;
    gameState.extraLifeAvailable = false;
}

function drawExtraLife(life, ctx) {
    ctx.save();
    ctx.translate(life.x + life.width / 2, life.y + life.height / 2);

    // Animação de pulsação suave
    const scale = 1 + Math.sin(life.pulse) * 0.15;
    ctx.scale(scale, scale);

    // Desenha o formato de coração via curvas de Bézier
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-12, -10, -14, 8, 0, 15);
    ctx.bezierCurveTo(14, 8, 12, -10, 0, 4);
    ctx.fill();

    // Brilho no topo do coração
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-4, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ==========================================================================
// CENÁRIO E PARALLAX
// ==========================================================================
const clouds = [
    { x: 50, y: 40, width: 80, speedMultiplier: 0.25 },
    { x: 300, y: 70, width: 110, speedMultiplier: 0.35 },
    { x: 600, y: 30, width: 90, speedMultiplier: 0.2 }
];

let groundOffset = 0;

function drawBackground(ctx) {
    // 1. Céu com gradiente suave
    const skyGradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGradient.addColorStop(0, '#38bdf8');
    skyGradient.addColorStop(1, '#bae6fd');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // 2. Sol sutil no horizonte
    ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
    ctx.beginPath();
    ctx.arc(700, 70, 40, 0, Math.PI * 2);
    ctx.fill();

    // 3. Nuvens em movimento lento (profundidade / parallax)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 16, 0, Math.PI * 2);
        ctx.arc(cloud.x + 18, cloud.y - 8, 22, 0, Math.PI * 2);
        ctx.arc(cloud.x + 38, cloud.y, 18, 0, Math.PI * 2);
        ctx.fill();

        if (!gameState.paused && gameState.running) {
            cloud.x -= gameState.speed * cloud.speedMultiplier;
            if (cloud.x + 80 < 0) {
                cloud.x = CANVAS_WIDTH + Math.random() * 80;
                cloud.y = 30 + Math.random() * 60;
            }
        }
    });

    // 4. Silhuetas de prédios tech ao fundo (segundo plano de parallax)
    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
    ctx.fillRect(120, GROUND_Y - 70, 45, 70);
    ctx.fillRect(260, GROUND_Y - 95, 60, 95);
    ctx.fillRect(480, GROUND_Y - 60, 50, 60);
    ctx.fillRect(660, GROUND_Y - 80, 55, 80);

    // 5. Chão com grama e asfalto texturizado
    ctx.fillStyle = '#15803d'; // Faixa superior de grama
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 8);

    ctx.fillStyle = '#78350f'; // Terra e base
    ctx.fillRect(0, GROUND_Y + 8, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 8);

    // Detalhes da terra em movimento para dar sensação de alta velocidade
    ctx.fillStyle = '#92400e';
    for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        const xPos = (i - groundOffset) % CANVAS_WIDTH;
        ctx.fillRect(xPos >= 0 ? xPos : xPos + CANVAS_WIDTH, GROUND_Y + 16, 16, 4);
    }

    if (!gameState.paused && gameState.running) {
        groundOffset = (groundOffset + gameState.speed) % 40;
    }
}

// ==========================================================================
// COLISÕES (AABB — AXIS-ALIGNED BOUNDING BOX)
// ==========================================================================
/**
 * Verificação de colisão por Bounding Box Alinhada aos Eixos (AABB).
 * 
 * Explicação matemática e didática:
 * Dois retângulos com lados paralelos aos eixos X e Y colidem se, e somente se,
 * houver sobreposição simultânea em ambos os eixos:
 * - O lado esquerdo de A está antes do lado direito de B;
 * - O lado direito de A está depois do lado esquerdo de B;
 * - O topo de A está acima da base de B;
 * - A base de A está abaixo do topo de B.
 * 
 * É a técnica padrão mais rápida e amplamente adotada em jogos 2D.
 */
function checkCollision(rectA, rectB) {
    return (
        rectA.x < rectB.x + rectB.width &&
        rectA.x + rectA.width > rectB.x &&
        rectA.y < rectB.y + rectB.height &&
        rectA.y + rectA.height > rectB.y
    );
}

// ==========================================================================
// QUIZ & FEEDBACK
// ==========================================================================
let currentQuizQuestion = null;
let collidedObstacleIndex = -1;

/**
 * Dispara o modal do quiz após uma colisão com obstáculo.
 * Pausa imediatamente o avanço do jogo.
 */
function triggerQuiz(obstacleIndex) {
    gameState.paused = true;
    collidedObstacleIndex = obstacleIndex;

    // Se o índice atingir o fim da lista de questões, re-embaralha o banco
    if (gameState.currentQuestionIndex >= gameState.selectedQuestions.length) {
        gameState.selectedQuestions = shuffleQuestions(gameState.allQuestions);
        gameState.currentQuestionIndex = 0;
    }
    currentQuizQuestion = gameState.selectedQuestions[gameState.currentQuestionIndex];

    // Preenche os dados da questão no modal
    quizLessonBadge.textContent = `Aula 0${currentQuizQuestion.lesson}`;
    quizProgressEl.textContent = `Acertos: ${gameState.questionsAnswered} de ${WIN_TARGET_QUESTIONS}`;
    quizQuestionEl.textContent = currentQuizQuestion.question;

    // Reseta o estado do modal
    quizFeedbackEl.classList.add('hidden');
    quizFeedbackEl.className = 'feedback-box hidden';
    btnContinueQuiz.classList.add('hidden');
    btnContinueQuiz.textContent = 'Continuar';
    quizOptionsEl.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];

    // Renderiza as 4 alternativas em grade 2x2
    currentQuizQuestion.options.forEach((optText, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.setAttribute('type', 'button');
        btn.setAttribute('data-index', index);

        btn.innerHTML = `
            <span class="option-letter">${letters[index]}</span>
            <span>${optText}</span>
        `;

        btn.addEventListener('click', () => handleOptionSelection(index));
        quizOptionsEl.appendChild(btn);
    });

    // Exibe o modal do quiz
    screenQuiz.classList.remove('hidden');
}

/**
 * Processa e valida a resposta do usuário no quiz.
 */
function handleOptionSelection(selectedIndex) {
    const isCorrect = selectedIndex === currentQuizQuestion.correct;
    const buttons = quizOptionsEl.querySelectorAll('.option-btn');

    // Desativa todos os botões para impedir cliques múltiplos
    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === currentQuizQuestion.correct) {
            btn.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    // Configura o feedback explicativo
    quizFeedbackEl.classList.remove('hidden');
    if (isCorrect) {
        quizFeedbackEl.className = 'feedback-box correct';
        feedbackTitleEl.textContent = '✅ Resposta Correta!';
        feedbackTextEl.textContent = currentQuizQuestion.explanation;

        gameState.questionsAnswered++;
        gameState.currentQuestionIndex++;
        updateHUD();

        // Se atingiu 10 acertos e ainda possui vidas disponíveis, sinaliza vitória
        if (gameState.questionsAnswered >= WIN_TARGET_QUESTIONS && gameState.lives > 0) {
            btnContinueQuiz.textContent = '🏆 Zerar o Jogo (Vitória)';
        } else {
            btnContinueQuiz.textContent = 'Continuar Corrida';
        }
    } else {
        quizFeedbackEl.className = 'feedback-box wrong';
        feedbackTitleEl.textContent = '❌ Resposta Incorreta!';
        feedbackTextEl.textContent = `${currentQuizQuestion.explanation} (Você perdeu 1 vida)`;

        gameState.lives--;
        gameState.currentQuestionIndex++;
        updateHUD();

        if (gameState.lives <= 0) {
            btnContinueQuiz.textContent = '💀 Fim de Jogo';
        } else {
            btnContinueQuiz.textContent = 'Continuar Corrida';
        }
    }

    // Exibe o botão de continuar
    btnContinueQuiz.classList.remove('hidden');
    btnContinueQuiz.focus();
}

/**
 * Continua o jogo ou finaliza com Vitória / Game Over.
 * Condição estrita:
 * - Se perdeu todas as vidas (lives <= 0): Game Over.
 * - Se acertou 10 perguntas e mantém vidas disponíveis (lives > 0): Vitória (Zerar o Jogo).
 */
function handleQuizContinue() {
    screenQuiz.classList.add('hidden');

    // Remove o obstáculo colidido para que o jogador não tome dano imediato ao retomar
    if (collidedObstacleIndex >= 0 && collidedObstacleIndex < obstacles.length) {
        obstacles.splice(collidedObstacleIndex, 1);
        collidedObstacleIndex = -1;
    }

    // 1. Verificação de Derrota: sem vidas disponíveis
    if (gameState.lives <= 0) {
        triggerGameOver();
        return;
    }

    // 2. Condição de Vitória (Zerar o Jogo): atingir 10 acertos com vidas restantes (> 0)
    if (gameState.questionsAnswered >= WIN_TARGET_QUESTIONS && gameState.lives > 0) {
        triggerVictory();
        return;
    }

    // Caso contrário, retoma a corrida normalmente
    gameState.paused = false;
}

// ==========================================================================
// CONTROLES DE ENTRADA (TECLADO E TOUCH)
// ==========================================================================
function setupControls() {
    window.addEventListener('keydown', (e) => {
        // Pulo durante o jogo
        if ((e.code === 'Space' || e.key === 'ArrowUp') && gameState.running && !gameState.paused) {
            e.preventDefault();
            player.jump();
        }

        // Atalhos do Quiz por teclado (A, B, C, D ou 1, 2, 3, 4)
        if (!screenQuiz.classList.contains('hidden')) {
            const mapKeys = {
                'KeyA': 0, 'Digit1': 0,
                'KeyB': 1, 'Digit2': 1,
                'KeyC': 2, 'Digit3': 2,
                'KeyD': 3, 'Digit4': 3
            };
            if (e.code in mapKeys) {
                const buttons = quizOptionsEl.querySelectorAll('.option-btn');
                const targetIdx = mapKeys[e.code];
                if (buttons[targetIdx] && !buttons[targetIdx].disabled) {
                    handleOptionSelection(targetIdx);
                }
            } else if (e.code === 'Enter' && !btnContinueQuiz.classList.contains('hidden')) {
                handleQuizContinue();
            }
        }
    });

    // Botão touch para dispositivos móveis
    if (btnMobileJump) {
        btnMobileJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            player.jump();
        });
        btnMobileJump.addEventListener('click', () => {
            player.jump();
        });
    }

    // Botões de interface
    btnStart.addEventListener('click', startGame);
    btnRestartGameOver.addEventListener('click', startGame);
    btnRestartVictory.addEventListener('click', startGame);
    btnContinueQuiz.addEventListener('click', handleQuizContinue);
}

// ==========================================================================
// HUD (ATUALIZAÇÃO VISUAL DOS CONTADORES)
// ==========================================================================
function updateHUD() {
    if (hudScoreEl) hudScoreEl.textContent = `⭐ Pontos: ${Math.floor(gameState.score)}`;
    if (hudCoinsEl) hudCoinsEl.textContent = `🪙 Moedas: ${gameState.coins}`;
    if (hudQuestionsEl) hudQuestionsEl.textContent = `📚 Acertos: ${gameState.questionsAnswered}/${WIN_TARGET_QUESTIONS}`;

    if (hudLivesEl) {
        // Constrói corações conforme vidas restantes
        const hearts = [];
        for (let i = 0; i < Math.max(0, gameState.lives); i++) {
            hearts.push('❤️');
        }
        hudLivesEl.textContent = hearts.join('') || '💔';
    }
}

// ==========================================================================
// TELAS E CICLO DE PARTIDA
// ==========================================================================
function startGame() {
    // 1. Esconde overlays
    screenStart.classList.add('hidden');
    screenGameOver.classList.add('hidden');
    screenVictory.classList.add('hidden');
    screenQuiz.classList.add('hidden');

    // 2. Reseta o estado global
    gameState.running = true;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.victory = false;
    gameState.score = 0;
    gameState.elapsedTime = 0; // Reseta tempo decorrido para reiniciar progressão
    gameState.lives = 3;
    gameState.coins = 0;
    gameState.questionsAnswered = 0; // Reseta contador de 10 acertos
    gameState.speed = PHYSICS.initialSpeed;
    gameState.extraLifeAvailable = true;
    gameState.extraLifeSpawned = false;

    // 3. Embaralha e prepara as questões para a partida
    setupMatchQuestions();

    // 4. Reseta posições das entidades
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isGrounded = true;

    obstacles.length = 0;
    coins.length = 0;
    visualParticles.length = 0;
    extraLife = null;

    nextObstacleTimer = 90;
    nextCoinTimer = 50;

    updateHUD();
}

function triggerGameOver() {
    gameState.running = false;
    gameState.gameOver = true;

    finalScoreGameOver.textContent = Math.floor(gameState.score);
    finalCoinsGameOver.textContent = gameState.coins;
    finalQuestionsGameOver.textContent = `${gameState.questionsAnswered}/${WIN_TARGET_QUESTIONS}`;

    screenGameOver.classList.remove('hidden');
}

function triggerVictory() {
    gameState.running = false;
    gameState.victory = true;

    finalScoreVictory.textContent = Math.floor(gameState.score);
    finalCoinsVictory.textContent = gameState.coins;

    screenVictory.classList.remove('hidden');
}

// ==========================================================================
// GAME LOOP PRINCIPAL
// ==========================================================================
/**
 * O Game Loop é o coração de qualquer jogo em tempo real.
 * Utiliza requestAnimationFrame() nativo para:
 * 1. Sincronizar com a taxa de atualização da tela do monitor (~60hz);
 * 2. Pausar automaticamente quando a aba do navegador perde o foco (economiza bateria e CPU);
 * 3. Garantir transições visuais suaves entre frames.
 */
function gameLoop() {
    // Executa continuamente via agendamento do próximo frame
    requestAnimationFrame(gameLoop);

    if (!ctx) return;

    // Limpa o canvas para o novo desenho
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Sempre desenha o cenário de fundo
    drawBackground(ctx);

    // Se o jogo não está ativo (pausado ou nas telas iniciais), desenha apenas as entidades estáticas
    if (!gameState.running || gameState.paused) {
        // Desenha obstáculos existentes
        obstacles.forEach(obs => drawObstacle(obs, ctx));
        // Desenha moedas existentes
        coins.forEach(c => drawCoin(c, ctx));
        // Desenha vida extra se ativa
        if (extraLife) drawExtraLife(extraLife, ctx);
        // Desenha o jogador
        player.draw(ctx);
        return;
    }

    // ======================================================================
    // ATUALIZAÇÃO DO ESTADO DO JOGO (UPDATE)
    // ======================================================================

    // 1. Atualiza tempo de jogo decorrido (em segundos, taxa ~60 FPS)
    gameState.elapsedTime += 1 / 60;

    // 2. Atualiza pontuação com base na distância percorrida
    gameState.score += 0.25;

    // ======================================================================
    // SISTEMA DE PROGRESSÃO DE DIFICULDADE — FRENTE 1: VELOCIDADE AINDA MAIS RÁPIDA
    // ======================================================================
    // Aumenta a velocidade de forma vigorosa e contínua com o passar do tempo
    // (+0.85 de velocidade a cada 10 segundos decorridos + bônus pela pontuação até o teto de 14.0)
    const timeSpeedBonus = (gameState.elapsedTime / 10) * 0.85;
    const scoreSpeedBonus = gameState.score / 600;
    gameState.speed = Math.min(
        PHYSICS.maxSpeed,
        PHYSICS.initialSpeed + timeSpeedBonus + scoreSpeedBonus
    );

    updateHUD();

    // Atualiza física do personagem
    player.update();

    // ======================================================================
    // SPAWN E ATUALIZAÇÃO DA VIDA EXTRA
    // ======================================================================
    if (gameState.extraLifeAvailable && !gameState.extraLifeSpawned && gameState.score >= 500) {
        spawnExtraLife();
    }

    if (extraLife) {
        extraLife.x -= gameState.speed;
        extraLife.pulse += 0.08;

        // Colisão do jogador com a vida extra
        if (checkCollision(player, extraLife)) {
            gameState.lives++;
            extraLife = null; // Removida após ser coletada (nunca mais surge)
            updateHUD();
        } else if (extraLife.x + extraLife.width < 0) {
            extraLife = null; // Se sair da tela sem ser coletada
        }
    }

    // ======================================================================
    // SPAWN E ATUALIZAÇÃO DE MOEDAS
    // ======================================================================
    nextCoinTimer--;
    if (nextCoinTimer <= 0) {
        spawnCoin();
        nextCoinTimer = 60 + Math.floor(Math.random() * 80);
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.x -= gameState.speed;
        coin.rotation += 0.08;

        // Detecção de coleta de moeda via AABB
        if (checkCollision(player, coin)) {
            gameState.coins++;
            gameState.score += 25; // Bônus de pontuação por moeda
            coins.splice(i, 1);
            updateHUD();
            continue;
        }

        // Remove moedas que saíram do campo de visão
        if (coin.x + coin.width < 0) {
            coins.splice(i, 1);
        }
    }

    // ======================================================================
    // SISTEMA DE PROGRESSÃO DE DIFICULDADE — FRENTE 2: MAIS OBSTÁCULOS NA TELA
    // ======================================================================
    // Com o passar do tempo, o intervalo entre obstáculos diminui gradualmente,
    // fazendo com que surjam mais obstáculos na tela simultaneamente.
    nextObstacleTimer--;
    if (nextObstacleTimer <= 0) {
        spawnObstacle();

        // Fator de tempo: varia de 0.0 (início) até 1.0 (após ~100 segundos de corrida)
        const timeDifficulty = Math.min(1.0, gameState.elapsedTime / 100);

        // O intervalo base entre obstáculos cai de 82 para 48 frames (gerando mais obstáculos na tela)
        const baseInterval = Math.max(48, Math.floor(82 - timeDifficulty * 34));
        // A variação aleatória cai de 55 para 22 frames
        const randomSpread = Math.max(22, Math.floor(55 - timeDifficulty * 33));

        nextObstacleTimer = baseInterval + Math.floor(Math.random() * randomSpread);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameState.speed;

        // Detecção de colisão do jogador com obstáculo via AABB
        if (checkCollision(player, obs)) {
            triggerQuiz(i);
            break; // Interrompe para abrir o quiz imediatamente
        }

        // Remove obstáculos que saíram da tela
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    // ======================================================================
    // DESENHO DAS ENTIDADES (RENDER)
    // ======================================================================

    // Desenha moedas
    coins.forEach(c => drawCoin(c, ctx));

    // Desenha vida extra
    if (extraLife) {
        drawExtraLife(extraLife, ctx);
    }

    // Desenha obstáculos
    obstacles.forEach(obs => drawObstacle(obs, ctx));

    // Desenha o personagem
    player.draw(ctx);
}

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
window.addEventListener('DOMContentLoaded', async () => {
    // Ajusta as dimensões nativas do canvas para resolução interna 800x400
    if (canvas) {
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
    }

    setupControls();
    await loadQuestions();
    updateHUD();

    // Inicia o Game Loop contínuo
    requestAnimationFrame(gameLoop);
});

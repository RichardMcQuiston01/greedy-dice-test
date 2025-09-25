class GameUI {
    constructor() {
        this.setupScreen = document.getElementById('setup-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.messageTimeout = null;
    }

    initialize() {
        this.setupEventListeners();
        this.showSetupScreen();
        diceRenderer.initialize();
    }

    setupEventListeners() {
        document.getElementById('player-count').addEventListener('input', (e) => {
            this.updatePlayerNameInputs(parseInt(e.target.value));
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('roll-dice-btn').addEventListener('click', () => {
            this.rollDice();
        });

        document.getElementById('bank-points-btn').addEventListener('click', () => {
            this.bankPoints();
        });

        document.getElementById('and-rolling-btn').addEventListener('click', () => {
            this.andRolling();
        });

        document.getElementById('end-turn-btn').addEventListener('click', () => {
            this.endTurn();
        });
    }

    updatePlayerNameInputs(count) {
        const container = document.getElementById('player-names');
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-name';
            input.placeholder = `Player ${i + 1}`;
            input.setAttribute('data-player', i);
            container.appendChild(input);
        }
    }

    startGame() {
        const playerCount = parseInt(document.getElementById('player-count').value);
        const winningScore = parseInt(document.getElementById('winning-score').value);
        const minimumBank = parseInt(document.getElementById('minimum-bank').value);

        const playerNames = [];
        const nameInputs = document.querySelectorAll('.player-name');
        nameInputs.forEach(input => {
            playerNames.push(input.value.trim() || input.placeholder);
        });

        if (playerCount < 1 || playerCount > 6) {
            this.showMessage('Please select 1-6 players', 'error');
            return;
        }

        game.setupGame(playerNames, winningScore, minimumBank);
        this.showGameScreen();
        this.updateGameDisplay();
        this.showMessage(`${game.players[game.currentPlayerIndex].name}'s turn - Roll all dice to start!`, 'info');
    }

    showSetupScreen() {
        this.hideAllScreens();
        this.setupScreen.classList.add('active');
        this.updatePlayerNameInputs(2);
    }

    showGameScreen() {
        this.hideAllScreens();
        this.gameScreen.classList.add('active');

        document.getElementById('display-winning-score').textContent = game.winningScore;
        document.getElementById('display-minimum-bank').textContent = game.minimumBank;
    }

    showGameOverScreen() {
        this.hideAllScreens();
        this.gameOverScreen.classList.add('active');

        const winner = game.winner;
        document.getElementById('winner-announcement').innerHTML =
            `<h2>🎉 ${winner.name} Wins! 🎉</h2><p>Final Score: ${winner.score}</p>`;

        this.updateFinalScores();
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    updateGameDisplay() {
        const gameStatus = game.getGameStatus();

        this.updateCurrentPlayer();
        this.updateScoreboard();
        this.updateTurnInfo(gameStatus);
        this.updateGameControls(gameStatus);
        diceRenderer.updateDiceDisplay();

        if (gameStatus.gameOver) {
            setTimeout(() => {
                this.showGameOverScreen();
            }, 2000);
        }
    }

    updateCurrentPlayer() {
        const currentPlayer = game.players[game.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = currentPlayer.name;
    }

    updateScoreboard() {
        const container = document.getElementById('player-scores');
        container.innerHTML = '';

        game.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `player-score ${player.isActive ? 'active' : ''}`;

            const statusIcon = player.hasReachedMinimum ? '✓' :
                              (player.score + game.turnScore >= game.minimumBank) ? '⚡' : '○';

            playerDiv.innerHTML = `
                <div class="player-info">
                    <span class="player-name">${player.name} ${statusIcon}</span>
                    <span class="player-score-value">${player.score.toLocaleString()}</span>
                </div>
                <div class="player-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(player.score / game.winningScore) * 100}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(playerDiv);
        });
    }

    updateTurnInfo(gameStatus) {
        document.getElementById('turn-score').textContent = gameStatus.turnScore.toLocaleString();
        document.getElementById('banked-score').textContent = gameStatus.currentPlayer.score.toLocaleString();
    }

    updateGameControls(gameStatus) {
        const rollBtn = document.getElementById('roll-dice-btn');
        const bankBtn = document.getElementById('bank-points-btn');
        const andRollingBtn = document.getElementById('and-rolling-btn');
        const endTurnBtn = document.getElementById('end-turn-btn');

        rollBtn.disabled = diceRenderer.isAnimating;
        bankBtn.disabled = !gameStatus.canBank || diceRenderer.isAnimating;
        andRollingBtn.disabled = !gameStatus.canAndRoll || diceRenderer.isAnimating;
        endTurnBtn.disabled = diceRenderer.isAnimating;

        if (!gameStatus.hasRolled) {
            rollBtn.textContent = 'Roll All Dice';
        } else {
            const availableDice = gameStatus.heldDice.filter(held => !held).length;
            rollBtn.textContent = availableDice > 0 ? `Roll ${availableDice} Dice` : 'No Dice to Roll';
            rollBtn.disabled = rollBtn.disabled || availableDice === 0;
        }

        if (gameStatus.mustRoll) {
            bankBtn.disabled = true;
            this.showMessage('You must reach the minimum bank score before you can bank points!', 'warning');
        }
    }

    async rollDice() {
        if (diceRenderer.isAnimating) return;

        const result = await diceRenderer.performRoll();

        if (result === 'bust') {
            this.showMessage('BUST! No scoring dice - turn over!', 'error');
            setTimeout(() => {
                game.endTurn();
                this.updateGameDisplay();
                this.showMessage(`${game.players[game.currentPlayerIndex].name}'s turn`, 'info');
            }, 2000);
        } else if (result === 'success') {
            const gameStatus = game.getGameStatus();
            if (gameStatus.turnScore === 0) {
                this.showMessage('Select scoring dice to continue', 'info');
            } else {
                this.showMessage('Select dice to hold or roll again', 'success');
            }
            this.updateGameDisplay();
        }
    }

    bankPoints() {
        const success = game.bankPoints();
        if (success) {
            if (game.gameOver) {
                this.showMessage(`${game.winner.name} wins the game!`, 'success');
                this.updateGameDisplay();
            } else {
                this.showMessage(`Points banked! ${game.players[game.currentPlayerIndex].name}'s turn`, 'success');
                this.updateGameDisplay();
            }
        } else {
            this.showMessage('Cannot bank points at this time', 'error');
        }
    }

    async andRolling() {
        const success = game.andRoll();
        if (success) {
            this.showMessage('And Rolling! Rolling all dice again...', 'info');
            this.updateGameDisplay();

            // Automatically roll all dice after releasing them
            setTimeout(async () => {
                await this.rollDice();
            }, 500); // Small delay for visual feedback
        } else {
            this.showMessage('Cannot use "And Rolling" at this time', 'error');
        }
    }

    endTurn() {
        game.endTurn();
        this.showMessage(`${game.players[game.currentPlayerIndex].name}'s turn`, 'info');
        this.updateGameDisplay();
    }

    newGame() {
        game.newGame();
        diceRenderer.resetDice();
        this.showSetupScreen();
        this.clearMessage();
    }

    updateFinalScores() {
        const container = document.getElementById('final-scores');
        container.innerHTML = '<h3>Final Scores:</h3>';

        const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

        sortedPlayers.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'final-score-item';
            div.innerHTML = `
                <span class="rank">${index + 1}.</span>
                <span class="name">${player.name}</span>
                <span class="score">${player.score.toLocaleString()}</span>
            `;
            container.appendChild(div);
        });
    }

    showMessage(text, type = 'info') {
        const messageDisplay = document.getElementById('message-display');
        messageDisplay.textContent = text;
        messageDisplay.className = `message ${type}`;
        messageDisplay.style.display = 'block';

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        if (type !== 'error' && type !== 'warning') {
            this.messageTimeout = setTimeout(() => {
                this.clearMessage();
            }, 5000);
        }
    }

    clearMessage() {
        const messageDisplay = document.getElementById('message-display');
        messageDisplay.style.display = 'none';
        messageDisplay.textContent = '';
        messageDisplay.className = 'message';

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
    }
}

const game = new GreedyDiceGame();
const gameUI = new GameUI();

document.addEventListener('DOMContentLoaded', () => {
    gameUI.initialize();
});
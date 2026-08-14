// Player names are free text and end up inside innerHTML, so escape them.
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

class GameUI {
    constructor() {
        this.setupScreen = document.getElementById('setup-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.messageTimeout = null;
        this.lastMustRoll = false;
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
        const safeCount = Math.min(6, Math.max(1, Number.isFinite(count) ? count : 1));
        container.innerHTML = '';

        for (let i = 0; i < safeCount; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-name';
            input.placeholder = `Player ${i + 1}`;
            input.setAttribute('data-player', i);
            container.appendChild(input);
        }
    }

    startGame() {
        const playerCount = parseInt(document.getElementById('player-count').value, 10);
        const winningScore = parseInt(document.getElementById('winning-score').value, 10);
        const minimumBank = parseInt(document.getElementById('minimum-bank').value, 10);

        if (!Number.isFinite(playerCount) || playerCount < 1 || playerCount > 6) {
            this.showSetupError('Please choose between 1 and 6 players.');
            return;
        }
        if (!Number.isFinite(winningScore) || winningScore < 100) {
            this.showSetupError('Winning score must be a number of at least 100.');
            return;
        }
        if (!Number.isFinite(minimumBank) || minimumBank < 0) {
            this.showSetupError('Minimum bank must be a number of 0 or more.');
            return;
        }
        if (minimumBank > winningScore) {
            this.showSetupError('Minimum bank cannot be higher than the winning score.');
            return;
        }

        const playerNames = [];
        document.querySelectorAll('.player-name').forEach(input => {
            playerNames.push(input.value.trim() || input.placeholder);
        });

        if (!game.setupGame(playerNames, winningScore, minimumBank)) {
            this.showSetupError('Could not start the game - please check the player count.');
            return;
        }

        this.clearSetupError();
        this.showGameScreen();
        this.updateGameDisplay();
        this.showMessage(`${game.players[game.currentPlayerIndex].name}'s turn - Roll all dice to start!`, 'info');
    }

    showSetupError(text) {
        const el = document.getElementById('setup-message');
        el.textContent = text;
        el.style.display = 'block';
    }

    clearSetupError() {
        const el = document.getElementById('setup-message');
        el.textContent = '';
        el.style.display = 'none';
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
            `<h2>🎉 ${escapeHtml(winner.name)} Wins! 🎉</h2>` +
            `<p>Final Score: ${winner.score.toLocaleString()}</p>`;

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
                    <span class="player-name">${escapeHtml(player.name)} ${statusIcon}</span>
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

        rollBtn.disabled = diceRenderer.isAnimating || !gameStatus.canRoll;
        bankBtn.disabled = !gameStatus.canBank || diceRenderer.isAnimating;
        andRollingBtn.disabled = !gameStatus.canAndRoll || diceRenderer.isAnimating;
        endTurnBtn.disabled = diceRenderer.isAnimating;

        if (!gameStatus.hasRolled) {
            rollBtn.textContent = 'Roll All Dice';
            rollBtn.title = '';
        } else {
            const availableDice = gameStatus.heldDice.filter(held => !held).length;
            rollBtn.textContent = availableDice > 0 ? `Roll ${availableDice} Dice` : 'No Dice to Roll';
            rollBtn.title = gameStatus.canRoll
                ? ''
                : 'Hold at least one scoring die before rolling again';
        }

        if (gameStatus.mustRoll) {
            bankBtn.disabled = true;
            bankBtn.title = 'You must reach the minimum bank score before banking';
            // Only announce on the transition, otherwise every redraw stomps the
            // message area and the warning can never be replaced.
            if (!this.lastMustRoll) {
                this.showMessage('You must reach the minimum bank score before you can bank points!', 'warning');
            }
        } else {
            bankBtn.title = '';
        }
        this.lastMustRoll = gameStatus.mustRoll;
    }

    async rollDice() {
        if (diceRenderer.isAnimating) return;

        if (!game.canRoll()) {
            this.showMessage('Hold at least one scoring die before rolling again.', 'warning');
            return;
        }

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
        // Ending a turn forfeits the turn score - banking is the only way to keep
        // it - so never let that happen on a single unconfirmed click.
        if (game.turnScore > 0) {
            const points = game.turnScore.toLocaleString();
            const prompt = game.canBankPoints()
                ? `End your turn and give up ${points} points? Use "Bank Points" to keep them.`
                : `End your turn and give up ${points} points?`;
            if (!window.confirm(prompt)) {
                return;
            }
        }

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
                <span class="name">${escapeHtml(player.name)}</span>
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
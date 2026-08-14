class DiceRenderer {
    constructor() {
        this.diceElements = [];
        this.rollAnimationDuration = 800;
        this.isAnimating = false;
    }

    initialize() {
        this.diceElements = Array.from(document.querySelectorAll('.die'));
        this.setupDiceClickHandlers();
    }

    setupDiceClickHandlers() {
        this.diceElements.forEach((die, index) => {
            die.addEventListener('click', () => this.handleDiceClick(index));
        });
    }

    handleDiceClick(index) {
        if (this.isAnimating) return;

        const die = this.diceElements[index];
        const isHeld = die.classList.contains('held');

        // Once a die is held, it cannot be unheld
        if (isHeld) {
            return;
        }

        // Only allow holding if the die is available to hold
        if (game.holdDie(index)) {
            gameUI.updateGameDisplay();
        }
    }

    renderDieFace(value) {
        const dots = this.getDotPattern(value);
        return `<div class="die-dots">${dots}</div>`;
    }

    getDotPattern(value) {
        const patterns = {
            1: '<div class="dot center"></div>',
            2: '<div class="dot top-left"></div><div class="dot bottom-right"></div>',
            3: '<div class="dot top-left"></div><div class="dot center"></div><div class="dot bottom-right"></div>',
            4: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>',
            5: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot center"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>',
            6: '<div class="dot top-left"></div><div class="dot top-right"></div><div class="dot middle-left"></div><div class="dot middle-right"></div><div class="dot bottom-left"></div><div class="dot bottom-right"></div>'
        };
        return patterns[value] || patterns[1];
    }

    async rollDiceAnimation(diceToRoll) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const rollPromises = diceToRoll.map(index => this.animateSingleDie(index));
        await Promise.all(rollPromises);

        this.isAnimating = false;
        this.updateDiceDisplay();
    }

    animateSingleDie(index) {
        return new Promise(resolve => {
            const die = this.diceElements[index];
            const face = die.querySelector('.die-face');

            die.classList.add('rolling');

            const rollInterval = setInterval(() => {
                const randomValue = Math.floor(Math.random() * 6) + 1;
                face.innerHTML = this.renderDieFace(randomValue);
            }, 100);

            setTimeout(() => {
                clearInterval(rollInterval);
                die.classList.remove('rolling');

                const finalValue = game.diceValues[index];
                face.innerHTML = this.renderDieFace(finalValue);

                resolve();
            }, this.rollAnimationDuration);
        });
    }

    updateDiceDisplay() {
        const gameStatus = game.getGameStatus();

        this.diceElements.forEach((die, index) => {
            const face = die.querySelector('.die-face');
            const value = gameStatus.diceValues[index];
            const isHeld = gameStatus.heldDice[index];
            const canHold = gameStatus.availableDiceToHold.includes(index);

            face.innerHTML = this.renderDieFace(value);

            die.classList.remove('held', 'can-hold', 'disabled');

            if (isHeld) {
                die.classList.add('held');
            } else if (canHold && gameStatus.hasRolled) {
                die.classList.add('can-hold');
            } else if (gameStatus.hasRolled) {
                die.classList.add('disabled');
            }
        });
    }

    resetDice() {
        this.diceElements.forEach((die, index) => {
            const face = die.querySelector('.die-face');
            die.classList.remove('held', 'can-hold', 'disabled', 'rolling');
            face.innerHTML = this.renderDieFace(1);
        });
    }

    highlightAvailableDice(indices) {
        this.diceElements.forEach((die, index) => {
            if (indices.includes(index)) {
                die.classList.add('highlight');
            } else {
                die.classList.remove('highlight');
            }
        });
    }

    clearHighlights() {
        this.diceElements.forEach(die => {
            die.classList.remove('highlight');
        });
    }

    shakeDice(indices) {
        indices.forEach(index => {
            const die = this.diceElements[index];
            die.classList.add('shake');
            setTimeout(() => die.classList.remove('shake'), 500);
        });
    }

    getDiceToRoll() {
        return game.heldDice.map((held, index) => !held ? index : -1).filter(i => i !== -1);
    }

    async performRoll() {
        if (this.isAnimating) return false;

        const success = game.rollDice();
        if (!success) return false;

        const diceToRoll = this.getDiceToRoll();
        await this.rollDiceAnimation(diceToRoll);

        if (game.checkForBust()) {
            this.shakeDice(diceToRoll);
            return 'bust';
        }

        return 'success';
    }
}

const diceRenderer = new DiceRenderer();
class GreedyDiceGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.winningScore = 10000;
        this.minimumBank = 1000;
        this.gameState = 'setup';
        this.diceValues = [1, 1, 1, 1, 1, 1, 1, 1];
        this.heldDice = [false, false, false, false, false, false, false, false];
        this.diceRollGroup = [0, 0, 0, 0, 0, 0, 0, 0]; // Track which roll each die came from
        this.currentRollGroup = 1;
        this.turnScore = 0;
        this.andRollingBankedScore = 0; // Points banked from previous "And Rolling" actions
        this.hasRolled = false;
        this.gameOver = false;
        this.winner = null;
    }

    setupGame(playerNames, winningScore, minimumBank) {
        this.players = playerNames.map((name, index) => ({
            name: name || `Player ${index + 1}`,
            score: 0,
            hasReachedMinimum: false,
            isActive: false
        }));

        this.winningScore = winningScore;
        this.minimumBank = minimumBank;
        this.currentPlayerIndex = this.determineStartingPlayer();
        this.players[this.currentPlayerIndex].isActive = true;
        this.gameState = 'playing';
        this.resetTurn();
    }

    determineStartingPlayer() {
        let maxRoll = 0;
        let startingPlayers = [];

        for (let i = 0; i < this.players.length; i++) {
            const roll = Math.floor(Math.random() * 6) + 1;
            if (roll > maxRoll) {
                maxRoll = roll;
                startingPlayers = [i];
            } else if (roll === maxRoll) {
                startingPlayers.push(i);
            }
        }

        if (startingPlayers.length === 1) {
            return startingPlayers[0];
        }

        return startingPlayers[Math.floor(Math.random() * startingPlayers.length)];
    }

    rollDice() {
        const availableDice = this.heldDice.map((held, index) => !held ? index : -1).filter(i => i !== -1);

        if (availableDice.length === 0) {
            return false;
        }

        // If this is not the first roll of the turn and we have held dice, increment roll group
        if (this.hasRolled && this.heldDice.some(held => held)) {
            this.currentRollGroup++;
        }

        availableDice.forEach(index => {
            this.diceValues[index] = Math.floor(Math.random() * 6) + 1;
            this.diceRollGroup[index] = this.currentRollGroup;
        });

        this.hasRolled = true;
        return true;
    }

    calculateScore(diceToScore = null) {
        // If specific dice provided, calculate their score directly
        if (diceToScore) {
            const counts = [0, 0, 0, 0, 0, 0, 0];
            diceToScore.forEach(value => counts[value]++);
            return this.calculateScoreFromCounts(counts);
        }

        // For held dice, we need to calculate score considering roll groups and three-of-a-kind bonuses
        let totalScore = 0;

        // Group held dice by their roll group
        const rollGroups = {};
        this.diceValues.forEach((value, index) => {
            if (this.heldDice[index]) {
                const rollGroup = this.diceRollGroup[index];
                if (!rollGroups[rollGroup]) {
                    rollGroups[rollGroup] = [];
                }
                rollGroups[rollGroup].push(value);
            }
        });

        // Track which faces have already received three-of-a-kind bonuses
        const threeOfAKindBonusUsed = [false, false, false, false, false, false, false];

        // Process roll groups in order to track three-of-a-kind bonuses
        const sortedRollGroups = Object.keys(rollGroups).sort((a, b) => parseInt(a) - parseInt(b));

        for (const rollGroupKey of sortedRollGroups) {
            const diceInGroup = rollGroups[rollGroupKey];
            const counts = [0, 0, 0, 0, 0, 0, 0];
            diceInGroup.forEach(value => counts[value]++);

            totalScore += this.calculateScoreFromCountsWithContext(counts, threeOfAKindBonusUsed);
        }

        return totalScore;
    }

    calculateScoreFromCounts(counts) {
        let score = 0;

        for (let face = 1; face <= 6; face++) {
            const count = counts[face];

            if (count >= 3) {
                if (face === 1) {
                    score += 1000;
                } else {
                    score += face * 100;
                }

                const remaining = count - 3;
                if (face === 1) {
                    score += remaining * 100;
                } else if (face === 5) {
                    score += remaining * 50;
                } else {
                    score += remaining * 50;
                }
            } else {
                if (face === 1) {
                    score += count * 100;
                } else if (face === 5) {
                    score += count * 50;
                }
            }
        }

        return score;
    }

    calculateScoreFromCountsWithContext(counts, threeOfAKindBonusUsed) {
        let score = 0;

        for (let face = 1; face <= 6; face++) {
            const count = counts[face];

            if (count >= 3 && !threeOfAKindBonusUsed[face]) {
                // First time getting three of this face - award the three-of-a-kind bonus
                if (face === 1) {
                    score += 1000;
                } else {
                    score += face * 100;
                }
                threeOfAKindBonusUsed[face] = true;

                // Score any remaining dice
                const remaining = count - 3;
                if (face === 1) {
                    score += remaining * 100;
                } else if (face === 5) {
                    score += remaining * 50;
                } else {
                    score += remaining * 50;
                }
            } else if (count > 0) {
                // Either we don't have 3+ dice, or we already used the three-of-a-kind bonus
                if (threeOfAKindBonusUsed[face]) {
                    // Already have three-of-a-kind bonus, so all dice of this face are worth 50
                    if (face === 1) {
                        score += count * 100; // 1s are always 100 each
                    } else if (face === 5) {
                        score += count * 50; // 5s are always 50 each
                    } else {
                        score += count * 50; // Additional dice after three-of-a-kind are worth 50
                    }
                } else {
                    // No three-of-a-kind bonus yet, score normally
                    if (face === 1) {
                        score += count * 100;
                    } else if (face === 5) {
                        score += count * 50;
                    }
                    // Other faces without three-of-a-kind are worth 0
                }
            }
        }

        return score;
    }

    getAvailableDiceToHold() {
        const availableDice = [];

        // Count all dice (held and available)
        const allCounts = [0, 0, 0, 0, 0, 0, 0];
        const availableCounts = [0, 0, 0, 0, 0, 0, 0];
        const heldCounts = [0, 0, 0, 0, 0, 0, 0];

        this.diceValues.forEach((value, index) => {
            allCounts[value]++;
            if (this.heldDice[index]) {
                heldCounts[value]++;
            } else {
                availableCounts[value]++;
            }
        });

        this.diceValues.forEach((value, index) => {
            if (!this.heldDice[index]) {
                let canHold = false;

                // Always allow 1s and 5s
                if (value === 1 || value === 5) {
                    canHold = true;
                }
                // Allow if we have 3 or more of this value available to roll
                else if (availableCounts[value] >= 3) {
                    canHold = true;
                }
                // Allow if we already have held dice of this value and together make 3+
                else if (heldCounts[value] > 0 && (heldCounts[value] + availableCounts[value]) >= 3) {
                    canHold = true;
                }
                // Allow if we already have 3+ held of this value (additional dice worth 50)
                else if (heldCounts[value] >= 3) {
                    canHold = true;
                }

                if (canHold) {
                    availableDice.push(index);
                }
            }
        });

        return availableDice;
    }

    holdDie(index) {
        if (this.heldDice[index] || !this.hasRolled) {
            return false;
        }

        const availableDice = this.getAvailableDiceToHold();
        if (!availableDice.includes(index)) {
            return false;
        }

        this.heldDice[index] = true;
        this.updateTurnScore();
        return true;
    }

    unholdDie(index) {
        // Once a die is held, it cannot be unheld in traditional Greedy Dice
        return false;
    }

    updateTurnScore() {
        // Calculate score from currently held dice
        const currentHeldScore = this.calculateScore();
        // Add the score banked from previous "And Rolling" actions
        this.turnScore = this.andRollingBankedScore + currentHeldScore;
    }

    canContinueRolling() {
        const availableDice = this.heldDice.filter(held => !held).length;
        return availableDice > 0 && this.getAvailableDiceToHold().some(index => this.heldDice[index]);
    }

    canBankPoints() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        const totalScore = currentPlayer.score + this.turnScore;

        if (!currentPlayer.hasReachedMinimum && totalScore < this.minimumBank) {
            return false;
        }

        return this.turnScore > 0 && this.hasRolled;
    }

    canAndRoll() {
        const heldCount = this.heldDice.filter(held => held).length;
        const availableDice = this.getAvailableDiceToHold();

        // Can "And Roll" if:
        // 1. You have 7 dice held and the 8th die can score, OR
        // 2. You have all 8 dice held (all are scoring)
        const canAndRoll = (heldCount === 7 && availableDice.length > 0) ||
                           (heldCount === 8);

        return canAndRoll && this.turnScore > 0 && this.hasRolled;
    }

    andRoll() {
        if (!this.canAndRoll()) {
            return false;
        }

        // Bank the current turn score before releasing dice
        this.andRollingBankedScore += this.turnScore;

        // Release all dice for rolling again
        this.heldDice = [false, false, false, false, false, false, false, false];
        this.hasRolled = false; // Ready to roll again
        this.currentRollGroup++;

        // Keep turnScore showing the banked amount for UI consistency
        // It will be recalculated when new dice are held
        this.turnScore = this.andRollingBankedScore;

        return true;
    }

    bankPoints() {
        if (!this.canBankPoints()) {
            return false;
        }

        const currentPlayer = this.players[this.currentPlayerIndex];
        // turnScore already includes andRollingBankedScore from updateTurnScore()
        currentPlayer.score += this.turnScore;

        if (!currentPlayer.hasReachedMinimum && currentPlayer.score >= this.minimumBank) {
            currentPlayer.hasReachedMinimum = true;
        }

        if (currentPlayer.score >= this.winningScore) {
            this.gameOver = true;
            this.winner = currentPlayer;
            this.gameState = 'game_over';
            return true;
        }

        this.endTurn();
        return true;
    }

    checkForBust() {
        const availableDice = this.diceValues.filter((value, index) => !this.heldDice[index]);
        const score = this.calculateScore(availableDice);
        return score === 0;
    }

    endTurn() {
        if (this.hasRolled && this.checkForBust()) {
            this.turnScore = 0;
        }

        this.resetTurn();
        this.nextPlayer();
    }

    resetTurn() {
        this.diceValues = [1, 1, 1, 1, 1, 1, 1, 1];
        this.heldDice = [false, false, false, false, false, false, false, false];
        this.diceRollGroup = [0, 0, 0, 0, 0, 0, 0, 0];
        this.currentRollGroup = 1;
        this.turnScore = 0;
        this.andRollingBankedScore = 0; // Reset banked "And Rolling" score
        this.hasRolled = false;
    }

    nextPlayer() {
        this.players[this.currentPlayerIndex].isActive = false;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.players[this.currentPlayerIndex].isActive = true;
    }

    mustRollAgain() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        return this.turnScore > 0 && !currentPlayer.hasReachedMinimum &&
               (currentPlayer.score + this.turnScore) < this.minimumBank;
    }

    getGameStatus() {
        return {
            currentPlayer: this.players[this.currentPlayerIndex],
            turnScore: this.turnScore,
            diceValues: [...this.diceValues],
            heldDice: [...this.heldDice],
            hasRolled: this.hasRolled,
            canBank: this.canBankPoints(),
            canAndRoll: this.canAndRoll(),
            mustRoll: this.mustRollAgain(),
            availableDiceToHold: this.getAvailableDiceToHold(),
            gameOver: this.gameOver,
            winner: this.winner
        };
    }

    newGame() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gameState = 'setup';
        this.gameOver = false;
        this.winner = null;
        this.resetTurn();
    }
}
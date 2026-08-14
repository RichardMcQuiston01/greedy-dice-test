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
        this.turnScoreAtLastRoll = 0; // Turn score as it stood after the last roll
        this.gameOver = false;
        this.winner = null;
    }

    setupGame(playerNames, winningScore, minimumBank) {
        const names = Array.isArray(playerNames) ? playerNames.slice(0, 6) : [];
        if (names.length === 0) {
            return false;
        }

        this.players = names.map((name, index) => ({
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
        return true;
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

    /**
     * Rule 6: before rolling again a player must set aside one or more *scoring*
     * dice from the roll they just made. Testing the turn score rather than a
     * count of held dice is what makes that precise - holding one die out of a
     * three-of-a-kind adds nothing, and rolling on would strand the pair in a
     * spent roll group where it can never score.
     */
    canRoll() {
        const availableDice = this.heldDice.filter(held => !held).length;
        if (availableDice === 0) {
            return false;
        }
        if (!this.hasRolled) {
            return true;
        }
        return this.turnScore > this.turnScoreAtLastRoll;
    }

    rollDice() {
        if (!this.canRoll()) {
            return false;
        }

        const availableDice = this.heldDice.map((held, index) => !held ? index : -1).filter(i => i !== -1);

        // If this is not the first roll of the turn and we have held dice, increment roll group
        if (this.hasRolled && this.heldDice.some(held => held)) {
            this.currentRollGroup++;
        }

        availableDice.forEach(index => {
            this.diceValues[index] = Math.floor(Math.random() * 6) + 1;
            this.diceRollGroup[index] = this.currentRollGroup;
        });

        this.hasRolled = true;
        this.turnScoreAtLastRoll = this.turnScore;
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

    /**
     * Faces for which the player has already completed a three-of-a-kind within
     * a single roll. Scoring only awards the set bonus inside one roll group, so
     * this uses the same grouping - otherwise the game would offer holds that
     * can never score.
     */
    getEstablishedTripleFaces() {
        const countsByGroup = {};

        this.diceValues.forEach((value, index) => {
            if (!this.heldDice[index]) return;
            const group = this.diceRollGroup[index];
            if (!countsByGroup[group]) {
                countsByGroup[group] = [0, 0, 0, 0, 0, 0, 0];
            }
            countsByGroup[group][value]++;
        });

        const faces = [];
        Object.keys(countsByGroup).forEach(group => {
            for (let face = 1; face <= 6; face++) {
                if (countsByGroup[group][face] >= 3 && faces.indexOf(face) === -1) {
                    faces.push(face);
                }
            }
        });
        return faces;
    }

    getAvailableDiceToHold() {
        const availableDice = [];

        // Every unheld die came from the same roll, so counting them is the same
        // as counting three-of-a-kinds within the current roll.
        const availableCounts = [0, 0, 0, 0, 0, 0, 0];
        this.diceValues.forEach((value, index) => {
            if (!this.heldDice[index]) {
                availableCounts[value]++;
            }
        });

        const establishedTriples = this.getEstablishedTripleFaces();

        this.diceValues.forEach((value, index) => {
            if (this.heldDice[index]) return;

            const canHold =
                value === 1 || value === 5 ||               // always worth points alone
                availableCounts[value] >= 3 ||              // three of a kind in this roll
                establishedTriples.indexOf(value) !== -1;   // adds 50 to a set already held

            if (canHold) {
                availableDice.push(index);
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
        this.hasRolled = false; // Ready to roll again, so rule 6 restarts
        this.turnScoreAtLastRoll = this.andRollingBankedScore;
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

    /**
     * A roll is a bust when none of the dice still in play may be set aside.
     * Deferring to getAvailableDiceToHold() keeps this in step with the hold
     * rules - scoring a die off a three-of-a-kind already held counts, so
     * rolling a fourth matching die is not a bust.
     */
    checkForBust() {
        const availableDice = this.heldDice.filter(held => !held).length;
        if (availableDice === 0) {
            return false;
        }
        return this.getAvailableDiceToHold().length === 0;
    }

    /**
     * Ends the turn without banking - the turn score is forfeited. Callers are
     * responsible for confirming that with the player; bankPoints() is the path
     * that keeps the points.
     */
    endTurn() {
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
        this.turnScoreAtLastRoll = 0;
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
            canRoll: this.canRoll(),
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
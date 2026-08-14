# greedy-dice-test

**Live demo:** https://greedy-dice-test.vercel.app

## Description

Demo of Application for Windows Store built using HTML5 and JavaScript. It is a
dependency-free static site - no build step, no framework, no package manager -
so it can be opened straight from disk or served by any static host.

## Game Setup

1. Suitable for 1 to 6 Players
2. Players will play up to a certain amount of points, which is 10,000 by default [i.e. Winning Score]
3. Each player is given eight six-sided dice
4. Each player must hit a minimum number of points to start banking points. This is typically 1,000 points but it can vary depending on player choice. [i.e. Minimum Bank]

## Scoring

- Three dice with a face value of 1 is equal to 1,000 points
- Three dice with a face value of 2 to 6 is equal to 100 times the face value(e.g. Three 5's equals 500 points)
- A single die with a face value of 1 is equal to 100 points.
- A single die with a face value of 5 is equal to 50 points.
- If a single die matches a face value of 2, 3, 4, or 6, and you already have three of a kind of that \* face value, then that additional die is worth 50 points.
- Otherwise, a die with 2, 3, 4 or 6 is worth zero points.
- Points are not saved until the player ends their turn. If a player rolls a non-scoring hands, any previously accumulated points in their hand are discarded.

## Gameplay

1. Each player rolls a single die. The player with the highest die goes first. If two or more players roll the same high value, they will roll again until one single player has the highest value. This person is the Starting Player. For each round, the Starting Player marks the start of a given round.
2. The Starting Player must roll all eight of their dice.
3. To continue rolling, a player must have a hand worth more than zero points. [See Scoring section]
4. If a player has a potential score greater than zero and they have already hit their minimum bank, they can stop play.
5. If a player has a potential score greater than zero and they have not hit their minimum bank, they must roll again.
6. Before they can roll again, they must select 1 or more scoring dice to hold, and then they can roll the remaining dice available. If they have more than 1 scoring dice, they can choose any or all of them to hold before rolling again.
7. If a player is already holding seven dice and the eight dice is worth more than zero, they can choose to roll all eight dice again after stating "And Rolling".
8. After a player has struck out (i.e. rolled a non-scoring roll) or chooses to stop, the dice are passed to the next player in a clockwise direction.
9. Play continues until a player reaches the Winning Score.
10. If a Player has achieved the Winning Score, they have won the game.
11. If the other players agree, Players can continue to play until they end of the round (i.e. the player that plays last before it goes back tot he Starting Player)

## Buy Me A Coffee

I developed this while I currently looking for work. If this app has helped you or someone you know, please consider donating via [Stripe](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800). I appreciate it.

This is the same link the floating donate card in the app uses.

## Running locally

There is nothing to install or build. Either open `index.html` directly, or
serve the folder so the web app manifest and icons resolve:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying to Vercel

The repository is linked to a Vercel project that deploys `main` to production.
`vercel.json` pins the build - framework preset **Other**, no build command,
output directory the repository root - along with caching and a couple of
security headers.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the setup, game, and game-over screens |
| `game.js` | Rules engine - scoring, holds, busting, banking, turn order |
| `dice.js` | Dice rendering and roll animation |
| `ui.js` | Screen switching, controls, and scoreboard |
| `qr.js` | Small QR encoder used by the donate card |
| `donate.js` | Floating donate card |
| `manifest.json` | Web app manifest |
| `Package.appxmanifest` | Windows Store packaging (unused by the web build) |
| `tools/make-assets.py` | Regenerates `icons/` and `og-image.png` |

### Assets

The icons and the social preview image are generated rather than hand-drawn, so
they stay in step if the palette changes:

```
pip install pillow
python3 tools/make-assets.py
```

### Donate link

The donate card's URL lives in one place - `DONATE_URL` at the top of
`donate.js`. The QR code is encoded from that value at runtime, so changing the
link is a one-line edit and the QR cannot fall out of sync with it. Update the
two `href` attributes on `#donate-widget` in `index.html` to match, which are
what a visitor gets if scripts are blocked.

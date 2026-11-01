# Greedy Dice

- Author: [Richard McQuiston](mailto:richard.mcquiston@gmail.com)
- Website: https://richardmcquiston.com/
- Demo: https://greedy-dice-test.vercel.app

## Table of Contents

| [Overview](#overview) | [Getting Started](#getting-started) | [Project Layout](#project-layout) | [Buy Me a Coffee](#buy-me-a-coffee) | [License](#license) | [Copyright](#copyright) |

## Overview

Greedy Dice is a push-your-luck dice game for 1 to 6 players. Each player rolls eight six-sided dice, holds the ones that score, and decides when to bank points. A bad roll wipes out the points in your hand.

This demo is a web app built with HTML5 and JavaScript. It has no build step, no framework, and no package manager. It is also packaged for the Windows Store. See [RULES.md](./RULES.md) for the full rules and scoring.

[Back to Top](#table-of-contents)

## Getting Started

### Prerequisites

- A modern web browser.
- Optional: Python 3 to serve the folder locally.

### Installation

There is nothing to install. Clone the repository:

```
git clone https://github.com/RichardMcQuiston01/greedy-dice-test.git
cd greedy-dice-test
```

### Usage

Open `index.html` in a browser, or serve the folder so the manifest and icons load:

```
python3 -m http.server 8000
```

Then visit http://localhost:8000. Pick the number of players, the winning score, and the minimum bank. Enter names and press **Start Game**.

### Examples

The setup screen starts with 2 players, a winning score of 10,000, and a minimum bank of 1,000. Raise the winning score for a longer game, or lower the minimum bank to start banking sooner.

To rebuild the icons and the social preview image:

```
pip install pillow
python3 tools/make-assets.py
```

The site deploys to Vercel as static files. `vercel.json` sets caching and security headers.

[Back to Top](#table-of-contents)

## Project Layout

| File | Purpose |
| --- | --- |
| `index.html` | Markup for the setup, game, and game-over screens |
| `game.js` | Rules engine: scoring, holds, busting, banking, turn order |
| `dice.js` | Dice drawing and roll animation |
| `ui.js` | Screen switching, controls, and scoreboard |
| `qr.js` | Small QR code encoder used by the donate card |
| `donate.js` | Floating donate card |
| `styles.css` | Styles |
| `manifest.json` | Web app manifest |
| `Package.appxmanifest` | Windows Store packaging (not used by the web build) |
| `tools/make-assets.py` | Rebuilds `icons/` and `og-image.png` |

The donate link lives in `DONATE_URL` at the top of `donate.js`. The card builds its QR code from that value when the page loads. The two `href` attributes on `#donate-widget` in `index.html` are the fallback if scripts are blocked. Keep all three the same.

[Back to Top](#table-of-contents)

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via PayPal**](https://www.paypal.com/ncp/payment/SA7A5KFMFCC6S), or scan:

<a href="https://www.paypal.com/ncp/payment/SA7A5KFMFCC6S"><img src="./donate.png" alt="Donate via PayPal" width="180"></a>

[Back to Top](#table-of-contents)

## License

Apache 2

[Back to Top](#table-of-contents)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.

[Back to Top](#table-of-contents)

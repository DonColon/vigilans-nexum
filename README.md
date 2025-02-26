# Vigilans Nexum
[![Node CI Build](https://github.com/doncolon/vigilans-nexum/actions/workflows/ci-build.yml/badge.svg)](https://github.com/DonColon/vigilans-nexum/actions/workflows/ci-build.yml) [![codecov](https://codecov.io/gh/DonColon/vigilans-nexum/graph/badge.svg?token=6TBGMM3XH1)](https://codecov.io/gh/DonColon/vigilans-nexum) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DonColon_vigilans-nexum&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DonColon_vigilans-nexum)

Vigilans Nexum is a tactical, turn- and tile-based RPG with a deep story about trust and the invisible bonds that connects the people on the battlefield. This game is inspired by the by the fire emblem franchise and tries to capture the essence of the fire emblem games with a twist on the gameplay mechanics.

## Project Structure
```
vigilans-nexum
├── src
│   ├── assets
│   │   ├── audio
│   │   ├── fonts
│   │   ├── icons
│   │   ├── images
│   │   ├── javascript
│   │   └── video
│   ├── commands
│   ├── components
│   ├── core
│   ├── states
│   ├── systems
│   ├── utils
│   ├── asset.manifest.ts
│   ├── database.schema.ts
│   ├── game.config.ts
│   ├── game.events.ts
│   ├── index.css
│   ├── index.html
│   ├── index.ts
│   └── manifest.json
├── .gitignore
├── LICENSE
├── package.json
├── README.md
├── rollup.config.js
└── tsconfig.json
```
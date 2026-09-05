# Vigilans Nexum
[![Node CI Build](https://github.com/doncolon/vigilans-nexum/actions/workflows/ci-build.yml/badge.svg)](https://github.com/DonColon/vigilans-nexum/actions/workflows/ci-build.yml) [![codecov](https://codecov.io/gh/DonColon/vigilans-nexum/graph/badge.svg?token=6TBGMM3XH1)](https://codecov.io/gh/DonColon/vigilans-nexum) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DonColon_vigilans-nexum&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DonColon_vigilans-nexum)

Vigilans Nexum is a tactical, turn- and tile-based RPG with a deep story about trust and the invisible bonds that connects the people on the battlefield. This game is inspired by the by the fire emblem franchise and tries to capture the essence of the fire emblem games with a twist on the gameplay mechanics.

## Project Structure
```
vigilans-nexum
├── src
│   ├── assets               # Asset Bundles
│   │   ├── startmenu
│   │   │   ├── audio
│   │   │   ├── video
│   │   │   ├── fonts
│   │   │   ├── icons
│   │   │   ├── images
│   │   │   ├── scripts
│   │   │   └── data
│   │   ├── ...
│   │   └── common
│   │       ├── audio
│   │       ├── video
│   │       ├── fonts
│   │       ├── icons
│   │       ├── images
│   │       ├── scripts
│   │       └── data
│   ├── core                 # Game Framework
│   │   ├── assets
│   │   ├── audio
│   │   ├── database
│   │   ├── ecs
│   │   ├── events
│   │   ├── graphics
│   │   ├── input
│   │   ├── math
│   │   ├── model
│   │   ├── service
│   │   ├── timer
│   │   ├── utils
│   │   ├── Game.ts
│   │   ├── GameError.ts
│   │   └── ...
│   ├── game                 # Game Features and Systems
│   │   ├── battle
│   │   │   ├── systems
│   │   │   ├── components
│   │   │   ├── commands
│   │   │   ├── states
│   │   │   ├── model
│   │   │   └── index.ts
│   │   ├── map
│   │   │   ├── systems
│   │   │   ├── components
│   │   │   ├── commands
│   │   │   ├── states
│   │   │   ├── model
│   │   │   └── index.ts
│   │   ├── units
│   │   ├── bonding
│   │   ├── story
│   │   ├── ui
│   │   ├── progression
│   │   ├── ...
│   │   └── common
│   │       ├── systems
│   │       ├── components
│   │       ├── commands
│   │       ├── states
│   │       ├── model
│   │       └── index.ts
│   ├── asset.manifest.ts    # Asset Manifest for Loading
│   ├── database.schema.ts   # Custom Schemas for IndexDB
│   ├── game.config.ts       # Game Configuration
│   ├── game.events.ts       # Custom Events for Event System
│   ├── index.css
│   ├── index.html
│   ├── index.ts             # Game Initialization and Feature Registration
│   └── manifest.json
├── test
│   ├── core
│   └── ...
├── .gitignore
├── .editorconfig
├── .eslintrc
├── .prettierrc
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── sonar-project.properties
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── vitest.setup.ts
```
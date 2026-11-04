# Sound effect prompts for ElevenLabs

Every sound effect the game needs, one ElevenLabs *Sound Effects* prompt each. Sounds the current build can play today are marked **now**; the rest cover the design document (magic, reactions, chain attacks, beasts, later chapters) so the library is built once, in one style.

## How to use these prompts

1. **Pick one style prefix** (below) and paste it in front of every prompt. Consistency comes from the prefix, not from the individual prompts.
2. Generate **3–4 variations** per prompt, keep the best, and keep a second one for sounds that repeat a lot (cursor, footsteps, hits) so the game can alternate them.
3. Settings: `duration_seconds` as listed, `prompt_influence` **0.4** (raise to 0.6–0.7 when the result drifts away from the description; lower to 0.3 when it sounds too literal or too dry), `loop: true` only where the table says loop.
4. After download: trim leading silence, normalise peaks to −1 dB, keep UI sounds around −18 LUFS and impacts around −14 LUFS so nothing needs re-mixing in code. Export mp3 (44.1 kHz) — or ogg — and name the file as listed under `src/assets/audio/`.

### Style prefix (choose one)

**A – recommended.** Matches the Kenney pixel art without going full chiptune, and sits where GBA/DS Fire Emblem sits:

> Crisp, stylised sound effect for a pixel-art fantasy tactics game, in the spirit of Game Boy Advance Fire Emblem but with modern clarity. Clean, punchy, short tail, no music, no voice, no reverb wash.

**B – pure retro.** If you want the audio as lo-fi as the tiles:

> 16-bit retro video game sound effect, SNES/GBA style synthesis, chiptune character, clean and punchy, no music, no voice.

**C – cinematic.** If the art direction moves towards Three Houses:

> Realistic, cinematic fantasy game sound effect, medieval battlefield, foley quality, tight and punchy, no music, no voice.

Some prompts already carry a material or a texture ("wood", "steel", "wet"); those words are for ElevenLabs to pick the right timbre and work with all three prefixes.

---

## 1. Cursor and menus — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `ui/cursor-move` | Tiny soft tick as a map cursor moves one tile, subtle, very short, pleasant, high-pitched wooden click | 0.5 s | – |
| `ui/cursor-move-fast` | Very short quiet tick for a cursor scrolling rapidly, softer and shorter than a normal cursor tick, no tail | 0.5 s | – |
| `ui/confirm` | Bright positive confirmation blip for selecting a menu entry, two quick rising notes, short | 0.5 s | – |
| `ui/cancel` | Soft descending two-note blip for backing out of a menu, muted, short | 0.5 s | – |
| `ui/menu-open` | Quick light swipe as a small command menu unfolds, a paper-and-parchment slide with a faint tick at the end | 0.6 s | – |
| `ui/menu-close` | Quick reverse swipe as a small menu folds shut, shorter and duller than the opening | 0.5 s | – |
| `ui/invalid` | Short dull double buzz for a forbidden action, low, muted, not harsh | 0.5 s | – |
| `ui/page-turn` | Parchment page flipping once, crisp and quick, for paging between unit sheets | 0.6 s | – |
| `ui/screen-open` | Broad soft whoosh with a subtle chime as a full-screen panel slides in over the battlefield | 0.8 s | – |
| `ui/screen-close` | Soft short whoosh as a full-screen panel slides away | 0.6 s | – |
| `ui/hover-card` | Barely audible soft pop as a small info card appears next to a cursor | 0.4 s | – |
| `ui/toggle` | Small mechanical switch click for toggling an option on or off | 0.4 s | – |
| `ui/slider` | Short soft tick for nudging a slider one step | 0.4 s | – |
| `ui/popup` | Gentle notice chime, one bell-like note with a short shimmer, as a message box pops up | 0.8 s | – |

## 2. Text and conversation — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `text/blip` | Single very short neutral text-reveal blip for a dialogue box, soft, mid-pitched, like a muted typewriter key | 0.3 s | – |
| `text/blip-low` | Single very short low-pitched text-reveal blip for a deep-voiced speaker, soft | 0.3 s | – |
| `text/blip-high` | Single very short high-pitched text-reveal blip for a light-voiced speaker, soft | 0.3 s | – |
| `text/advance` | Quiet soft click as a dialogue box advances to the next line | 0.4 s | – |
| `text/box-open` | Soft quick slide as a dialogue box appears at the bottom of the screen | 0.5 s | – |
| `text/box-close` | Soft quick slide as a dialogue box disappears | 0.5 s | – |
| `text/talk-start` | Warm two-note chime as two characters begin a conversation on the battlefield | 0.8 s | – |

## 3. Turn and phase — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `phase/player` | Heroic short brass swell with a sword-draw shing as the banner "Player Phase" sweeps across the screen, confident, 1.5 seconds | 1.5 s | – |
| `phase/enemy` | Ominous low drum hit with a dark metallic rise as the banner "Enemy Phase" sweeps across the screen, threatening | 1.5 s | – |
| `phase/ally` | Bright friendly swell with a soft bell as the banner "Ally Phase" sweeps across the screen | 1.5 s | – |
| `phase/other` | Neutral wind-like sweep with a muted drum for a neutral faction's phase banner | 1.5 s | – |
| `phase/banner-whoosh` | Fast cloth banner whoosh sweeping left to right across the screen, no tone | 0.8 s | – |
| `turn/start` | Short crisp chime as a new turn counter appears, one note with a light echo | 0.8 s | – |
| `turn/end` | Soft descending confirmation as the player ends the turn, calm | 0.7 s | – |
| `turn/warning` | Tense ticking clock sting, three ticks and a low tone, for a turn limit running out | 1.5 s | – |

## 4. Selecting and moving units — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `unit/select` | Short bright pick-up blip as a unit is selected on the map, upward, snappy | 0.5 s | – |
| `unit/range-reveal` | Quick soft ripple of blue tiles spreading outward across a grid, a fast rising shimmer, short | 0.8 s | – |
| `unit/place` | Firm soft thud as a unit settles on its destination tile, wooden token on a board | 0.5 s | – |
| `unit/wait` | Quiet muted click as a unit finishes its action and greys out | 0.4 s | – |
| `unit/return` | Quick reversed whoosh as a unit snaps back to where it started | 0.5 s | – |
| `step/grass` | Two quick footsteps on grass, light leather boots, seamless loop for a walking sprite | 0.6 s | loop |
| `step/forest` | Two quick footsteps through undergrowth and leaves, twigs snapping, seamless loop | 0.6 s | loop |
| `step/mountain` | Two quick footsteps on loose rock and gravel, seamless loop | 0.6 s | loop |
| `step/water` | Two quick splashing footsteps through shallow water, seamless loop | 0.6 s | loop |
| `step/stone` | Two quick footsteps on stone flagstones, inside a fortress, seamless loop | 0.6 s | loop |
| `step/sand` | Two quick soft footsteps on sand, seamless loop | 0.6 s | loop |
| `step/wood` | Two quick footsteps on wooden planks, a ship's deck, seamless loop | 0.6 s | loop |
| `step/armor` | Two quick heavy footsteps with clinking plate armor, seamless loop | 0.7 s | loop |
| `step/hooves` | Horse trotting, four quick hoofbeats on soft ground with a light harness jingle, seamless loop | 0.8 s | loop |
| `step/wings` | Two slow powerful wingbeats of a large bird carrying a rider, seamless loop | 1.0 s | loop |
| `step/wyvern` | Two heavy leathery wingbeats of a dragon-like creature, seamless loop | 1.0 s | loop |
| `step/beast` | Four quick padded paws of a large wolf-like beast running on earth, seamless loop | 0.7 s | loop |

## 5. Positional abilities and the Nexus — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `position/shove` | Short push impact, a body shoved one tile with a quick slide and thump, no voice | 0.6 s | – |
| `position/swap` | Two quick opposite whooshes crossing each other as two units trade places | 0.7 s | – |
| `position/knockback` | Heavy strike knocking a target backwards, a whoosh and a skidding thud | 0.8 s | – |
| `position/draw` | Quick pull with a whoosh ending in a soft stop, a unit dragged one tile towards another | 0.6 s | – |
| `position/pull-mystic` | Magical tether snapping taut then pulling, a glassy chime with a whoosh that ends in a soft thud | 0.9 s | – |
| `nexus/exchange` | Signature ability sound: two glowing threads of light intertwine and swap places, a warm rising and falling chime with a soft magical whoosh, hopeful and intimate, not flashy | 1.2 s | – |

## 6. Combat: weapons — **now**

One swing sound per weapon type; the hit and miss sounds in section 7 are layered on top.

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `weapon/sword` | Fast steel sword slash, a sharp metallic swing with a bright edge, short | 0.6 s | – |
| `weapon/lance` | Quick lance thrust, a whistling pointed jab with a short wooden shaft creak | 0.6 s | – |
| `weapon/axe` | Heavy axe chop swung with both hands, a deep whoosh with weight behind it | 0.7 s | – |
| `weapon/knife` | Quick knife stab, a tiny sharp metallic flick, very short | 0.4 s | – |
| `weapon/gauntlet` | Fast armored fist punch, leather and steel, a snappy heavy jab | 0.5 s | – |
| `weapon/battle-staff` | Quarterstaff strike, a wooden shaft whistling through the air and cracking | 0.6 s | – |
| `weapon/chain` | Length of iron chain whipped through the air, rattling links then a snap | 0.8 s | – |
| `weapon/bow` | Bowstring released, a taut twang and the whistle of an arrow leaving | 0.6 s | – |
| `weapon/arrow-hit` | Arrow striking a target, a sharp thunk with a short shaft quiver | 0.5 s | – |
| `weapon/cannon-fire` | Medieval cannon firing, a deep boom with a burst of black powder, tight and punchy, short tail | 1.2 s | – |
| `weapon/cannon-hit` | Cannonball impact on earth, a heavy crunching thud with scattering debris, short | 0.9 s | – |
| `weapon/mortar-fire` | Siege mortar launching, a hollow deep thump followed by a rising whistle | 1.2 s | – |
| `weapon/equip` | Weapon drawn and readied, a short steel slide with a click | 0.6 s | – |
| `weapon/break` | Weapon shattering, a metallic crack and pieces falling, followed by a short sad descending tone | 1.2 s | – |

## 7. Combat: results — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `hit/normal` | Blade hitting a body, a solid meaty impact with a short cloth rustle | 0.5 s | – |
| `hit/armor` | Weapon clanging against plate armor, a bright metallic impact | 0.5 s | – |
| `hit/critical` | Devastating critical hit, a heavy impact with a sharp glass-like shatter and a short high ring, dramatic | 0.9 s | – |
| `hit/effective` | Weapon striking a weak point, an impact with a piercing bright flash tone | 0.7 s | – |
| `hit/miss` | Weapon swinging through empty air, a clean whoosh with no impact | 0.5 s | – |
| `hit/block` | Shield block, a dull wooden-and-iron thud | 0.5 s | – |
| `combat/start` | Short tense sting as two units square off, a low drum and a rising string swell, one second | 1.0 s | – |
| `combat/forecast-open` | Parchment scroll unrolling quickly with a small tick, battle forecast appearing | 0.7 s | – |
| `combat/advantage` | Quick upward bright double note when a weapon has the advantage in the forecast | 0.5 s | – |
| `combat/disadvantage` | Quick downward muted double note when a weapon is at a disadvantage in the forecast | 0.5 s | – |
| `combat/double` | Two rapid consecutive whooshes, a follow-up attack cue, short | 0.6 s | – |
| `combat/chain-cue` | Sharp attention chime as adjacent allies ready a chain attack, a rising three-note trill | 0.7 s | – |
| `combat/chain-strike` | Several allies striking in rapid sequence, three overlapping quick impacts ending in a shield shattering | 1.2 s | – |
| `combat/shield-crack` | Magical shield cracking once, a glassy crack with a short hum | 0.6 s | – |
| `combat/shield-break` | Magical shield shattering completely, glass bursting outward with a low thump | 0.9 s | – |
| `hp/drain` | Rapid descending tick-tick-tick as a health bar drains, short, mechanical, seamless loop | 0.5 s | loop |
| `hp/gain` | Rapid rising soft ticks as a health bar refills, seamless loop | 0.5 s | loop |
| `unit/defeated` | A unit falling in battle, a heavy collapse and a slow fading descending tone, sorrowful, no scream | 1.5 s | – |
| `unit/death-sting` | Short mournful musical sting, a low string chord fading, for a permanent death | 2.5 s | – |
| `unit/retreat` | Quick fading whoosh as a defeated unit retreats from the battlefield in casual mode | 0.8 s | – |

## 8. Experience and growth — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `exp/fill` | Experience bar filling, a rising smooth sweep of quick ticks, seamless loop | 0.8 s | loop |
| `exp/level-up` | Triumphant short level-up fanfare, four ascending bright notes with a sparkle, one and a half seconds | 1.5 s | – |
| `exp/stat-up` | Small bright pop with a rising tick as a stat increases on a level-up screen | 0.4 s | – |
| `exp/stat-none` | Tiny flat muted tick for a stat that did not increase | 0.3 s | – |
| `exp/promote` | Grand class promotion fanfare, a bright brass and choir rise with a shining chime, three seconds | 3.0 s | – |
| `exp/rank-up` | Weapon rank rising, a short metallic shing with a bright note | 0.8 s | – |
| `exp/ability-learned` | New ability learned, a curious rising chime with a page-turn | 1.0 s | – |
| `bond/rank-up` | Support rank rising between two characters, a warm two-voice chime intertwining, tender | 1.5 s | – |
| `bond/adjacent` | Very soft warm hum as two bonded allies stand next to each other, subtle | 0.6 s | – |

## 9. Staves and support magic — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `staff/cast` | Healing staff raised, a soft magical hum swelling with a gentle bell | 0.8 s | – |
| `staff/heal` | Healing light showering an ally, a warm sparkling shimmer that resolves into a soft chime | 1.2 s | – |
| `staff/physic` | Distant healing spell arcing across the battlefield, a soft whoosh of light landing in a shimmer | 1.2 s | – |
| `staff/restore` | Status ailment cleansed, a bright clean sweep like a bell being wiped clean | 1.0 s | – |
| `staff/rescue` | Rescue spell warping an ally, a light suction whoosh, a pause, and a soft reappearance pop | 1.2 s | – |
| `staff/buff` | Protective blessing applied, a soft golden chime with a brief rising shield hum | 1.0 s | – |
| `staff/debuff` | Weakening hex applied, a dull descending tone with a faint hiss | 1.0 s | – |

## 10. Natura magic — design doc (Magic-System.md)

One cast and one impact per element. Casts are the tome opening plus the element gathering; impacts are the element striking the target.

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `magic/tome-open` | Heavy spellbook opening with a quick page flutter and a faint magical hum | 0.7 s | – |
| `magic/pyro-cast` | Fire spell charging, a whoosh of flames gathering with a rising crackle | 0.9 s | – |
| `magic/pyro-hit` | Fireball bursting on impact, a fiery explosion with crackling embers, short | 0.9 s | – |
| `magic/aero-cast` | Wind spell gathering, a swirling gust building with a high whistle | 0.9 s | – |
| `magic/aero-hit` | Blade of wind slicing the target, a sharp cutting gust with a snap | 0.8 s | – |
| `magic/electro-cast` | Lightning spell charging, a crackling electric buildup with a rising hum | 0.9 s | – |
| `magic/electro-hit` | Lightning bolt striking, a sharp crack with a sizzling electric tail | 0.9 s | – |
| `magic/hydro-cast` | Water spell gathering, a bubbling swirl of water rising | 0.9 s | – |
| `magic/hydro-hit` | Wave of water crashing onto the target, a heavy splash with a wet slap | 0.9 s | – |
| `magic/cryo-cast` | Ice spell forming, crystalline crackle with a cold shimmering rise | 0.9 s | – |
| `magic/cryo-hit` | Ice shards shattering on impact, a sharp frosty crack with tinkling fragments | 0.9 s | – |
| `magic/geo-cast` | Earth spell gathering, a low rumble with grinding stone | 0.9 s | – |
| `magic/geo-hit` | Boulder slamming into the target, a deep crunching stone impact | 0.9 s | – |
| `magic/dendro-cast` | Nature spell gathering, rustling leaves and creaking growing vines with a soft green hum | 0.9 s | – |
| `magic/dendro-hit` | Thorny vines lashing the target, a whipping crack with snapping branches | 0.9 s | – |
| `magic/lux-cast` | Light magic charging, a pure rising choir-like tone with a bright shimmer | 1.0 s | – |
| `magic/lux-hit` | Pillar of holy light striking, a radiant bright burst with a ringing tail | 1.0 s | – |
| `magic/umbra-cast` | Dark magic charging, a low reversed whisper with a growing sinister hum | 1.0 s | – |
| `magic/umbra-hit` | Shadow magic engulfing the target, a muffled dark implosion with a hissing tail | 1.0 s | – |
| `magic/element-applied` | Small elemental status tag applied to a unit, a short soft glassy tick | 0.4 s | – |

## 11. Elemental reactions — design doc (Elemental-Reactions.md)

Generate the named reactions; the *template* at the end covers any reaction not listed.

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `reaction/vaporize` | Water flash-boiling into steam, a sharp hiss with a puff of pressure | 0.9 s | – |
| `reaction/melt` | Ice melting explosively under fire, a crack of ice followed by a rushing hiss | 1.0 s | – |
| `reaction/burn` | Plants catching fire, a whoomp of ignition then crackling flames | 1.0 s | – |
| `reaction/shock-charge` | Electricity arcing through water, a crackling buzz spreading outward | 1.0 s | – |
| `reaction/freeze` | Water instantly freezing solid, a fast crystalline crackle locking into a deep thud | 1.0 s | – |
| `reaction/shock-frost` | Lightning striking ice, a sharp electric crack with shattering icy tinkles | 0.9 s | – |
| `reaction/overgrow` | Electrically charged plants bursting, a crackling buzz ending in a leafy pop | 1.0 s | – |
| `reaction/swirl` | Element spreading on the wind, a wide swirling gust that scatters | 1.0 s | – |
| `reaction/crystallize` | Elemental shield crystallising around a unit, a glassy forming chime that locks with a click | 1.0 s | – |
| `reaction/snow-shove` | Blast of icy wind hurling a target backwards, a gust with a sliding skid | 1.0 s | – |
| `reaction/mud` | Ground turning to thick mud, a wet squelching slurp | 1.0 s | – |
| `reaction/sandstorm` | Sandstorm whipping up around a tile, a gritty howling swirl, short | 1.2 s | – |
| `reaction/chain-frost` | Lightning jumping between frozen targets, three quick electric cracks in sequence | 1.0 s | – |
| `reaction/vine-net` | Vines snapping around a target and binding it, a quick creaking wrap with a tight snap | 0.9 s | – |
| `reaction/sunfire` | Holy light igniting a firestorm, a bright burst followed by a roaring flare | 1.2 s | – |
| `reaction/rainbow` | Light refracting through water, a shimmering glassy chime that dazzles | 1.0 s | – |
| `reaction/light-crystal` | Light frozen into ice crystals, a bright crystalline shield forming with a chime | 1.0 s | – |
| `reaction/ray-shock` | Laser-like beam of light and lightning piercing through, a sharp high-energy zap | 0.9 s | – |
| `reaction/blinding-vortex` | Blinding whirlwind of light, a bright swirling flash | 1.0 s | – |
| `reaction/light-pillar` | Pillars of light rising from stone, a low rumble with a radiant ascending tone | 1.2 s | – |
| `reaction/holy-bloom` | Glowing flowers blooming and healing, a soft blossoming shimmer with a warm chime | 1.2 s | – |
| `reaction/shadow-burn` | Dark fire smouldering, a low crackle with a sinister hiss | 1.0 s | – |
| `reaction/dark-flood` | Dark water surging, a heavy muffled wave with a low groan | 1.0 s | – |
| `reaction/grave-frost` | Dark ice creeping, a slow ominous crackle with a deep hum | 1.0 s | – |
| `reaction/shadow-charge` | Chain lightning made of darkness, muffled electric cracks in sequence with a low drone | 1.0 s | – |
| `reaction/nightmare-storm` | Wind carrying darkness, a howling gust with whispering voices and a panic sting | 1.2 s | – |
| `reaction/shadow-monolith` | Dark stone pillar rising and cursing, a grinding rumble with a low ominous tone | 1.2 s | – |
| `reaction/soul-eater` | Life force being drained, a reversed sucking whoosh with a faint heartbeat | 1.0 s | – |
| `reaction/dissolution` | Light and darkness annihilating each other, a silent pause then a massive bright-and-dark burst | 1.5 s | – |
| `reaction/three-element` | Massive triple-element reaction, a building rumble that erupts into a layered explosion, dramatic, two seconds | 2.0 s | – |
| *template* | *[element one] and [element two] reacting, [physical description], [one-word mood], short* | 1.0 s | – |

### Field effects (terrain changed by magic)

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `field/burning` | Small patch of ground burning, steady crackling flames, seamless loop | 2.0 s | loop |
| `field/flooded` | Shallow flood water lapping on a field, gentle sloshing, seamless loop | 2.0 s | loop |
| `field/frozen` | Thin ice creaking under weight, occasional crack, seamless loop | 2.0 s | loop |
| `field/ice-break` | Ice sheet breaking and plunging into water, a crack and a splash | 1.0 s | – |
| `field/electrified` | Electricity buzzing over water, a continuous crackling hum, seamless loop | 2.0 s | loop |
| `field/stone-rise` | Stone pillars thrusting up from the ground, a rumble ending in a grinding stop | 1.2 s | – |
| `field/shadow` | Dark shadow field humming, a low ominous drone, seamless loop | 2.0 s | loop |
| `field/light` | Light field glowing, a soft warm choir-like hum, seamless loop | 2.0 s | loop |
| `field/storm` | Storm field with gusting wind on one tile, seamless loop | 2.0 s | loop |
| `field/crystal` | Crystal field resonating, a glassy sustained shimmer, seamless loop | 2.0 s | loop |
| `field/bloom` | Blossom field, soft rustling petals with a faint healing chime, seamless loop | 2.0 s | loop |

## 12. Combat arts, abilities and the beast — design doc

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `art/activate` | Combat art activating, a sharp focused whoosh with a bright metallic flash tone | 0.7 s | – |
| `art/mp-spend` | Mana points spent, a soft descending glassy drip | 0.5 s | – |
| `art/mp-regen` | Mana regenerating at the start of a turn, a soft ascending glassy trickle | 0.6 s | – |
| `ability/trigger` | Passive ability triggering, a quick bright glint with a subtle chime | 0.5 s | – |
| `ability/canto` | Mounted unit continuing to move after acting, a short hoofbeat flourish with a rising note | 0.7 s | – |
| `bio/peak` | Biorhythm rising to its peak, a bright pulsing heartbeat that resolves in a chime | 1.0 s | – |
| `bio/low` | Biorhythm sinking to its low, a slow dull heartbeat fading | 1.0 s | – |
| `beast/call` | Summoner's beast call, a short horn note answered by a distant wolf howl | 1.5 s | – |
| `beast/appear` | Large beast bursting onto the battlefield, a rumble of paws and a fierce growl | 1.2 s | – |
| `beast/growl` | Large wolf-like beast growling once, low and menacing | 0.8 s | – |
| `beast/bite` | Beast biting and tearing, a snarling snap with a crunch | 0.7 s | – |
| `beast/dismiss` | Beast dismissed, a soft whoosh dissolving into wind with a fading whimper | 1.2 s | – |
| `beast/wild-howl` | Wild beast howling in the distance, long and eerie | 2.5 s | – |

## 13. Items, trade and the convoy — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `item/use` | Drinking a potion, a quick gulp and a satisfied cork pop with a soft sparkle | 0.9 s | – |
| `item/get` | Item obtained, a bright short jingle of two rising notes with a sparkle | 0.9 s | – |
| `item/get-rare` | Rare item obtained, a longer glittering fanfare, three rising notes with a shimmer | 1.5 s | – |
| `item/gold` | Coins clinking into a purse, a bright metallic jingle | 0.8 s | – |
| `item/equip-weapon` | Weapon equipped, a firm steel slide and click | 0.5 s | – |
| `item/equip-accessory` | Accessory equipped, a small clasp clicking shut with a soft chime | 0.5 s | – |
| `item/discard` | Item dropped on the ground, a dull small thud | 0.5 s | – |
| `trade/swap` | Two items exchanged between packs, a quick double swipe of leather bags | 0.6 s | – |
| `trade/open` | Two backpacks opened side by side, leather flaps and a buckle | 0.7 s | – |
| `convoy/send` | Item sent to the supply wagon, a whoosh ending in a wooden crate thump | 0.8 s | – |
| `convoy/take` | Item taken from the supply wagon, a wooden crate lid and a quick whoosh | 0.8 s | – |
| `convoy/open` | Supply wagon canvas flap pulled aside with a wooden creak | 0.8 s | – |
| `item/repair` | Weapon repaired at a forge, a quick hammer on anvil with a hiss of quenching | 1.2 s | – |
| `shop/buy` | Purchase completed, coins on a wooden counter with a small bell | 0.9 s | – |
| `shop/sell` | Item sold, a bag drop on a counter and coins sliding back | 0.9 s | – |
| `shop/enter` | Shop entered, a wooden door with a small bell above it | 1.0 s | – |

## 14. Doors, chests, houses and villages — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `lock/unlock` | Key turning in an old iron lock, a rattle and a heavy click | 0.8 s | – |
| `lock/door-open` | Heavy wooden door swinging open with a long creak | 1.2 s | – |
| `lock/door-locked` | Door handle rattled against a lock that will not open, short | 0.6 s | – |
| `lock/chest-open` | Treasure chest lid opening, a wooden creak with an iron hinge and a soft glitter | 1.2 s | – |
| `lock/pick` | Lockpick working inside a lock, fine metallic scraping and a click | 1.0 s | – |
| `lock/key-break` | Key snapping inside a lock, a small metallic crack | 0.6 s | – |
| `visit/knock` | Three knocks on a wooden cottage door | 0.9 s | – |
| `visit/door` | Cottage door opening, a light wooden creak with a latch | 0.9 s | – |
| `visit/gift` | Villager handing over a gift, a soft cloth rustle ending in a warm chime | 1.0 s | – |
| `visit/village-saved` | Village protected, a small cheerful jingle with a distant church bell | 1.5 s | – |
| `visit/village-burned` | Village destroyed, a crackling fire with a collapsing beam and a sad low tone | 2.0 s | – |
| `seize/throne` | Throne seized, a heavy stone step and a regal short brass chord | 1.5 s | – |
| `seize/gate` | Gate captured, an iron portcullis raising with a chain rattle | 1.5 s | – |

## 15. Objectives, bosses and outcomes — **now**

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `objective/victory` | Short victory fanfare, a bright triumphant brass flourish with a drum roll, three seconds | 3.0 s | – |
| `objective/defeat` | Defeat sting, a heavy dark chord falling into silence, three seconds | 3.0 s | – |
| `objective/complete` | Objective completed, a crisp confirmation chime with a short drum hit | 1.0 s | – |
| `objective/new` | New objective revealed, a scroll unrolling with an attention chime | 1.0 s | – |
| `objective/fail-warning` | Warning that an objective is about to fail, a tense low pulse with a sharp tick | 1.0 s | – |
| `boss/appear` | Boss revealed, a deep war drum hit with a dark rising brass sting | 1.5 s | – |
| `boss/defeated` | Boss defeated, a heavy fall followed by a short triumphant sting | 2.0 s | – |
| `boss/enrage` | Boss entering a stronger phase, a growling low roar with a metallic rise | 1.5 s | – |
| `reinforce/arrive` | Enemy reinforcements arriving, a distant war horn and marching drums, short | 1.5 s | – |
| `reinforce/ally` | Allied reinforcements arriving, a bright horn call with hoofbeats | 1.5 s | – |
| `recruit/join` | Character joining the army, a warm hopeful short fanfare with a rising string | 2.0 s | – |
| `chapter/start` | Chapter title appearing, a quill scratching on parchment then a soft resonant gong | 2.5 s | – |
| `chapter/end` | Chapter ending, a book closing with a soft final chord | 2.0 s | – |
| `save/write` | Game saved, a small quill scratch and a soft ink-well tap with a chime | 1.0 s | – |
| `save/load` | Game loaded, a page turn with a soft rising chime | 1.0 s | – |
| `title/start` | Title screen start, a sword drawn from its sheath with a bright ringing note | 1.2 s | – |

## 16. Ambience loops — one per map type

Generate at 10–15 s with loop enabled; the mixer fades between them.

| File | Prompt | Duration | Loop |
|---|---|---|---|
| `ambience/plains` | Open grassland battlefield ambience, light wind through grass, distant birds, calm, seamless loop, no music | 12 s | loop |
| `ambience/forest` | Dense forest ambience, leaves rustling, birdsong, a creaking branch, seamless loop, no music | 12 s | loop |
| `ambience/mountain` | High mountain pass ambience, steady cold wind, a distant hawk, seamless loop, no music | 12 s | loop |
| `ambience/river` | Riverside ambience, flowing water over rocks, light breeze, seamless loop, no music | 12 s | loop |
| `ambience/coast` | Coastal ambience, waves rolling onto a beach, gulls, wind, seamless loop, no music | 12 s | loop |
| `ambience/ship` | Wooden ship deck at sea, creaking timbers, ropes, waves against the hull, seamless loop, no music | 12 s | loop |
| `ambience/castle` | Stone castle interior ambience, hollow echo, a distant torch crackle, faint dripping, seamless loop, no music | 12 s | loop |
| `ambience/dungeon` | Dark dungeon ambience, dripping water, deep stone echo, distant chain rattle, seamless loop, no music | 12 s | loop |
| `ambience/village` | Small medieval village ambience, distant chatter, chickens, a blacksmith hammer far away, seamless loop, no music | 12 s | loop |
| `ambience/village-night` | Village at night, crickets, a soft breeze, a distant dog, seamless loop, no music | 12 s | loop |
| `ambience/rain` | Steady rain on a battlefield with distant thunder, seamless loop, no music | 12 s | loop |
| `ambience/snow` | Snowfield with a cold muffled wind, occasional gust, seamless loop, no music | 12 s | loop |
| `ambience/desert` | Desert ambience, dry hot wind with shifting sand, seamless loop, no music | 12 s | loop |
| `ambience/swamp` | Swamp ambience, frogs, insects buzzing, bubbling mud, seamless loop, no music | 12 s | loop |
| `ambience/battle` | Distant battle ambience, muffled clashing steel and shouting soldiers far away, seamless loop, no music | 12 s | loop |
| `ambience/fire` | Burning village ambience, roaring fire, collapsing timber, crackling, seamless loop, no music | 12 s | loop |
| `ambience/camp` | Army camp at night, campfire crackle, quiet murmurs, a tent flap in the wind, seamless loop, no music | 12 s | loop |
| `ambience/ruins` | Ancient ruins ambience, hollow wind through broken stone, an eerie faint hum, seamless loop, no music | 12 s | loop |
| `weather/thunder` | Single distant thunderclap rolling across a valley | 3.0 s | – |
| `weather/wind-gust` | Single strong wind gust sweeping across an open field | 2.0 s | – |
| `weather/church-bell` | Distant church bell tolling three times | 4.0 s | – |
| `weather/war-horn` | Distant war horn sounding once, long and low | 3.0 s | – |
| `weather/crow` | Single crow cawing twice, close | 1.5 s | – |

---

## Suggested generation order

1. Sections 1–4 and 6–8 (about 90 sounds) — everything the current build can trigger; the audio feature can ship with these.
2. Sections 9, 13–16 — staves, items, locks, houses, objectives, ambience, all of which also exist in the build.
3. Sections 5 and 12 — positional abilities exist today; the Nexus is the signature sound and deserves the most iterations.
4. Sections 10–11 — magic and reactions once the magic feature is being built; the templates cover anything added to the catalog later.

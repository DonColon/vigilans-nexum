/**
 * What the specs fight on. None of this ships: it is seeded by vitest.setup.ts
 * under the same kind of asset ids the game's own content uses, so a spec's
 * cast and tiles stay put however the story's chapters change.
 *
 *  - `spec` is the scenario most specs dispatch `map:ready` with: a small cast
 *    off the short-id sheets, and a house, a door, a chest and conversations.
 *  - `chapter-one` and `chapter-two` are a plain two-chapter campaign, on plain
 *    maps, for the specs that follow a run from battle to battle.
 */

/** An open field of one tile - every spec that needs walls or forest sketches its own grid. */
function openField(columns: number, rows: number) {
	return {
		format: "vigilans-tilemap",
		version: 1,
		columns,
		rows,
		tileWidth: 16,
		tileHeight: 16,
		tileset: "kenney-1bit",
		layers: [{ name: "terrain", tiles: new Array<number>(columns * rows).fill(2) }],
		tileTerrain: { "2": "plain" },
		defaultTerrain: "wall"
	};
}

export const specMap = openField(48, 24);

export const specSmallMap = openField(20, 15);

export const specCampaign = {
	format: "vigilans-campaign",
	version: 1,
	chapters: [
		{ id: "chapter-one", title: { de: "Jedes Ende...", en: "Every End..." }, map: "spec" },
		{ id: "chapter-two", title: { de: "...ist ein neuer Anfang", en: "...Is A New Beginning" }, map: "spec-small" }
	]
};

export const specDeployment = {
	format: "vigilans-deployment",
	version: 1,
	map: "spec",
	objective: {
		win: "seize",
		column: 12,
		row: 5
	},
	units: [
		{
			unit: "dardan",
			column: 4,
			row: 10
		},
		{
			unit: "elira",
			column: 5,
			row: 10
		},
		{
			unit: "teuta",
			column: 5,
			row: 11
		},
		{
			unit: "hasan",
			column: 4,
			row: 14
		},
		{
			unit: "besnik",
			column: 2,
			row: 14
		}
	]
};

export const specHouses = {
	format: "vigilans-houses",
	version: 1,
	houses: [
		{
			id: "smithy",
			column: 18,
			row: 14,
			openDoor: 450,
			reward: "iron-sword",
			pages: [
				{
					speaker: {
						de: "Schmiedin",
						en: "Smith"
					},
					text: {
						de: "Ihr tragt Waffen und kommt trotzdem an meine Tür statt an meine Mauer. Das ist mehr, als die anderen getan haben.",
						en: "You carry weapons and still you come to my door instead of my wall. That is more than the others managed."
					}
				},
				{
					speaker: {
						de: "Schmiedin",
						en: "Smith"
					},
					text: {
						de: "Nehmt die Klinge hier. Sie lag für einen Hauptmann bereit, der die Furt nie erreicht hat.",
						en: "Take this blade. It was laid by for a captain who never reached the ford."
					}
				}
			]
		},
		{
			id: "ford-cottage",
			column: 23,
			row: 12,
			openDoor: 447,
			reward: "concoction",
			pages: [
				{
					speaker: {
						de: "Alte Frau",
						en: "Old Woman"
					},
					text: {
						de: "Von meinem Fenster aus sehe ich die Furt. Seit drei Tagen stehen dort Männer mit Äxten und lassen niemanden hinüber.",
						en: "I can see the ford from my window. For three days now there have been men with axes on it, letting nobody across."
					}
				},
				{
					speaker: {
						de: "Alte Frau",
						en: "Old Woman"
					},
					text: {
						de: "Ich habe keine Waffe für Euch. Aber ich habe einen Trank gebraut, und Ihr werdet ihn nötiger haben als ich.",
						en: "I have no weapon for you. But I brewed a draught, and you will have more need of it than I will."
					}
				}
			]
		},
		{
			id: "millers-house",
			column: 27,
			row: 17,
			openDoor: 447,
			reward: "iron-axe",
			pages: [
				{
					speaker: {
						de: "Müller",
						en: "Miller"
					},
					text: {
						de: "Mein Junge ist mit der Grenzwache fortgezogen und hat seine Axt hiergelassen. Sie hängt seither über dem Herd.",
						en: "My boy went off with the border watch and left his axe behind. It has hung over the hearth ever since."
					}
				},
				{
					speaker: {
						de: "Müller",
						en: "Miller"
					},
					text: {
						de: "Nehmt sie mit. Eine Axt über dem Herd hält niemanden von der Tür fern.",
						en: "Take it with you. An axe over the hearth keeps nobody from the door."
					}
				}
			]
		},
		{
			id: "riverside-hut",
			column: 23,
			row: 21,
			openDoor: 447,
			reward: "elixir",
			pages: [
				{
					speaker: {
						de: "Fährmann",
						en: "Ferryman"
					},
					text: {
						de: "Ich setze über, seit ich laufen kann, und ich habe noch nie so wenig Verkehr gesehen wie in dieser Woche.",
						en: "I have worked this crossing since I could walk, and I have never seen a week as quiet as this one."
					}
				},
				{
					speaker: {
						de: "Fährmann",
						en: "Ferryman"
					},
					text: {
						de: "Wenn Ihr die Furt öffnet, öffnet Ihr auch mein Geschäft. Hier - das habe ich für den schlimmsten Tag aufgehoben.",
						en: "Open the ford and you open my trade with it. Here - I was saving this for the worst day."
					}
				}
			]
		}
	]
};

export const specLocks = {
	format: "vigilans-locks",
	version: 1,
	doors: [
		{
			id: "fort-gate",
			column: 12,
			row: 9,
			openFrame: 551
		}
	],
	chests: [
		{
			id: "fort-chest",
			column: 14,
			row: 4,
			openFrame: 305,
			reward: "energy-drop"
		}
	]
};

export const specConversations = {
	format: "vigilans-conversations",
	version: 1,
	conversations: [
		{
			id: "dardan-elira",
			between: ["dardan", "elira"],
			pages: [
				{
					speaker: "dardan",
					text: {
						de: "Elira. Du hast die Furt im Blick behalten, seit wir das Lager verlassen haben.",
						en: "Elira. You have kept your eyes on the ford ever since we broke camp."
					}
				},
				{
					speaker: "elira",
					text: {
						de: "Jemand muss es tun. Der Fluss ist tief, und es gibt nur einen Übergang. Wer ihn hält, hält das Tal.",
						en: "Someone has to. The river runs deep, and there is only the one crossing. Whoever holds it holds the valley."
					}
				},
				{
					speaker: "dardan",
					text: {
						de: "Dann halten wir ihn gemeinsam. Geh nicht allein vor - deine Axt trifft härter, wenn ich dir den Rücken decke.",
						en: "Then we hold it together. Do not go ahead alone - your axe lands harder when I am covering your back."
					}
				},
				{
					speaker: "elira",
					text: {
						de: "Einverstanden, Kommandant. Aber wenn du fällst, trage ich dich zurück - und du wirst es nie wieder vergessen dürfen.",
						en: "Agreed, commander. But if you fall, I carry you back - and you will never be allowed to forget it."
					}
				}
			]
		},
		{
			id: "elira-hasan",
			between: ["elira", "hasan"],
			pages: [
				{
					speaker: "hasan",
					text: {
						de: "Du trägst die Axt der Grenzwache. Woher hast du sie?",
						en: "That is a border watch axe you are carrying. Where did you come by it?"
					}
				},
				{
					speaker: "elira",
					text: {
						de: "Von meinem Vater. Er stand an dieser Furt, bevor sie euch gehörte.",
						en: "From my father. He stood at this ford before it was yours."
					}
				},
				{
					speaker: "hasan",
					text: {
						de: "Dann wissen wir beide, wie das hier endet. Ich hätte dir lieber ein Feuer angeboten als eine Klinge.",
						en: "Then we both know how this ends. I would rather have offered you a fire than a blade."
					}
				}
			]
		}
	]
};

export const chapterOneDeployment = {
	format: "vigilans-deployment",
	version: 1,
	map: "spec",
	objective: {
		win: "rout"
	},
	capacity: 4,
	slots: [
		{
			column: 5,
			row: 11
		},
		{
			column: 3,
			row: 11
		}
	],
	units: [
		{
			unit: "dardan-niveli",
			column: 4,
			row: 10,
			required: true
		},
		{
			unit: "hasan-eyletmez",
			column: 5,
			row: 10,
			required: true
		},
		{
			unit: "bandit",
			id: "bandit-1",
			column: 4,
			row: 14
		},
		{
			unit: "bandit",
			id: "bandit-2",
			column: 2,
			row: 14
		},
		{
			unit: "ruffian",
			id: "ruffian-1",
			column: 2,
			row: 12
		},
		{
			unit: "poacher",
			id: "poacher-1",
			column: 6,
			row: 13
		}
	]
};

export const chapterOneHouses = {
	format: "vigilans-houses",
	version: 1,
	houses: [
		{
			id: "smithy",
			column: 18,
			row: 14,
			openDoor: 450,
			reward: "iron-sword",
			pages: [
				{
					speaker: {
						de: "Schmiedin",
						en: "Smith"
					},
					text: {
						de: "Ihr tragt Waffen und kommt trotzdem an meine Tür statt an meine Mauer. Das ist mehr, als die anderen getan haben.",
						en: "You carry weapons and still you come to my door instead of my wall. That is more than the others managed."
					}
				},
				{
					speaker: {
						de: "Schmiedin",
						en: "Smith"
					},
					text: {
						de: "Nehmt die Klinge hier. Sie lag für einen Hauptmann bereit, der die Furt nie erreicht hat.",
						en: "Take this blade. It was laid by for a captain who never reached the ford."
					}
				}
			]
		},
		{
			id: "ford-cottage",
			column: 23,
			row: 12,
			openDoor: 447,
			reward: "concoction",
			pages: [
				{
					speaker: {
						de: "Alte Frau",
						en: "Old Woman"
					},
					text: {
						de: "Von meinem Fenster aus sehe ich die Furt. Seit drei Tagen stehen dort Männer mit Äxten und lassen niemanden hinüber.",
						en: "I can see the ford from my window. For three days now there have been men with axes on it, letting nobody across."
					}
				},
				{
					speaker: {
						de: "Alte Frau",
						en: "Old Woman"
					},
					text: {
						de: "Ich habe keine Waffe für Euch. Aber ich habe einen Trank gebraut, und Ihr werdet ihn nötiger haben als ich.",
						en: "I have no weapon for you. But I brewed a draught, and you will have more need of it than I will."
					}
				}
			]
		},
		{
			id: "millers-house",
			column: 27,
			row: 17,
			openDoor: 447,
			reward: "iron-axe",
			pages: [
				{
					speaker: {
						de: "Müller",
						en: "Miller"
					},
					text: {
						de: "Mein Junge ist mit der Grenzwache fortgezogen und hat seine Axt hiergelassen. Sie hängt seither über dem Herd.",
						en: "My boy went off with the border watch and left his axe behind. It has hung over the hearth ever since."
					}
				},
				{
					speaker: {
						de: "Müller",
						en: "Miller"
					},
					text: {
						de: "Nehmt sie mit. Eine Axt über dem Herd hält niemanden von der Tür fern.",
						en: "Take it with you. An axe over the hearth keeps nobody from the door."
					}
				}
			]
		},
		{
			id: "riverside-hut",
			column: 23,
			row: 21,
			openDoor: 447,
			reward: "elixir",
			pages: [
				{
					speaker: {
						de: "Fährmann",
						en: "Ferryman"
					},
					text: {
						de: "Ich setze über, seit ich laufen kann, und ich habe noch nie so wenig Verkehr gesehen wie in dieser Woche.",
						en: "I have worked this crossing since I could walk, and I have never seen a week as quiet as this one."
					}
				},
				{
					speaker: {
						de: "Fährmann",
						en: "Ferryman"
					},
					text: {
						de: "Wenn Ihr die Furt öffnet, öffnet Ihr auch mein Geschäft. Hier - das habe ich für den schlimmsten Tag aufgehoben.",
						en: "Open the ford and you open my trade with it. Here - I was saving this for the worst day."
					}
				}
			]
		}
	]
};

export const chapterOneLocks = {
	format: "vigilans-locks",
	version: 1,
	doors: [
		{
			id: "fort-gate",
			column: 12,
			row: 9,
			openFrame: 551
		}
	],
	chests: [
		{
			id: "fort-chest",
			column: 14,
			row: 4,
			openFrame: 305,
			reward: "energy-drop"
		}
	]
};

export const chapterOneConversations = {
	format: "vigilans-conversations",
	version: 1,
	conversations: [
		{
			id: "dardan-hasan",
			between: ["dardan-niveli", "hasan-eyletmez"],
			pages: [
				{
					speaker: "hasan-eyletmez",
					text: {
						de: "Vier gegen zwei. Ich hab schon schlechtere Quoten gesehen - auf dem Marktplatz, mit einem Deckel als Schild.",
						en: "Four against two. I have seen worse odds - on the market square, with a lid for a shield."
					}
				},
				{
					speaker: "dardan-niveli",
					text: {
						de: "Damals hat niemand geblutet. Bleib in meiner Nähe, Hasan. Wir gehen zusammen durch diese Tür.",
						en: "Nobody bled back then. Stay close, Hasan. We go through this door together."
					}
				},
				{
					speaker: "hasan-eyletmez",
					text: {
						de: "Du zählst die Türen, ich tret sie ein. War schon immer so.",
						en: "You count the doors, I kick them in. Always has been."
					}
				}
			]
		}
	]
};

export const chapterTwoDeployment = {
	format: "vigilans-deployment",
	version: 1,
	map: "spec-small",
	objective: {
		win: "rout"
	},
	capacity: 3,
	slots: [
		{
			column: 2,
			row: 8
		},
		{
			column: 4,
			row: 6
		}
	],
	units: [
		{
			unit: "dardan-niveli",
			column: 3,
			row: 7,
			required: true
		},
		{
			unit: "hasan-eyletmez",
			column: 4,
			row: 8
		},
		{
			unit: "maksimo-auditore",
			column: 3,
			row: 9
		},
		{
			unit: "bandit-chief",
			id: "bandit-chief",
			column: 16,
			row: 4,
			behaviour: "hold"
		},
		{
			unit: "ruffian",
			id: "ruffian-1",
			column: 16,
			row: 5,
			behaviour: "hold"
		},
		{
			unit: "poacher",
			id: "poacher-1",
			column: 14,
			row: 3
		},
		{
			unit: "bandit",
			id: "bandit-1",
			column: 14,
			row: 8
		},
		{
			unit: "bandit",
			id: "bandit-2",
			column: 13,
			row: 6
		},
		{
			unit: "ruffian",
			id: "ruffian-2",
			column: 15,
			row: 10
		}
	]
};

export const chapterTwoHouses = {
	format: "vigilans-houses",
	version: 1,
	houses: []
};

export const chapterTwoLocks = {
	format: "vigilans-locks",
	version: 1,
	doors: [],
	chests: []
};

export const chapterTwoConversations = {
	format: "vigilans-conversations",
	version: 1,
	conversations: [
		{
			id: "dardan-maksimo",
			between: ["dardan-niveli", "maksimo-auditore"],
			pages: [
				{
					speaker: "maksimo-auditore",
					text: {
						de: "Sechs auf der anderen Seite, einer davon im Torhaus. Sie warten darauf, dass wir die Brücke nehmen.",
						en: "Six on the far side, one of them in the gatehouse. They are waiting for us to take the bridge."
					}
				},
				{
					speaker: "dardan-niveli",
					text: {
						de: "Dann nehmen wir sie langsam. Einer nach dem anderen - niemand geht allein hinüber.",
						en: "Then we take it slowly. One at a time - nobody crosses alone."
					}
				}
			]
		}
	]
};

export const specScenarios = {
	spec: { deployment: specDeployment, houses: specHouses, locks: specLocks, conversations: specConversations },
	"chapter-one": { deployment: chapterOneDeployment, houses: chapterOneHouses, locks: chapterOneLocks, conversations: chapterOneConversations },
	"chapter-two": { deployment: chapterTwoDeployment, houses: chapterTwoHouses, locks: chapterTwoLocks, conversations: chapterTwoConversations }
};

---
title: Bukang Run
description: "A three-lane swimming runner made in Unity 6 about Bukang-i, the shark that spent 34 days in a Busan harbor canal in 2026. The real events behind the obstacles, the rules, and how a walking cartoon shark became a swimmer."
outline: deep
---

# Bukang Run

*Unity 6 · WebGL and Android* · [Play in the browser](/arcade/bukang-run)

Bukang Run (Korean title 탈출! 북항이, "Escape! Bukhang-i") is an endless runner where you guide a shark out of a harbor canal and into the open sea. It plays like a classic three-lane runner, except the runner is swimming: you change lanes, jump over nets, dive under them, and pick up ice cream along the way. The whole thing is presented like a live news broadcast, and it runs in English or Korean.

It's an unofficial fan game. It isn't connected to the City of Busan or to anyone involved in the real rescue.

![Three Bukang Run screens: the title screen with a breaking news caption, a run through Busan Port with the score box and the boost button, and the game over screen styled as a newspaper front page](/projects/bukang-run-screens.jpg)
*The title screen, a run through Busan Port, and the game over front page. Every screen can be switched between English and Korean.*

## The real story

On September 18, 2026, a shark about three meters long turned up in the canal of Bukhang Waterfront Park in Busan, South Korea. People online named her Bukang-i (부캉이), after the park. She stayed for 34 days.

Getting her out took several tries. A water pump was used to push her toward the sea and didn't work. A net was put across the canal, and she got back in over it. A long attempt in late October moved her out, and she slipped back in through the net the same night. On October 22 the barrier net was opened and she finally swam out to sea.

Meanwhile the canal turned into a tourist spot. Crowds came to see her, flash photography at night became a problem, and shark-shaped ice cream sold out at nearby stores. Almost every obstacle in the game comes from one of those news stories.

## How to play

| Input | Action |
|---|---|
| Left / Right, A / D, swipe sideways | Change lanes |
| Up, W, Space, swipe up | Jump |
| Down, S, swipe down (hold) | Dive. Uses oxygen |
| Shift, or hold the boost button | 1.4× speed, distance points count double |
| Tap, Space | Start, or start again after a game over |

On a phone, the boost button sits in the bottom right corner. You can hold it with one thumb and keep swiping with the other.

### Obstacles

| Obstacle | How to get past | Appears |
|---|---|---|
| Low net (all lanes) | Jump | From the start |
| Buoy | Change lanes or jump | From the start |
| High barrier net (all lanes) | Dive only | From 120 m |
| Water pump | Change lanes or jump | Barrier net zone |
| Rescue boat | Change lanes only | Barrier net zone |
| Camera flash (one lane) | Dive or change lanes | Busan Port |
| Oil slick (all lanes) | Dive only | Busan Port |

The oil slick is a nod to the oil spill reported near the port the day after she left.

### Sections

The run is split into four stretches by distance. Each one changes the sky, the water color, the walls and the scenery beyond them.

1. **Bukhang Waterfront Park canal** (0 to 500 m): a narrow concrete canal with apartment blocks on both sides.
2. **Barrier net zone** (500 to 1,200 m): pumps and rescue boats join the nets.
3. **Busan Port** (1,200 to 2,500 m): darker water, cranes, camera flashes and oil.
4. **Open sea** (from 2,500 m): bright water, lighthouses and small islands, and the speed keeps climbing to its cap.

![Three sections of the route: the barrier net zone with a rescue boat, Busan Port with cranes, containers and a high net, and the open sea with lighthouses and islands](/projects/bukang-run-sections.jpg)
*The barrier net zone, Busan Port, and the open sea.*

### Scoring

- One point per meter. While boosting, each meter counts twice.
- Each ice cream is worth 20 points, and getting past a net adds 5.
- Speed starts at 11 m/s and rises by 0.95 m/s every 100 m, up to 36 m/s, which it reaches at about 2.6 km.
- Your best score is kept on your own device. Nothing is sent to a leaderboard.

## How it was built

### A walking shark that has to swim

The character is a cute cartoon shark from Fab that stands on two legs and came with a single walk cycle. A runner on land would have used that animation as it was, but a shark running down a road didn't fit the story. A fully underwater game would have needed new swimming animation and much harder collision.

The middle option worked: the shark swims at the surface with the water cut off at her waist by an opaque water plane. Only the upper body shows, and the arm swing from the walk cycle reads as a doggy paddle. Jumping and diving are a vertical offset plus a bit of tilt, so the existing animation covers everything.

### The scene is generated from code

Every material, prefab, the UI and the scene itself are built by one editor script. A menu command (or a batch-mode call) deletes the generated folders and builds them again from scratch. Nothing is placed by hand in the editor, so a change is always a code change that can be reviewed and reverted, and a WebGL or Android build can run from the command line without opening the editor.

### Details

- **Collision without physics.** Obstacles and pickups keep themselves in a static list. Each frame the player checks the ones close in depth and in the same lane, and each obstacle type defines which actions get past it.
- **Toon shading.** Every opaque material uses one custom shader: lighting is cut into three flat bands with a soft edge, a thin rim light catches the silhouette, and a second pass draws an outline by pushing the mesh out along its normals. Big flat surfaces (water, walls) skip the outline, and distant buildings get a thicker one so it still reads at range. The sun was turned to shine from the side, because light from behind the camera left almost no shadow band to see.
- **The shark's outline was already in the model.** The body mesh carries a slightly larger shell with its normals facing inward, the classic inverted-hull outline from Blender. An earlier version pushed that shell out along its normals as well, which pushed it inward instead, and it poked through the body as black smudges on the face and back. Now the shell is simply painted the outline color and the extra pass is skipped for the shark.
- **An opening mouth with no mouth bone.** The rig has no jaw bone, and the mouth meshes are skinned completely to the body. The build script bakes them into plain meshes under a pivot at the center of the mouth, and the game scales that pivot to open the mouth when the shark gets hit.
- **No audio files.** Every sound, from the water loop to the splash and the hit, is synthesized when the game starts.
- **Object pooling.** Obstacles, pickups and scenery are reused instead of created and destroyed, which keeps garbage collection pauses out of a long run.
- **Two languages, one font atlas.** All text lives in one table with a Korean and an English column. The game starts in the device or browser language and remembers the choice from the title screen button. Shipping a full Korean font would add megabytes, so only the characters the game uses are baked into a font atlas. That rules out automatic text fitting, so each label has its own size factor for English, which runs longer.
- **News broadcast UI.** The title is a live news caption, each new section arrives as a breaking news banner, and the game over screen is the front page of a special edition, with a headline and a short story that depend on what stopped the shark. A record score gets a red stamp.

The web build is about 9 MB and loads on phones and desktops. It's compressed with a fallback that decompresses in the browser, so it runs on a static host without any server configuration. An Android version is in testing.

## Credits

- Shark character: "Cute Shark Animated Character" from Fab.
- Fonts: Black Han Sans (Zess Type) and Noto Sans KR, both under the SIL Open Font License.
- Game design, code and build pipeline: DevCol.

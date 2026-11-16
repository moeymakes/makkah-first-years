# Makkah, First Years: build notes

Built with the `worldsmith` skill (`/home/moey/.shared/skills/worldsmith`), starting from the source of
`/home/moey/Dev/projects/makkah-jabal-al-nour` (copied, never edited there), which itself came from madinah-horizon.
Brief: `prompt.txt`. Set after the conquest (630-632 CE), so there are no idols anywhere.

## State (update after every step)

- Phase: DONE for review (2026-11-16). Not published: no GitHub repo, no push. Moey reviews first.
- Critic iterations: iter-04, 06, 08, 10, 11 (5 of 5, stopping rule reached). Final verdict: verify/iter-11/critic.md,
  highest severity "major" (slope texture moire, dune-like mountains, plaster blotches, town layout from above, the
  Kaaba's cloth up close, ground tiling, window boxes). Not passed; stopped by the iteration cap.
- After the last critic: the Kaaba's door recess was moved from the night-glow material to the unlit one (it lit up
  at night). Checked at night afterwards; not re-reviewed by a critic.
- Minified index.html: 0 console errors at High, Low (makkahFY=2) and each Time (makkahFYTime=0/1/2): verify/final-*.
- Perf (verify/iter-11, dev.html, 2560x1440, 60 s flight, RTX 3070 shared with other worlds): GPU avg 5.94 ms,
  p99 9.07, max 9.28. Load to menu 2.5-5 s.
- Deliverables: index.html (~90 KB, ~36 KB gzipped), perf.txt, README.md with screenshots, prompt.txt, LICENSE.

## What is reasonably known, and what is a guess

| Element | Sources say | Here | Status |
|---|---|---|---|
| The Kaaba after Quraysh's rebuilding (about 605 CE) | about 18 cubits (8.6 m) high; funds ran short so about 3 m on the north-west side (the Hijr / Hatim) was left outside, marked by a low semicircular wall; the east door raised well above the ground, the western one closed; a roof and a water spout (mizab) | 8.6 m high, footprint 10.2 x 11.6 m, the Hijr side to the north-west with a low curved wall, the door on the north-east face near the east corner raised about 2 m, a wooden spout on the north-west roof edge | height, door, Hijr known; exact footprint, door size, spout form are guesses |
| Its walls | commonly reported as courses of stone with timber (from a wrecked ship) | not visible: covered by the cloth above a stone base course | the base course shown is a guess |
| The covering (kiswah) | coverings of various cloths are reported for this period (including Yemeni cloth); black became the norm later | plain dark cloth, no band, no writing, soft folds, a plain hem | per the brief; colour and hem are informed guesses |
| Around the Kaaba | open ground with houses around it; the first enclosing wall was built later under Umar (about 638 CE) | an open sandy space about 50 m across, houses beyond | known in outline; the size of the open space is a guess |
| Zamzam | a well near the Kaaba, about 20 m to the east | a stone-ringed well 19 m east-south-east with a wooden frame, rope, bucket and a stone trough | position known; the well head's form is a guess |
| Safa and Marwa | low hills; Safa about 130 m south-east of the Kaaba; about 450 m between them | rocky rises 13-14 m high, Safa 140 m south-east, Marwa about 280 m from Safa to the north-north-east, an open earthen way between | positions approximate, distance compressed |
| Abu Qubays | the mountain east of the Haram, Safa at its foot | a broad peak about 125 m high, 530 m east | composed |
| Houses | stone and mud brick, flat roofs | rough granite or mud brick, parapets, roof timbers, small high windows, some roof rooms and walled yards | guess within the known materials |
| Trees | dry valley, few trees | a few acacias on the edges | guess |
| Jabal al-Nour | 4-5 km north-east | 3.4 km north-east, same mountain as the sibling world | composed |

Sources checked 2026-11-16:
- Islamic Landmarks, the Kaaba (islamiclandmarks.com/?p=739): Quraysh rebuilding about 605 CE, height about 8.64 m,
  about 3 m left outside marked by a low semicircular wall, east door raised, west door sealed, roof and spout.
- Wikishia, Al-Ka'ba and Holy Ka'ba (en.wikishia.net): the Hatim left outside for lack of materials; the Hijr between
  the Kaaba and a semicircular wall on the north side.
- Seerah timeline, rebuilding of the Kaaba (seerah-7u9.pages.dev/events/rebuilding-kaaba), citing Ibn Hisham: loose
  stones above a man's height before the rebuilding.
- Wikipedia, Safa and Marwa: Safa about 130 m south-east of the Kaaba; travel guides give about 450 m between them.
- Wikipedia, Zamzam Well (from memory, not re-fetched this session): about 20 m east of the Kaaba. Unverified here.
- Wikipedia, Great Mosque of Mecca (from memory, not re-fetched): Umar's wall around the open space about 638 CE.
  Unverified here.

## Geography (composed, not to scale)

Axes: +x east, -z north, y up, metres. The Kaaba at the origin, turned 135 degrees so its corners point roughly to
the compass points. Valleys drawn as segments (VALLEYS in shaders.js); houses fill the valley floors to about 1.7 km.

## Six poses (keys 1-6)

1. In the open space north-east of the Kaaba, facing its door.
2. On the rocks of Safa, looking north-west over the roofs to the Kaaba.
3. At the foot of Safa, looking along the open way toward Marwa.
4. Beside Zamzam, the Kaaba beyond.
5. In a lane east-north-east of the Kaaba, looking down it to the Kaaba.
6. Flight: south-west of the town, looking north-east over it.

## Time presets (localStorage makkahFYTime, default Dawn)

Dawn here is about an hour after sunrise (sun 16 deg up from bearing 102): with Abu Qubays and the ranges east of
the valley, a lower sun leaves the whole town in shadow. Night: moon, stars, warm lamp and fire glows from about one
door in eight near the Kaaba and a few in the far town; no electric light anywhere.

## Critic intent paragraph

Makkah around 630-632 CE, an artistic reconstruction, in the early morning. A narrow valley between bare brown
granite mountains. In an open sandy space at its heart stands the Kaaba: a plain cubic building about 9 m high draped
in plain dark cloth over a stone base, a raised wooden door, a low curved wall on one side; no mosque around it, no
minarets, no domes. Nearby a simple stone well (Zamzam) with a wooden frame and a trough. The low rocky hills of Safa
and Marwa with an open earthen way between them. Houses of rough stone and mud brick with flat roofs crowd the valley
floor along narrow lanes; very few trees. Quiet, reverent, warm low light, thin haze. No people, no animals except a
few birds, no text.

## Movement and audio

- Walk with gravity inside the near box (384 x 136 x 384 m at 1 m); outside it the walker follows the ground model.
  F flies (E lifts off, Q lands). Dev flight on P, benchmark B.
- Audio: wind with gusts, a gust whistle that grows with height, air rush, small birds and rock doves in the
  morning, none at night. The third bus is silent: no town noise is synthesized. Nothing recited.

# Image prompts for the picture tiles

The app currently uses 89 picture tiles borrowed from the Mentava set (`assets/images/mentava/web/`). They must be replaced with our own art before the app is sold. This file lists every tile the curriculum uses, with one image-generation prompt for each, so all replacements can be made in one consistent style.

Source of the list: `tools/precache-images.mjs` (`usedImages()` over `data/curriculum.json`). Some words appear twice in different phonics folders (`cat`, `hat`); each folder gets its own file, so both are listed.

## Shared STYLE block

Paste this with every prompt:

> Flat, friendly children's-book illustration for a 4-year-old. One clear object, centred, filling about 70% of the square. Plain soft pastel background, one colour. Simple shapes, consistent thick dark-brown outline, consistent palette of warm primaries and pastels. No text, no letters, no numbers, no logos, no watermark. Square 1:1, 1024x1024.

Prompt = STYLE block + the object sentence from the table.

## File naming

- Save each finished image as `assets/images/tiles/<folder>/<word>.webp`.
- Use the same `<folder>` and `<word>` as the current file, so the code swap is a single path change (`assets/images/mentava/web/` becomes `assets/images/tiles/`).
- Folder names are phonics groups (`c-k`, `ch`, `ie`, `or`, `oo-moon`); keep them exactly as written.
- Lowercase only, no spaces. Export as WebP at 1024x1024 or 512x512.

## Tiles by first sound

### a (short a)

| folder | word | current file | prompt |
|---|---|---|---|
| a | apple | assets/images/mentava/web/a/apple.webp | a red apple with one green leaf |
| a | astronaut | assets/images/mentava/web/a/astronaut.webp | a friendly astronaut in a white space suit with a round helmet |
| a | cat | assets/images/mentava/web/a/cat.webp | a grey tabby cat sitting with its tail curled round |
| a | crab | assets/images/mentava/web/a/crab.webp | a red crab with two big claws |
| a | hat | assets/images/mentava/web/a/hat.webp | a red woolly hat with a bobble on top |

### b

| folder | word | current file | prompt |
|---|---|---|---|
| b | baby | assets/images/mentava/web/b/baby.webp | a smiling baby in a yellow romper |
| b | ball | assets/images/mentava/web/b/ball.webp | a red bouncy ball with a white stripe |
| b | banana | assets/images/mentava/web/b/banana.webp | a single yellow banana with a small brown tip |
| b | bear | assets/images/mentava/web/b/bear.webp | a brown teddy bear with round ears sitting down |
| b | bus | assets/images/mentava/web/b/bus.webp | a yellow school bus with black wheels |

### c-k (hard c and k)

| folder | word | current file | prompt |
|---|---|---|---|
| c-k | camel | assets/images/mentava/web/c-k/camel.webp | a tan camel with two humps |
| c-k | candy | assets/images/mentava/web/c-k/candy.webp | a wrapped sweet with twisted paper ends |
| c-k | cat | assets/images/mentava/web/c-k/cat.webp | a grey tabby cat sitting with its tail curled round |
| c-k | king | assets/images/mentava/web/c-k/king.webp | a king with a gold crown and a red cape |
| c-k | koala | assets/images/mentava/web/c-k/koala.webp | a grey koala hugging a eucalyptus branch |

### ch

| folder | word | current file | prompt |
|---|---|---|---|
| ch | chair | assets/images/mentava/web/ch/chair.webp | a wooden chair with a tall back |
| ch | cheese | assets/images/mentava/web/ch/cheese.webp | a yellow wedge of cheese with round holes |
| ch | chick | assets/images/mentava/web/ch/chick.webp | a fluffy yellow baby chick |

### d

| folder | word | current file | prompt |
|---|---|---|---|
| d | deer | assets/images/mentava/web/d/deer.webp | a brown deer with small antlers |
| d | dog | assets/images/mentava/web/d/dog.webp | a brown and white puppy with floppy ears |
| d | dolphin | assets/images/mentava/web/d/dolphin.webp | a blue dolphin jumping out of the waves |
| d | door | assets/images/mentava/web/d/door.webp | a red front door with a round brass handle |
| d | duck | assets/images/mentava/web/d/duck.webp | a yellow duck with an orange beak |

### e

| folder | word | current file | prompt |
|---|---|---|---|
| e | egg | assets/images/mentava/web/e/egg.webp | a white egg standing in an egg cup |
| e | hen | assets/images/mentava/web/e/hen.webp | a brown hen with a red comb |
| e | nest | assets/images/mentava/web/e/nest.webp | a twig bird nest with three speckled eggs |
| e | tent | assets/images/mentava/web/e/tent.webp | a green camping tent with its door flap open |

### f

| folder | word | current file | prompt |
|---|---|---|---|
| f | fan | assets/images/mentava/web/f/fan.webp | a standing electric fan with three blades |
| f | fish | assets/images/mentava/web/f/fish.webp | an orange fish with fins and bubbles |
| f | fork | assets/images/mentava/web/f/fork.webp | a silver fork with three prongs |

### g

| folder | word | current file | prompt |
|---|---|---|---|
| g | gate | assets/images/mentava/web/g/gate.webp | a wooden garden gate, half open |
| g | goat | assets/images/mentava/web/g/goat.webp | a white goat with small horns |

### h

| folder | word | current file | prompt |
|---|---|---|---|
| h | hand | assets/images/mentava/web/h/hand.webp | an open hand with five fingers spread out |
| h | hat | assets/images/mentava/web/h/hat.webp | a red woolly hat with a bobble on top |
| h | hippo | assets/images/mentava/web/h/hippo.webp | a grey hippo with its mouth wide open |

### i

| folder | word | current file | prompt |
|---|---|---|---|
| i | igloo | assets/images/mentava/web/i/igloo.webp | a dome-shaped igloo made of snow blocks |
| i | sit | assets/images/mentava/web/i/sit.webp | a child sitting cross-legged on the floor |
| i | stick | assets/images/mentava/web/i/stick.webp | a long brown stick lying on green grass |

### ie (long i)

| folder | word | current file | prompt |
|---|---|---|---|
| ie | kite | assets/images/mentava/web/ie/kite.webp | a red diamond kite with a long tail of bows |
| ie | light | assets/images/mentava/web/ie/light.webp | a glowing light bulb with rays coming out |

### j

| folder | word | current file | prompt |
|---|---|---|---|
| j | jet | assets/images/mentava/web/j/jet.webp | a white passenger jet plane flying to the right |

### l

| folder | word | current file | prompt |
|---|---|---|---|
| l | ladder | assets/images/mentava/web/l/ladder.webp | a wooden ladder leaning against a wall |
| l | leaf | assets/images/mentava/web/l/leaf.webp | a green leaf with clear veins |
| l | leg | assets/images/mentava/web/l/leg.webp | a child's leg with a shoe on the foot |

### m

| folder | word | current file | prompt |
|---|---|---|---|
| m | map | assets/images/mentava/web/m/map.webp | a folded paper map with a dotted route and a red pin |
| m | milk | assets/images/mentava/web/m/milk.webp | a glass of white milk |

### n

| folder | word | current file | prompt |
|---|---|---|---|
| n | necklace | assets/images/mentava/web/n/necklace.webp | a gold necklace with a round blue bead |
| n | nose | assets/images/mentava/web/n/nose.webp | a round pink cartoon nose on a face |
| n | nut | assets/images/mentava/web/n/nut.webp | a brown hazelnut in its shell |

### o

| folder | word | current file | prompt |
|---|---|---|---|
| o | octopus | assets/images/mentava/web/o/octopus.webp | a purple octopus with curly tentacles |
| o | pot | assets/images/mentava/web/o/pot.webp | a black cooking pot with a lid |
| o | rock | assets/images/mentava/web/o/rock.webp | a grey rock with a few speckles |

### oo (as in moon)

| folder | word | current file | prompt |
|---|---|---|---|
| oo-moon | moon | assets/images/mentava/web/oo-moon/moon.webp | a yellow crescent moon with a sleepy face |

### or

| folder | word | current file | prompt |
|---|---|---|---|
| or | corn | assets/images/mentava/web/or/corn.webp | a yellow ear of corn in a green husk |
| or | horse | assets/images/mentava/web/or/horse.webp | a brown horse with a long mane |

### p

| folder | word | current file | prompt |
|---|---|---|---|
| p | panda | assets/images/mentava/web/p/panda.webp | a black and white panda sitting and eating bamboo |
| p | pig | assets/images/mentava/web/p/pig.webp | a pink pig with a curly tail |
| p | pumpkin | assets/images/mentava/web/p/pumpkin.webp | an orange pumpkin with a green stalk |

### q

| folder | word | current file | prompt |
|---|---|---|---|
| q | queen | assets/images/mentava/web/q/queen.webp | a queen with a tall gold crown and a purple robe |

### r

| folder | word | current file | prompt |
|---|---|---|---|
| r | rabbit | assets/images/mentava/web/r/rabbit.webp | a white rabbit with long ears |
| r | robot | assets/images/mentava/web/r/robot.webp | a friendly silver robot with a square head |
| r | rocket | assets/images/mentava/web/r/rocket.webp | a red rocket ship pointing up with a small flame |

### s

| folder | word | current file | prompt |
|---|---|---|---|
| s | snail | assets/images/mentava/web/s/snail.webp | a snail with a spiral shell |
| s | snake | assets/images/mentava/web/s/snake.webp | a green snake curled in a loop |
| s | sock | assets/images/mentava/web/s/sock.webp | a single striped sock |

### t

| folder | word | current file | prompt |
|---|---|---|---|
| t | table | assets/images/mentava/web/t/table.webp | a wooden table with four legs |
| t | tiger | assets/images/mentava/web/t/tiger.webp | an orange tiger with black stripes |
| t | tree | assets/images/mentava/web/t/tree.webp | a round green tree with a brown trunk |

### u

| folder | word | current file | prompt |
|---|---|---|---|
| u | bug | assets/images/mentava/web/u/bug.webp | a green beetle bug with black spots |
| u | sun | assets/images/mentava/web/u/sun.webp | a smiling yellow sun with rays |
| u | umbrella | assets/images/mentava/web/u/umbrella.webp | a red umbrella, open |
| u | up | assets/images/mentava/web/u/up.webp | a big green arrow pointing straight up |

### v

| folder | word | current file | prompt |
|---|---|---|---|
| v | van | assets/images/mentava/web/v/van.webp | a white delivery van |
| v | vest | assets/images/mentava/web/v/vest.webp | a blue sleeveless vest |
| v | volcano | assets/images/mentava/web/v/volcano.webp | a volcano with smoke and red lava |

### w

| folder | word | current file | prompt |
|---|---|---|---|
| w | wagon | assets/images/mentava/web/w/wagon.webp | a red toy wagon with wheels |
| w | window | assets/images/mentava/web/w/window.webp | a window with four panes and a yellow curtain |
| w | worm | assets/images/mentava/web/w/worm.webp | a pink worm wiggling on the ground |

### x

| folder | word | current file | prompt |
|---|---|---|---|
| x | fox | assets/images/mentava/web/x/fox.webp | an orange fox with a bushy white-tipped tail |

### y

| folder | word | current file | prompt |
|---|---|---|---|
| y | yarn | assets/images/mentava/web/y/yarn.webp | a ball of red yarn with a loose thread |

## World 3 (Sunny Hills) additions

Lessons 18 to 25 (e j w v y z x qu) use these tiles from the same Mentava folders. The first rows are tiles that are in use now but were not listed above; the rows marked "new, no current file" are pictures the lessons could use but have no tile yet (the lessons are built without them: a letters-only or said-only word stands in, never a wrong picture). The jam tile (j/jam), the red tile (e/red) and the yellow tile (y/yellow) exist but show a misleading picture (a knife in the jam, a paint can for "red", a paint bucket for "yellow"), so they are not used; if you want them, draw them again.

| folder | word | current file | prompt |
|---|---|---|---|
| j | jump | assets/images/mentava/web/j/jump.webp | a child in mid-air jumping with both arms up, knees bent |
| y | yoyo | assets/images/mentava/web/y/yoyo.webp | a red yo-yo on a white string |
| z | zebra | assets/images/mentava/web/z/zebra.webp | a zebra standing side-on, black and white stripes |
| z | zipper | assets/images/mentava/web/z/zipper.webp | a jacket zipper half open, close up |
| z | zoo | assets/images/mentava/web/z/zoo.webp | a zoo with a wooden fence and gate, and a lion, an elephant, a giraffe and a zebra behind it |
| x | box | assets/images/mentava/web/x/box.webp | a brown cardboard box with the flaps open |
| x | ox | assets/images/mentava/web/x/ox.webp | a brown ox with horns, standing side-on |
| q | quack | assets/images/mentava/web/q/quack.webp | a yellow duck with its beak open, quacking |
| q | quilt | assets/images/mentava/web/q/quilt.webp | a patchwork quilt of coloured squares, folded corner |
| e | elephant | new, no current file | a grey elephant with big ears and a raised trunk (a second e picture: egg is the only tile that starts with e) |
| e | bed | new, no current file | a child's bed with a blue blanket and a pillow (the curriculum says "e as in bed") |
| j | jug | new, no current file | a blue jug with a handle, full of water |
| j | jar | new, no current file | a glass jar of red jam with a lid and no knife (replaces the misleading jam tile) |
| w | watch | new, no current file | a round wristwatch with a bright strap (hands visible, no numbers) |
| w | web | new, no current file | a spider web with dew drops and a tiny spider |
| y | yak | new, no current file | a shaggy brown yak with curved horns (a third y picture; yellow is not usable as a tile) |
| v | violin | new, no current file | a wooden violin with its bow |
| x | xylophone | new, no current file | a rainbow xylophone with two mallets (the one common picture word that starts with x) |

## Tricky Sounds additions (new, no current file)

The Tricky Sounds stops (Which One?, `docs/LESSON-REBUILD.md` section 12) show a picture on both cards of a pair only when both words have a tile. Only fan and van have tiles today, so every other pair is words only. These are the pictures that would let more pairs show them (put each file in the folder named and run `node tools/gen-lessons.mjs`; a pair picks up its pictures by itself). Use the shared STYLE block above.

| folder | word | current file | prompt |
|---|---|---|---|
| n | nap | new, no current file | a child asleep in a small bed under a blue blanket, eyes closed |
| h | ham | new, no current file | a whole pink ham on a plate with a bone sticking out |
| c-k | cap | new, no current file | a red baseball cap seen from the side, peak to the right |
| c-k | cot | new, no current file | a small folding camp cot with a green sheet and a pillow |
| d | dad | new, no current file | a smiling dad, shoulders and head, short brown hair |
| d | dig | new, no current file | a child digging a hole in sand with a small spade |
| b | bib | new, no current file | a baby bib with a yellow duck on it, tied round the neck |
| i | pin | new, no current file | a safety pin, silver, closed, with a loop at the top |
| e | pen | new, no current file | a blue ballpoint pen, cap off, lying diagonally |
| t | tin | new, no current file | a round metal tin can with a lid, silver with a blue label |
| t | ten | new, no current file | ten red apples in two neat rows of five |
| f | fat | new, no current file | a round, cheerful fat cat sitting down, ginger |
| v | vat | new, no current file | a big wooden barrel-shaped vat with a lid, one handle on each side |
| w | wet | new, no current file | a child in a yellow raincoat standing in the rain with water drops, smiling |
| s | sip | new, no current file | a child drinking through a striped straw from a glass of juice |
| z | zip | new, no current file | a coat zip, half done up, with a metal pull tab |

## World 4 (Digraph Docks) additions

Lessons 26 to 33 (sh ch th ck ff(ll ss zz) wh ng nk) use the tiles that exist in the folders sh (ship shark shoe), ch (chair cheese chick), th-unvoiced (bath thumb thunder), th-voiced (brother father feather mother) and ng (ring sing wing), plus d/duck, s/sock, i/stick and o/rock (the ck words) and b/ball (the one double-letter picture). wh and nk have no tile at all, so their lessons show no pictures (never a wrong one). The rows below are pictures the lessons and the Tricky Sounds pairs could use but have no tile yet; all are "new, no current file".

| folder | word | current file | prompt |
|---|---|---|---|
| wh | whale | new, no current file | a friendly blue whale with a water spout, side-on (wh has no tile at all: lesson 31 has no pictures until one of these exists) |
| wh | wheel | new, no current file | a single red wagon wheel with spokes, front on |
| wh | whistle | new, no current file | a silver train whistle on a chain |
| wh | white | new, no current file | a plain white mug with a pale shadow (or a white rabbit) to show the colour white |
| ch | chip | new, no current file | a single golden potato chip (crisp) on a plate; ship/chip needs this to show the pair as pictures |
| sh | shop | new, no current file | a small shop front with a striped awning, an open door and a sign (the word shop pairs with chop) |
| sh | shell | new, no current file | a pink spiral sea shell on sand |
| sh | sheep | new, no current file | a fluffy white sheep standing side-on |
| sh | shed | new, no current file | a small wooden garden shed with a closed door and a tiny window |
| sh | dish | new, no current file | a round blue dish with a spoon in it |
| ch | chop | new, no current file | a wooden chopping board with a carrot half chopped and a knife beside it (shop/chop pair) |
| th | thin | new, no current file | a very thin snake or a thin stick next to a thick one (thin/tin pair) |
| th | think | new, no current file | a child with a hand on the chin and a thought bubble above |
| th | three | new, no current file | three red apples in a row, no numbers |
| th | bath (th-voiced pair) | new, no current file | a child in a bath with bubbles (th-unvoiced/bath exists); that, this, then, them need no picture |
| ck | clock | new, no current file | a round wall clock with hands and no numbers |
| ck | truck | new, no current file | a red pick-up truck, side-on |
| ck | sack | new, no current file | a brown sack tied at the top with string (sack/shack pair) |
| ck | shack | new, no current file | a tiny wooden shack with a tin roof (sack/shack pair) |
| ck | kick | new, no current file | a child kicking a football, leg raised |
| ff | puff | new, no current file | a small white puff of cloud or a powder puff |
| ff | cliff | new, no current file | a tall cliff above the sea with a gull |
| ll | bell | new, no current file | a brass hand bell with a wooden handle (lesson 30 has only ball as a picture) |
| ll | doll | new, no current file | a rag doll with yarn hair and a red dress |
| ll | hill | new, no current file | a green hill with a winding path |
| ss | kiss | new, no current file | a child kissing a mother on the cheek, hearts above |
| ss | dress | new, no current file | a child standing in a yellow dress with a hem |
| ss | grass | new, no current file | a patch of green grass with a few daisies |
| zz | buzz | new, no current file | a bee with blurred wings and a dotted flight path |
| zz | jazz | new, no current file | a trumpet and a saxophone side by side |
| ng | king (ng) | new, no current file | the ng folder has ring, sing and wing; a swing is the fourth: a child on a swing |
| ng | song | new, no current file | a music note over an open mouth, or a child singing |
| nk | bank | new, no current file | a stone bank building with columns and a coin sign (nk has no tile at all: lesson 33 has no pictures until one of these exists) |
| nk | sink | new, no current file | a white kitchen sink with a tap and water running |
| nk | trunk | new, no current file | an elephant trunk lifted, or a wooden treasure trunk with a lid |
| nk | skunk | new, no current file | a black and white skunk with a big tail |
| nk | monkey | new, no current file | a brown monkey hanging from a branch |

## World 5 additions (new, no current file)

Lessons 34 to 42 (blends: st ft, nd mp nt, sp sk, sn sw sm sl, bl cl fl, pl gl, br tr cr, dr fr gr, mixed review) use the tiles that exist: e/nest e/tent v/vest h/hand j/jump i/stick ar/star s/snail s/snake ow/cloud oo-moon/glue a/crab ae/train t/tree ie/cry oo-moon/fruit. A blend is not a new sound, so no new folder is needed: put each new image in the folder of its first sound (the folder path is shown in the file name column). Until a picture exists a lesson shows none for that word, never a wrong one. Same style as the rest of the set (flat, friendly, one object, plain background, 512 px, under 70 KB as .webp).

| folder | word | current file | prompt |
|---|---|---|---|
| ft | gift | new, no current file | a wrapped present with a ribbon bow, front on |
| ft | raft | new, no current file | a small wooden raft of logs on calm water |
| mp | lamp | new, no current file | a table lamp with a yellow shade, lit |
| mp | camp | new, no current file | a small orange tent with a campfire beside it (or use the word camp only when the tent is a camp scene) |
| mp | stamp | new, no current file | a postage stamp with a small picture and a wavy edge |
| sp | spoon | new, no current file | a silver spoon, side-on |
| sp | spider | new, no current file | a friendly spider hanging from a thread |
| sk | skate | new, no current file | one ice skate with a blade and a laced boot |
| sk | skunk | new, no current file | a black and white skunk with a big tail |
| st | stop sign | new, no current file | a red octagon stop sign on a pole (file name: stop) |
| sn | snow | new, no current file | a snowman with a carrot nose, or falling flakes on a hill (file name: snow) |
| sw | swing | new, no current file | a child swing hanging from a tree branch |
| sw | swan | new, no current file | a white swan on the water |
| sm | smile | new, no current file | a round yellow smiling face |
| sl | sled | new, no current file | a red sled on a snowy slope |
| sl | slide | new, no current file | a playground slide with a ladder |
| bl | block | new, no current file | a stack of three coloured toy building blocks |
| bl | black | new, no current file | a black cat in front of a plain background (file name: black) |
| cl | clock | new, no current file | a round wall clock with two hands |
| cl | clam | new, no current file | an open clam shell with a pearl |
| fl | flag | new, no current file | a small red flag on a pole waving |
| fl | flower | new, no current file | a red flower with green stem and leaves |
| pl | plum | new, no current file | a purple plum with a leaf |
| pl | plane | new, no current file | a small passenger aeroplane flying |
| gl | globe | new, no current file | a world globe on a stand |
| gl | glass | new, no current file | a clear drinking glass with water |
| br | brush | new, no current file | a paint brush with a wooden handle and red paint on the tip |
| br | bridge | new, no current file | a stone bridge over a stream |
| tr | truck | new, no current file | a red pick-up truck, side-on |
| cr | crown | new, no current file | a golden crown with three points |
| cr | crib | new, no current file | a baby crib with bars and a blanket |
| dr | drum | new, no current file | a red drum with two sticks |
| dr | dress | new, no current file | a small blue dress on a hanger |
| fr | frog | new, no current file | a green frog sitting on a lily pad |
| gr | grapes | new, no current file | a bunch of purple grapes with a leaf |
| gr | grass | new, no current file | a patch of tall green grass |

## Hard to picture

- **sit** (i): a verb, not a noun. The prompt shows a child sitting cross-legged; check that it reads as "sitting" and not as a generic child.
- **up** (u): a direction, not an object. The prompt uses a big arrow; a child's hand reaching up is an alternative if the arrow feels too abstract.
- **light** (ie): a light bulb is the most common picture; a torch or the sun would be ambiguous.
- **kite** and **nest** are fine, but check that the nest shows eggs clearly.
- **nose** (n) and **leg** (l): body parts can look odd in cartoon form; show the part alone, centred.
- **oo-moon** has only one word, so the tile must read as "moon" at a glance: a crescent moon is clearer than a full moon.
- **hat** and **cat** each appear in two phonics folders. Make one image per folder (same picture is fine), so the folder paths stay correct.

// Parasha Books — peshat-based picture books where the reader's own kids explore the parasha.
//
// Story text uses cast tokens so any family can be dropped in:
//   {BIG}  — the oldest explorer (reads the pesukim out loud, asks the questions)
//   {MID}  — the little one (points, counts, loves the animals)
//   {BABY} — the baby (coos, grabs, rides along)
// Every spread is anchored to Sefaria refs; the story may only show what those pesukim say.
// No midrash: where the Torah is silent, the kids wonder out loud instead of inventing answers.
// Image scenes never depict Hashem (light only) and keep figures from the pesukim distant and modest.

export const STYLE =
  "warm gouache and watercolor children's picture-book illustration, soft painterly edges, rich golden light, gentle joyful mood, detailed ancient Near East setting, no text, no letters, no words";

export const books = [
  {
    slug: 'bereshit',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [3], [2], [7, 10], [4, 5], [8], [12, 'title']],
    parasha: 'Bereshit',
    hebrew: 'בְּרֵאשִׁית',
    range: 'Genesis 1:1–6:8',
    title: 'In the Very Beginning',
    tagline: 'Three sisters open a Chumash — and watch the world begin.',
    color: '#f2b544',
    cover:
      'the three sisters standing at the edge of a vast glowing dawn, a huge open book of light behind them, swirling dark waters turning into sky, sea and green land, stars appearing',
    trailer: [
      'Before the sea. Before the sky. Before anything at all…',
      'there was darkness — and water — and the spirit of God, hovering.',
      'Then came a voice. And a word. And the word was — LIGHT.',
      'Three sisters. One Chumash. Six days that built the whole world.',
      'Oceans split from sky. Land rises. Stars ignite.',
      'And on the seventh day… everything stops. Holy.',
      'This Shabbat, the story begins again. Parashat Bereshit.',
    ],
    pages: [
      {
        ref: 'Genesis 1:1-2',
        title: 'In the Very Beginning',
        story:
          "It was Friday night, and the Chumash on the Shabbat table was glowing. {BIG} opened it to the very first page — and the room melted away. The three sisters were floating in a deep, quiet dark. There was no floor and no sky, only water, dark and deep. {MID} squeezed her sister's hand. {BABY} blinked her big eyes. \"Where are we?\" {BIG} whispered, and read the first words: the earth was empty and unformed, darkness was over the deep, and the spirit of God was hovering over the water.",
        question: 'What was over the deep before anything else was made?',
        answer: 'Darkness — and the spirit of God hovered over the water (1:2).',
        scene:
          'the three sisters floating gently in a vast deep-blue darkness above endless dark water, a faint soft breath of wind rippling the water, the older girl holding a small glowing open book',
      },
      {
        ref: 'Genesis 1:3-5',
        title: 'Let There Be Light!',
        story:
          'Then God said, "Let there be light" — and there was light! It poured over the water like warm honey. {MID} clapped and shouted, "Light!" {BABY} laughed and reached for it with both hands. God saw that the light was good, and separated the light from the darkness. {BIG} read: God called the light Day, and the darkness He called Night. "There was evening and there was morning," she said slowly, "day one."',
        question: 'What did God call the light? What did He call the darkness?',
        answer: 'The light He called Day, and the darkness Night (1:5).',
        scene:
          'the primordial world on the first day of creation: brilliant golden light bursting across endless dark water for the first time, nothing else exists, no land, no buildings, no people; the three sisters floating above the water, shielding their eyes and laughing in wonder, the baby reaching up toward the light',
      },
      {
        ref: 'Genesis 1:6-8',
        title: 'A Sky in the Middle',
        story:
          'On the second day there was water everywhere — above and below. God made a great expanse, a rakia, right in the middle, and it pushed the waters apart: some above, some below. {MID} lay back and looked up and up. "It\'s the sky!" she said. {BIG} nodded at the page. God called the expanse Sky. And there was evening and there was morning, a second day.',
        question: 'What did the sky separate?',
        answer: 'The waters below the expanse from the waters above it (1:7).',
        scene:
          'the primordial world on the second day of creation: a great clear blue sky opening up between shimmering glassy waters high above and a calm endless ocean below, no land anywhere, no buildings, no people; the three sisters floating in the open air in the middle, looking up in amazement',
      },
      {
        ref: 'Genesis 1:9-13',
        title: 'Dry Land and Green Things',
        story:
          'On the third day, the waters rushed together into one place — and dry land came up! The sisters landed with a soft bump. God called the dry land Earth and the gathered waters Seas. Then grass sprang up between their toes, then plants with seeds, then fruit trees, each one making fruit with its seeds inside, every kind after its own kind. {BABY} patted the grass. {MID} sniffed a blossom. And God saw that it was good.',
        question: 'What did God call the gathered waters?',
        answer: 'Seas (1:10).',
        scene:
          'fresh green land rising out of the sea, grass, seed plants and young fruit trees sprouting all around, the three sisters sitting barefoot in new grass, the toddler sniffing a blossom',
      },
      {
        ref: 'Genesis 1:14-19',
        title: 'Lights in the Sky',
        story:
          'On the fourth day, God made lights in the sky — a great light to rule the day and a smaller light to rule the night, and the stars too. {BIG} read why: they are signs, for seasons, for days and for years. "So that\'s how we know when it\'s Rosh Chodesh, and when it\'s a holiday!" she said. {MID} counted stars — "one, two, three, lots!" — until {BABY} fell asleep under the moon.',
        question: 'What are the lights in the sky for?',
        answer: 'For signs, for seasons (mo\'adim), for days and for years — and to give light on the earth (1:14-15).',
        scene:
          'a sky split between a glowing sunset sun on one side and a big silver moon with countless stars on the other, the three sisters lying on a hill, the toddler counting stars on her fingers, the baby asleep',
      },
      {
        ref: 'Genesis 1:20-23',
        title: 'Splash and Flutter',
        story:
          'On the fifth day, the waters were suddenly swarming with living things, and birds flew over the earth across the sky! God created the great sea creatures, and every fish and every winged bird. {BABY} squealed as a fish jumped. {MID} flapped her arms like a bird. Then God blessed them: "Be fruitful and multiply." "The very first blessing in the Torah," said {BIG}, "and it\'s for the fish and the birds!"',
        question: 'Who got the very first blessing in the Torah?',
        answer: 'The fish and the birds — "Be fruitful and multiply" (1:22).',
        scene:
          'an untouched wild seashore on the fifth day of creation, no buildings, no people: colorful fish leaping from the water, an enormous gentle sea creature arching in the distance, flocks of birds filling the sky; the three sisters on the sand, the toddler flapping her arms like wings, the baby laughing at a fish',
      },
      {
        ref: 'Genesis 1:24-31',
        title: 'Animals — and People Too',
        story:
          'On the sixth day, the land brought out animals: cattle, creeping things, and wild beasts of every kind. A lamb nuzzled {MID}. A lion yawned. Then God made people — in His image, male and female — and blessed them: fill the earth and rule over it. {BIG} read the last words of the day very carefully: God saw everything He had made, and behold, it was very good. "Not just good," she whispered. "Very good."',
        question: 'What was different about how God described day six?',
        answer: 'It was "very good" — tov me\'od (1:31).',
        scene:
          'a sunny meadow full of animals of every kind, a lamb nuzzling the toddler, a lion, an elephant, rabbits and cattle, the older girl holding the baby, all bathed in warm late light',
      },
      {
        ref: 'Genesis 2:1-3',
        title: 'The Seventh Day',
        story:
          'The heavens and the earth were finished, and everything in them. Then came the seventh day, and God rested from all the work He had done. {BIG} read: God blessed the seventh day and made it holy. Everything went quiet and golden. {MID} whispered, "It\'s Shabbat." {BABY} snuggled in. The sisters sat together and did nothing at all — and it was the best feeling in the whole world.',
        question: 'What did God do to the seventh day?',
        answer: 'He blessed it and made it holy (2:3).',
        scene:
          'a peaceful golden evening over the new world, the three sisters sitting close together on a hill wrapped in a soft blanket, two small candles glowing beside them, total calm',
      },
      {
        ref: 'Genesis 2:8-15',
        title: 'A Garden in Eden',
        story:
          'God planted a garden in Eden, in the east, full of trees that were beautiful to look at and good to eat. In the middle stood the Tree of Life and the Tree of Knowing Good and Bad, and a river flowed out of Eden to water the garden. {MID} splashed her feet in the river. God put the man in the garden with two jobs. "To work it," read {BIG}, "and to guard it." "We can help!" said {MID}, and filled her little bucket.',
        question: 'What two jobs did God give the man in the garden?',
        answer: 'To work it and to guard it — le\'ovdah ul\'shomrah (2:15).',
        scene:
          'a lush wild garden of Eden full of fruit trees with a sparkling river running through it, two special tall glowing trees in the middle, no buildings, no adults; the toddler splashing in the river with a little bucket, the older girl watering a plant, the baby sitting in the grass',
      },
      {
        ref: 'Genesis 2:19-20',
        title: "What's Its Name?",
        story:
          'God formed every animal of the field and every bird of the sky and brought them to the man to see what he would call them — and whatever he called each one, that became its name. A giraffe went by, and a zebra, and a hippo. {MID} jumped up and down: "I want to name one!" {BIG} laughed. "Adam already did," she said. "Every single one." {BABY} pointed at a duck and said, "Da!"',
        question: 'Who gave the animals their names?',
        answer: 'Adam — whatever he called each living creature, that was its name (2:19).',
        scene:
          'a long joyful parade of animals walking two and three at a time through the wild garden of Eden toward a sunlit clearing, giraffe, zebra, hippo, peacock, ducks, no buildings, no adults; the three sisters watching from behind a flowering bush, the toddler jumping excitedly, the baby pointing at a duck',
      },
      {
        ref: 'Genesis 2:16-17; Genesis 3:6; Genesis 3:23-24',
        title: 'Outside the Garden',
        story:
          'God had given one rule: do not eat from the Tree of Knowing Good and Bad. But the woman saw the fruit was nice to look at, and she took some and ate, and gave some to her husband, and he ate. {MID} covered her eyes. Then God sent them out of the garden to work the ground. At the gate, keruvim stood with a flaming, turning sword to guard the way to the Tree of Life. The sisters held hands very tight. "One rule," said {BIG} quietly. "That\'s all it was."',
        question: 'What guarded the way to the Tree of Life?',
        answer: 'The keruvim and the fiery, ever-turning sword (3:24).',
        scene:
          'the tall gate of a garden at dusk guarded by two shining winged angelic figures made of light and a slowly turning flaming sword, the three sisters outside holding hands, looking back at the glowing garden',
      },
      {
        ref: 'Genesis 6:5-8',
        title: 'Noach Found Favor',
        story:
          'Many years went by, and the world filled with people. But people did not do what was good, and God was sad in His heart. {BIG} turned to the very last line of the parasha, and the page began to glow again. "But Noach," she read, "found favor in the eyes of Hashem." {MID} yawned. {BABY} was already asleep. {BIG} closed the Chumash on the Shabbat table and smiled. "Next week," she said, "we meet Noach."',
        question: 'Who found favor in the eyes of Hashem?',
        answer: 'Noach (6:8).',
        scene:
          'back home at a cozy Shabbat table at night with candles and challah, the older girl closing a glowing Chumash, the toddler yawning, the baby asleep in her lap, soft warm light',
      },
    ],
  },
  {
    slug: 'noach',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [6], [2], [4], [3, 5], [7, 8, 10], [9, 'title']],
    parasha: 'Noach',
    hebrew: 'נֹחַ',
    range: 'Genesis 6:9–11:32',
    title: 'The Ark, the Dove and the Rainbow',
    tagline: 'Three sisters climb aboard the ark and ride out the flood.',
    color: '#4f8fc0',
    cover:
      'the three sisters at the open window of a huge wooden ark on stormy waters, a white dove flying toward them with an olive leaf, a rainbow breaking through the clouds behind',
    trailer: [
      'The world had gone wrong. Very, very wrong.',
      'But one man walked with God. His name… was Noach.',
      'Three hundred cubits of gopher wood. Pitch inside and out. Three decks.',
      'The fountains of the deep burst open. The windows of heaven — opened wide.',
      'Forty days. Forty nights. And three sisters… on board.',
      'A raven. A dove. An olive leaf. And a promise written across the sky.',
      'All aboard. Parashat Noach.',
    ],
    pages: [
      {
        ref: 'Genesis 6:9-13',
        title: 'A Man Who Walked with God',
        story:
          'This time, when {BIG} opened the Chumash, a warm wind blew out of the pages — and the sisters were standing on a dusty hill. The land below was full of people, but it was full of chamas, too — people grabbing and hurting. "That\'s not how the world is supposed to be," said {MID}. {BIG} read: Noach was a righteous man, wholehearted in his generation. Noach walked with God. He had three sons: Shem, Cham and Yefet.',
        question: 'What were the names of Noach\'s three sons?',
        answer: 'Shem, Cham and Yefet (6:10).',
        scene:
          'the three sisters on a dusty hilltop overlooking an ancient city of mud-brick houses, in the distance a bearded man in a simple robe seen from behind walking alone toward open fields under a clear sky',
      },
      {
        ref: 'Genesis 6:14-16',
        title: 'Build an Ark!',
        story:
          'God told Noach exactly how to build the ark: gopher wood, with rooms inside, covered with pitch inside and out. Three hundred cubits long, fifty wide, thirty high. A tzohar for light. A door in the side. And three decks: lower, second and third. {BIG} showed {MID} a cubit — from her elbow to her fingertips. "Three hundred of those?!" {MID} gasped. {BABY} banged two pieces of wood together to help.',
        question: 'How many decks did the ark have?',
        answer: 'Three — lower, second and third (6:16).',
        scene:
          'a gigantic half-built wooden ark on a hillside with scaffolding, buckets of dark pitch and stacks of wood, the older girl measuring her forearm to show the toddler a cubit, the baby holding two wooden blocks',
      },
      {
        ref: 'Genesis 7:7-9',
        title: 'Two by Two',
        story:
          'Noach went into the ark with his sons, his wife, and his sons\' wives, because of the waters of the flood. And then the animals came — two by two, male and female, just as God had commanded. Two elephants. Two giraffes, ducking their heads. Two tiny ladybugs. {MID} counted them all: "Two! Two! Two!" {BABY} waved at a pair of monkeys, and the monkeys waved back.',
        question: 'Who went into the ark with Noach?',
        answer: 'His sons, his wife and his sons\' wives (7:7).',
        scene:
          'pairs of animals walking up a wide wooden ramp into the huge ark, elephants, giraffes ducking, lions, zebras, monkeys, the three sisters standing beside the ramp, the toddler counting on her fingers, the baby waving',
      },
      {
        ref: 'Genesis 7:11-16',
        title: 'The Door Closes',
        story:
          'In the six hundredth year of Noach\'s life, in the second month, on the seventeenth day, all the fountains of the great deep burst open and the windows of the sky opened up. Rain fell for forty days and forty nights. The sisters hurried up the ramp. Then {BIG} read a line that made her stop: "And Hashem shut him in." The great door closed behind them — safe and dry.',
        question: 'Who shut the door of the ark?',
        answer: 'Hashem shut him in (7:16).',
        scene:
          'a dramatic storm seen from inside the huge wooden ark: the great wooden side door swinging shut, through the closing gap torrents of rain and water bursting up from the ground, lightning; the three sisters just inside in warm lamplight, safe and dry',
      },
      {
        ref: 'Genesis 7:17-24',
        title: 'The Ark Floats',
        story:
          'The water rose and rose and lifted the ark right off the ground. The ark floated on the face of the waters, higher than the tallest mountains. Inside it was warm and noisy — mooing and roaring and chirping. The sisters peeked out of the tzohar at the gray water everywhere. {BIG} read that the waters swelled on the earth for one hundred and fifty days. "That\'s a long time to be on a boat," said {MID}.',
        question: 'How long did the waters swell on the earth?',
        answer: 'One hundred and fifty days (7:24).',
        scene:
          'inside a cozy lamp-lit wooden deck of the ark full of animals in stalls, the three sisters peeking out a high window at endless gray water, the baby petting a sleepy lamb',
      },
      {
        ref: 'Genesis 8:1-4',
        title: 'God Remembered Noach',
        story:
          'Then God remembered Noach and all the animals in the ark. He sent a wind over the earth, and the waters began to go down. The fountains of the deep closed, and the rain stopped. Bump! The ark stopped moving. {BIG} read: in the seventh month, on the seventeenth day, the ark came to rest on the mountains of Ararat. {BABY} clapped. {MID} shouted, "We landed!"',
        question: 'Where did the ark come to rest?',
        answer: 'On the mountains of Ararat (8:4).',
        scene:
          'the big wooden ark resting on a rocky mountain peak as the water recedes below, clouds parting, wind blowing, the three sisters on the top deck cheering',
      },
      {
        ref: 'Genesis 8:6-9',
        title: 'The Raven and the Dove',
        story:
          'After forty days, Noach opened the window of the ark and sent out a raven. It flew back and forth, back and forth, until the water dried up. Then he sent out a dove. But the dove found no place to rest her foot, because water still covered the earth. So she came back. {MID} held her breath as Noach reached out his hand and brought the dove back in. "She\'s safe," whispered {BIG}.',
        question: 'Why did the dove come back the first time?',
        answer: 'She found no resting place for her foot, because water was still on the face of the earth (8:9).',
        scene:
          'the open wooden window of the ark over wide flood water: a black raven flying away, and a white dove coming back, a bearded old man\'s arm in a brown robe sleeve reaching out to take the dove in (only his arm visible); the three sisters beside the window watching',
      },
      {
        ref: 'Genesis 8:10-12',
        title: 'An Olive Leaf!',
        story:
          'Noach waited seven more days and sent the dove out again. In the evening, the dove came back — and in her mouth was a freshly plucked olive leaf! "Something is growing again!" shouted {MID}. {BABY} reached for the leaf. Noach waited another seven days and sent the dove out once more. This time she did not come back at all. "She found a home," said {BIG}.',
        question: 'What was in the dove\'s mouth?',
        answer: 'A freshly plucked olive leaf (8:11).',
        scene:
          'a white dove flying toward the ark at golden evening with a green olive leaf in its beak, the three sisters leaning out of the window, the toddler pointing, the baby reaching',
      },
      {
        ref: 'Genesis 8:15-20',
        title: 'Out of the Ark',
        story:
          'God said to Noach: "Go out of the ark — you, your wife, your sons and your sons\' wives — and bring out every living thing with you." The big door opened. The animals poured out onto the dry, fresh land — running, hopping, flying. {MID} ran too. Then Noach built an altar to Hashem and brought offerings. The sisters stood quietly and watched the smoke rise.',
        question: 'What was the first thing Noach built after leaving the ark?',
        answer: 'An altar to Hashem (8:20).',
        scene:
          'animals streaming joyfully out of the open ark down a wooden ramp onto fresh green land, birds flying up, a simple stone altar with a thin line of smoke far in the distance; the three sisters running down the ramp together',
      },
      {
        ref: 'Genesis 9:12-16',
        title: 'The Rainbow',
        story:
          'Then God made a promise — a brit — with Noach and every living creature: never again would the waters become a flood to destroy all life. And He gave a sign: "My bow I have set in the cloud." A rainbow stretched across the whole sky. {MID} named every color. {BABY} reached up to grab it. "Every time we see one," said {BIG}, "it\'s the sign of the promise."',
        question: 'What is the rainbow a sign of?',
        answer: 'God\'s covenant that the waters will never again become a flood to destroy all flesh (9:15).',
        scene:
          'a huge brilliant rainbow arching over a fresh green valley with the ark on the mountain behind, the three sisters sitting in the grass looking up, the baby reaching toward the rainbow',
      },
      {
        ref: 'Genesis 11:1-9',
        title: 'A Tower to the Sky',
        story:
          'Years later, the whole earth had one language and the same words. People settled in a valley in Shinar and baked bricks. "Let\'s build a city," they said, "and a tower with its top in the sky, and make a name for ourselves, so we won\'t be scattered." Hashem came down to see the city and the tower. He mixed up their language so they couldn\'t understand each other. "Brick!" said one. "Huh?" said another. And Hashem scattered them over the whole earth.',
        question: 'Why was the city called Bavel?',
        answer: 'Because there Hashem mixed up (balal) the language of all the earth (11:9).',
        scene:
          'an enormous unfinished ziggurat tower of baked bricks rising into the clouds in a wide valley, workers far away with bewildered gestures, the three sisters standing on a pile of bricks in the foreground looking up',
      },
      {
        ref: 'Genesis 11:26-32',
        title: 'Someone New',
        story:
          'Many generations later, the Chumash told of a family: Terach, and his sons Avram, Nachor and Haran. Avram married Sarai. Terach took Avram, Sarai and his grandson Lot and left Ur Kasdim to go to the land of Canaan — and they came as far as Charan, and settled there. The page began to glow. {BIG} smiled and closed the Chumash. "Next week," she said, "Hashem is going to tell Avram to go."',
        question: 'Where was Terach\'s family heading when they left Ur Kasdim?',
        answer: 'To the land of Canaan — they came as far as Charan and settled there (11:31).',
        scene:
          'a family caravan with camels and donkeys walking along a river road at sunset away from a distant walled city, figures small and seen from behind, the three sisters watching from a date palm grove',
      },
    ],
  },
  {
    slug: 'lech-lecha',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [2], [3], [4, 5, 8], [10], [7, 11], [12, 'title']],
    parasha: 'Lech Lecha',
    hebrew: 'לֶךְ־לְךָ',
    range: 'Genesis 12:1–17:27',
    title: 'Go! Avram\'s Great Journey',
    tagline: 'Three sisters follow Avram and Sarai into the land of Canaan.',
    color: '#c9723e',
    cover:
      'the three sisters walking on a winding desert road toward golden hills of Canaan at sunrise, a caravan of camels and tents ahead, a sky full of fading stars',
    trailer: [
      'One voice. Two words. Lech lecha — GO.',
      'Leave your land. Your birthplace. Your father\'s house.',
      'He was seventy-five years old. And he went.',
      'Famine. Quarrels. Kings at war. Three hundred and eighteen men in the night.',
      'Look up at the stars. Count them — if you can.',
      'Three sisters. One promise. A journey that never ends.',
      'Pack your bags. Parashat Lech Lecha.',
    ],
    pages: [
      {
        ref: 'Genesis 12:1-3',
        title: 'Go!',
        story:
          'This time the Chumash opened with just two words, and they rang out like a bell: "Lech lecha — Go!" The sisters found themselves in Charan, beside a big tent. Hashem was speaking to Avram: Go from your land, from your birthplace, and from your father\'s house, to the land that I will show you. I will make you a great nation and bless you, and you will be a blessing. {MID} whispered, "But where?" {BIG} looked at the page. "He doesn\'t say yet," she said. "Avram just has to go."',
        question: 'What did Hashem promise Avram if he would go?',
        answer: 'To make him a great nation, to bless him, make his name great — and that he would be a blessing (12:2).',
        scene:
          'wide view of an ancient tent camp in Charan at dawn, huge beams of warm golden light pouring down from the sky, far away in the middle distance a tiny white-bearded old man in a brown robe stands alone looking up into the light; in the foreground the three sisters stand in a row looking up at the light in wonder',
      },
      {
        ref: 'Genesis 12:4-6',
        title: 'On the Road',
        story:
          'Avram went, just as Hashem told him, and Lot went with him. Avram was seventy-five years old when he left Charan. He took Sarai his wife, and Lot, and everything they had, and all the people who were with them — and they set out for the land of Canaan. The sisters walked behind the caravan, holding hands in a row. {BABY} toddled along as fast as she could. {MID} asked, "Are we there yet?" about a hundred times. Finally they came to Shechem.',
        question: 'How old was Avram when he left Charan?',
        answer: 'Seventy-five years old (12:4).',
        scene:
          'a dusty road winding through rolling golden hills toward Canaan, a long caravan of camels, donkeys and robed adult travelers walking ahead in the middle distance; in the foreground the three sisters walk hand in hand in a row along the road following the caravan, seen from the front, the baby toddling on the right',
      },
      {
        ref: 'Genesis 12:7-8',
        title: 'An Altar and a Tent',
        story:
          'Hashem appeared to Avram and said: "To your offspring I will give this land." So Avram built an altar right there. Then he moved on to the hills east of Beit-El and pitched his tent. {BIG} pointed: "Beit-El is over there, in the west — and Ai is over there, in the east." Avram built another altar and called out in the name of Hashem. {MID} stacked little stones into a tiny altar of her own.',
        question: 'Between which two places did Avram pitch his tent?',
        answer: 'Beit-El on the west and Ai on the east (12:8).',
        scene:
          'a tent on a hilltop between two distant ancient towns, a simple stone altar nearby, the older girl pointing west and east, the toddler stacking small stones, the baby sitting on a woven blanket',
      },
      {
        ref: 'Genesis 12:10; Genesis 13:1-2',
        title: 'Famine — and Back Again',
        story:
          'Then there was a famine in the land — no rain, no food. So Avram went down to Egypt to live there for a while. {MID}\'s tummy grumbled just hearing about it. Later, Avram came back up from Egypt to the Negev, with Sarai and Lot. And now he was very rich — in cattle, in silver and in gold! {BABY} tried to eat a gold coin. {BIG} took it back, gently.',
        question: 'What was Avram rich in when he came back from Egypt?',
        answer: 'Livestock, silver and gold (13:2).',
        scene:
          'a large caravan returning through a dry desert landscape with herds of cattle and sheep and donkeys carrying chests glinting with silver and gold, the three sisters riding on a cart, the baby holding a shiny coin',
      },
      {
        ref: 'Genesis 13:5-9',
        title: 'No Quarreling',
        story:
          'Lot had lots of sheep and cattle and tents too — so many that the land couldn\'t hold them all together. Avram\'s shepherds and Lot\'s shepherds started to quarrel. {MID} knew all about quarreling over toys. Then Avram said to Lot: "Please, let there be no quarrel between me and you, or between my shepherds and yours — for we are brothers. The whole land is in front of you. If you go left, I\'ll go right." {BIG} and {MID} looked at each other and shared their snack.',
        question: 'What reason did Avram give for not quarreling?',
        answer: '"For we are brothers" — anashim achim anachnu (13:8).',
        scene:
          'two groups of shepherds with crowded flocks of sheep arguing by a well, in front of them the older girl and toddler sharing a snack and smiling at each other, the baby watching the lambs',
      },
      {
        ref: 'Genesis 13:10-13',
        title: 'Lot Chooses',
        story:
          'Lot lifted up his eyes and saw the whole plain of the Jordan — it was watered everywhere, green like the garden of Hashem. So Lot chose the plain, and traveled east, and pitched his tents all the way to Sedom. {BIG} read the next line and frowned: the people of Sedom were very wicked. "It looked so pretty," said {MID}. "Pretty isn\'t everything," said {BIG}.',
        question: 'Why did Lot choose the plain of the Jordan?',
        answer: 'Because it was well-watered everywhere, like the garden of Hashem (13:10).',
        scene:
          'a view from a high ridge over a lush green river valley glowing in the sun, a man with flocks heading down toward it, the three sisters on the ridge looking down, the toddler pointing',
      },
      {
        ref: 'Genesis 13:14-18',
        title: 'Look Up and Walk',
        story:
          'After Lot left, Hashem said to Avram: "Lift up your eyes and look — north and south and east and west. All the land you see I will give to you and your offspring forever. I will make your offspring like the dust of the earth. Get up and walk through the land, its length and its width." {MID} spun in a circle pointing every direction. {BIG} picked up a handful of dust and let it blow away. "That many?!"',
        question: 'What did Hashem compare Avram\'s offspring to here?',
        answer: 'The dust of the earth — if one could count the dust, his offspring could be counted (13:16).',
        scene:
          'a wide panoramic hilltop view of the land of Canaan in every direction, the toddler spinning with arms out pointing, the older girl letting dust blow from her hand in the sunlight, the baby giggling',
      },
      {
        ref: 'Genesis 14:12-16',
        title: 'The Night Rescue',
        story:
          'Kings went to war, and Lot was captured and taken away with everything he owned. Someone escaped and ran to tell Avram the Ivri. Avram gathered his trained men — three hundred and eighteen of them, born in his own household — and chased after the captors all the way to Dan. At night he split up his men and rescued Lot. {MID} hid behind {BIG}. But Avram brought everyone back — Lot, his belongings, the women and the people.',
        question: 'How many trained men did Avram take with him?',
        answer: 'Three hundred and eighteen (14:14).',
        scene:
          'a starry night in the hills, a long line of flickering torches moving through a valley far away, the three sisters safe on a hill watching, the toddler peeking from behind her big sister, the baby wrapped in a blanket',
      },
      {
        ref: 'Genesis 14:18-23',
        title: 'Bread and Wine',
        story:
          'Malki-Tzedek, king of Shalem, came out to greet Avram with bread and wine. He was a kohen to God Most High, and he blessed Avram. Avram gave him a tenth of everything. Then the king of Sedom said, "Give me the people — keep the riches for yourself." But Avram said no: "Not a thread, not even a sandal strap will I take!" {BABY} held up her own sandal. Everyone laughed.',
        question: 'What did Avram refuse to take from the king of Sedom?',
        answer: '"Not a thread nor a sandal strap" — nothing at all (14:23).',
        scene:
          'a regal old king in simple robes offering round loaves of bread and a clay jug of wine on a rocky road outside a stone city, the three sisters nearby, the baby holding up a tiny sandal',
      },
      {
        ref: 'Genesis 15:1-6',
        title: 'Count the Stars',
        story:
          'Hashem said to Avram, "Don\'t be afraid, Avram — I am your shield." Then He took Avram outside and said: "Look at the sky and count the stars, if you can." The sisters lay on their backs and tried. {MID} got to "eleven!" and gave up. "So will your offspring be," Hashem said. {BIG} read the last part twice: Avram believed in Hashem, and Hashem counted it for him as righteousness.',
        question: 'What did Hashem tell Avram to count?',
        answer: 'The stars — "so shall your offspring be" (15:5).',
        scene:
          'an enormous glittering desert night sky full of stars and the Milky Way, a tent glowing in the distance, the three sisters lying on their backs on a blanket pointing up at the stars',
      },
      {
        ref: 'Genesis 16:7-16',
        title: 'The God Who Sees',
        story:
          'An angel of Hashem found Hagar by a spring of water in the wilderness, on the road to Shur. "You will have a son," the angel said, "and you will call him Yishmael — because Hashem has heard you." Hagar called Hashem "El Ro\'i" — the God who sees me. {MID} splashed the cool water on her face. "He sees us too?" she asked. {BIG} nodded. Avram was eighty-six when Yishmael was born.',
        question: 'What does the name Yishmael mean?',
        answer: '"Hashem has heard" your suffering (16:11).',
        scene:
          'a small spring of clear water with a few palm trees in a vast sunlit wilderness; a grown woman in a dark traveler\'s cloak with a dark head scarf, seen from behind, kneeling by the spring in a soft beam of light; the three sisters splashing their hands in the water nearby',
      },
      {
        ref: 'Genesis 17:1-5; Genesis 17:15-19',
        title: 'New Names',
        story:
          'When Avram was ninety-nine, Hashem appeared to him: "Walk before Me and be wholehearted." Then He gave him a new name: "No longer will you be called Avram — your name is Avraham, because I have made you the father of a multitude of nations." And Sarai became Sarah! "Sarah will have a son," Hashem said, "and you will call him Yitzchak." {MID} tried out her own name with a new letter. {BIG} closed the Chumash, smiling. "Next week," she said, "we meet Yitzchak."',
        question: 'Why was Avram\'s name changed to Avraham?',
        answer: 'Because Hashem made him the father of a multitude of nations — av hamon goyim (17:5).',
        scene:
          'an elderly couple seen from behind standing at the entrance of a large tent under a bright starry sky filled with soft golden light, the three sisters sitting nearby, the older girl closing a glowing book, the toddler tracing a letter in the sand',
      },
    ],
  },
];

export const bookBySlug = Object.fromEntries(books.map((b) => [b.slug, b]));

// Fill {BIG}/{MID}/{BABY} with a cast's names.
export function castStory(text, cast) {
  return text
    .replaceAll('{BIG}', cast.big?.name || 'the big sister')
    .replaceAll('{MID}', cast.mid?.name || 'the little one')
    .replaceAll('{BABY}', cast.baby?.name || 'the baby');
}

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
    tagline: '[[{Group} open|{BIG} opens]] a Chumash — and [[watch|watches]] the world begin.',
    color: '#f2b544',
    cover:
      'the three sisters standing at the edge of a vast glowing dawn, a huge open book of light behind them, swirling dark waters turning into sky, sea and green land, stars appearing',
    trailer: [
      'Before the sea. Before the sky. Before anything at all…',
      'there was darkness — and water — and the spirit of God, hovering.',
      'Then came a voice. And a word. And the word was — LIGHT.',
      '[[{Group}|{BIG}]]. One Chumash. Six days that built the whole world.',
      'Oceans split from sky. Land rises. Stars ignite.',
      'And on the seventh day… everything stops. Holy.',
      'This Shabbat, the story begins again. Parashat Bereshit.',
    ],
    pages: [
      {
        ref: 'Genesis 1:1-2',
        title: 'In the Very Beginning',
        story:
          "It was Friday night, and the Chumash on the Shabbat table was glowing. {BIG} opened it to the very first page — and the room melted away. [[The {group} were|{BIG} was]] floating in a deep, quiet dark. There was no floor and no sky, only water, dark and deep. {MID} squeezed her sister's hand. {BABY} blinked her big eyes. \"Where are we?\" {BIG} whispered, and read the first words: the earth was empty and unformed, darkness was over the deep, and the spirit of God was hovering over the water.",
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
          'On the second day there was water everywhere — above and below. God made a great expanse, a rakia, right in the middle, and it pushed the waters apart: some above, some below. {MID} lay back and looked up and up. "It\'s the sky!" said {MID}. {BIG} nodded at the page. God called the expanse Sky. And there was evening and there was morning, a second day.',
        question: 'What did the sky separate?',
        answer: 'The waters below the expanse from the waters above it (1:7).',
        scene:
          'the primordial world on the second day of creation: a great clear blue sky opening up between shimmering glassy waters high above and a calm endless ocean below, no land anywhere, no buildings, no people; the three sisters floating in the open air in the middle, looking up in amazement',
      },
      {
        ref: 'Genesis 1:9-13',
        title: 'Dry Land and Green Things',
        story:
          'On the third day, the waters rushed together into one place — and dry land came up! [[The {sisters}|{BIG}]] landed with a soft bump. God called the dry land Earth and the gathered waters Seas. Then grass sprang up between [[their|her]] toes, then plants with seeds, then fruit trees, each one making fruit with its seeds inside, every kind after its own kind. {BABY} patted the grass. {MID} sniffed a blossom. And God saw that it was good.',
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
          'The heavens and the earth were finished, and everything in them. Then came the seventh day, and God rested from all the work He had done. {BIG} read: God blessed the seventh day and made it holy. Everything went quiet and golden. {MID} whispered, "It\'s Shabbat." {BABY} snuggled in. [[The {sisters} sat together|{BIG} sat very still]] and did nothing at all — and it was the best feeling in the whole world.',
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
          'God had given one rule: do not eat from the Tree of Knowing Good and Bad. But the woman saw the fruit was nice to look at, and she took some and ate, and gave some to her husband, and he ate. {MID} covered her eyes. Then God sent them out of the garden to work the ground. At the gate, keruvim stood with a flaming, turning sword to guard the way to the Tree of Life. [[The {sisters} held hands very tight.|{BIG} held the Chumash very tight.]] "One rule," said {BIG} quietly. "That\'s all it was."',
        question: 'What guarded the way to the Tree of Life?',
        answer: 'The keruvim and the fiery, ever-turning sword (3:24).',
        scene:
          'the tall gate of a garden at dusk guarded by two towering keruvim — tall winged figures of pure golden light, twice as tall as a grown-up, faces hidden in their glow — and a slowly turning flaming sword, the three sisters outside holding hands, [[faces turned toward us as they glance|face turned toward us as she glances]] back at the glowing garden',
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
    tagline: '[[{Group} climb|{BIG} climbs]] aboard the ark and [[ride|rides]] out the flood.',
    color: '#4f8fc0',
    cover:
      'the three sisters at the open window of a huge wooden ark on stormy waters, a white dove flying toward them with an olive leaf, a rainbow breaking through the clouds behind',
    trailer: [
      'The world had gone wrong. Very, very wrong.',
      'But one man walked with God. His name… was Noach.',
      'Three hundred cubits of gopher wood. Pitch inside and out. Three decks.',
      'The fountains of the deep burst open. The windows of heaven — opened wide.',
      'Forty days. Forty nights. And [[{group}|{BIG}]]… on board.',
      'A raven. A dove. An olive leaf. And a promise written across the sky.',
      'All aboard. Parashat Noach.',
    ],
    pages: [
      {
        ref: 'Genesis 6:9-13',
        title: 'A Man Who Walked with God',
        story:
          'This time, when {BIG} opened the Chumash, a warm wind blew out of the pages — and [[the {sisters} were|she was]] standing on a dusty hill. The land below was full of people, but it was full of chamas, too — people grabbing and hurting. "That\'s not how the world is supposed to be," said {MID}. {BIG} read: Noach was a righteous man, wholehearted in his generation. Noach walked with God. He had three sons: Shem, Cham and Yefet.',
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
          'In the six hundredth year of Noach\'s life, in the second month, on the seventeenth day, all the fountains of the great deep burst open and the windows of the sky opened up. Rain fell for forty days and forty nights. [[The {sisters} hurried|{BIG} hurried]] up the ramp. Then {BIG} read a line that made her stop: "And Hashem shut him in." The great door closed behind them — safe and dry.',
        question: 'Who shut the door of the ark?',
        answer: 'Hashem shut him in (7:16).',
        scene:
          'a dramatic storm seen from inside the huge wooden ark: the great wooden side door swinging shut, through the closing gap torrents of rain and water bursting up from the ground, lightning; the three sisters just inside in warm lamplight, safe and dry',
      },
      {
        ref: 'Genesis 7:17-24',
        title: 'The Ark Floats',
        story:
          'The water rose and rose and lifted the ark right off the ground. The ark floated on the face of the waters, higher than the tallest mountains. Inside it was warm and noisy — mooing and roaring and chirping. [[The {sisters} peeked|{BIG} peeked]] out of the tzohar at the gray water everywhere. {BIG} read that the waters swelled on the earth for one hundred and fifty days. "That\'s a long time to be on a boat," said {MID}.',
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
          'God said to Noach: "Go out of the ark — you, your wife, your sons and your sons\' wives — and bring out every living thing with you." The big door opened. The animals poured out onto the dry, fresh land — running, hopping, flying. {MID} ran too. Then Noach built an altar to Hashem and brought offerings. [[The {sisters} stood|{BIG} stood]] quietly and watched the smoke rise.',
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
    tagline: '[[{Group} follow|{BIG} follows]] Avram and Sarai into the land of Canaan.',
    color: '#c9723e',
    cover:
      'the three sisters walking on a winding desert road toward golden hills of Canaan at sunrise, a caravan of camels and tents ahead, a sky full of fading stars',
    trailer: [
      'One voice. Two words. Lech lecha — GO.',
      'Leave your land. Your birthplace. Your father\'s house.',
      'He was seventy-five years old. And he went.',
      'Famine. Quarrels. Kings at war. Three hundred and eighteen men in the night.',
      'Look up at the stars. Count them — if you can.',
      '[[{Group}|{BIG}]]. One promise. A journey that never ends.',
      'Pack your bags. Parashat Lech Lecha.',
    ],
    pages: [
      {
        ref: 'Genesis 12:1-3',
        title: 'Go!',
        story:
          'This time the Chumash opened with just two words, and they rang out like a bell: "Lech lecha — Go!" [[The {sisters} found themselves|{BIG} found herself]] in Charan, beside a big tent. Hashem was speaking to Avram: Go from your land, from your birthplace, and from your father\'s house, to the land that I will show you. I will make you a great nation and bless you, and you will be a blessing. {MID} whispered, "But where?" {BIG} looked at the page. "He doesn\'t say yet," she said. "Avram just has to go."',
        question: 'What did Hashem promise Avram if he would go?',
        answer: 'To make him a great nation, to bless him, make his name great — and that he would be a blessing (12:2).',
        scene:
          'wide view of an ancient tent camp in Charan at dawn, huge beams of warm golden light pouring down from the sky, far away in the middle distance a tiny white-bearded old man in a brown robe stands alone looking up into the light; in the foreground the three sisters stand in a row looking up at the light in wonder',
      },
      {
        ref: 'Genesis 12:4-6',
        title: 'On the Road',
        story:
          'Avram went, just as Hashem told him, and Lot went with him. Avram was seventy-five years old when he left Charan. He took Sarai his wife, and Lot, and everything they had, and all the people who were with them — and they set out for the land of Canaan. [[The {sisters} walked behind the caravan, holding hands in a row.|{BIG} walked behind the caravan.]] {BABY} toddled along as fast as she could. About a hundred times, {MID} asked, "Are we there yet?" Finally they came to Shechem.',
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
          'Hashem said to Avram, "Don\'t be afraid, Avram — I am your shield." Then He took Avram outside and said: "Look at the sky and count the stars, if you can." [[The {sisters} lay on their backs|{BIG} lay on her back]] and tried. {MID} got to "eleven!" and gave up. "So will your offspring be," Hashem said. {BIG} read the last part twice: Avram believed in Hashem, and Hashem counted it for him as righteousness.',
        question: 'What did Hashem tell Avram to count?',
        answer: 'The stars — "so shall your offspring be" (15:5).',
        scene:
          'an enormous glittering desert night sky full of stars and the Milky Way, a tent glowing in the distance, the three sisters lying on their backs on a blanket pointing up at the stars',
      },
      {
        ref: 'Genesis 16:7-16',
        title: 'The God Who Sees',
        story:
          'An angel of Hashem found Hagar by a spring of water in the wilderness, on the road to Shur. "You will have a son," the angel said, "and you will call him Yishmael — because Hashem has heard you." Hagar called Hashem "El Ro\'i" — the God who sees me. {MID} splashed the cool water on her face. "He sees us too?" asked {MID}. {BIG} nodded. Avram was eighty-six when Yishmael was born.',
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
  // From Vayera on, the kids travel by the Parsha Box: a small carved box on the Shabbat table that opens,
  // grows big enough to climb into, and carries them to watch the parasha happen in front of them.
  {
    slug: 'vayera',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [2], [3], [5], [6, 7], [10, 11], [12, 'title']],
    parasha: 'Vayera',
    hebrew: 'וַיֵּרָא',
    range: 'Genesis 18:1–22:24',
    title: 'Three Guests and a Boy Named Laughter',
    tagline: '[[{Group} ride|{BIG} rides]] the Parsha Box to Avraham\'s tent — and [[watch|watches]] a promise come true.',
    color: '#d99a3a',
    cover:
      'a large carved olive-wood box with its lid wide open on a hill above a big desert tent under great oak trees, warm golden light pouring out of the box, the three sisters leaning out over its edge looking down in wonder, three travelers walking up the road toward the tent in the distance',
    trailer: [
      'It was the heat of the day. And three strangers were standing by the tent.',
      'Water. Bread. A calf, tender and good. Avraham ran.',
      'Next year, Sarah will have a son. And Sarah… laughed.',
      'Fire over Sedom. Do not look back.',
      'A baby named Laughter. A well in the wilderness.',
      'Avraham. Here I am. And the two of them walked on together.',
      '[[{Group}|{BIG}]]. One Parsha Box. Parashat Vayera.',
    ],
    pages: [
      {
        ref: 'Genesis 18:1-5',
        title: 'Into the Parsha Box',
        story: `Every Friday night, the Parsha Box sat on the Shabbat table: a little carved wooden box with a lid that opened only when you were ready to listen. Tonight it was warm to the touch. {BIG} lifted the lid — and the box grew and grew until it was big enough for [[all of them|her]] to climb inside. Whoosh! When the box stopped, it was perched on a hill above a big tent by the oaks of Mamre. It was the heat of the day, and Avraham was sitting at the door of his tent. He lifted his eyes and saw three men standing nearby — and he ran to greet them and bowed. "Please," he said, "let a little water be brought to wash your feet, and rest under the tree, and I'll bring a piece of bread." {MID} whispered, "He ran! In this heat!"`,
        question: 'What did Avraham offer the three men first?',
        answer: 'A little water to wash their feet, rest under the tree, and a piece of bread (18:4-5).',
        scene:
          'a large carved olive-wood box with its lid open resting on a sunny hilltop, the three sisters peeking over its edge; below in the middle distance a big goat-hair tent under great oak trees in the shimmering midday heat, an old bearded man in a brown robe hurrying toward three robed travelers standing on the path, all small and far away',
      },
      {
        ref: 'Genesis 18:6-8',
        title: 'A Feast in a Hurry',
        story: `"A piece of bread" turned into a feast! Avraham hurried into the tent to Sarah: "Quick — three se'ahs of fine flour! Knead it and make cakes." Then he ran to the herd and picked a calf, tender and good, and gave it to a young man, who hurried to make it ready. Avraham brought butter and milk and the meat and set it all in front of his guests, and he stood beside them under the tree while they ate. {MID} counted: "Hurry, run, quick, hurry!" {BABY} grabbed a crumb of cake. {BIG} laughed. "He said a little bread — and then he did a lot."`,
        question: 'Where did Avraham stand while his guests ate?',
        answer: 'Beside them, under the tree (18:8).',
        scene:
          'three robed travelers seated in the shade of a great oak tree beside a desert tent, low table with round flat cakes, bowls of butter and milk, an old bearded man standing beside them serving, figures seen from a distance; in the foreground the three sisters crouching behind a stone wall watching, the baby holding a crumb of cake',
      },
      {
        ref: 'Genesis 18:9-14',
        title: 'Sarah Laughs',
        story: `The guests asked, "Where is Sarah, your wife?" "Right here, in the tent," said Avraham. Then one said: "I will surely come back to you at this time next year — and Sarah your wife will have a son!" Sarah was listening at the door of the tent, behind him. Avraham and Sarah were old, very old. And Sarah laughed inside herself. {MID} giggled too. Then Hashem said to Avraham: "Why did Sarah laugh? Is anything too wondrous for Hashem?" {BIG} read that line twice. "Nothing is too wondrous," she said softly.`,
        question: 'What question did Hashem ask about Sarah\'s laughing?',
        answer: '"Is anything too wondrous for Hashem?" (18:14).',
        scene:
          'the doorway of a large goat-hair tent with the woven curtain half drawn, an elderly woman in a long dark robe and head covering standing just inside in shadow with her hand over her mouth, seen from a distance; the three sisters sitting on a woven rug nearby, the toddler giggling behind her hands',
      },
      {
        ref: 'Genesis 18:23-32',
        title: 'What If There Are Ten?',
        story: `The men looked out toward Sedom, and Avraham walked with them to send them on their way. Hashem told Avraham how wicked Sedom was. Then Avraham came close and asked: "Will You sweep away the righteous with the wicked? What if there are fifty righteous people in the city? Shall the Judge of all the earth not do justice?" Hashem said: for fifty, I will spare the whole place. "And forty-five?" asked Avraham. "Forty? Thirty? Twenty?" {MID} counted down on her fingers. "Ten?" And Hashem said: for the sake of the ten, I will not destroy it. {BIG} let out her breath. "He kept asking," she said, "for people he didn't even know."`,
        question: 'What was the smallest number Avraham asked about?',
        answer: 'Ten — "I will not destroy, for the sake of the ten" (18:32).',
        scene:
          'an old bearded man in a brown robe standing alone on a high rocky ridge at sunset looking down over a wide hazy plain with a distant walled city, a soft beam of golden light from the sky; the three sisters sitting in the open carved wooden box on the ridge behind him, the toddler counting on her fingers',
      },
      {
        ref: 'Genesis 19:15-17; Genesis 19:24-26',
        title: 'Don\'t Look Back',
        story: `When dawn came, the angels hurried Lot: "Get up! Take your wife and your two daughters and go!" Lot lingered — so the men grabbed his hand, and his wife's hand, and his daughters' hands, because Hashem had pity on him, and they brought them out of the city. "Run for your life," they said. "Don't look behind you, and don't stop anywhere in the plain. Run to the mountain!" Then Hashem rained sulfur and fire on Sedom and Amorah. But Lot's wife looked back — and she became a pillar of salt. [[The {sisters} held on to the edge of the Parsha Box and did not look back either.|{BIG} held on to the edge of the Parsha Box and did not look back either.]]`,
        question: 'What did the angels tell Lot not to do?',
        answer: 'Not to look behind him and not to stop anywhere in the plain (19:17).',
        scene:
          'early dawn in a wide plain, four tiny robed figures far away hurrying along a road toward dark mountains, a distant orange glow on the horizon behind them; in the foreground the three sisters safe inside the open carved wooden box on a high ridge, facing us, holding hands and looking toward the mountains',
      },
      {
        ref: 'Genesis 21:1-7',
        title: 'A Baby Named Laughter',
        story: `Then Hashem remembered Sarah, just as He had said. Sarah had a son for Avraham in his old age, at the very time God had promised. Avraham named him Yitzchak, and when the baby was eight days old, Avraham gave him a brit milah, just as God commanded. Avraham was one hundred years old! Sarah said: "God has made laughter for me — everyone who hears will laugh with me." And [[they all did|she did]]. {MID} laughed. {BABY} laughed so hard she hiccupped. "Yitzchak," said {BIG}, "means he will laugh."`,
        question: 'How old was Avraham when Yitzchak was born?',
        answer: 'One hundred years old (21:5).',
        scene:
          'a joyful scene outside a big festive desert tent hung with colorful woven cloths, an elderly couple seen from behind in the tent doorway, oil lamps and flowers; the three sisters in front laughing together, the baby giggling in her big sister\'s arms',
      },
      {
        ref: 'Genesis 21:14-19',
        title: 'A Well in the Wilderness',
        story: `Avraham got up early, took bread and a skin of water and put it on Hagar's shoulder, and sent her away with her son, Yishmael. She wandered in the wilderness of Be'er Sheva. Then the water in the skin ran out. Hagar sat down far away and cried. But God heard the voice of the boy, and an angel of God called to Hagar from the sky: "What is wrong, Hagar? Don't be afraid — God has heard the boy's voice. Get up and lift him." Then God opened her eyes, and she saw a well of water! She filled the skin and gave the boy a drink. {MID} let out a big breath. "God heard him," said {BIG}. "Just like his name."`,
        question: 'What did Hagar see when God opened her eyes?',
        answer: 'A well of water (21:19).',
        scene:
          'a vast sunlit desert wilderness with a few dry bushes, a stone well with clear water glinting, a grown woman in a dark cloak and head scarf seen from behind kneeling by the well filling a leather water skin, a soft beam of light from the sky; the three sisters standing nearby with wide happy eyes',
      },
      {
        ref: 'Genesis 21:27-33',
        title: 'Seven Lambs and a Tree',
        story: `Avimelech, the king of Gerar, came to make a covenant with Avraham. Avraham gave him sheep and cattle, and the two of them made a covenant. Then Avraham set seven ewe lambs apart. "Take these seven lambs from me," he said, "as a witness that I dug this well." That is why the place is called Be'er Sheva — because there the two of them swore. {MID} counted the lambs: "One, two, three… seven!" Then Avraham planted a tamarisk tree, an eshel, in Be'er Sheva, and called there in the name of Hashem, God of the world. {BABY} patted the little tree.`,
        question: 'Why did Avraham give Avimelech seven ewe lambs?',
        answer: 'As a witness that Avraham dug the well (21:30).',
        scene:
          'a stone well in a dry sunny landscape, two robed grown men far apart shaking hands in the middle distance, seven fluffy white lambs standing in a row near the well, a young tamarisk sapling freshly planted; the toddler counting the lambs on her fingers, the older girl kneeling beside the baby who pats the little tree',
      },
      {
        ref: 'Genesis 22:1-3',
        title: 'Here I Am',
        story: `After these things, God tested Avraham. "Avraham!" He called. "Hineni — here I am," said Avraham. Then God said: "Take your son, your only one, whom you love — Yitzchak — and go to the land of Moriyah, and bring him up there as an offering on one of the mountains that I will tell you." {MID} grabbed her sister's hand. "Is it going to be okay?" {BIG} looked at the next line. "Keep watching," she said. Avraham got up early in the morning, saddled his donkey, took two young men and Yitzchak, split the wood, and set out.`,
        question: 'What did Avraham answer when God called him?',
        answer: '"Hineni — here I am" (22:1).',
        scene:
          'pale blue early morning outside a desert tent, a white-bearded old man in a brown robe saddling a donkey loaded with a bundle of split wood, a young man and two servants beside him, all seen from a distance; the three sisters sitting in the open carved wooden box nearby, the toddler holding her big sister\'s hand',
      },
      {
        ref: 'Genesis 22:4-8',
        title: 'The Two of Them Together',
        story: `On the third day, Avraham lifted his eyes and saw the place from far away. "Stay here with the donkey," he told the young men. "The boy and I will go up there, bow down, and come back to you." Avraham put the wood on Yitzchak, and he took the fire, and the two of them walked on together. Then Yitzchak said, "My father!" "Here I am, my son." "Here is the fire and the wood — but where is the lamb for the offering?" Avraham said: "God will see to the lamb, my son." {BIG} read the last words very quietly: "And the two of them walked on together."`,
        question: 'What did Yitzchak ask his father?',
        answer: '"Here is the fire and the wood, but where is the lamb for the offering?" (22:7).',
        scene:
          'a rocky mountain path at golden hour, an old bearded man and a young man in simple robes walking side by side away from us up toward a distant mountaintop, the young man carrying a bundle of wood, the old man holding a small clay fire pot; the three sisters watching quietly from behind a boulder, facing us',
      },
      {
        ref: 'Genesis 22:9-14',
        title: 'A Ram in the Thicket',
        story: `They came to the place God had told him, and Avraham built the altar there and laid out the wood. {MID} could hardly breathe. Then an angel of Hashem called to him from the sky: "Avraham! Avraham!" "Here I am." "Do not put your hand on the boy, and do nothing to him — for now I know that you fear God." Avraham lifted his eyes — and there was a ram, caught in the thicket by its horns! Avraham brought the ram as an offering instead of his son. He named the place "Hashem Yir'eh" — Hashem will see. {BABY} pointed at the ram and said, "Baa!"`,
        question: 'Where was the ram caught?',
        answer: 'In the thicket, by its horns (22:13).',
        scene:
          'a sunlit mountaintop with a simple stone altar and stacked wood in the middle distance, a woolly ram with big curled horns tangled in a thorny thicket in the foreground, a bright beam of light from the sky, an old man and a young man standing far away; the three sisters nearby, the baby pointing at the ram',
      },
      {
        ref: 'Genesis 22:15-18; Genesis 22:20-23',
        title: 'Stars, Sand — and Rivka',
        story: `The angel of Hashem called again: "Because you did this, I will bless you, and make your offspring as many as the stars of the sky and the sand on the seashore — because you listened to My voice." Then Avraham heard news from far away: his brother Nachor had a big family now, and Nachor's son Betuel had a daughter named Rivka. {BIG} smiled at the name. [[The {sisters} climbed|{BIG} climbed]] back into the Parsha Box, and whoosh — [[they were|she was]] home at the Shabbat table, and the box was small again. "Next week," said {BIG}, "we meet Rivka."`,
        question: 'What two things did the angel compare Avraham\'s offspring to?',
        answer: 'The stars of the sky and the sand on the seashore (22:17).',
        scene:
          'back home at a cozy Shabbat table at night with candles and challah, a small carved olive-wood box on the table with its lid closing and a last glow of golden light and tiny stars drifting out of it, the three sisters around it, the toddler yawning, the baby asleep in her big sister\'s lap',
      },
    ],
  },
  {
    slug: 'chayei-sarah',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [4], [5], [6, 7], [9], [10, 11], [12, 'title']],
    parasha: 'Chayei Sarah',
    hebrew: 'חַיֵּי שָׂרָה',
    range: 'Genesis 23:1–25:18',
    title: 'Ten Camels and a Girl at the Well',
    tagline: '[[{Group} ride|{BIG} rides]] the Parsha Box to the well — and [[meet|meets]] Rivka.',
    color: '#c48a5a',
    cover:
      'a large carved olive-wood box with its lid open on a sandy rise at sunset above a stone well outside an ancient town, ten kneeling camels around the well, golden light pouring out of the box, the three sisters leaning over its edge looking down excitedly',
    trailer: [
      'One hundred and twenty-seven years. The life of Sarah.',
      'A servant. A promise. Go to my land, and find a wife for my son.',
      'Ten camels. One well. And a prayer at evening.',
      'Drink — and I will water your camels too.',
      'Will you go with this man? I will go.',
      'A veil. A tent. And Yitzchak loved her.',
      '[[{Group}|{BIG}]]. One Parsha Box. Parashat Chayei Sarah.',
    ],
    pages: [
      {
        ref: 'Genesis 23:1-2',
        title: 'The Life of Sarah',
        story: `On Friday night, the Parsha Box on the Shabbat table opened slowly, all by itself, as if it knew this week would start quietly. [[The {sisters} climbed|{BIG} climbed]] in, the box grew, and whoosh — it set down on a hill in Chevron. {BIG} read: the life of Sarah was one hundred and twenty-seven years. Sarah died in Kiryat Arba, which is Chevron, in the land of Canaan. And Avraham came to mourn for Sarah and to cry for her. {MID} leaned against her sister. {BABY} was very still. "We saw her laugh last week," {MID} whispered.`,
        question: 'How long was the life of Sarah?',
        answer: 'One hundred and twenty-seven years (23:1).',
        scene:
          'a large carved olive-wood box with its lid open resting on a quiet green hill at soft gray dawn, the three sisters sitting inside it close together, facing us; far below in the valley a large tent among olive trees and an old man seen from behind sitting alone at its doorway',
      },
      {
        ref: 'Genesis 23:3-11',
        title: 'A Cave at the End of the Field',
        story: `Avraham got up and spoke to the people of Chet, the people who lived there. "I am a stranger and a resident among you," he said. "Give me a place to bury." They answered: "You are a prince of God among us!" Avraham bowed to them and asked for one thing: the Cave of Machpelah, at the end of the field of a man named Efron. Efron said, "I give you the field, and I give you the cave in it." {MID} said, "That's nice!" {BIG} turned the page. "Wait and see what Avraham says."`,
        question: 'What did Avraham call himself when he spoke to the people of Chet?',
        answer: '"A stranger and a resident among you" (23:4).',
        scene:
          'a group of robed elders sitting at the stone gate of an ancient town, an old bearded man in a brown robe bowing respectfully before them, all seen from a distance; the three sisters standing by an old stone wall in the foreground watching',
      },
      {
        ref: 'Genesis 23:12-20',
        title: 'Four Hundred Shekels',
        story: `Avraham did not want it as a gift. "I will pay the price of the field," he said. "Take it from me." Efron said: "Land worth four hundred shekels of silver — what is that between you and me?" So Avraham weighed out four hundred shekels of silver, in front of everyone. {MID} tried to count the shining pieces and got lost at twelve. The field and the cave and all the trees around its border became Avraham's. And Avraham buried Sarah there, in the Cave of Machpelah, near Mamre — that is Chevron.`,
        question: 'How much did Avraham pay for the field?',
        answer: 'Four hundred shekels of silver (23:16).',
        scene:
          'an ancient balance scale piled with shining silver pieces on a stone ledge at a town gate, robed elders watching from a distance, a green field with trees and a dark cave opening in a hillside beyond; the toddler trying to count the silver pieces on her fingers, the older girl holding the baby',
      },
      {
        ref: 'Genesis 24:1-4',
        title: 'A Job for the Servant',
        story: `Avraham was old now, and Hashem had blessed him in everything. He called his servant — the oldest one in his house, who was in charge of everything he had. "Swear to me by Hashem," said Avraham, "that you will not take a wife for my son from the daughters of Canaan, where I live. Go to my land and my birthplace, and take a wife for my son, for Yitzchak." {MID} asked, "How will he know which one?" {BIG} shrugged and smiled. "Neither does he," she said. "Yet."`,
        question: 'Where did Avraham send his servant to find a wife for Yitzchak?',
        answer: 'To his land and his birthplace (24:4).',
        scene:
          'inside a large lamp-lit goat-hair tent, a very old white-bearded man seated on cushions speaking seriously to a gray-bearded servant who stands with his hand on his heart, seen from a distance; the three sisters peeking in through the open tent flap, facing us',
      },
      {
        ref: 'Genesis 24:10-14',
        title: 'Ten Camels and a Prayer',
        story: `The servant took ten of his master's camels, loaded with good things, and traveled all the way to Aram Naharayim, to the city of Nachor. [[The {sisters} rode|{BIG} rode]] along in the Parsha Box. In the evening, the servant made the camels kneel outside the city by the well — the time when the women came out to draw water. Then he prayed: "Hashem, God of my master Avraham, let it happen for me today. The girl I ask, 'Please tip your jar so I can drink,' who says, 'Drink — and I'll water your camels too' — let her be the one." {MID} whispered, "Ten camels drink a LOT."`,
        question: 'What did the servant ask Hashem for at the well?',
        answer: 'That the girl who would say "Drink, and I will water your camels too" be the one for Yitzchak (24:14).',
        scene:
          'ten camels kneeling around an old stone well outside an ancient walled town at golden evening, a gray-bearded servant in traveling robes standing with his face turned up toward the sky in prayer, seen from a distance; the three sisters sitting in the open carved wooden box on a sandy rise nearby, the toddler counting camels',
      },
      {
        ref: 'Genesis 24:15-20',
        title: 'Drink — and Your Camels Too!',
        story: `Before he had even finished praying — there came Rivka, the daughter of Betuel, with her jar on her shoulder! She went down to the spring, filled her jar, and came up. The servant ran to her: "Please let me sip a little water from your jar." "Drink, my lord," she said, and quickly lowered her jar and gave him a drink. Then she said, "I'll draw water for your camels too, until they've finished drinking." She emptied her jar into the trough and ran back to the well again and again, for all his camels. {MID} counted every trip. {BABY} clapped. "She said the exact words!" said {BIG}.`,
        question: 'What did Rivka say after she gave the servant a drink?',
        answer: '"I will draw for your camels too, until they finish drinking" (24:19).',
        scene:
          'a young woman in a long modest blue robe and head scarf, seen from behind, pouring water from a big clay jar into a long stone trough at an ancient well, a row of thirsty camels drinking, a gray-bearded servant watching amazed in the background, warm evening light; the three sisters nearby, the baby clapping',
      },
      {
        ref: 'Genesis 24:21-27',
        title: 'A Gold Ring and Two Bracelets',
        story: `The man stood quietly, watching her, to know whether Hashem had made his journey succeed. When the camels finished drinking, he took out a gold nose ring weighing half a shekel and two gold bracelets weighing ten shekels. "Whose daughter are you?" he asked. "Is there room in your father's house for us to stay?" "I am the daughter of Betuel, the son of Milkah and Nachor," she said. "We have plenty of straw and food, and a place to stay." Then the man bowed down and blessed Hashem, who had not left His kindness and truth for his master. "Betuel!" said {BIG}. "That's Avraham's family!"`,
        question: 'Whose daughter was Rivka?',
        answer: 'Betuel\'s — the son of Milkah and Nachor, Avraham\'s brother (24:24).',
        scene:
          'close view of a weathered hand holding out a small gold ring and two shining gold bracelets in the warm sunset light beside an ancient stone well, camels resting behind; the three sisters leaning in to look at the gold, eyes wide',
      },
      {
        ref: 'Genesis 24:28-33',
        title: 'Not Until I Tell',
        story: `Rivka ran and told everyone at her mother's house. Her brother Lavan saw the ring and the bracelets and ran out to the man at the spring. "Come in, blessed of Hashem!" said Lavan. "Why are you standing outside? I've made the house ready, and a place for the camels." The camels were unloaded and given straw and food, and there was water to wash the travelers' feet. Then food was put in front of the servant — but he said, "I will not eat until I have said what I came to say." {MID}'s tummy rumbled. "I would eat first," she said.`,
        question: 'Why didn\'t the servant eat right away?',
        answer: 'He would not eat until he had told them why he came (24:33).',
        scene:
          'the courtyard of an ancient mud-brick house at dusk, camels being unloaded, bundles of straw, a clay basin of water, a gray-bearded servant seated at a low table of food holding up his hand politely, a young man in a striped robe beside him, all seen from a distance; the three sisters sitting on a bench by the wall, the toddler holding her tummy',
      },
      {
        ref: 'Genesis 24:50-58',
        title: 'I Will Go',
        story: `The servant told them everything — the promise, the prayer, the well. Lavan and Betuel answered: "This came from Hashem! Here is Rivka — take her and go." The servant bowed to the ground to Hashem, and brought out silver and gold jewelry and clothing for Rivka, and gifts for her brother and her mother. In the morning her family said, "Let her stay with us a few days — maybe ten." But the servant wanted to go. So they said, "Let's call the girl and ask her." "Will you go with this man?" And Rivka said: "I will go." {BIG} read it again: "Elech." Just one word.`,
        question: 'What did Rivka answer when they asked her?',
        answer: '"I will go" — elech (24:58).',
        scene:
          'inside a lamp-lit ancient house, a young woman in a modest blue robe and head scarf seen from behind standing tall before her seated family, an open chest of gold jewelry and folded fine cloth on the floor, figures in the middle distance; the three sisters sitting on cushions nearby, facing us, listening intently',
      },
      {
        ref: 'Genesis 24:59-61',
        title: 'Thousands of Ten-Thousands',
        story: `So they sent Rivka off with her nurse, and with the servant and his men. And they blessed Rivka: "Our sister, may you become thousands of ten-thousands!" Then Rivka and her maids got up, rode on the camels, and followed the man. [[The {sisters} rode|{BIG} rode]] right behind them in the Parsha Box. {MID} waved goodbye to Rivka's family. {BABY} bounced with every camel step. "Thousands of ten-thousands," said {MID}. "Is that more than eleven?"`,
        question: 'What blessing did Rivka\'s family give her?',
        answer: '"Our sister, may you become thousands of ten-thousands" (24:60).',
        scene:
          'a camel caravan setting out at sunrise from an ancient mud-brick town, young women in modest robes and head scarves riding on the camels seen from behind, a family waving in the distance; in the foreground the three sisters riding in the open carved wooden box following the caravan, the toddler waving, the baby bouncing',
      },
      {
        ref: 'Genesis 24:62-67',
        title: 'Yitzchak in the Field',
        story: `Yitzchak was living in the Negev. Toward evening he went out to the field to pray and think, and he lifted his eyes — and saw camels coming! Rivka lifted her eyes and saw Yitzchak, and she got down from the camel. "Who is that man walking in the field toward us?" she asked. "That is my master," said the servant. So she took her veil and covered herself. The servant told Yitzchak everything that had happened. Yitzchak brought Rivka into the tent of Sarah his mother, and she became his wife, and he loved her. And Yitzchak was comforted after his mother. {MID} sighed happily.`,
        question: 'Into whose tent did Yitzchak bring Rivka?',
        answer: 'The tent of Sarah his mother (24:67).',
        scene:
          'a wide golden field at sunset, a young man in a simple robe walking alone in the middle distance, far away a camel caravan arriving and a veiled young woman in blue stepping down from a camel, all small; the three sisters sitting in tall grass in the foreground, the toddler sighing happily with her chin in her hands',
      },
      {
        ref: 'Genesis 25:7-11',
        title: 'Yitzchak and Yishmael',
        story: `Avraham lived one hundred and seventy-five years, a good long life. His sons, Yitzchak and Yishmael, buried him in the Cave of Machpelah — the field Avraham had bought — next to Sarah. After that, God blessed Yitzchak, his son. {BIG} closed the Chumash. [[The {sisters} climbed|{BIG} climbed]] back into the Parsha Box, and whoosh — [[they were|she was]] home at the Shabbat table, and the box was small again. {MID} rubbed her eyes. "Next week," said {BIG}, "Rivka has twins!"`,
        question: 'Who buried Avraham?',
        answer: 'His sons, Yitzchak and Yishmael (25:9).',
        scene:
          'back home at a cozy Shabbat table at night with candles and challah, a small carved olive-wood box on the table with its lid closing and a last warm glow drifting out of it, the three sisters around it, the older girl closing a book, the toddler rubbing her eyes, the baby asleep',
      },
    ],
  },
  {
    slug: 'toldot',
    // Trailer: which pages play under each voiceover line (0 = cover, 'title' = title card).
    trailerShots: [[1], [2, 3], [4], [7, 8], [10], [11], [12, 'title']],
    parasha: 'Toldot',
    hebrew: 'תּוֹלְדֹת',
    range: 'Genesis 25:19–28:9',
    title: 'Twins, Wells and a Blessing',
    tagline: '[[{Group} ride|{BIG} rides]] the Parsha Box into Yitzchak and Rivka\'s tent — and [[meet|meets]] Esav and Yaakov.',
    color: '#9a6b3f',
    cover:
      'a large carved olive-wood box with its lid open on a hill at sunset above a desert tent camp, a bubbling pot of red lentil stew over a small fire beside the tent, a stone well with water sparkling, golden light pouring out of the box, the three sisters leaning over its edge looking down',
    trailer: [
      'Two nations. One mother. And they were already pushing.',
      'One came out red and hairy. One came out holding his heel.',
      'A pot of red, red stew. A birthright — sold.',
      'Wells dug. Wells fought over. And then — room for everyone.',
      'Two goats. Goatskin gloves. His brother\'s best clothes.',
      'The voice is the voice of Yaakov. But the hands are the hands of Esav.',
      '[[{Group}|{BIG}]]. One Parsha Box. Parashat Toldot.',
    ],
    pages: [
      {
        ref: 'Genesis 25:19-23',
        title: 'Two Nations Inside',
        story: `The Parsha Box was rattling on the Shabbat table, as if something inside was pushing. {BIG} lifted the lid, the box grew, [[the {sisters} climbed|she climbed]] in — and whoosh! It set down beside a big tent. {BIG} read: Yitzchak was forty years old when he married Rivka. Rivka had no children, so Yitzchak prayed to Hashem for his wife — and Hashem answered him. But the babies pushed and pushed inside her! Rivka went to ask Hashem, and Hashem told her: "Two nations are inside you. One will be stronger than the other, and the older will serve the younger." {MID} gasped. "Twins!"`,
        question: 'What did Hashem tell Rivka was inside her?',
        answer: 'Two nations — "the older will serve the younger" (25:23).',
        scene:
          'a large carved olive-wood box with its lid open landing beside a big goat-hair tent at twilight, golden light swirling out of the box, the three sisters climbing out of it in excitement, facing us; in the distance a young woman in a modest blue robe and head scarf, seen from behind, standing alone under the first stars',
      },
      {
        ref: 'Genesis 25:24-26',
        title: 'Red and Hairy, Holding On',
        story: `When it was time — there were twins! The first one came out red, all over like a hairy cloak, and they named him Esav. Then his brother came out, and his hand was holding on to Esav's heel, so they named him Yaakov. {MID} grabbed {BIG}'s heel to show how. {BABY} grabbed {MID}'s. Everyone tumbled over laughing. {BIG} read: Yitzchak was sixty years old when they were born. "He waited twenty years," she said.`,
        question: 'Why was Yaakov named Yaakov?',
        answer: 'Because his hand was holding on to Esav\'s heel — akev (25:26).',
        scene:
          'inside a cozy lamp-lit tent at night, two little woven reed cradles side by side, one with a fuzzy red wool blanket and the other with a plain cream blanket, oil lamps glowing; the three sisters tumbling on a rug laughing, the toddler holding her big sister\'s heel, the baby holding the toddler\'s',
      },
      {
        ref: 'Genesis 25:27-28',
        title: 'The Hunter and the Tent',
        story: `The boys grew up. Esav became a skilled hunter, a man of the field. Yaakov was a wholesome man who stayed in the tents. Yitzchak loved Esav, because Esav brought him meat from his hunting. And Rivka loved Yaakov. {MID} looked from one brother to the other. "They're so different," she said. "Twins can be different," said {BIG}. "Like you and me — and we're not even twins."`,
        question: 'How does the Torah describe Yaakov?',
        answer: 'A wholesome man (ish tam) who dwelled in tents (25:27).',
        scene:
          'split view of a desert camp: on the left a rugged young man with a bow on his back striding off into open wild fields, on the right a calm young man sitting in the doorway of a tent among sheep; the three sisters standing in the middle looking from one to the other',
      },
      {
        ref: 'Genesis 25:29-34',
        title: 'Red, Red Stew',
        story: `One day Yaakov was cooking a stew, and Esav came in from the field, exhausted. "Pour me some of that red, red stuff — I'm exhausted!" That is why he was called Edom. Yaakov said, "First sell me your birthright." "I'm about to die," said Esav. "What good is a birthright to me?" So Esav swore and sold it. Yaakov gave him bread and lentil stew, and he ate and drank and got up and left. {BIG} read the last words slowly: "And Esav despised the birthright." {MID} shook her head. "I would never trade something special for soup."`,
        question: 'What did Esav sell to Yaakov for the stew?',
        answer: 'His birthright (25:33).',
        scene:
          'beside a tent a calm young man stirring a bubbling clay pot of red lentil stew over a small fire, a tired rugged young man with a bow flopping down beside him reaching for a bowl, bread on a cloth, seen from a little distance; the three sisters nearby, the toddler shaking her head, the baby sniffing the steam',
      },
      {
        ref: 'Genesis 26:1-5',
        title: 'Stay in the Land',
        story: `There was a famine in the land, like in Avraham's days. Yitzchak went to Avimelech, king of the Plishtim, in Gerar. Hashem appeared to him and said: "Don't go down to Egypt. Live in this land, and I will be with you and bless you. I will make your offspring as many as the stars of the sky, and give them all these lands — because Avraham listened to My voice." {MID} looked up. "Stars again!" she said. "Same promise," said {BIG}. "Now it's Yitzchak's turn."`,
        question: 'Where did Hashem tell Yitzchak not to go?',
        answer: 'Down to Egypt (26:2).',
        scene:
          'a dry cracked landscape at night under a sky full of brilliant stars, a man in a robe seen from behind standing at the edge of a tent camp in a soft beam of golden light looking up; the three sisters sitting in the open carved wooden box on a rock nearby pointing up at the stars',
      },
      {
        ref: 'Genesis 26:12-14',
        title: 'A Hundred Times as Much',
        story: `Yitzchak planted seeds in that land, and that year he harvested a hundred times as much — because Hashem blessed him. The man grew great, and greater and greater, until he was very great. He had flocks of sheep and herds of cattle and many servants. {MID} hid in the tall golden wheat. {BABY} hugged a whole sheaf. And the Plishtim were jealous of him.`,
        question: 'How much did Yitzchak harvest that year?',
        answer: 'A hundred times what he planted (26:12).',
        scene:
          'enormous fields of tall golden wheat in bright sunshine stretching to the horizon, herds of sheep and cattle beyond, workers far away; the toddler peeking out of the tall wheat, the baby hugging a big sheaf, the older girl laughing',
      },
      {
        ref: 'Genesis 26:18-22',
        title: 'Esek, Sitnah, Rechovot',
        story: `Yitzchak dug again the wells his father Avraham had dug, which the Plishtim had stopped up — and he gave them the same names his father had. Then his servants dug in the valley and found a well of fresh, flowing water. But the shepherds of Gerar argued: "The water is ours!" So he named it Esek — Argument. They dug another well, and they fought over that one too, so he named it Sitnah. He moved on and dug another well — and nobody fought over it. He named it Rechovot: "Now Hashem has made room for us." {MID} spread her arms wide. "Room for everyone!"`,
        question: 'Why did Yitzchak name the third well Rechovot?',
        answer: '"For now Hashem has made room for us" (26:22).',
        scene:
          'a wide valley with three stone wells: two far away with small groups of shepherds arguing, and one in the front with clear fresh water sparkling up and nobody arguing, servants with shovels resting; the toddler standing by the front well with her arms spread wide, the older girl and baby splashing their hands in the water',
      },
      {
        ref: 'Genesis 26:23-25; Genesis 26:32-33',
        title: 'We Found Water!',
        story: `Yitzchak went up to Be'er Sheva. That night Hashem appeared to him: "I am the God of Avraham your father. Don't be afraid, for I am with you." So Yitzchak built an altar there and called out in the name of Hashem, and he pitched his tent, and his servants dug a well. That very day the servants came running: "We found water!" He named it Shiv'ah. {BIG} read: that's why the city is called Be'er Sheva to this day. {MID} gasped. "Be'er Sheva — we were there last time, with Avraham!"`,
        question: 'What did Yitzchak build in Be\'er Sheva?',
        answer: 'An altar — and he pitched his tent there and his servants dug a well (26:25).',
        scene:
          'a sunny desert camp with a tent and a simple stone altar, servants running joyfully toward us from a freshly dug well with water splashing up; the three sisters cheering in the foreground, the baby clapping',
      },
      {
        ref: 'Genesis 27:1-4',
        title: 'Go Out and Hunt',
        story: `Yitzchak grew old, and his eyes grew too dim to see. He called Esav, his older son: "My son!" "Here I am." "I am old now. Take your bow and your arrows, go out to the field and hunt for me. Make me the tasty food I love and bring it to me, so I can eat and bless you." Esav went out to the field. {MID} whispered, "He's going to get the blessing." {BIG} looked over at the other side of the tent. "Someone else was listening," she said.`,
        question: 'What did Yitzchak ask Esav to bring him?',
        answer: 'Game from the field, made into the tasty food he loved (27:3-4).',
        scene:
          'inside a dim tent, a very old white-bearded man with cloudy eyes sitting on cushions, a rugged young man with a bow and quiver standing before him, seen from a distance; at the edge of the tent curtain a young woman in a blue head scarf listening, seen from behind; the three sisters sitting quietly by the tent pole, facing us',
      },
      {
        ref: 'Genesis 27:5-17',
        title: 'Goatskin Gloves',
        story: `Rivka heard everything. She said to Yaakov: "Listen to me, my son. Go to the flock and bring me two good young goats, and I'll make them into the tasty food your father loves. You will bring it to him." Yaakov said: "But Esav my brother is a hairy man, and I am a smooth man! What if my father touches me?" Rivka said, "Just listen to my voice." She dressed Yaakov in Esav's best clothes, and she put the goat skins on his hands and on the smooth part of his neck. {MID} patted her own arm. "Smooth," she said. {BABY} patted a goat.`,
        question: 'Why was Yaakov worried about his father touching him?',
        answer: 'Because Esav was a hairy man and Yaakov was smooth (27:11).',
        scene:
          'inside a lamp-lit tent, a woman in a blue robe and head scarf seen from behind wrapping fuzzy goat skin around the hands of a nervous young man in a fine red robe, a steaming clay pot nearby, two little goats at the tent door; the three sisters watching, the toddler patting her own arm, the baby petting a goat',
      },
      {
        ref: 'Genesis 27:18-29',
        title: 'The Voice and the Hands',
        story: `Yaakov came to his father: "My father." "Here I am. Who are you, my son?" "I am Esav, your firstborn." "Come close so I can feel you," said Yitzchak. Yitzchak felt him and said: "The voice is the voice of Yaakov — but the hands are the hands of Esav." He did not recognize him, and he blessed him: "May God give you of the dew of the sky and the richness of the earth, and plenty of grain and wine." {MID} put her hands over her mouth. "He knew the voice," whispered {BIG}. "But he trusted the hands."`,
        question: 'What did Yitzchak say about the voice and the hands?',
        answer: '"The voice is the voice of Yaakov, but the hands are the hands of Esav" (27:22).',
        scene:
          'inside a dim tent, a very old blind white-bearded man reaching out to feel the goat-skin covered hands of a young man in a fine red robe kneeling before him, a bowl of food between them, seen from a little distance in warm lamplight; the three sisters huddled by the tent wall, the toddler with her hands over her mouth',
      },
      {
        ref: 'Genesis 27:30-34; Genesis 28:1-5',
        title: 'Off to Charan',
        story: `Yaakov had just gone out when Esav came in from hunting. "Who are you?" asked Yitzchak. "I am Esav!" Yitzchak trembled very much. And Esav cried a great and bitter cry: "Bless me too, my father!" Later, Yitzchak called Yaakov and blessed him, and told him: "Go to Paddan Aram, to the house of Betuel, your mother's father, and marry one of Lavan's daughters. May God give you the blessing of Avraham." [[The {sisters} climbed|{BIG} climbed]] back into the Parsha Box, and whoosh — [[they were|she was]] home at the Shabbat table, and the box was small again. "Next week," said {BIG}, "Yaakov goes on a long trip — and has a dream."`,
        question: 'Where did Yitzchak send Yaakov?',
        answer: 'To Paddan Aram, to the house of Betuel, to marry from the daughters of Lavan (28:2).',
        scene:
          'back home at a cozy Shabbat table at night with candles and challah, a small carved olive-wood box on the table with its lid closing and a last golden glow showing a tiny traveler on a long road at sunset inside the light, the three sisters around it, the older girl closing a book, the toddler yawning, the baby asleep',
      },
    ],
  },
];

export const bookBySlug = Object.fromEntries(books.map((b) => [b.slug, b]));

// Tell a story for a cast.
//   {BIG}/{MID}/{BABY}    — names
//   {group} / {Group}     — "three sisters", "two sisters", "three friends", … (only used on the plural side)
//   {sisters}             — "sisters" or "friends"
//   [[plural|solo]]       — the first text for two or more children, the second when there is only one
export function tell(text, cast, sisters = true) {
  const n = ['big', 'mid', 'baby'].filter((r) => cast[r]?.name).length || 1;
  const kin = sisters ? 'sisters' : 'friends';
  const group = `${['one', 'one', 'two', 'three'][n]} ${kin}`;
  let out = text.replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, (_, many, one) => (n > 1 ? many : one));
  // Drop sentences about roles nobody is playing.
  const missing = ['BIG', 'MID', 'BABY'].filter((r) => !cast[r.toLowerCase()]?.name).map((r) => `{${r}}`);
  if (missing.length) {
    // Break only where a new sentence starts, so `"Wow!" she said.` stays in one piece.
    const sentences = out.split(/(?<=[.!?]["”']?)\s+(?=["“A-Z{])/);
    out = sentences.filter((x) => !missing.some((m) => x.includes(m))).join(' ').trim();
  }
  return out
    .replaceAll('{Group}', group[0].toUpperCase() + group.slice(1))
    .replaceAll('{group}', group)
    .replaceAll('{sisters}', kin)
    .replaceAll('{BIG}', cast.big?.name || '')
    .replaceAll('{MID}', cast.mid?.name || '')
    .replaceAll('{BABY}', cast.baby?.name || '');
}

// Fill a story for the default cast (three sisters).
export const castStory = (text, cast) => tell(text, cast, true);

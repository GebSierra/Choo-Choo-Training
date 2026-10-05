// What a first-time grown-up reads: why this app teaches the sound of a letter, not its name.
// Parent-facing only: it is never spoken and never shown to the child. It names letter names on purpose
// (“em”, “ay”) to explain what to avoid, which is why it lives here and not in curriculum.json.
export const WELCOME = [
  { title: 'Welcome to Choo Choo Training', body: ['Sit with your child. You say the sounds; the app shows the way and plays the games.', 'Tap the glowing lesson to start.'] },
  { title: 'Say the sound, not the name', body: [
    'Many reading programs begin with the names of the letters, and with capital letters too. When a child is first learning to read, it helps to strip away everything that is confusing or not needed, and keep it as simple as you can.',
    'So here, call a letter by its sound: mmm for m, not “em”, and aaa (as in apple) for a, not “ay”.',
  ] },
  { title: 'Why it matters', body: [
    'Sound out the word ma. With letter names it would be “em-ay”. But we say it “maaa”.',
    'It is a small difference, and the idea behind this app is that it makes learning quicker and less confusing for your child. We also start with lowercase letters; capitals can wait.',
  ] },
];

// One short reminder in the first two lessons, where the habit is formed: lesson number and task type.
export const TIPS = {
  '1:newLetter': 'Call this letter mmm, not “em”. When we read, we sound words out, and the name never comes into it.',
  '1:writing': 'Lowercase first. Capital letters can wait: most of what your child will read is lowercase.',
  '2:newLetter': 'Call this letter aaa (as in apple), not “ay”. Then ma is “maaa”, not “em-ay”.',
  '2:sounds': 'Say ma as “maaa”, with no pause between the sounds. Letter names would make it “em-ay”, which is not a word.',
};
export const tipFor = (lessonNumber, type) => TIPS[`${lessonNumber}:${type}`] || null;

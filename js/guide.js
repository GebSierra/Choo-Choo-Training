// What a first-time grown-up reads: why this app teaches the sound of a letter, not its name.
// Parent-facing only: it is never spoken and never shown to the child. It names letter names on purpose
// (“em”, “ay”) to explain what to avoid, which is why it lives here and not in curriculum.json.
export const WELCOME = [
  { title: 'Welcome to Choo Choo Training', body: [
    'Most reading apps are like cotton candy: enjoyable, but they have no substance; in fact, they’re bad for you! If your child uses them, there’s a risk they will struggle to develop the deep reading skills they need.',
  ] },
  { title: 'Loved by kids, built on research', body: [
    'Choo Choo Training is a program your kids will love, but it’s built on decades of research. We designed the app first to educate, and second to entertain.',
    'Behind each lesson are academic studies from Harvard, the National Institutes of Health, the U.S. Department of Education, and more. “What’s an example?” you might ask.',
  ] },
  { title: 'Say the sound, not the name', body: [
    'We use the sounds-first approach. This will seem counterintuitive, but instead of starting with the alphabet (like most programs), we start with the sounds of the alphabet.',
    'So the letter m is “mmm,” not “em,” and a is “aaa” (as in apple), not “ay.” Why do it this way?',
  ] },
  { title: 'Why it matters', body: [
    'Take the word “mom.” If your kid tried to read “mom” by saying those 3 letters by name, it would be “em-oh-em.” But that’s not how we say “mom”! If that’s confusing to you, imagine how confusing it is for a kid!',
    'It’s a small thing that makes a big difference, and only one example of how we do things based on the research. Children will learn their letter names eventually, but we begin with the important information: the sounds.',
    'If you want to be a parent who sets their children up for success, then Choo Choo Training is for you.',
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

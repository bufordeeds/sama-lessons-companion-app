export interface Quote {
	text: string;
	source: string;
}

/** Quotes from SAMA drum lessons */
export const LESSON_QUOTES: Quote[] = [
	{
		text: 'Reading is nothing but playing by ear with your eyes.',
		source: 'Alfredo'
	},
	{
		text: "If you practice this for three minutes continuously, you're going to learn. You'll have it forever.",
		source: 'Alfredo'
	},
	{
		text: 'You are the metronome.',
		source: 'Alfredo'
	},
	{
		text: 'The mistakes show more when you go slow than when you go fast.',
		source: 'Alfredo'
	},
	{
		text: "At some point you start coming up with ideas while keeping an ostinato, and that's what makes a good drummer.",
		source: 'Alfredo'
	},
	{
		text: "It doesn't matter. You practice a lot, you get it. The only way to become confident is practice.",
		source: 'Alfredo'
	},
	{
		text: "If you only have one word to describe a good drummer, it's accuracy. You have to be precise.",
		source: 'Alfredo'
	},
	{
		text: "I promise you it's better to see somebody play one thing perfect than fifty impressive things all wrong.",
		source: 'Alfredo'
	},
	{
		text: 'The trick for accents is not to play the accent really loud, but to play the other notes really soft.',
		source: 'Alfredo'
	},
	{
		text: "If you do the accents right and just change where the accent falls, it's going to take you around the world.",
		source: 'Alfredo'
	},
	{
		text: "Even if it's ten minutes a day — just for your brain to start saying, 'Okay, this is already mine.'",
		source: 'Alfredo'
	},
	{
		text: "The older you grow, the more judgmental you become of yourself. Just chill and keep going. You're doing good.",
		source: 'Alfredo'
	},
	{
		text: "At some point you really have to let go of overthinking. That's part of the trick of this instrument.",
		source: 'Alfredo'
	},
	{
		text: "Remember that learning this is not 'okay, I did it once, let's go.' It's good to do this as a warm-up.",
		source: 'Alfredo'
	},
	{
		text: "Don't play faster than you can think. Especially when you're practicing and learning stuff.",
		source: 'Alfredo'
	},
	{
		text: "Napoleon had a famous phrase: 'Go slow, because I'm in a hurry.' So just go slow.",
		source: 'Alfredo'
	},
	{
		text: "I promise you that if you take your time and are patient, you're going to be very good. Just go step by step.",
		source: 'Alfredo'
	},
	{
		text: "You have to keep steady. You have to be grounded. That's called the ground, the earth.",
		source: 'Alfredo'
	},
	{
		text: 'Master this side. That side, you already have it. You have to believe that you already have this side.',
		source: 'Alfredo'
	},
	{
		text: "It's a part of your brain that you're not putting your attention into. You're just letting it become a background process.",
		source: 'Alfredo'
	},
	{
		text: 'Practice one thing right. When you do the accents, you want to make it sound like you own this thing.',
		source: 'Alfredo'
	},
	{
		text: "We're just seeing the end result of the boring stuff.",
		source: 'Thad'
	},
	{
		text: "When drumming and doing exercises, you have to make it almost a meditation — where you're not thinking about it.",
		source: 'Thad'
	},
	{
		text: 'Rock is about drums. Jazz is about cymbals.',
		source: 'Alfredo'
	}
];

/** Get a deterministic quote for today (changes daily) */
export function getQuoteOfTheDay(): Quote {
	const now = new Date();
	const dayIndex = Math.floor(now.getTime() / 86400000);
	return LESSON_QUOTES[dayIndex % LESSON_QUOTES.length];
}

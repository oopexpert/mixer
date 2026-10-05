package mixer;

import java.util.List;
import java.util.Random;

/**
 * Generiert lesbare Rezept-Tokens (z.B. "berlin234").
 *
 * Die Klasse ist bewusst zustandsbehaftet (Random) aber ansonsten unabhängig vom Mixer.
 */
final class RecipeTokenGenerator {

	private static final List<String> CITIES = List.of(
			"berlin", "hamburg", "hannover", "bremen", "kiel", "essen",
			"bonn", "mainz", "erfurt", "kassel", "ulm", "frankfurt",
			"trier", "leipzig", "dresden", "darmstadt", "bamberg", "braunfels", "flensburg",
			"fulda", "heilbronn", "krefeld", "linden", "nassau", "nienburg", "peine", "weimar",
			"wien", "graz", "linz", "bern", "basel",
			"prag", "paris", "rom", "mailand", "turin",
			"genf", "london", "madrid"
	);

	private final Random random;

	RecipeTokenGenerator(Random random) {
		if (random == null) {
			throw new IllegalArgumentException("random darf nicht null sein");
		}
		this.random = random;
	}

	String generate() {
		String city = CITIES.get(random.nextInt(CITIES.size()));
		String sequence = generateDigitSequence();
		return city + sequence;
	}

	private String generateDigitSequence() {
		boolean ascending = random.nextBoolean();
		int startDigit;
		StringBuilder seq = new StringBuilder();

		if (ascending) {
			startDigit = random.nextInt(8); // 0 bis 7
			seq.append(startDigit).append(startDigit + 1).append(startDigit + 2);
		} else {
			startDigit = random.nextInt(8) + 2; // 2 bis 9
			seq.append(startDigit).append(startDigit - 1).append(startDigit - 2);
		}
		return seq.toString();
	}
}

package usecase.admin;

import mixer.Mixer;
import java.util.Set;

public class ListActiveTokensUseCase {
    private final Mixer mixer;

    public ListActiveTokensUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public Set<String> execute() {
		return mixer.listActiveTokens();
    }
}

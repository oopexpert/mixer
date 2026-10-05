package usecase.admin;

import mixer.Mixer;
import java.util.List;

public class ListSystemPortsUseCase {

    private final Mixer mixer;

    public ListSystemPortsUseCase(Mixer mixer) {
        this.mixer = mixer;
    }

    public List<String> execute() {
        return mixer.listSystemPortNames();
    }
}

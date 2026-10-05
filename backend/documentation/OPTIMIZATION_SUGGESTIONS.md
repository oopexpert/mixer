# SmartMixer – Optimierungsvorschläge

Dieses Dokument hält Ideen fest, die beim Code-Review oder bei der Fehleranalyse entstanden sind,
aber über reine Bugfixes hinausgehen. Die beschriebenen Punkte sind keine akuten Fehler,
sondern strukturelle Verbesserungsmöglichkeiten.

---

## 1. Trennung von persistenter Konfiguration und transientem Laufzeitzustand

**Klasse:** `Mixer.reconcileIngredientMappingsToSystemPorts()`

**Problem:**  
Beim Start (und bei jedem Config-Reload) löscht die Methode die `ingredient`-UUID direkt in den
`PortIngredient`-Objekten der geladenen `Configuration`, wenn ein Port nicht im System gefunden wird:

```java
pi.setIngredient(null); // mutiert das Configuration-Objekt im RAM
```

Das führt zu zwei strukturellen Problemen:

1. **Versteckter Zustandsverlust:** Der Wert ist weg, ohne dass es eine explizite Laufzeit-Datenstruktur gibt, die das signalisiert. Ein Config-Reload erzeugt zwar ein neues `Configuration`-Objekt, mutiert es aber sofort wieder – ein nachfolgendes Lesen des Objekts spiegelt nicht mehr die `configuration.json` wider.
2. **Verletzung des Single-Responsibility-Prinzips:** `Configuration` ist gleichzeitig Datenhaltung *und* Laufzeitzustandsträger.

> Das resultierende Laufzeitverhalten (betroffene Zutaten werden als manuelle Schritte behandelt;
> Admin-Direktsteuerung ist nicht betroffen; Verhalten bei Reload) ist in `TECHNICAL_DOCUMENTATION.md`,
> Abschnitt 5.2, dokumentiert.

**Vorschlag:**  
Den Abgleich nicht durch Mutation der Config-Objekte ausdrücken, sondern durch eine separate
Laufzeit-Datenstruktur – z.B. ein `Set<String> activePortNames` im `Mixer`, das beim Start
und beim Reload befüllt wird. `findPortForIngredient()` würde dann zusätzlich prüfen, ob der
gefundene Port in diesem Set enthalten ist, anstatt auf eine möglicherweise genullte UUID zu vertrauen.

```java
// Statt: pi.setIngredient(null) in der Config
// Besser: separater Laufzeit-Filter im Mixer

private Set<String> activePortNames = new HashSet<>(); // befüllt in StartupState / reconcile

public Optional<PortAdapter> findPortForIngredient(Ingredient ingredient) {
    UUID ingredientId = ingredient.getUuid();
    PortIngredient comIngredient = configuration.getComIngredients().stream()
            .filter(ci -> ingredientId.equals(ci.getIngredient()))
            .filter(ci -> activePortNames.contains(ci.getCom())) // Laufzeit-Filter
            .findFirst()
            .orElse(null);
    ...
}
```

Vorteil: Die `configuration.json`-Daten bleiben im Arbeitsspeicher unangetastet; ein Reload
oder eine künftige Admin-API für Port-Zuordnungen muss nicht gegen mutierten Config-Zustand ankämpfen.

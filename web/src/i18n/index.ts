import uz from "./dictionaries/uz.json";
import ru from "./dictionaries/ru.json";

export type Locale = "uz" | "ru";
export type Dictionary = typeof uz;

const dictionaries: Record<Locale, Dictionary> = { uz, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? uz;
}

export function serviceName(
  service: { nameUz: string; nameRu: string },
  locale: Locale,
) {
  return locale === "ru" ? service.nameRu : service.nameUz;
}

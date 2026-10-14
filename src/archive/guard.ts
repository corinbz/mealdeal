/**
 * ADR-0003 says we store no Chain-sourced media and no supplier-authored
 * product text. Both Chains hand us those fields whether we want them or
 * not -- Dirk's `ProductDto` carries `image` and `logos`, and its offers
 * carry `image` -- so the only thing stopping them entering the archive is
 * that we never ask for them.
 *
 * An archive is exactly where that rule is easiest to break by accident: the
 * instinct when capturing raw data is to select everything available. This
 * guard runs over every query document before it is sent and refuses the run
 * if a banned field appears, so a well-meaning "let's grab the images too"
 * fails loudly at startup rather than quietly accumulating an exposure we
 * have decided not to take.
 */

const BANNED_FIELDS = [
  // Chain-hosted media.
  "image",
  "images",
  "imageUrl",
  "imagePath",
  "imageInfo",
  "thumbnail",
  "photo",
  "photos",
  "logos",
  "logoUrl",
  // Supplier-authored text.
  "nutritions",
  "nutritionalValues",
  "nutritionInfo",
  "ingredientsText",
  "allergens",
  "allergenInfo",
  "supplierDescription",
  // Hoogvliet (Magento): the blob holding every metafield, ingredients and
  // nutrients among them, its parts by name, and Magento's image fields.
  "metadata",
  "voedingswaardetabel",
  "supplier_info",
  "small_image",
  "media_gallery",
];

export class BannedFieldError extends Error {
  readonly field: string;

  constructor(field: string, label: string) {
    super(
      `Query "${label}" selects "${field}", which ADR-0003 forbids storing ` +
        `(no Chain-sourced media or supplier text). Remove the field, or ` +
        `change the ADR first -- do not weaken this guard.`,
    );
    this.name = "BannedFieldError";
    this.field = field;
  }
}

/**
 * Throws if a GraphQL document selects a field ADR-0003 forbids.
 *
 * Deliberately a dumb token match rather than a GraphQL parse: it has no
 * dependencies, it cannot be defeated by a field we have not met yet, and a
 * false positive is a two-second fix whereas a false negative is a legal
 * exposure. Field names like `headerText`, `packaging` and `description` are
 * allowed through -- those are the Chain's own commercial description of its
 * own Product, not supplier copy, and resolving a Basket Item needs them.
 */
export function assertNoBannedFields(document: string, label: string): void {
  for (const field of BANNED_FIELDS) {
    if (new RegExp(`\\b${field}\\b`, "i").test(document)) {
      throw new BannedFieldError(field, label);
    }
  }
}

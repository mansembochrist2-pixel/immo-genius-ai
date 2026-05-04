import { z } from "zod";

/** Centralized Zod schemas for all user-facing forms. French error messages. */

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères").max(100, "Maximum 100 caractères"),
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  phone: z.string().trim().max(20, "Téléphone trop long").regex(/^[\d\s+().-]*$/, "Caractères invalides").or(z.literal("")),
  agency_name: z.string().trim().max(120, "Nom d'agence trop long").or(z.literal("")),
  objectif_ca: z.string().regex(/^\d*$/, "Doit être un nombre entier").or(z.literal("")),
  zone_principale: z.string().trim().max(120, "Zone trop longue").or(z.literal("")),
});

export const clientSchema = z.object({
  nom: z.string().trim().min(2, "Le nom doit faire au moins 2 caractères").max(100, "Maximum 100 caractères"),
  email: z.string().trim().email("Email invalide").max(255).or(z.literal("")),
  telephone: z.string().trim().max(20).regex(/^[\d\s+().-]*$/, "Téléphone invalide").or(z.literal("")),
  budget_min: z.string().regex(/^\d*$/, "Budget invalide").or(z.literal("")),
  budget_max: z.string().regex(/^\d*$/, "Budget invalide").or(z.literal("")),
}).refine(
  (data) => {
    if (!data.budget_min || !data.budget_max) return true;
    return Number(data.budget_min) <= Number(data.budget_max);
  },
  { message: "Le budget min doit être ≤ au budget max", path: ["budget_max"] },
);

export const eventSchema = z.object({
  titre: z.string().trim().min(2, "Le titre est requis").max(200, "Titre trop long"),
  date_debut: z.string().min(1, "Date de début requise"),
  date_fin: z.string().optional(),
  lieu: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000, "Description trop longue").optional(),
}).refine(
  (data) => {
    if (!data.date_fin) return true;
    return new Date(data.date_debut) <= new Date(data.date_fin);
  },
  { message: "La date de fin doit être après la date de début", path: ["date_fin"] },
);

export const onboardingSchema = z.object({
  zone: z.string().trim().min(2, "Renseignez votre zone géographique").max(120),
  objectif: z.string().trim().max(200).optional(),
});

/** Generic helper: returns null if valid, error message string if invalid. */
export function validateOrError<T extends z.ZodTypeAny>(schema: T, data: unknown): string | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  return result.error.issues[0]?.message || "Données invalides";
}

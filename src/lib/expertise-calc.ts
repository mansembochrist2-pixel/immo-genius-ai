/**
 * Moteur de calcul pour le module Expertise Valeur & Rendement.
 * Calculs déterministes, basés sur les inputs agent.
 * Mis à jour en temps réel à chaque modification.
 */

export type TypeLocation = "nue" | "meublee_lmnp" | "courte_duree";
export type RegimeFiscal = "micro_foncier" | "reel_foncier" | "micro_bic" | "reel_bic";

export interface ExpertiseInputs {
  // Bien
  type_bien: string;
  adresse: string;
  surface: number;
  pieces: number;
  annee_construction?: number;
  etat: string;
  dpe: string;
  prix_acquisition: number;

  // Locatif
  type_location: TypeLocation;
  loyer_mensuel: number;
  encadrement_loyer: boolean;
  loyer_plafond?: number;
  charges_copro_annuelles: number;
  taxe_fonciere_annuelle: number;
  vacance_locative_pct: number; // ex: 5
  assurance_gli: number; // €/an
  assurance_pno: number; // €/an
  frais_gestion_pct: number; // % loyers, ex: 7
  entretien_pct: number; // % prix, ex: 1

  // Rénovation
  dpe_cible: string;
  cout_travaux: number;
  aides_renovation: number;
  gain_loyer_post_travaux: number; // €/mois supplémentaires
  economie_charges_post_travaux: number; // €/an

  // Financement
  apport: number;
  frais_notaire_pct: number; // ex: 7.5
  frais_agence: number;
  taux_credit: number; // % ex 3.8
  duree_credit_annees: number;

  // Fiscalité
  regime_fiscal: RegimeFiscal;
  tmi: number; // % ex: 30
  duree_detention_annees: number; // pour TRI simplifié
  revalorisation_annuelle_pct: number; // ex: 2
}

export interface ExpertiseResults {
  prix_acquisition_total: number;
  capital_emprunte: number;
  mensualite_credit: number;
  cout_total_credit: number;

  loyers_annuels_bruts: number;
  loyers_annuels_nets_vacance: number;
  charges_annuelles_totales: number;

  rentabilite_brute: number;
  rentabilite_nette: number;
  rentabilite_nette_nette: number;

  impot_annuel_estime: number;
  cash_flow_mensuel: number;
  cash_flow_annuel: number;

  // Scénario post-travaux
  post_travaux: {
    prix_acquisition_total: number;
    loyers_annuels_bruts: number;
    charges_annuelles_totales: number;
    rentabilite_brute: number;
    rentabilite_nette: number;
    rentabilite_nette_nette: number;
    cash_flow_mensuel: number;
    plus_value_estimee_apres_n_ans: number;
  };

  // TRI simplifié (sur la durée de détention)
  tri_simplifie: number;
  plus_value_estimee_apres_n_ans: number;
  prix_revente_estime: number;

  warnings: string[];
}

const PRELEVEMENTS_SOCIAUX = 0.172;

export function calcMensualiteCredit(capital: number, tauxAnnuel: number, dureeAnnees: number): number {
  if (capital <= 0 || dureeAnnees <= 0) return 0;
  const i = tauxAnnuel / 100 / 12;
  const n = dureeAnnees * 12;
  if (i === 0) return capital / n;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}

function calcImpotAnnuel(
  loyersAnnuels: number,
  chargesDeductibles: number,
  interetsAnnuels: number,
  regime: RegimeFiscal,
  tmi: number
): number {
  let baseImposable = 0;
  switch (regime) {
    case "micro_foncier":
      baseImposable = loyersAnnuels * (1 - 0.3); // abattement 30%
      break;
    case "reel_foncier":
      baseImposable = Math.max(0, loyersAnnuels - chargesDeductibles - interetsAnnuels);
      break;
    case "micro_bic":
      baseImposable = loyersAnnuels * (1 - 0.5); // abattement 50% LMNP micro
      break;
    case "reel_bic": {
      // Réel BIC LMNP : charges + amortissement (estimé ~2.5% du prix sur 30 ans)
      const amortissement = chargesDeductibles * 0.3; // approximation prudente
      baseImposable = Math.max(0, loyersAnnuels - chargesDeductibles - interetsAnnuels - amortissement);
      break;
    }
  }
  const ir = baseImposable * (tmi / 100);
  const ps = baseImposable * PRELEVEMENTS_SOCIAUX;
  return ir + ps;
}

export function computeExpertise(i: ExpertiseInputs): ExpertiseResults {
  const warnings: string[] = [];

  const fraisNotaire = i.prix_acquisition * (i.frais_notaire_pct / 100);
  const prixAcquisitionTotal = i.prix_acquisition + fraisNotaire + (i.frais_agence || 0);

  const capitalEmprunte = Math.max(0, prixAcquisitionTotal - i.apport);
  if (i.apport > prixAcquisitionTotal) {
    warnings.push("L'apport est supérieur au prix total. Aucun crédit nécessaire.");
  }
  const mensualite = calcMensualiteCredit(capitalEmprunte, i.taux_credit, i.duree_credit_annees);
  const coutTotalCredit = mensualite * i.duree_credit_annees * 12 - capitalEmprunte;

  const loyersBruts = i.loyer_mensuel * 12;
  const tauxVacance = Math.max(0, Math.min(100, i.vacance_locative_pct)) / 100;
  const loyersNetsVacance = loyersBruts * (1 - tauxVacance);

  if (i.encadrement_loyer && i.loyer_plafond && i.loyer_mensuel > i.loyer_plafond) {
    warnings.push(`Le loyer saisi (${i.loyer_mensuel}€) dépasse le plafond légal (${i.loyer_plafond}€).`);
  }

  const fraisGestion = loyersNetsVacance * (i.frais_gestion_pct / 100);
  const entretien = i.prix_acquisition * (i.entretien_pct / 100);
  const chargesTotales =
    i.charges_copro_annuelles +
    i.taxe_fonciere_annuelle +
    i.assurance_gli +
    i.assurance_pno +
    fraisGestion +
    entretien;

  const rentBrute = prixAcquisitionTotal > 0 ? (loyersBruts / prixAcquisitionTotal) * 100 : 0;
  const rentNette =
    prixAcquisitionTotal > 0 ? ((loyersNetsVacance - chargesTotales) / prixAcquisitionTotal) * 100 : 0;

  // Intérêts annuels approximés (1ère année)
  const interetsAnnuels = capitalEmprunte * (i.taux_credit / 100);
  const impot = calcImpotAnnuel(
    loyersNetsVacance,
    chargesTotales,
    interetsAnnuels,
    i.regime_fiscal,
    i.tmi
  );

  const rentNetteNette =
    prixAcquisitionTotal > 0
      ? ((loyersNetsVacance - chargesTotales - impot) / prixAcquisitionTotal) * 100
      : 0;

  const cashFlowMensuel =
    i.loyer_mensuel * (1 - tauxVacance) - mensualite - chargesTotales / 12 - impot / 12;
  const cashFlowAnnuel = cashFlowMensuel * 12;

  // === Scénario post-travaux ===
  const coutNetTravaux = Math.max(0, i.cout_travaux - i.aides_renovation);
  const prixPostTravaux = prixAcquisitionTotal + coutNetTravaux;
  const loyersPostTravaux = (i.loyer_mensuel + i.gain_loyer_post_travaux) * 12;
  const loyersNetsPostTravaux = loyersPostTravaux * (1 - tauxVacance);
  const chargesPostTravaux = Math.max(0, chargesTotales - i.economie_charges_post_travaux);

  const rentBrutePost = prixPostTravaux > 0 ? (loyersPostTravaux / prixPostTravaux) * 100 : 0;
  const rentNettePost =
    prixPostTravaux > 0 ? ((loyersNetsPostTravaux - chargesPostTravaux) / prixPostTravaux) * 100 : 0;
  const impotPost = calcImpotAnnuel(
    loyersNetsPostTravaux,
    chargesPostTravaux,
    interetsAnnuels,
    i.regime_fiscal,
    i.tmi
  );
  const rentNetteNettePost =
    prixPostTravaux > 0
      ? ((loyersNetsPostTravaux - chargesPostTravaux - impotPost) / prixPostTravaux) * 100
      : 0;
  const cashFlowPost =
    (i.loyer_mensuel + i.gain_loyer_post_travaux) * (1 - tauxVacance) -
    mensualite -
    chargesPostTravaux / 12 -
    impotPost / 12;

  // === Plus-value à la revente ===
  const n = Math.max(1, i.duree_detention_annees);
  const rev = i.revalorisation_annuelle_pct / 100;
  const prixReventeEstime = i.prix_acquisition * Math.pow(1 + rev, n);
  const plusValueBase = prixReventeEstime - i.prix_acquisition;

  // Plus-value post-travaux (l'investissement travaux valorise aussi le bien)
  const prixReventePost = (i.prix_acquisition + coutNetTravaux) * Math.pow(1 + rev, n);
  const plusValuePost = prixReventePost - (i.prix_acquisition + coutNetTravaux);

  // TRI simplifié (méthode Newton sur cash-flows)
  const investissementInitial = i.apport + fraisNotaire + i.frais_agence;
  const cfAnnuel = cashFlowAnnuel;
  const flux = [-investissementInitial, ...Array(n - 1).fill(cfAnnuel), cfAnnuel + plusValueBase * 0.7]; // 0.7 pour PV nette d'impôt approx.
  const tri = calcTRI(flux);

  return {
    prix_acquisition_total: prixAcquisitionTotal,
    capital_emprunte: capitalEmprunte,
    mensualite_credit: mensualite,
    cout_total_credit: coutTotalCredit,
    loyers_annuels_bruts: loyersBruts,
    loyers_annuels_nets_vacance: loyersNetsVacance,
    charges_annuelles_totales: chargesTotales,
    rentabilite_brute: rentBrute,
    rentabilite_nette: rentNette,
    rentabilite_nette_nette: rentNetteNette,
    impot_annuel_estime: impot,
    cash_flow_mensuel: cashFlowMensuel,
    cash_flow_annuel: cashFlowAnnuel,
    post_travaux: {
      prix_acquisition_total: prixPostTravaux,
      loyers_annuels_bruts: loyersPostTravaux,
      charges_annuelles_totales: chargesPostTravaux,
      rentabilite_brute: rentBrutePost,
      rentabilite_nette: rentNettePost,
      rentabilite_nette_nette: rentNetteNettePost,
      cash_flow_mensuel: cashFlowPost,
      plus_value_estimee_apres_n_ans: plusValuePost,
    },
    tri_simplifie: tri,
    plus_value_estimee_apres_n_ans: plusValueBase,
    prix_revente_estime: prixReventeEstime,
    warnings,
  };
}

/** TRI par méthode de bissection (suffisant pour un rapport client). */
function calcTRI(flux: number[]): number {
  if (flux.length < 2) return 0;
  const npv = (rate: number) =>
    flux.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);

  let low = -0.99;
  let high = 1.0;
  for (let k = 0; k < 100; k++) {
    const mid = (low + high) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-3) return mid * 100;
    if (v > 0) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 100;
}

export const DEFAULT_INPUTS: Partial<ExpertiseInputs> = {
  type_location: "meublee_lmnp",
  vacance_locative_pct: 5,
  frais_gestion_pct: 7,
  entretien_pct: 1,
  encadrement_loyer: false,
  assurance_gli: 0,
  assurance_pno: 120,
  charges_copro_annuelles: 0,
  taxe_fonciere_annuelle: 0,
  apport: 0,
  frais_notaire_pct: 7.5,
  frais_agence: 0,
  taux_credit: 3.8,
  duree_credit_annees: 20,
  regime_fiscal: "micro_bic",
  tmi: 30,
  duree_detention_annees: 10,
  revalorisation_annuelle_pct: 2,
  dpe_cible: "C",
  cout_travaux: 0,
  aides_renovation: 0,
  gain_loyer_post_travaux: 0,
  economie_charges_post_travaux: 0,
};

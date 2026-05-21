/**
 * Moteur de calcul pour le module Expertise Valeur & Rendement.
 * Calculs déterministes, basés sur les inputs agent. Mis à jour en temps réel.
 *
 * V2 — Intègre :
 *  - Amortissement LMNP au Réel (bâti + mobilier + frais de notaire)
 *  - Comparateur Micro-BIC vs Réel
 *  - Moteur de suggestions d'optimisation financière (cash-flow)
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
  entretien_pct: number; // % prix, ex: 0.5

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
  duree_detention_annees: number;
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

  tri_simplifie: number; // alias historique = tri_10_ans
  tri_10_ans: number;
  capital_restant_du_n: number;
  impot_plus_value_n: number;
  effort_epargne_mensuel: number; // -cashflow si négatif, 0 sinon
  plus_value_estimee_apres_n_ans: number;
  prix_revente_estime: number;

  warnings: string[];
}

const INFLATION_LOYERS = 0.015; // +1,5%/an
const INFLATION_PRIX = 0.02;    // +2%/an par défaut si revalorisation_annuelle_pct=0
const FRAIS_AGENCE_REVENTE_PCT = 0.05;

const PRELEVEMENTS_SOCIAUX = 0.172;

// === Amortissement LMNP au Réel ===
// Quotes-parts standard utilisées par les experts-comptables spécialisés :
//  - Terrain (non amortissable) : 15 % du prix
//  - Bâti (amortissable) : 85 % du prix, durée moyenne pondérée ~33 ans (~2,55 %/an)
//  - Mobilier (LMNP meublé) : 10 % du prix, amortissement sur 7 ans (~14,3 %/an)
//  - Frais de notaire : amortissables sur 10 ans
const QUOTE_TERRAIN = 0.15;
const QUOTE_BATI = 1 - QUOTE_TERRAIN;
const DUREE_AMORT_BATI = 33;
const QUOTE_MOBILIER = 0.10;
const DUREE_AMORT_MOBILIER = 7;
const DUREE_AMORT_NOTAIRE = 10;
const COMPTA_LMNP_ANNUEL = 500; // adhésion CGA + comptable

export function calcMensualiteCredit(capital: number, tauxAnnuel: number, dureeAnnees: number): number {
  if (capital <= 0 || dureeAnnees <= 0) return 0;
  const i = tauxAnnuel / 100 / 12;
  const n = dureeAnnees * 12;
  if (i === 0) return capital / n;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}

interface ImpotContext {
  loyersAnnuels: number;
  chargesDeductibles: number; // hors amortissements & intérêts
  interetsAnnuels: number;
  prixAcquisition: number;
  fraisNotaire: number;
  typeLocation: TypeLocation;
  regime: RegimeFiscal;
  tmi: number;
}

function calcAmortissementsLMNP(prixAcquisition: number, fraisNotaire: number) {
  const amortBati = (prixAcquisition * QUOTE_BATI) / DUREE_AMORT_BATI;
  const amortMobilier = (prixAcquisition * QUOTE_MOBILIER) / DUREE_AMORT_MOBILIER;
  const amortNotaire = fraisNotaire / DUREE_AMORT_NOTAIRE;
  return { amortBati, amortMobilier, amortNotaire, total: amortBati + amortMobilier + amortNotaire };
}

function calcImpotAnnuel(ctx: ImpotContext): number {
  const { loyersAnnuels, chargesDeductibles, interetsAnnuels, regime, tmi } = ctx;
  let baseImposable = 0;

  switch (regime) {
    case "micro_foncier":
      baseImposable = loyersAnnuels * (1 - 0.3);
      break;
    case "reel_foncier":
      baseImposable = Math.max(0, loyersAnnuels - chargesDeductibles - interetsAnnuels);
      break;
    case "micro_bic":
      baseImposable = loyersAnnuels * (1 - 0.5);
      break;
    case "reel_bic": {
      const { total: amortTotal } = calcAmortissementsLMNP(ctx.prixAcquisition, ctx.fraisNotaire);
      // L'amortissement ne peut créer ou aggraver un déficit (art. 39 C CGI)
      const chargesAvantAmort = chargesDeductibles + interetsAnnuels + COMPTA_LMNP_ANNUEL;
      const resteApresCharges = loyersAnnuels - chargesAvantAmort;
      const amortUtilise = Math.min(amortTotal, Math.max(0, resteApresCharges));
      baseImposable = Math.max(0, resteApresCharges - amortUtilise);
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

  const interetsAnnuels = capitalEmprunte * (i.taux_credit / 100);
  const impot = calcImpotAnnuel({
    loyersAnnuels: loyersNetsVacance,
    chargesDeductibles: chargesTotales,
    interetsAnnuels,
    prixAcquisition: i.prix_acquisition,
    fraisNotaire,
    typeLocation: i.type_location,
    regime: i.regime_fiscal,
    tmi: i.tmi,
  });

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
  const impotPost = calcImpotAnnuel({
    loyersAnnuels: loyersNetsPostTravaux,
    chargesDeductibles: chargesPostTravaux,
    interetsAnnuels,
    prixAcquisition: i.prix_acquisition + coutNetTravaux,
    fraisNotaire,
    typeLocation: i.type_location,
    regime: i.regime_fiscal,
    tmi: i.tmi,
  });
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
  const prixReventePost = (i.prix_acquisition + coutNetTravaux) * Math.pow(1 + rev, n);
  const plusValuePost = prixReventePost - (i.prix_acquisition + coutNetTravaux);

  // TRI simplifié (bissection)
  const investissementInitial = i.apport + fraisNotaire + i.frais_agence;
  const cfAnnuel = cashFlowAnnuel;
  const flux = [-investissementInitial, ...Array(n - 1).fill(cfAnnuel), cfAnnuel + plusValueBase * 0.7];
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

// ============================================================
// Comparateur Micro-BIC vs Réel BIC (LMNP)
// ============================================================
export interface RegimeOutcome {
  regime: "micro_bic" | "reel_bic";
  label: string;
  base_imposable: number;
  impot_revenu: number;
  prelevements_sociaux: number;
  impot_total: number;
  cashflow_mensuel: number;
  rentabilite_nette_nette: number;
  details?: {
    amort_bati: number;
    amort_mobilier: number;
    amort_notaire: number;
    amort_total: number;
    amort_utilise: number;
    charges_deductibles_totales: number;
  };
}

export interface LMNPComparison {
  micro_bic: RegimeOutcome;
  reel_bic: RegimeOutcome;
  recommended: "micro_bic" | "reel_bic";
  delta_cashflow_mensuel: number; // reel - micro
  delta_impot_annuel: number;     // micro - reel (économie via réel)
}

function regimeOutcome(i: ExpertiseInputs, regime: "micro_bic" | "reel_bic"): RegimeOutcome {
  const fraisNotaire = i.prix_acquisition * (i.frais_notaire_pct / 100);
  const prixAcquisitionTotal = i.prix_acquisition + fraisNotaire + (i.frais_agence || 0);
  const capitalEmprunte = Math.max(0, prixAcquisitionTotal - i.apport);
  const mensualite = calcMensualiteCredit(capitalEmprunte, i.taux_credit, i.duree_credit_annees);
  const tauxVacance = Math.max(0, Math.min(100, i.vacance_locative_pct)) / 100;
  const loyersNets = i.loyer_mensuel * 12 * (1 - tauxVacance);
  const fraisGestion = loyersNets * (i.frais_gestion_pct / 100);
  const entretien = i.prix_acquisition * (i.entretien_pct / 100);
  const chargesTotales =
    i.charges_copro_annuelles + i.taxe_fonciere_annuelle +
    i.assurance_gli + i.assurance_pno + fraisGestion + entretien;
  const interets = capitalEmprunte * (i.taux_credit / 100);

  let baseImposable = 0;
  let details: RegimeOutcome["details"] | undefined;

  if (regime === "micro_bic") {
    baseImposable = loyersNets * 0.5;
  } else {
    const { amortBati, amortMobilier, amortNotaire, total } = calcAmortissementsLMNP(
      i.prix_acquisition,
      fraisNotaire
    );
    const chargesAvantAmort = chargesTotales + interets + COMPTA_LMNP_ANNUEL;
    const resteApresCharges = loyersNets - chargesAvantAmort;
    const amortUtilise = Math.min(total, Math.max(0, resteApresCharges));
    baseImposable = Math.max(0, resteApresCharges - amortUtilise);
    details = {
      amort_bati: amortBati,
      amort_mobilier: amortMobilier,
      amort_notaire: amortNotaire,
      amort_total: total,
      amort_utilise: amortUtilise,
      charges_deductibles_totales: chargesAvantAmort,
    };
  }

  const ir = baseImposable * (i.tmi / 100);
  const ps = baseImposable * PRELEVEMENTS_SOCIAUX;
  const impotTotal = ir + ps;
  const cashflowAnnuel = loyersNets - chargesTotales - mensualite * 12 - impotTotal;
  const rentNN = prixAcquisitionTotal > 0
    ? ((loyersNets - chargesTotales - impotTotal) / prixAcquisitionTotal) * 100
    : 0;

  return {
    regime,
    label: regime === "micro_bic" ? "Micro-BIC (abattement 50%)" : "Réel BIC (amortissement)",
    base_imposable: baseImposable,
    impot_revenu: ir,
    prelevements_sociaux: ps,
    impot_total: impotTotal,
    cashflow_mensuel: cashflowAnnuel / 12,
    rentabilite_nette_nette: rentNN,
    details,
  };
}

export function compareLMNP(i: ExpertiseInputs): LMNPComparison {
  const micro = regimeOutcome(i, "micro_bic");
  const reel = regimeOutcome(i, "reel_bic");
  const recommended = reel.cashflow_mensuel > micro.cashflow_mensuel ? "reel_bic" : "micro_bic";
  return {
    micro_bic: micro,
    reel_bic: reel,
    recommended,
    delta_cashflow_mensuel: reel.cashflow_mensuel - micro.cashflow_mensuel,
    delta_impot_annuel: micro.impot_total - reel.impot_total,
  };
}

// ============================================================
// Moteur de suggestions d'optimisation
// ============================================================
export interface OptimizationProposal {
  id: string;
  label: string;
  description: string;
  delta_cashflow_mensuel: number;
  patch: Partial<ExpertiseInputs>;
}

export function suggestOptimizations(
  i: ExpertiseInputs,
  results: ExpertiseResults
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];
  const baseCF = results.cash_flow_mensuel;

  const simulate = (patch: Partial<ExpertiseInputs>): number => {
    const r = computeExpertise({ ...i, ...patch });
    return r.cash_flow_mensuel - baseCF;
  };

  // 1. Bascule Micro-BIC -> Réel BIC (et inverse) si LMNP
  if (i.type_location === "meublee_lmnp") {
    const comp = compareLMNP(i);
    if (comp.recommended === "reel_bic" && i.regime_fiscal === "micro_bic") {
      proposals.push({
        id: "switch_reel",
        label: "Passer au régime Réel BIC",
        description: `L'amortissement du bâti, mobilier et frais de notaire neutralise l'impôt. Économie d'impôt estimée : ${Math.round(comp.delta_impot_annuel)} €/an.`,
        delta_cashflow_mensuel: simulate({ regime_fiscal: "reel_bic" }),
        patch: { regime_fiscal: "reel_bic" },
      });
    } else if (comp.recommended === "micro_bic" && i.regime_fiscal === "reel_bic") {
      proposals.push({
        id: "switch_micro",
        label: "Repasser au Micro-BIC",
        description: `Pour ce profil, l'abattement forfaitaire 50% est plus avantageux que le Réel.`,
        delta_cashflow_mensuel: simulate({ regime_fiscal: "micro_bic" }),
        patch: { regime_fiscal: "micro_bic" },
      });
    }
  }

  // 2. Allonger durée crédit (max 25 ans)
  if (i.duree_credit_annees < 25 && results.capital_emprunte > 0) {
    const newDuree = Math.min(25, i.duree_credit_annees + 5);
    const d = simulate({ duree_credit_annees: newDuree });
    if (d > 5) {
      proposals.push({
        id: "duree_credit",
        label: `Allonger le crédit à ${newDuree} ans`,
        description: `Mensualité réduite, cash-flow amélioré. Coût total du crédit plus élevé sur la durée.`,
        delta_cashflow_mensuel: d,
        patch: { duree_credit_annees: newDuree },
      });
    }
  }

  // 3. Augmenter l'apport
  const apportBoost = Math.max(5000, Math.round(i.prix_acquisition * 0.05 / 1000) * 1000);
  const dApport = simulate({ apport: i.apport + apportBoost });
  if (dApport > 10) {
    proposals.push({
      id: "apport",
      label: `Augmenter l'apport de ${apportBoost.toLocaleString("fr-FR")} €`,
      description: `Réduit le capital emprunté et la mensualité.`,
      delta_cashflow_mensuel: dApport,
      patch: { apport: i.apport + apportBoost },
    });
  }

  // 4. Négocier le taux (-0,2 pt)
  if (i.taux_credit > 1) {
    const newTaux = Math.max(0.5, +(i.taux_credit - 0.2).toFixed(2));
    const dTaux = simulate({ taux_credit: newTaux });
    if (dTaux > 5) {
      proposals.push({
        id: "taux",
        label: `Négocier le taux à ${newTaux.toString().replace(".", ",")} %`,
        description: `Une baisse de 20 points de base est réaliste via un courtier.`,
        delta_cashflow_mensuel: dTaux,
        patch: { taux_credit: newTaux },
      });
    }
  }

  // 5. Optimiser entretien (1% -> 0,5%)
  if (i.entretien_pct > 0.5) {
    const dEntretien = simulate({ entretien_pct: 0.5 });
    if (dEntretien > 5) {
      proposals.push({
        id: "entretien",
        label: "Ajuster l'entretien à 0,5 % du prix",
        description: `0,5 %/an est la moyenne observée pour un bien en bon état (vs. 1 % par défaut historique).`,
        delta_cashflow_mensuel: dEntretien,
        patch: { entretien_pct: 0.5 },
      });
    }
  }

  // 6. Augmentation loyer (+3 %) — bloqué si encadrement et déjà au plafond
  const newLoyer = Math.round(i.loyer_mensuel * 1.03);
  const blockedByEncadrement =
    i.encadrement_loyer && i.loyer_plafond && newLoyer > i.loyer_plafond;
  if (i.loyer_mensuel > 0 && !blockedByEncadrement) {
    const dLoyer = simulate({ loyer_mensuel: newLoyer });
    if (dLoyer > 5) {
      proposals.push({
        id: "loyer",
        label: `Augmenter le loyer à ${newLoyer.toLocaleString("fr-FR")} € (+3 %)`,
        description: i.encadrement_loyer
          ? `Dans la limite du plafond légal (${i.loyer_plafond ?? "—"} €).`
          : `Aligné sur le marché : à valider via comparables locaux.`,
        delta_cashflow_mensuel: dLoyer,
        patch: { loyer_mensuel: newLoyer },
      });
    }
  } else if (blockedByEncadrement) {
    proposals.push({
      id: "loyer_bloque",
      label: "Loyer plafonné — pas d'augmentation possible",
      description: `Le loyer ne peut pas dépasser ${i.loyer_plafond} € (encadrement légal).`,
      delta_cashflow_mensuel: 0,
      patch: {},
    });
  }

  return proposals
    .filter((p) => p.id === "loyer_bloque" || p.delta_cashflow_mensuel > 0)
    .sort((a, b) => b.delta_cashflow_mensuel - a.delta_cashflow_mensuel);
}

export const DEFAULT_INPUTS: Partial<ExpertiseInputs> = {
  type_location: "meublee_lmnp",
  vacance_locative_pct: 5,
  frais_gestion_pct: 7,
  entretien_pct: 0.5,
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
  regime_fiscal: "reel_bic",
  tmi: 30,
  duree_detention_annees: 10,
  revalorisation_annuelle_pct: 2,
  dpe_cible: "C",
  cout_travaux: 0,
  aides_renovation: 0,
  gain_loyer_post_travaux: 0,
  economie_charges_post_travaux: 0,
};

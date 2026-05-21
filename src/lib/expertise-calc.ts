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
  const n = Math.max(10, i.duree_detention_annees); // projection minimum 10 ans
  const rev = (i.revalorisation_annuelle_pct || INFLATION_PRIX * 100) / 100;
  const prixReventeEstime = i.prix_acquisition * Math.pow(1 + rev, n);
  const plusValueBase = prixReventeEstime - i.prix_acquisition;
  const prixReventePost = (i.prix_acquisition + coutNetTravaux) * Math.pow(1 + rev, n);
  const plusValuePost = prixReventePost - (i.prix_acquisition + coutNetTravaux);

  // Capital restant dû après n années
  const crd = calcCapitalRestantDu(capitalEmprunte, i.taux_credit, i.duree_credit_annees, n);

  // Impôt sur la plus-value des particuliers (location nue/meublée non-pro)
  // Abattement IR : 6%/an de 6 à 21 ans + 4% la 22e
  // Abattement PS : 1.65%/an de 6 à 21 ans + 1.6% la 22e + 9%/an 23-30
  const ivp = calcImpotPlusValue(plusValueBase, n);

  // === TRI réel sur n ans (flux complets, inflation loyers +1,5%/an) ===
  const investissementInitial = i.apport + fraisNotaire + (i.frais_agence || 0) + coutNetTravaux;
  const flux: number[] = [-investissementInitial];
  for (let t = 1; t <= n; t++) {
    const facteurLoyer = Math.pow(1 + INFLATION_LOYERS, t - 1);
    const cfYear =
      i.loyer_mensuel * 12 * (1 - tauxVacance) * facteurLoyer -
      chargesTotales -
      mensualite * 12 -
      impot;
    if (t < n) {
      flux.push(cfYear);
    } else {
      const fraisAgenceRevente = prixReventeEstime * FRAIS_AGENCE_REVENTE_PCT;
      const valeurTerminale = prixReventeEstime - crd - ivp - fraisAgenceRevente;
      flux.push(cfYear + valeurTerminale);
    }
  }
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
    tri_10_ans: tri,
    capital_restant_du_n: crd,
    impot_plus_value_n: ivp,
    effort_epargne_mensuel: cashFlowMensuel < 0 ? -cashFlowMensuel : 0,
    plus_value_estimee_apres_n_ans: plusValueBase,
    prix_revente_estime: prixReventeEstime,
    warnings,
  };
}

export function calcCapitalRestantDu(
  capital: number,
  tauxAnnuel: number,
  dureeTotaleAnnees: number,
  apresAnnees: number
): number {
  if (capital <= 0 || dureeTotaleAnnees <= 0) return 0;
  if (apresAnnees >= dureeTotaleAnnees) return 0;
  const i = tauxAnnuel / 100 / 12;
  const N = dureeTotaleAnnees * 12;
  const n = apresAnnees * 12;
  if (i === 0) return capital * (1 - n / N);
  const M = (capital * i) / (1 - Math.pow(1 + i, -N));
  // CRD = M * (1 - (1+i)^-(N-n)) / i
  return (M * (1 - Math.pow(1 + i, -(N - n)))) / i;
}

export function calcImpotPlusValue(plusValue: number, annees: number): number {
  if (plusValue <= 0) return 0;
  // Abattement IR
  let abIR = 0;
  if (annees > 5) abIR += Math.min(annees - 5, 16) * 0.06;
  if (annees >= 22) abIR += 0.04;
  if (annees >= 22) abIR = 1;
  abIR = Math.min(abIR, 1);
  // Abattement PS
  let abPS = 0;
  if (annees > 5) abPS += Math.min(annees - 5, 16) * 0.0165;
  if (annees >= 22) abPS += 0.016;
  if (annees > 22) abPS += Math.min(annees - 22, 8) * 0.09;
  if (annees >= 30) abPS = 1;
  abPS = Math.min(abPS, 1);
  const baseIR = plusValue * (1 - abIR);
  const basePS = plusValue * (1 - abPS);
  return baseIR * 0.19 + basePS * PRELEVEMENTS_SOCIAUX;
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

  // 7. Passage location nue → meublée LMNP
  if (i.type_location === "nue" && i.loyer_mensuel > 0) {
    const loyerMeuble = Math.round(i.loyer_mensuel * 1.15);
    const d = simulate({
      type_location: "meublee_lmnp",
      regime_fiscal: "reel_bic",
      loyer_mensuel: loyerMeuble,
    });
    if (d > 20) {
      proposals.push({
        id: "switch_meuble",
        label: "Passer en location meublée (LMNP Réel)",
        description: `Loyer +15 % en moyenne sur le marché meublé + amortissement fiscal qui annule l'IR.`,
        delta_cashflow_mensuel: d,
        patch: { type_location: "meublee_lmnp", regime_fiscal: "reel_bic", loyer_mensuel: loyerMeuble },
      });
    }
  }

  // 8. Renégociation GLI (souvent 2,5 % loyers → mutualisée 2 %)
  if (i.assurance_gli > i.loyer_mensuel * 12 * 0.02) {
    const newGli = Math.round(i.loyer_mensuel * 12 * 0.02);
    const d = simulate({ assurance_gli: newGli });
    if (d > 3) {
      proposals.push({
        id: "gli",
        label: `Renégocier la GLI à ${newGli.toLocaleString("fr-FR")} €/an (2 % des loyers)`,
        description: `Les courtiers spécialisés (Smartloc, Luko) descendent à 2 % vs 2,5 % chez les acteurs traditionnels.`,
        delta_cashflow_mensuel: d,
        patch: { assurance_gli: newGli },
      });
    }
  }

  // 9. Réduire frais de gestion (mandat à 7 % → autogestion ou agence low-cost à 4,5 %)
  if (i.frais_gestion_pct > 4.5) {
    const d = simulate({ frais_gestion_pct: 4.5 });
    if (d > 5) {
      proposals.push({
        id: "gestion",
        label: "Passer la gestion locative à 4,5 % (vs 7 %)",
        description: `Acteurs en ligne (Flatlooker, Bevouac, Manda) ou autogestion partielle. Économie directe sur cash-flow.`,
        delta_cashflow_mensuel: d,
        patch: { frais_gestion_pct: 4.5 },
      });
    }
  }

  // 10. Réduire la vacance locative (mise en location pro / annonce optimisée)
  if (i.vacance_locative_pct > 4) {
    const d = simulate({ vacance_locative_pct: Math.max(3, i.vacance_locative_pct - 3) });
    if (d > 5) {
      proposals.push({
        id: "vacance",
        label: `Réduire la vacance à ${Math.max(3, i.vacance_locative_pct - 3)} %`,
        description: `Photos pro, annonce optimisée, sélection rapide locataire → vacance ramenée à la moyenne du marché.`,
        delta_cashflow_mensuel: d,
        patch: { vacance_locative_pct: Math.max(3, i.vacance_locative_pct - 3) },
      });
    }
  }

  // 11. Bascule courte durée (Airbnb) si loyer faible et zone touristique potentielle
  if (i.type_location !== "courte_duree" && i.loyer_mensuel > 0) {
    const loyerCD = Math.round(i.loyer_mensuel * 1.6);
    const d = simulate({
      type_location: "courte_duree",
      loyer_mensuel: loyerCD,
      vacance_locative_pct: Math.max(20, i.vacance_locative_pct),
      frais_gestion_pct: Math.max(20, i.frais_gestion_pct),
    });
    if (d > 50) {
      proposals.push({
        id: "courte_duree",
        label: "Tester la location courte durée (Airbnb)",
        description: `Revenus potentiels +60 % mais vacance ~25 % et gestion ~20 %. Vérifier réglementation locale (mairie, copro).`,
        delta_cashflow_mensuel: d,
        patch: {
          type_location: "courte_duree",
          loyer_mensuel: loyerCD,
          vacance_locative_pct: Math.max(20, i.vacance_locative_pct),
          frais_gestion_pct: Math.max(20, i.frais_gestion_pct),
        },
      });
    }
  }

  // 12. Travaux énergétiques rentables (si DPE F/G et travaux non saisis)
  if (["F", "G", "E"].includes(i.dpe) && i.cout_travaux === 0) {
    const coutEstime = i.surface * 600; // ~600 €/m² pour passage E/F/G → C
    const aides = Math.round(coutEstime * 0.35); // MPR + CEE ~35%
    const gain = Math.round(i.loyer_mensuel * 0.08); // +8 % loyer post DPE C
    const d = simulate({
      cout_travaux: coutEstime,
      aides_renovation: aides,
      gain_loyer_post_travaux: gain,
      economie_charges_post_travaux: 600,
      dpe_cible: "C",
    });
    if (d > -50) {
      proposals.push({
        id: "renovation_energetique",
        label: `Lancer une rénovation énergétique (~${coutEstime.toLocaleString("fr-FR")} €)`,
        description: `Passage DPE ${i.dpe} → C : ~${aides.toLocaleString("fr-FR")} € d'aides (MPR + CEE), +${gain} €/mois de loyer, valeur verte +5 à 10 % à la revente. Évite l'interdiction de location 2025-2034.`,
        delta_cashflow_mensuel: d,
        patch: {
          cout_travaux: coutEstime,
          aides_renovation: aides,
          gain_loyer_post_travaux: gain,
          economie_charges_post_travaux: 600,
          dpe_cible: "C",
        },
      });
    }
  }

  // 13. Frais de notaire réduits (négociation ou bien neuf)
  if (i.frais_notaire_pct >= 7) {
    const d = simulate({ frais_notaire_pct: 2.5 });
    if (d > 3) {
      proposals.push({
        id: "notaire_neuf",
        label: "Cibler du neuf / VEFA (notaire à 2,5 % vs 7,5 %)",
        description: `Économie immédiate sur frais d'acquisition, moindre amortissement mais TVA récupérable en LMP. Pertinent si stratégie patrimoniale long terme.`,
        delta_cashflow_mensuel: d,
        patch: { frais_notaire_pct: 2.5 },
      });
    }
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

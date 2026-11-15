export type Chapter = { name: string; short: string; colors: [string, string] };

export const chapters: Chapter[] = [
  { name: "Alpha Epsilon Pi", short: "AΕΠ", colors: ["#0e5b9a", "#f8c629"] },
  { name: "Alpha Sigma Phi", short: "ΑΣΦ", colors: ["#cf1530", "#929ba0"] },
  { name: "Beta Theta Pi", short: "ΒΘΠ", colors: ["#142d60", "#ffffff"] },
  { name: "Delta Chi", short: "ΔΧ", colors: ["#e0062f", "#ffd34e"] },
  { name: "Delta Sigma Phi", short: "ΔΣΦ", colors: ["#008f3b", "#ffd300"] },
  { name: "Delta Upsilon", short: "ΔΥ", colors: ["#2f619b", "#ffce47"] },
  { name: "Kappa Sigma", short: "ΚΣ", colors: ["#be0d3d", "#ffffff"] },
  { name: "Lambda Chi Alpha", short: "ΛΧΑ", colors: ["#00733e", "#dca82c"] },
  { name: "Phi Delta Theta", short: "ΦΔΘ", colors: ["#192b5f", "#d9b56d"] },
  { name: "Phi Gamma Delta", short: "FIJI", colors: ["#48206f", "#ffffff"] },
  { name: "Phi Kappa Psi", short: "ΦΚΨ", colors: ["#f2a821", "#171717"] },
  { name: "Phi Sigma Kappa", short: "ΦΣΚ", colors: ["#c8143b", "#d6d6d6"] },
  { name: "Pi Kappa Phi", short: "ΠΚΦ", colors: ["#00529b", "#e2ad2e"] },
  { name: "Sigma Nu", short: "ΣΝ", colors: ["#b29a66", "#ffffff"] },
  { name: "Sigma Phi Epsilon", short: "ΣΦΕ", colors: ["#70399a", "#ffffff"] },
  { name: "Sigma Pi", short: "ΣΠ", colors: ["#4c466f", "#ffffff"] },
  { name: "Theta Chi", short: "ΘΧ", colors: ["#da1830", "#ffffff"] },
  { name: "Zeta Beta Tau", short: "ΖΒΤ", colors: ["#103b62", "#ffcc19"] },
  { name: "Pi Kappa Alpha", short: "ΠΚΑ", colors: ["#84202c", "#ffffff"] },
];

export const chapterNames = chapters.map((chapter) => chapter.name);

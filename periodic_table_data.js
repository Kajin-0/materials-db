// periodic_table_data.js
// Enhanced data for periodic table elements, focusing on materials science relevance.
// Note: Some values (density, melt/boil points, radii, conductivity) can vary based on allotrope, temperature, and pressure.
// Data for synthetic elements is often estimated or unavailable.

window.periodicTableData = {
  "H": {
    number: 1, name: "Hydrogen", mass: 1.008, category: "diatomic nonmetal",
    group: 1, period: 1, block: "s", density: 0.00008988, melt: -259.16, boil: -252.87,
    heat: 14.304, conduct: 0.1805, e_neg_pauling: 2.20, electron_configuration_semantic: "1s¹", atomic_radius: 53
  },
  "He": {
    number: 2, name: "Helium", mass: 4.0026, category: "noble gas",
    group: 18, period: 1, block: "p", density: 0.0001785, melt: null, boil: -268.93, // Melts only under pressure
    heat: 5.193, conduct: 0.1513, e_neg_pauling: null, electron_configuration_semantic: "1s²", atomic_radius: 31
  },
  "Li": {
    number: 3, name: "Lithium", mass: 6.94, category: "alkali metal",
    group: 1, period: 2, block: "s", density: 0.534, melt: 180.50, boil: 1342,
    heat: 3.582, conduct: 85, e_neg_pauling: 0.98, electron_configuration_semantic: "[He] 2s¹", atomic_radius: 167
  },
  "Be": {
    number: 4, name: "Beryllium", mass: 9.0122, category: "alkaline earth metal",
    group: 2, period: 2, block: "s", density: 1.85, melt: 1287, boil: 2469,
    heat: 1.825, conduct: 190, e_neg_pauling: 1.57, electron_configuration_semantic: "[He] 2s²", atomic_radius: 112
  },
  "B": {
    number: 5, name: "Boron", mass: 10.81, category: "metalloid",
    group: 13, period: 2, block: "p", density: 2.34, melt: 2076, boil: 3927,
    heat: 1.026, conduct: 27, e_neg_pauling: 2.04, electron_configuration_semantic: "[He] 2s² 2p¹", atomic_radius: 87
  },
  "C": {
    number: 6, name: "Carbon", mass: 12.011, category: "polyatomic nonmetal",
    group: 14, period: 2, block: "p", density: 2.267, melt: 3550, boil: 4827, // Graphite sublimes
    heat: 0.709, conduct: 140, e_neg_pauling: 2.55, electron_configuration_semantic: "[He] 2s² 2p²", atomic_radius: 67
  },
  "N": {
    number: 7, name: "Nitrogen", mass: 14.007, category: "diatomic nonmetal",
    group: 15, period: 2, block: "p", density: 0.001251, melt: -210.00, boil: -195.8,
    heat: 1.04, conduct: 0.02583, e_neg_pauling: 3.04, electron_configuration_semantic: "[He] 2s² 2p³", atomic_radius: 56
  },
  "O": {
    number: 8, name: "Oxygen", mass: 15.999, category: "diatomic nonmetal",
    group: 16, period: 2, block: "p", density: 0.001429, melt: -218.79, boil: -182.96,
    heat: 0.918, conduct: 0.02658, e_neg_pauling: 3.44, electron_configuration_semantic: "[He] 2s² 2p⁴", atomic_radius: 48
  },
  "F": {
    number: 9, name: "Fluorine", mass: 18.998, category: "diatomic nonmetal",
    group: 17, period: 2, block: "p", density: 0.001696, melt: -219.67, boil: -188.11,
    heat: 0.824, conduct: 0.0277, e_neg_pauling: 3.98, electron_configuration_semantic: "[He] 2s² 2p⁵", atomic_radius: 42
  },
  "Ne": {
    number: 10, name: "Neon", mass: 20.180, category: "noble gas",
    group: 18, period: 2, block: "p", density: 0.0009002, melt: -248.59, boil: -246.08,
    heat: 1.03, conduct: 0.0491, e_neg_pauling: null, electron_configuration_semantic: "[He] 2s² 2p⁶", atomic_radius: 38
  },
  "Na": {
    number: 11, name: "Sodium", mass: 22.990, category: "alkali metal",
    group: 1, period: 3, block: "s", density: 0.968, melt: 97.79, boil: 883,
    heat: 1.228, conduct: 140, e_neg_pauling: 0.93, electron_configuration_semantic: "[Ne] 3s¹", atomic_radius: 190
  },
  "Mg": {
    number: 12, name: "Magnesium", mass: 24.305, category: "alkaline earth metal",
    group: 2, period: 3, block: "s", density: 1.738, melt: 650, boil: 1091,
    heat: 1.023, conduct: 160, e_neg_pauling: 1.31, electron_configuration_semantic: "[Ne] 3s²", atomic_radius: 145
  },
  "Al": {
    number: 13, name: "Aluminum", mass: 26.982, category: "post-transition metal",
    group: 13, period: 3, block: "p", density: 2.70, melt: 660.32, boil: 2519,
    heat: 0.897, conduct: 235, e_neg_pauling: 1.61, electron_configuration_semantic: "[Ne] 3s² 3p¹", atomic_radius: 118
  },
  "Si": {
    number: 14, name: "Silicon", mass: 28.085, category: "metalloid",
    group: 14, period: 3, block: "p", density: 2.33, melt: 1414, boil: 3265,
    heat: 0.705, conduct: 150, e_neg_pauling: 1.90, electron_configuration_semantic: "[Ne] 3s² 3p²", atomic_radius: 111
  },
  "P": {
    number: 15, name: "Phosphorus", mass: 30.974, category: "polyatomic nonmetal",
    group: 15, period: 3, block: "p", density: 1.823, melt: 44.15, boil: 280.5, // White phosphorus
    heat: 0.769, conduct: 0.236, e_neg_pauling: 2.19, electron_configuration_semantic: "[Ne] 3s² 3p³", atomic_radius: 98
  },
  "S": {
    number: 16, name: "Sulfur", mass: 32.06, category: "polyatomic nonmetal",
    group: 16, period: 3, block: "p", density: 1.96, melt: 115.21, boil: 444.6, // Alpha sulfur
    heat: 0.71, conduct: 0.205, e_neg_pauling: 2.58, electron_configuration_semantic: "[Ne] 3s² 3p⁴", atomic_radius: 88
  },
  "Cl": {
    number: 17, name: "Chlorine", mass: 35.45, category: "diatomic nonmetal",
    group: 17, period: 3, block: "p", density: 0.003214, melt: -101.5, boil: -34.04,
    heat: 0.479, conduct: 0.0089, e_neg_pauling: 3.16, electron_configuration_semantic: "[Ne] 3s² 3p⁵", atomic_radius: 79
  },
  "Ar": {
    number: 18, name: "Argon", mass: 39.948, category: "noble gas",
    group: 18, period: 3, block: "p", density: 0.001784, melt: -189.34, boil: -185.85,
    heat: 0.520, conduct: 0.01772, e_neg_pauling: null, electron_configuration_semantic: "[Ne] 3s² 3p⁶", atomic_radius: 71
  },
  "K": {
    number: 19, name: "Potassium", mass: 39.098, category: "alkali metal",
    group: 1, period: 4, block: "s", density: 0.856, melt: 63.5, boil: 759,
    heat: 0.757, conduct: 100, e_neg_pauling: 0.82, electron_configuration_semantic: "[Ar] 4s¹", atomic_radius: 243
  },
  "Ca": {
    number: 20, name: "Calcium", mass: 40.078, category: "alkaline earth metal",
    group: 2, period: 4, block: "s", density: 1.55, melt: 842, boil: 1484,
    heat: 0.647, conduct: 200, e_neg_pauling: 1.00, electron_configuration_semantic: "[Ar] 4s²", atomic_radius: 194
  },
  "Sc": {
    number: 21, name: "Scandium", mass: 44.956, category: "transition metal",
    group: 3, period: 4, block: "d", density: 2.985, melt: 1541, boil: 2836,
    heat: 0.568, conduct: 15.8, e_neg_pauling: 1.36, electron_configuration_semantic: "[Ar] 3d¹ 4s²", atomic_radius: 184
  },
  "Ti": {
    number: 22, name: "Titanium", mass: 47.867, category: "transition metal",
    group: 4, period: 4, block: "d", density: 4.507, melt: 1668, boil: 3287,
    heat: 0.523, conduct: 21.9, e_neg_pauling: 1.54, electron_configuration_semantic: "[Ar] 3d² 4s²", atomic_radius: 176
  },
  "V": {
    number: 23, name: "Vanadium", mass: 50.942, category: "transition metal",
    group: 5, period: 4, block: "d", density: 6.11, melt: 1910, boil: 3407,
    heat: 0.489, conduct: 30.7, e_neg_pauling: 1.63, electron_configuration_semantic: "[Ar] 3d³ 4s²", atomic_radius: 171
  },
  "Cr": {
    number: 24, name: "Chromium", mass: 51.996, category: "transition metal",
    group: 6, period: 4, block: "d", density: 7.19, melt: 1907, boil: 2671,
    heat: 0.449, conduct: 94, e_neg_pauling: 1.66, electron_configuration_semantic: "[Ar] 3d⁵ 4s¹", atomic_radius: 166
  },
  "Mn": {
    number: 25, name: "Manganese", mass: 54.938, category: "transition metal",
    group: 7, period: 4, block: "d", density: 7.47, melt: 1246, boil: 2061,
    heat: 0.479, conduct: 7.8, e_neg_pauling: 1.55, electron_configuration_semantic: "[Ar] 3d⁵ 4s²", atomic_radius: 161
  },
  "Fe": {
    number: 26, name: "Iron", mass: 55.845, category: "transition metal",
    group: 8, period: 4, block: "d", density: 7.874, melt: 1538, boil: 2862,
    heat: 0.449, conduct: 80, e_neg_pauling: 1.83, electron_configuration_semantic: "[Ar] 3d⁶ 4s²", atomic_radius: 156
  },
  "Co": {
    number: 27, name: "Cobalt", mass: 58.933, category: "transition metal",
    group: 9, period: 4, block: "d", density: 8.90, melt: 1495, boil: 2927,
    heat: 0.421, conduct: 100, e_neg_pauling: 1.88, electron_configuration_semantic: "[Ar] 3d⁷ 4s²", atomic_radius: 152
  },
  "Ni": {
    number: 28, name: "Nickel", mass: 58.693, category: "transition metal",
    group: 10, period: 4, block: "d", density: 8.908, melt: 1455, boil: 2913,
    heat: 0.444, conduct: 91, e_neg_pauling: 1.91, electron_configuration_semantic: "[Ar] 3d⁸ 4s²", atomic_radius: 149
  },
  "Cu": {
    number: 29, name: "Copper", mass: 63.546, category: "transition metal",
    group: 11, period: 4, block: "d", density: 8.96, melt: 1084.62, boil: 2562,
    heat: 0.385, conduct: 398, e_neg_pauling: 1.90, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s¹", atomic_radius: 145
  },
  "Zn": {
    number: 30, name: "Zinc", mass: 65.38, category: "transition metal", // Often considered post-transition
    group: 12, period: 4, block: "d", density: 7.14, melt: 419.53, boil: 907,
    heat: 0.388, conduct: 116, e_neg_pauling: 1.65, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s²", atomic_radius: 142
  },
  "Ga": {
    number: 31, name: "Gallium", mass: 69.723, category: "post-transition metal",
    group: 13, period: 4, block: "p", density: 5.91, melt: 29.76, boil: 2400,
    heat: 0.371, conduct: 29, e_neg_pauling: 1.81, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p¹", atomic_radius: 136
  },
  "Ge": {
    number: 32, name: "Germanium", mass: 72.63, category: "metalloid",
    group: 14, period: 4, block: "p", density: 5.323, melt: 938.25, boil: 2833,
    heat: 0.32, conduct: 60, e_neg_pauling: 2.01, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p²", atomic_radius: 125
  },
  "As": {
    number: 33, name: "Arsenic", mass: 74.922, category: "metalloid",
    group: 15, period: 4, block: "p", density: 5.727, melt: 817, boil: 614, // Sublimes
    heat: 0.329, conduct: 50, e_neg_pauling: 2.18, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p³", atomic_radius: 114
  },
  "Se": {
    number: 34, name: "Selenium", mass: 78.971, category: "polyatomic nonmetal",
    group: 16, period: 4, block: "p", density: 4.81, melt: 221, boil: 685, // Gray selenium
    heat: 0.321, conduct: 0.52, e_neg_pauling: 2.55, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p⁴", atomic_radius: 103
  },
  "Br": {
    number: 35, name: "Bromine", mass: 79.904, category: "diatomic nonmetal",
    group: 17, period: 4, block: "p", density: 3.12, melt: -7.2, boil: 58.8,
    heat: 0.474, conduct: 0.122, e_neg_pauling: 2.96, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p⁵", atomic_radius: 94
  },
  "Kr": {
    number: 36, name: "Krypton", mass: 83.798, category: "noble gas",
    group: 18, period: 4, block: "p", density: 0.003749, melt: -157.37, boil: -153.41,
    heat: 0.248, conduct: 0.00943, e_neg_pauling: 3.0, electron_configuration_semantic: "[Ar] 3d¹⁰ 4s² 4p⁶", atomic_radius: 88
  },
  "Rb": {
    number: 37, name: "Rubidium", mass: 85.468, category: "alkali metal",
    group: 1, period: 5, block: "s", density: 1.532, melt: 39.30, boil: 688,
    heat: 0.363, conduct: 58, e_neg_pauling: 0.82, electron_configuration_semantic: "[Kr] 5s¹", atomic_radius: 265
  },
  "Sr": {
    number: 38, name: "Strontium", mass: 87.62, category: "alkaline earth metal",
    group: 2, period: 5, block: "s", density: 2.63, melt: 777, boil: 1382,
    heat: 0.301, conduct: 35, e_neg_pauling: 0.95, electron_configuration_semantic: "[Kr] 5s²", atomic_radius: 219
  },
  "Y": {
    number: 39, name: "Yttrium", mass: 88.906, category: "transition metal",
    group: 3, period: 5, block: "d", density: 4.472, melt: 1526, boil: 3336,
    heat: 0.298, conduct: 17.2, e_neg_pauling: 1.22, electron_configuration_semantic: "[Kr] 4d¹ 5s²", atomic_radius: 212
  },
  "Zr": {
    number: 40, name: "Zirconium", mass: 91.224, category: "transition metal",
    group: 4, period: 5, block: "d", density: 6.511, melt: 1855, boil: 4409,
    heat: 0.278, conduct: 22.6, e_neg_pauling: 1.33, electron_configuration_semantic: "[Kr] 4d² 5s²", atomic_radius: 206
  },
  "Nb": {
    number: 41, name: "Niobium", mass: 92.906, category: "transition metal",
    group: 5, period: 5, block: "d", density: 8.57, melt: 2477, boil: 4744,
    heat: 0.265, conduct: 53.7, e_neg_pauling: 1.6, electron_configuration_semantic: "[Kr] 4d⁴ 5s¹", atomic_radius: 198
  },
  "Mo": {
    number: 42, name: "Molybdenum", mass: 95.95, category: "transition metal",
    group: 6, period: 5, block: "d", density: 10.28, melt: 2623, boil: 4639,
    heat: 0.251, conduct: 139, e_neg_pauling: 2.16, electron_configuration_semantic: "[Kr] 4d⁵ 5s¹", atomic_radius: 190
  },
  "Tc": {
    number: 43, name: "Technetium", mass: 98, category: "transition metal", // Approx. mass for Tc-98
    group: 7, period: 5, block: "d", density: 11.5, melt: 2157, boil: 4265,
    heat: 0.243, conduct: 50.6, e_neg_pauling: 1.9, electron_configuration_semantic: "[Kr] 4d⁵ 5s²", atomic_radius: 183
  },
  "Ru": {
    number: 44, name: "Ruthenium", mass: 101.07, category: "transition metal",
    group: 8, period: 5, block: "d", density: 12.45, melt: 2334, boil: 4150,
    heat: 0.238, conduct: 117, e_neg_pauling: 2.2, electron_configuration_semantic: "[Kr] 4d⁷ 5s¹", atomic_radius: 178
  },
  "Rh": {
    number: 45, name: "Rhodium", mass: 102.91, category: "transition metal",
    group: 9, period: 5, block: "d", density: 12.41, melt: 1964, boil: 3695,
    heat: 0.243, conduct: 150, e_neg_pauling: 2.28, electron_configuration_semantic: "[Kr] 4d⁸ 5s¹", atomic_radius: 173
  },
  "Pd": {
    number: 46, name: "Palladium", mass: 106.42, category: "transition metal",
    group: 10, period: 5, block: "d", density: 12.023, melt: 1554.9, boil: 2963,
    heat: 0.244, conduct: 71.8, e_neg_pauling: 2.20, electron_configuration_semantic: "[Kr] 4d¹⁰", atomic_radius: 169
  },
  "Ag": {
    number: 47, name: "Silver", mass: 107.87, category: "transition metal",
    group: 11, period: 5, block: "d", density: 10.49, melt: 961.78, boil: 2162,
    heat: 0.235, conduct: 429, e_neg_pauling: 1.93, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s¹", atomic_radius: 165
  },
  "Cd": {
    number: 48, name: "Cadmium", mass: 112.41, category: "transition metal", // Often considered post-transition
    group: 12, period: 5, block: "d", density: 8.65, melt: 321.07, boil: 767,
    heat: 0.232, conduct: 97, e_neg_pauling: 1.69, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s²", atomic_radius: 161
  },
  "In": {
    number: 49, name: "Indium", mass: 114.82, category: "post-transition metal",
    group: 13, period: 5, block: "p", density: 7.31, melt: 156.60, boil: 2072,
    heat: 0.233, conduct: 81.8, e_neg_pauling: 1.78, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p¹", atomic_radius: 156
  },
  "Sn": {
    number: 50, name: "Tin", mass: 118.71, category: "post-transition metal",
    group: 14, period: 5, block: "p", density: 7.31, melt: 231.93, boil: 2602, // White tin
    heat: 0.228, conduct: 66.8, e_neg_pauling: 1.96, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p²", atomic_radius: 145
  },
  "Sb": {
    number: 51, name: "Antimony", mass: 121.76, category: "metalloid",
    group: 15, period: 5, block: "p", density: 6.697, melt: 630.63, boil: 1587,
    heat: 0.207, conduct: 24.4, e_neg_pauling: 2.05, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p³", atomic_radius: 133
  },
  "Te": {
    number: 52, name: "Tellurium", mass: 127.60, category: "metalloid",
    group: 16, period: 5, block: "p", density: 6.24, melt: 449.51, boil: 988,
    heat: 0.202, conduct: 3, e_neg_pauling: 2.1, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p⁴", atomic_radius: 123
  },
  "I": {
    number: 53, name: "Iodine", mass: 126.90, category: "diatomic nonmetal",
    group: 17, period: 5, block: "p", density: 4.933, melt: 113.7, boil: 184.3,
    heat: 0.214, conduct: 0.449, e_neg_pauling: 2.66, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p⁵", atomic_radius: 115
  },
  "Xe": {
    number: 54, name: "Xenon", mass: 131.29, category: "noble gas",
    group: 18, period: 5, block: "p", density: 0.005894, melt: -111.75, boil: -108.09,
    heat: 0.158, conduct: 0.00565, e_neg_pauling: 2.6, electron_configuration_semantic: "[Kr] 4d¹⁰ 5s² 5p⁶", atomic_radius: 108
  },
  "Cs": {
    number: 55, name: "Cesium", mass: 132.91, category: "alkali metal",
    group: 1, period: 6, block: "s", density: 1.879, melt: 28.44, boil: 671,
    heat: 0.242, conduct: 36, e_neg_pauling: 0.79, electron_configuration_semantic: "[Xe] 6s¹", atomic_radius: 298
  },
  "Ba": {
    number: 56, name: "Barium", mass: 137.33, category: "alkaline earth metal",
    group: 2, period: 6, block: "s", density: 3.51, melt: 727, boil: 1897,
    heat: 0.204, conduct: 18.4, e_neg_pauling: 0.89, electron_configuration_semantic: "[Xe] 6s²", atomic_radius: 253
  },
  "La": {
    number: 57, name: "Lanthanum", mass: 138.91, category: "lanthanide",
    group: null, period: 6, block: "f", density: 6.146, melt: 920, boil: 3464,
    heat: 0.195, conduct: 13.4, e_neg_pauling: 1.10, electron_configuration_semantic: "[Xe] 5d¹ 6s²", atomic_radius: 274 // Technically d-block start, but leads into f-block
  },
  "Ce": {
    number: 58, name: "Cerium", mass: 140.12, category: "lanthanide",
    group: null, period: 6, block: "f", density: 6.770, melt: 795, boil: 3443,
    heat: 0.192, conduct: 11.3, e_neg_pauling: 1.12, electron_configuration_semantic: "[Xe] 4f¹ 5d¹ 6s²", atomic_radius: 270
  },
  "Pr": {
    number: 59, name: "Praseodymium", mass: 140.91, category: "lanthanide",
    group: null, period: 6, block: "f", density: 6.77, melt: 931, boil: 3520,
    heat: 0.193, conduct: 12.5, e_neg_pauling: 1.13, electron_configuration_semantic: "[Xe] 4f³ 6s²", atomic_radius: 267
  },
  "Nd": {
    number: 60, name: "Neodymium", mass: 144.24, category: "lanthanide",
    group: null, period: 6, block: "f", density: 7.01, melt: 1021, boil: 3074,
    heat: 0.190, conduct: 16.5, e_neg_pauling: 1.14, electron_configuration_semantic: "[Xe] 4f⁴ 6s²", atomic_radius: 264
  },
  "Pm": {
    number: 61, name: "Promethium", mass: 145, category: "lanthanide", // Approx. mass for Pm-145
    group: null, period: 6, block: "f", density: 7.26, melt: 1042, boil: 3000,
    heat: null, conduct: 17.9, e_neg_pauling: 1.13, electron_configuration_semantic: "[Xe] 4f⁵ 6s²", atomic_radius: 262
  },
  "Sm": {
    number: 62, name: "Samarium", mass: 150.36, category: "lanthanide",
    group: null, period: 6, block: "f", density: 7.52, melt: 1072, boil: 1794,
    heat: 0.197, conduct: 13.3, e_neg_pauling: 1.17, electron_configuration_semantic: "[Xe] 4f⁶ 6s²", atomic_radius: 259
  },
  "Eu": {
    number: 63, name: "Europium", mass: 151.96, category: "lanthanide",
    group: null, period: 6, block: "f", density: 5.244, melt: 822, boil: 1529,
    heat: 0.182, conduct: 13.9, e_neg_pauling: 1.2, electron_configuration_semantic: "[Xe] 4f⁷ 6s²", atomic_radius: 256
  },
  "Gd": {
    number: 64, name: "Gadolinium", mass: 157.25, category: "lanthanide",
    group: null, period: 6, block: "f", density: 7.90, melt: 1313, boil: 3273,
    heat: 0.236, conduct: 10.6, e_neg_pauling: 1.20, electron_configuration_semantic: "[Xe] 4f⁷ 5d¹ 6s²", atomic_radius: 254
  },
  "Tb": {
    number: 65, name: "Terbium", mass: 158.93, category: "lanthanide",
    group: null, period: 6, block: "f", density: 8.23, melt: 1356, boil: 3230,
    heat: 0.182, conduct: 11.1, e_neg_pauling: 1.2, electron_configuration_semantic: "[Xe] 4f⁹ 6s²", atomic_radius: 251
  },
  "Dy": {
    number: 66, name: "Dysprosium", mass: 162.50, category: "lanthanide",
    group: null, period: 6, block: "f", density: 8.551, melt: 1412, boil: 2567,
    heat: 0.17, conduct: 10.7, e_neg_pauling: 1.22, electron_configuration_semantic: "[Xe] 4f¹⁰ 6s²", atomic_radius: 249
  },
  "Ho": {
    number: 67, name: "Holmium", mass: 164.93, category: "lanthanide",
    group: null, period: 6, block: "f", density: 8.79, melt: 1474, boil: 2700,
    heat: 0.165, conduct: 16.2, e_neg_pauling: 1.23, electron_configuration_semantic: "[Xe] 4f¹¹ 6s²", atomic_radius: 247
  },
  "Er": {
    number: 68, name: "Erbium", mass: 167.26, category: "lanthanide",
    group: null, period: 6, block: "f", density: 9.066, melt: 1529, boil: 2868,
    heat: 0.168, conduct: 14.5, e_neg_pauling: 1.24, electron_configuration_semantic: "[Xe] 4f¹² 6s²", atomic_radius: 245
  },
  "Tm": {
    number: 69, name: "Thulium", mass: 168.93, category: "lanthanide",
    group: null, period: 6, block: "f", density: 9.32, melt: 1545, boil: 1950,
    heat: 0.160, conduct: 16.9, e_neg_pauling: 1.25, electron_configuration_semantic: "[Xe] 4f¹³ 6s²", atomic_radius: 242
  },
  "Yb": {
    number: 70, name: "Ytterbium", mass: 173.05, category: "lanthanide",
    group: null, period: 6, block: "f", density: 6.90, melt: 824, boil: 1196,
    heat: 0.155, conduct: 38.5, e_neg_pauling: 1.1, electron_configuration_semantic: "[Xe] 4f¹⁴ 6s²", atomic_radius: 240
  },
  "Lu": {
    number: 71, name: "Lutetium", mass: 174.97, category: "lanthanide", // Often considered transition metal
    group: null, period: 6, block: "f", density: 9.841, melt: 1663, boil: 3402,
    heat: 0.154, conduct: 16.4, e_neg_pauling: 1.27, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹ 6s²", atomic_radius: 221 // Transition metal config
  },
  "Hf": {
    number: 72, name: "Hafnium", mass: 178.49, category: "transition metal",
    group: 4, period: 6, block: "d", density: 13.31, melt: 2233, boil: 4603,
    heat: 0.144, conduct: 23.0, e_neg_pauling: 1.3, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d² 6s²", atomic_radius: 212
  },
  "Ta": {
    number: 73, name: "Tantalum", mass: 180.95, category: "transition metal",
    group: 5, period: 6, block: "d", density: 16.65, melt: 3017, boil: 5458,
    heat: 0.140, conduct: 57.5, e_neg_pauling: 1.5, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d³ 6s²", atomic_radius: 200
  },
  "W": {
    number: 74, name: "Tungsten", mass: 183.84, category: "transition metal",
    group: 6, period: 6, block: "d", density: 19.3, melt: 3422, boil: 5555,
    heat: 0.132, conduct: 173, e_neg_pauling: 2.36, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d⁴ 6s²", atomic_radius: 193
  },
  "Re": {
    number: 75, name: "Rhenium", mass: 186.21, category: "transition metal",
    group: 7, period: 6, block: "d", density: 21.02, melt: 3186, boil: 5596,
    heat: 0.137, conduct: 48, e_neg_pauling: 1.9, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d⁵ 6s²", atomic_radius: 188
  },
  "Os": {
    number: 76, name: "Osmium", mass: 190.23, category: "transition metal",
    group: 8, period: 6, block: "d", density: 22.59, melt: 3033, boil: 5012,
    heat: 0.130, conduct: 87, e_neg_pauling: 2.2, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d⁶ 6s²", atomic_radius: 185
  },
  "Ir": {
    number: 77, name: "Iridium", mass: 192.22, category: "transition metal",
    group: 9, period: 6, block: "d", density: 22.56, melt: 2466, boil: 4428,
    heat: 0.131, conduct: 147, e_neg_pauling: 2.20, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d⁷ 6s²", atomic_radius: 180
  },
  "Pt": {
    number: 78, name: "Platinum", mass: 195.08, category: "transition metal",
    group: 10, period: 6, block: "d", density: 21.45, melt: 1768.3, boil: 3825,
    heat: 0.133, conduct: 71.6, e_neg_pauling: 2.28, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d⁹ 6s¹", atomic_radius: 177
  },
  "Au": {
    number: 79, name: "Gold", mass: 196.97, category: "transition metal",
    group: 11, period: 6, block: "d", density: 19.30, melt: 1064.18, boil: 2856,
    heat: 0.129, conduct: 317, e_neg_pauling: 2.54, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", atomic_radius: 174
  },
  "Hg": {
    number: 80, name: "Mercury", mass: 200.59, category: "transition metal", // Often considered post-transition
    group: 12, period: 6, block: "d", density: 13.534, melt: -38.83, boil: 356.73,
    heat: 0.140, conduct: 8.3, e_neg_pauling: 2.00, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s²", atomic_radius: 171
  },
  "Tl": {
    number: 81, name: "Thallium", mass: 204.38, category: "post-transition metal",
    group: 13, period: 6, block: "p", density: 11.85, melt: 304, boil: 1473,
    heat: 0.129, conduct: 46.1, e_neg_pauling: 1.62, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", atomic_radius: 156
  },
  "Pb": {
    number: 82, name: "Lead", mass: 207.2, category: "post-transition metal",
    group: 14, period: 6, block: "p", density: 11.34, melt: 327.46, boil: 1749,
    heat: 0.129, conduct: 35.3, e_neg_pauling: 2.33, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", atomic_radius: 154
  },
  "Bi": {
    number: 83, name: "Bismuth", mass: 208.98, category: "post-transition metal",
    group: 15, period: 6, block: "p", density: 9.78, melt: 271.4, boil: 1564,
    heat: 0.122, conduct: 7.9, e_neg_pauling: 2.02, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", atomic_radius: 143
  },
  "Po": {
    number: 84, name: "Polonium", mass: 209, category: "post-transition metal", // Often considered metalloid
    group: 16, period: 6, block: "p", density: 9.196, melt: 254, boil: 962,
    heat: null, conduct: 20, e_neg_pauling: 2.0, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", atomic_radius: 135
  },
  "At": {
    number: 85, name: "Astatine", mass: 210, category: "metalloid", // Often considered halogen
    group: 17, period: 6, block: "p", density: 6.35, melt: 302, boil: 337, // Estimated
    heat: null, conduct: 1.7, e_neg_pauling: 2.2, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", atomic_radius: 127
  },
  "Rn": {
    number: 86, name: "Radon", mass: 222, category: "noble gas",
    group: 18, period: 6, block: "p", density: 0.00973, melt: -71, boil: -61.7,
    heat: 0.094, conduct: 0.00361, e_neg_pauling: 2.2, electron_configuration_semantic: "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", atomic_radius: 120
  },
  "Fr": {
    number: 87, name: "Francium", mass: 223, category: "alkali metal",
    group: 1, period: 7, block: "s", density: 1.87, melt: 27, boil: 677, // Estimated
    heat: null, conduct: 15, e_neg_pauling: 0.7, electron_configuration_semantic: "[Rn] 7s¹", atomic_radius: null // Estimated ~260-300
  },
  "Ra": {
    number: 88, name: "Radium", mass: 226, category: "alkaline earth metal",
    group: 2, period: 7, block: "s", density: 5.5, melt: 700, boil: 1737,
    heat: 0.094, conduct: 18.6, e_neg_pauling: 0.9, electron_configuration_semantic: "[Rn] 7s²", atomic_radius: 215 // Calculated
  },
  "Ac": {
    number: 89, name: "Actinium", mass: 227, category: "actinide",
    group: null, period: 7, block: "f", density: 10.07, melt: 1051, boil: 3198,
    heat: 0.120, conduct: 12, e_neg_pauling: 1.1, electron_configuration_semantic: "[Rn] 6d¹ 7s²", atomic_radius: 260 // Technically d-block start
  },
  "Th": {
    number: 90, name: "Thorium", mass: 232.04, category: "actinide",
    group: null, period: 7, block: "f", density: 11.724, melt: 1750, boil: 4788,
    heat: 0.113, conduct: 54, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 6d² 7s²", atomic_radius: 259
  },
  "Pa": {
    number: 91, name: "Protactinium", mass: 231.04, category: "actinide",
    group: null, period: 7, block: "f", density: 15.37, melt: 1572, boil: 4027, // Estimated boil
    heat: null, conduct: 47, e_neg_pauling: 1.5, electron_configuration_semantic: "[Rn] 5f² 6d¹ 7s²", atomic_radius: 251
  },
  "U": {
    number: 92, name: "Uranium", mass: 238.03, category: "actinide",
    group: null, period: 7, block: "f", density: 19.1, melt: 1132.2, boil: 4131,
    heat: 0.116, conduct: 27.5, e_neg_pauling: 1.38, electron_configuration_semantic: "[Rn] 5f³ 6d¹ 7s²", atomic_radius: 241
  },
  "Np": {
    number: 93, name: "Neptunium", mass: 237, category: "actinide",
    group: null, period: 7, block: "f", density: 20.45, melt: 644, boil: 3902,
    heat: null, conduct: 6.3, e_neg_pauling: 1.36, electron_configuration_semantic: "[Rn] 5f⁴ 6d¹ 7s²", atomic_radius: 239
  },
  "Pu": {
    number: 94, name: "Plutonium", mass: 244, category: "actinide",
    group: null, period: 7, block: "f", density: 19.816, melt: 640, boil: 3228,
    heat: null, conduct: 6.7, e_neg_pauling: 1.28, electron_configuration_semantic: "[Rn] 5f⁶ 7s²", atomic_radius: 243
  },
  "Am": {
    number: 95, name: "Americium", mass: 243, category: "actinide",
    group: null, period: 7, block: "f", density: 13.67, melt: 1176, boil: 2607,
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f⁷ 7s²", atomic_radius: 244
  },
  "Cm": {
    number: 96, name: "Curium", mass: 247, category: "actinide",
    group: null, period: 7, block: "f", density: 13.51, melt: 1345, boil: 3110,
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f⁷ 6d¹ 7s²", atomic_radius: 245
  },
  "Bk": {
    number: 97, name: "Berkelium", mass: 247, category: "actinide",
    group: null, period: 7, block: "f", density: 14.78, melt: 986, boil: 2627, // Estimated boil
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f⁹ 7s²", atomic_radius: 244
  },
  "Cf": {
    number: 98, name: "Californium", mass: 251, category: "actinide",
    group: null, period: 7, block: "f", density: 15.1, melt: 900, boil: 1472, // Estimated boil
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹⁰ 7s²", atomic_radius: 245
  },
  "Es": {
    number: 99, name: "Einsteinium", mass: 252, category: "actinide",
    group: null, period: 7, block: "f", density: 8.84, melt: 860, boil: 996, // Estimated
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹¹ 7s²", atomic_radius: 245
  },
  "Fm": {
    number: 100, name: "Fermium", mass: 257, category: "actinide",
    group: null, period: 7, block: "f", density: 9.7, melt: 1527, boil: null, // Estimated
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹² 7s²", atomic_radius: 245
  },
  "Md": {
    number: 101, name: "Mendelevium", mass: 258, category: "actinide",
    group: null, period: 7, block: "f", density: 10.3, melt: 827, boil: null, // Estimated
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹³ 7s²", atomic_radius: 246
  },
  "No": {
    number: 102, name: "Nobelium", mass: 259, category: "actinide",
    group: null, period: 7, block: "f", density: 9.9, melt: 827, boil: null, // Estimated
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹⁴ 7s²", atomic_radius: 246
  },
  "Lr": {
    number: 103, name: "Lawrencium", mass: 262, category: "actinide", // Often considered transition metal
    group: null, period: 7, block: "f", density: 14.79, melt: 1627, boil: null, // Estimated
    heat: null, conduct: 10, e_neg_pauling: 1.3, electron_configuration_semantic: "[Rn] 5f¹⁴ 7s² 7p¹", atomic_radius: 246 // Transition metal config [Rn] 5f¹⁴ 6d¹ 7s² expected but p found
  },
  "Rf": {
    number: 104, name: "Rutherfordium", mass: 267, category: "transition metal",
    group: 4, period: 7, block: "d", density: 23.2, melt: 2100, boil: 5500, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d² 7s²", atomic_radius: null
  },
  "Db": {
    number: 105, name: "Dubnium", mass: 268, category: "transition metal",
    group: 5, period: 7, block: "d", density: 29.3, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d³ 7s²", atomic_radius: null
  },
  "Sg": {
    number: 106, name: "Seaborgium", mass: 271, category: "transition metal",
    group: 6, period: 7, block: "d", density: 35.0, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁴ 7s²", atomic_radius: null
  },
  "Bh": {
    number: 107, name: "Bohrium", mass: 272, category: "transition metal",
    group: 7, period: 7, block: "d", density: 37.1, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁵ 7s²", atomic_radius: null
  },
  "Hs": {
    number: 108, name: "Hassium", mass: 270, category: "transition metal",
    group: 8, period: 7, block: "d", density: 40.7, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁶ 7s²", atomic_radius: null
  },
  "Mt": {
    number: 109, name: "Meitnerium", mass: 276, category: "unknown, probably transition metal",
    group: 9, period: 7, block: "d", density: 37.4, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁷ 7s²", atomic_radius: null
  },
  "Ds": {
    number: 110, name: "Darmstadtium", mass: 281, category: "unknown, probably transition metal",
    group: 10, period: 7, block: "d", density: 34.8, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁸ 7s²", // Could be 6d⁹ 7s¹
     atomic_radius: null
  },
  "Rg": {
    number: 111, name: "Roentgenium", mass: 280, category: "unknown, probably transition metal",
    group: 11, period: 7, block: "d", density: 28.7, melt: null, boil: null, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d⁹ 7s²", // Could be 6d¹⁰ 7s¹
     atomic_radius: null
  },
  "Cn": {
    number: 112, name: "Copernicium", mass: 285, category: "transition metal", // May behave like post-transition
    group: 12, period: 7, block: "d", density: 23.7, melt: null, boil: 84, // Estimated boil
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s²", atomic_radius: null
  },
  "Nh": {
    number: 113, name: "Nihonium", mass: 286, category: "unknown, probably post-transition metal",
    group: 13, period: 7, block: "p", density: 16, melt: 427, boil: 1127, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", atomic_radius: null
  },
  "Fl": {
    number: 114, name: "Flerovium", mass: 289, category: "unknown, probably post-transition metal",
    group: 14, period: 7, block: "p", density: 14, melt: -73, boil: 67, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", atomic_radius: null
  },
  "Mc": {
    number: 115, name: "Moscovium", mass: 290, category: "unknown, probably post-transition metal",
    group: 15, period: 7, block: "p", density: 13.5, melt: 397, boil: 1097, // Estimated
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", atomic_radius: null
  },
  "Lv": {
    number: 116, name: "Livermorium", mass: 293, category: "unknown, probably post-transition metal",
    group: 16, period: 7, block: "p", density: 12.9, melt: 447, boil: 812, // Estimated range melt 364-507, boil 762-862
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", atomic_radius: null
  },
  "Ts": {
    number: 117, name: "Tennessine", mass: 294, category: "unknown, probably metalloid",
    group: 17, period: 7, block: "p", density: 7.17, melt: 447, boil: 607, // Estimated range melt 350-550, boil 610
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", atomic_radius: null
  },
  "Og": {
    number: 118, name: "Oganesson", mass: 294, category: "unknown, probably noble gas",
    group: 18, period: 7, block: "p", density: 4.95, melt: null, boil: 87, // Estimated range melt >50, boil 60-110
    heat: null, conduct: null, e_neg_pauling: null, electron_configuration_semantic: "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶", atomic_radius: null
  }
};

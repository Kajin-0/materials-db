# Material Detail Status

List of all materials found in `materials-*.json` files.
Checked items `[x]` have a corresponding **exact** key in `material_details.json` and should load correctly when clicked.
Unchecked items `[ ]` are missing a matching key in `material_details.json`.

- [x] Amorphous Alloy (Vitreloy)
- [x] Beryllium-Copper Alloy
- [x] Boron Carbide Reinforced Epoxy
- [x] Boron Nitride Nanotube Composite
- [x] Carbon Nanotube Composite
- [x] Ferrite-Polymer Composite
- [x] G-10/FR-4 Epoxy Glass Laminate
- [x] Gadolinium Gallium Garnet (GGG)
- [x] Gallium Arsenide
- [x] Graphene Oxide Paper
- [x] Graphene Polymer Composite
- [x] Hafnium Carbide Matrix Composite
- [x] Indium Foil
- [x] Indium Gallium Arsenide
- [x] Kapton Polyimide Film
- [x] LI-900 Silica Tile
- [x] LYSO:Ce Scintillator
- [x] Lead Tungstate
- [x] Lithium Niobate
- [x] Maraging Steel
- [x] Mercury Cadmium Telluride
- [x] Nextel 720 Fiber
- [x] Niobium Titanium (NbTi) Wire
- [x] Oxide-Oxide Ceramic Composite (Ox/Ox)
- [x] PEEK Carbon Fiber Composite
- [x] PTFE Glass Fiber Composite
- [x] Polyethylene Neutron Shielding
- [x] Reinforced Carbon–Carbon (RCC)
- [x] Sapphire Substrate
- [x] Silica Aerogel
- [x] Silicon
- [x] Silicon Carbide Fiber Reinforced Composite
- [x] Silicon Nitride Reinforced Silicon Carbide
- [x] TUFROC
- [x] Tantalum Hafnium Carbide
- [x] Thulium-doped YAG (Tm:YAG)
- [ ] Ultra-High Molecular Weight Polyethylene (UHMWPE)
- [ ] Vacuum Multilayer Insulation (MLI)
- [x] Yttria-Stabilized Zirconia (YSZ)
- [x] ZBLAN Fluoride Glass
- [ ] Zirconia Toughened Alumina (ZTA)
- [x] Zirconium Diboride (ZrB₂)

---
**Next Steps for Unchecked `[ ]` Items:**

To make an unchecked item work:
1.  Find its `name` in the corresponding `materials-*.json` file.
2.  Add a **new entry** to `material_details.json` where the top-level key is that **exact name**.

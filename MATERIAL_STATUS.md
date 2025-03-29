# Material Detail Status

List of all materials found in `materials-*.json` files.
Checked items `[x]` have a corresponding **exact** key in `material_details.json` and should load correctly when clicked.
Unchecked items `[ ]` are missing a matching key in `material_details.json`.

- [x] Amorphous Alloy (Vitreloy)
- [x] Beryllium-Copper Alloy
- [x] Boron Carbide Reinforced Epoxy
- [x] Boron Nitride Nanotube Composite
- [ ] Carbon Nanotube Composite
- [ ] Ferrite-Polymer Composite
- [ ] G-10/FR-4 Epoxy Glass Laminate
- [x] Gadolinium Gallium Garnet (GGG)
- [x] Gallium Arsenide
- [ ] Graphene Oxide Paper
- [ ] Graphene Polymer Composite
- [ ] Hafnium Carbide Matrix Composite
- [ ] Indium Foil
- [x] Indium Gallium Arsenide
- [x] Kapton Polyimide Film
- [ ] LI-900 Silica Tile
- [ ] LYSO:Ce Scintillator
- [ ] Lead Tungstate
- [x] Lithium Niobate
- [ ] Maraging Steel
- [x] Mercury Cadmium Telluride
- [ ] Nextel 720 Fiber
- [x] Niobium Titanium (NbTi) Wire
- [ ] Oxide-Oxide Ceramic Composite (Ox/Ox)
- [ ] PEEK Carbon Fiber Composite
- [ ] PTFE Glass Fiber Composite
- [ ] Polyethylene Neutron Shielding
- [x] Reinforced Carbon–Carbon (RCC)
- [x] Sapphire Substrate
- [ ] Silica Aerogel
- [x] Silicon
- [ ] Silicon Carbide Fiber Reinforced Composite
- [ ] Silicon Nitride Reinforced Silicon Carbide
- [ ] TUFROC
- [ ] Tantalum Hafnium Carbide
- [ ] Thulium-doped YAG (Tm:YAG)
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

"""
Target TSX Mining Producers
Top 50 producers by market cap that we want to track project-level data for.
"""

# Top 50 TSX mining producers with their primary commodity and key mines
TARGET_PRODUCERS = {
    # Gold Majors (>$10B market cap)
    "AEM": {"name": "Agnico Eagle Mines", "commodity": "Gold", "mines": ["Canadian Malartic", "Detour Lake", "Macassa", "Fosterville", "Meliadine", "Meadowbank"]},
    "ABX": {"name": "Barrick Mining", "commodity": "Gold", "mines": ["Nevada Gold Mines", "Pueblo Viejo", "Loulo-Gounkoto", "Kibali", "Tongon", "North Mara"]},
    "K": {"name": "Kinross Gold", "commodity": "Gold", "mines": ["Paracatu", "Tasiast", "Fort Knox", "Round Mountain", "La Coipa", "Great Bear"]},
    "LUG": {"name": "Lundin Gold", "commodity": "Gold", "mines": ["Fruta del Norte"]},
    "AGI": {"name": "Alamos Gold", "commodity": "Gold", "mines": ["Young-Davidson", "Island Gold", "Mulatos", "Lynn Lake"]},
    "EDV": {"name": "Endeavour Mining", "commodity": "Gold", "mines": ["Sabodala-Massawa", "Houndé", "Ity", "Mana", "Lafigué"]},
    "EQX": {"name": "Equinox Gold", "commodity": "Gold", "mines": ["Los Filos", "Mesquite", "Aurizona", "Fazenda", "RDM", "Santa Luz", "Greenstone"]},
    "IMG": {"name": "IAMGold", "commodity": "Gold", "mines": ["Essakane", "Westwood", "Côté Gold"]},
    "CGG": {"name": "China Gold International", "commodity": "Gold", "mines": ["CSH Mine", "Jiama Mine"]},
    "AG": {"name": "First Majestic Silver", "commodity": "Silver", "mines": ["San Dimas", "Santa Elena", "La Encantada", "Jerritt Canyon"]},

    # Streaming/Royalty (track underlying assets)
    "WPM": {"name": "Wheaton Precious Metals", "commodity": "Gold/Silver", "type": "streaming"},
    "FNV": {"name": "Franco-Nevada", "commodity": "Gold", "type": "royalty"},
    "TFPM": {"name": "Triple Flag Precious Metals", "commodity": "Gold", "type": "streaming"},
    "OR": {"name": "OR Royalties", "commodity": "Gold", "type": "royalty"},

    # Silver/Polymetallic
    "PAAS": {"name": "Pan American Silver", "commodity": "Silver", "mines": ["La Colorada", "Dolores", "Huaron", "San Vicente", "Cerro Moro"]},
    "EDR": {"name": "Endeavour Silver", "commodity": "Silver", "mines": ["Guanaceví", "Bolañitos", "El Cubo", "Terronera"]},

    # Copper
    "FM": {"name": "First Quantum Minerals", "commodity": "Copper", "mines": ["Cobre Panama", "Kansanshi", "Sentinel", "Las Cruces"]},
    "LUN": {"name": "Lundin Mining", "commodity": "Copper", "mines": ["Candelaria", "Chapada", "Eagle", "Neves-Corvo", "Zinkgruvan"]},
    "IVN": {"name": "Ivanhoe Mines", "commodity": "Copper", "mines": ["Kamoa-Kakula", "Platreef", "Kipushi"]},
    "CS": {"name": "Capstone Copper", "commodity": "Copper", "mines": ["Pinto Valley", "Cozamin", "Mantos Blancos", "Mantoverde"]},
    "HBM": {"name": "HudBay Minerals", "commodity": "Copper", "mines": ["Constancia", "Lalor", "Snow Lake", "Copper World"]},
    "ERO": {"name": "Ero Copper", "commodity": "Copper", "mines": ["Caraíba", "Xavantina", "Tucumã"]},

    # Uranium
    "CCO": {"name": "Cameco", "commodity": "Uranium", "mines": ["Cigar Lake", "McArthur River", "Key Lake"]},
    "NXE": {"name": "NexGen Energy", "commodity": "Uranium", "mines": ["Rook I"]},
    "EFR": {"name": "Energy Fuels", "commodity": "Uranium", "mines": ["White Mesa Mill"]},

    # Diversified/Other
    "NTR": {"name": "Nutrien", "commodity": "Potash", "mines": ["Rocanville", "Allan", "Lanigan", "Cory", "Vanscoy", "Patience Lake"]},
    "TECK": {"name": "Teck Resources", "commodity": "Copper/Zinc", "mines": ["Highland Valley", "Antamina", "Carmen de Andacollo", "Red Dog", "Trail"]},

    # Mid-tier Gold (>$3B market cap)
    "NGD": {"name": "New Gold", "commodity": "Gold", "mines": ["Rainy River", "New Afton"]},
    "ELD": {"name": "Eldorado Gold", "commodity": "Gold", "mines": ["Kisladag", "Lamaque", "Efemçukuru", "Olympias", "Skouries"]},
    "BTO": {"name": "B2Gold", "commodity": "Gold", "mines": ["Fekola", "Masbate", "Otjikoto", "Goose"]},
    "DPM": {"name": "DPM Metals", "commodity": "Gold", "mines": ["Chelopech", "Ada Tepe", "Tsumeb"]},
    "OGC": {"name": "OceanaGold", "commodity": "Gold", "mines": ["Haile", "Didipio", "Waihi", "Macraes"]},
    "GMIN": {"name": "G Mining Ventures", "commodity": "Gold", "mines": ["Tocantinzinho"]},
    "OLA": {"name": "Orla Mining", "commodity": "Gold", "mines": ["Camino Rojo"]},
    "SSRM": {"name": "SSR Mining", "commodity": "Gold", "mines": ["Çöpler", "Marigold", "Seabee", "Puna"]},
    "TXG": {"name": "Torex Gold", "commodity": "Gold", "mines": ["El Limón Guajes", "Media Luna"]},
    "KNT": {"name": "K92 Mining", "commodity": "Gold", "mines": ["Kainantu"]},
    "FVI": {"name": "Fortuna Mining", "commodity": "Gold/Silver", "mines": ["Séguéla", "Yaramoko", "Lindero", "San Jose", "Caylloma"]},
    "ARIS": {"name": "Aris Mining", "commodity": "Gold", "mines": ["Marmato", "Segovia"]},
    "AAUC": {"name": "Allied Gold", "commodity": "Gold", "mines": ["Bonikro", "Agbaou", "Sadiola"]},
    "CG": {"name": "Centerra Gold", "commodity": "Gold", "mines": ["Mount Milligan", "Öksüt"]},
    "WDO": {"name": "Wesdome Gold", "commodity": "Gold", "mines": ["Eagle River", "Kiena"]},

    # Developers with near-term production
    "PRU": {"name": "Perseus Mining", "commodity": "Gold", "mines": ["Edikan", "Sissingué", "Yaouré"]},
    "DSV": {"name": "Discovery Silver", "commodity": "Silver", "mines": ["Cordero"]},
    "SKE": {"name": "Skeena Resources", "commodity": "Gold", "mines": ["Eskay Creek"]},
}

# Priority order for data collection (by market cap tier)
PRIORITY_TIERS = {
    "tier1_majors": ["AEM", "ABX", "WPM", "FNV", "CCO", "K", "NTR", "TECK"],
    "tier2_large": ["LUG", "PAAS", "FM", "LUN", "AGI", "IVN", "EDV", "EQX"],
    "tier3_mid": ["IMG", "CGG", "AG", "TFPM", "CS", "HBM", "OR", "NGD", "ELD", "BTO"],
    "tier4_small": ["DPM", "OGC", "NXE", "GMIN", "PRU", "OLA", "SSRM", "TXG", "DSV"],
}

# Data sources for each metric type
DATA_SOURCES = {
    "production": {
        "primary": "Quarterly MD&A / Press Releases",
        "frequency": "Quarterly",
        "location": "SEDAR+ or Company IR page",
    },
    "reserves": {
        "primary": "NI 43-101 Technical Reports",
        "frequency": "Annual (or with new studies)",
        "location": "SEDAR+",
    },
    "economics": {
        "primary": "Feasibility Studies (PEA, PFS, FS)",
        "frequency": "As published",
        "location": "SEDAR+",
    },
}

import Product from "../models/Productmodel.js";

const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const categoryMap = {
    // GPUs / Graphics cards
    gpu: ["Graphic Cards", "Cards"],
    gpus: ["Graphic Cards", "Cards"],
    "graphic card": ["Graphic Cards", "Cards"],
    "graphic cards": ["Graphic Cards", "Cards"],
    "graphics card": ["Graphic Cards", "Cards"],
    "graphics cards": ["Graphic Cards", "Cards"],
    "video card": ["Graphic Cards", "Cards"],
    "video cards": ["Graphic Cards", "Cards"],
    vga: ["Graphic Cards", "Cards"],
    rtx: ["Graphic Cards", "Cards"],
    gtx: ["Graphic Cards", "Cards"],
    radeon: ["Graphic Cards", "Cards"],

    // CPUs / Processors
    cpu: ["Processors"],
    cpus: ["Processors"],
    processor: ["Processors"],
    processors: ["Processors"],
    intel: ["Processors"],
    ryzen: ["Processors"],

    // Motherboards
    motherboard: ["Motherboards"],
    motherboards: ["Motherboards"],
    mobo: ["Motherboards"],
    mainboard: ["Motherboards"],

    // Power Supplies
    psu: ["Power Supply"],
    psus: ["Power Supply"],
    "power supply": ["Power Supply"],
    "power supplies": ["Power Supply"],

    // RAM / Memory
    ram: ["RAM"],
    memory: ["RAM"],
    ddr4: ["RAM"],
    ddr5: ["RAM"],

    // Storage / SSD
    ssd: ["SSD"],
    ssds: ["SSD"],
    storage: ["SSD"],
    hdd: ["SSD"],
    "hard drive": ["SSD"],
    nvme: ["SSD"],

    // Laptops
    laptop: ["Laptops"],
    laptops: ["Laptops"],
    "gaming laptop": ["Laptops"],
    "gaming laptops": ["Laptops"],
    "budget laptop": ["Laptops"],
    "budget laptops": ["Laptops"],
    notebook: ["Laptops"],

    // Cameras
    camera: ["Cameras"],
    cameras: ["Cameras"],
    dslr: ["Cameras"],
    mirrorless: ["Cameras"],

    // Drones
    drone: ["Drones"],
    drones: ["Drones"],

    // PC Cases
    case: ["PC Cases"],
    cases: ["PC Cases"],
    "pc case": ["PC Cases"],
    "pc cases": ["PC Cases"],

    // Keyboards
    keyboard: ["Keyboards"],
    keyboards: ["Keyboards"],

    // General Hardware
    hardware: [
        "Processors",
        "Graphic Cards",
        "Cards",
        "RAM",
        "SSD",
        "Motherboards",
        "Power Supply",
    ],
};

export const searchProducts = async ({
    search,
    category,
    brand,
    minPrice,
    maxPrice,
    page = 1,
    limit = 10,
    sort = "newest",
}) => {
    const query = {
        isActive: { $ne: false },
    };

    // Search
    if (search) {
        const trimmedSearch = search.trim();
        const safeSearch = escapeRegex(trimmedSearch);
        const lowerSearch = trimmedSearch.toLowerCase();

        const descRegex = safeSearch.length <= 3 ? `\\b${safeSearch}\\b` : safeSearch;

        const orConditions = [
            { name: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: descRegex, $options: "i" } },
            { category: { $regex: safeSearch, $options: "i" } },
            { brand: { $regex: safeSearch, $options: "i" } },
        ];

        // Check if keyword directly matches or contains a category alias (e.g. "gpus", "gpu", "rtx")
        if (categoryMap[lowerSearch]) {
            const mappedCats = categoryMap[lowerSearch];
            orConditions.push({
                category: {
                    $in: mappedCats.map(
                        (catName) => new RegExp(`^${escapeRegex(catName)}$`, "i")
                    ),
                },
            });
        }

        // If search ends with 's' (e.g. "gpus" -> "gpu", "laptops" -> "laptop")
        if (lowerSearch.endsWith("s")) {
            const singular = lowerSearch.slice(0, -1);
            if (categoryMap[singular]) {
                const mappedCats = categoryMap[singular];
                orConditions.push({
                    category: {
                        $in: mappedCats.map(
                            (catName) => new RegExp(`^${escapeRegex(catName)}$`, "i")
                        ),
                    },
                });
            }
        }

        query.$or = orConditions;
    }

    // Category
    if (category) {
        const normalizedCategory = category.toLowerCase().trim();

        if (categoryMap[normalizedCategory]) {
            const mappedCats = categoryMap[normalizedCategory];
            query.category = {
                $in: mappedCats.map(
                    (catName) => new RegExp(`^${escapeRegex(catName)}$`, "i")
                ),
            };
        } else {
            // Check singular if ends with 's'
            const singular = normalizedCategory.endsWith("s") ? normalizedCategory.slice(0, -1) : "";
            if (singular && categoryMap[singular]) {
                const mappedCats = categoryMap[singular];
                query.category = {
                    $in: mappedCats.map(
                        (catName) => new RegExp(`^${escapeRegex(catName)}$`, "i")
                    ),
                };
            } else {
                query.category = {
                    $regex: escapeRegex(category),
                    $options: "i",
                };
            }
        }
    }

    // Brand
    if (brand) {
        const brands = Array.isArray(brand)
            ? brand
            : brand.split(",").map((item) => item.trim());

        query.brand = {
            $in: brands.map(
                (item) => new RegExp(`^${escapeRegex(item)}$`, "i")
            ),
        };
    }

    // Price
    if (minPrice !== undefined) {
        query.price = {
            ...(query.price || {}),
            $gte: Number(minPrice),
        };
    }

    if (maxPrice !== undefined) {
        query.price = {
            ...(query.price || {}),
            $lte: Number(maxPrice),
        };
    }

    // Pagination
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (pageNumber - 1) * limitNumber;

    // Sorting
    const sortOptions = {
        price_asc: { price: 1 },
        price_desc: { price: -1 },
        newest: { createdAt: -1 },
        rating: { ratingAverage: -1 },
    };

    const sortOption = sortOptions[sort] || sortOptions.newest;

    const [products, totalProducts] = await Promise.all([
        Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNumber)
            .lean(),

        Product.countDocuments(query),
    ]);

    return {
        products,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            totalProducts,
            totalPages: Math.ceil(totalProducts / limitNumber),
        },
    };
};
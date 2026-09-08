import Product from "../models/Productmodel.js";

const escapeRegex = (text) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        const safeSearch = escapeRegex(search);

        query.$or = [
            { name: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: safeSearch, $options: "i" } },
            { category: { $regex: safeSearch, $options: "i" } },
            { brand: { $regex: safeSearch, $options: "i" } },
        ];
    }

    // Category
    if (category) {
        const categoryMap = {
            "gaming laptops": "Laptops",
            "budget laptops": "Laptops",
            "laptops": "Laptops",
            "laptop": "Laptops",

            "graphics cards": "GPU",
            gpu: "GPU",
            psu: "PSU",
            storage: "Storage",
            ssd: "Storage",
            hdd: "Storage",
            processors: "CPU",
            cpu: "CPU",
            ram: "RAM",
            memory: "RAM",
            motherboard: "Motherboard",
            cameras: "Cameras",
            drones: "Drones",
        };

        const normalizedCategory = category.toLowerCase().trim();

        if (categoryMap[normalizedCategory]) {
            query.category = {
                $regex: `^${escapeRegex(categoryMap[normalizedCategory])}$`,
                $options: "i",
            };
        } else {
            query.category = {
                $regex: escapeRegex(category),
                $options: "i",
            };
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
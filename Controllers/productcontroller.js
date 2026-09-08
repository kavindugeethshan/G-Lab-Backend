import mongoose from "mongoose";
import Product from "../models/Productmodel.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Create Product Function
export const createProduct = async (req, res) => {
  try {
    // Get product details from request body
    const {
      name,
      description,
      category,
      brand,
      price,
      stock,
      image,
      discount = 0,
    } = req.body;

    // Validate product name
    if (!name || typeof name !== "string") {
      return res.status(400).json({
        message: "Product name is required",
      });
    }

    // Validate product description
    if (!description || typeof description !== "string") {
      return res.status(400).json({
        message: "Product description is required",
      });
    }

    // Validate product category
    if (!category || typeof category !== "string") {
      return res.status(400).json({
        message: "Product category is required",
      });
    }

    // Validate product brand
    if (!brand || typeof brand !== "string") {
      return res.status(400).json({
        message: "Product brand is required",
      });
    }

    // Validate product price
    if (
      price === undefined ||
      price === null ||
      typeof price !== "number"
    ) {
      return res.status(400).json({
        message: "Valid product price is required",
      });
    }

    // Check whether price is negative
    if (price < 0) {
      return res.status(400).json({
        message: "Product price cannot be negative",
      });
    }

    // Validate product stock quantity
    if (
      stock === undefined ||
      stock === null ||
      typeof stock !== "number"
    ) {
      return res.status(400).json({
        message: "Valid product stock quantity is required",
      });
    }

    // Check whether stock is negative
    if (stock < 0) {
      return res.status(400).json({
        message: "Stock cannot be negative",
      });
    }

    // Validate discount
    if (
      typeof discount !== "number" ||
      discount < 0 ||
      discount > 100
    ) {
      return res.status(400).json({
        message: "Discount must be between 0 and 100",
      });
    }

    // Check for duplicate product
    const existingProduct = await Product.findOne({
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "Product already exists",
      });
    }
    // Create new product in MongoDB
    const createdProduct = await Product.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      brand: brand.trim(),
      price,
      stock,
      image,
      discount,
      isavailable: stock > 0,
    });

    // Send successful response
    res.status(201).json({
      message: "Product created successfully",
      product: createdProduct,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
//-----------------------------------------------------------------------------------------
//create many product function
export const createManyProducts = async (req, res) => {
  try {
    // Get the products array from the request body
    const products = req.body;

    // Check whether the request body is an array
    if (!Array.isArray(products)) {
      return res.status(400).json({
        message: "Request body must be an array of products",
      });
    }

    // Check whether the array is empty
    if (products.length === 0) {
      return res.status(400).json({
        message: "Product list cannot be empty",
      });
    }

    // Validate each product before inserting
    for (const product of products) {
      const {
        name,
        description,
        category,
        brand,
        price,
        stock,
      } = product;

      // Validate product name
      if (!name || typeof name !== "string") {
        return res.status(400).json({
          message: "Product name is required",
        });
      }

      // Validate product description
      if (!description || typeof description !== "string") {
        return res.status(400).json({
          message: "Product description is required",
        });
      }

      // Validate product category
      if (!category || typeof category !== "string") {
        return res.status(400).json({
          message: "Product category is required",
        });
      }

      // Validate product brand
      if (!brand || typeof brand !== "string") {
        return res.status(400).json({
          message: "Product brand is required",
        });
      }

      // Validate price
      if (
        price === undefined ||
        price === null ||
        typeof price !== "number" ||
        price < 0
      ) {
        return res.status(400).json({
          message: "Valid product price is required",
        });
      }

      // Validate stock
      if (
        stock === undefined ||
        stock === null ||
        typeof stock !== "number" ||
        stock < 0
      ) {
        return res.status(400).json({
          message: "Valid product stock quantity is required",
        });
      }
    }

    // Prepare products before inserting them into MongoDB
    const productsToCreate = products.map((product) => ({
      name: product.name.trim(),
      description: product.description.trim(),
      category: product.category.trim(),
      brand: product.brand.trim(),
      price: product.price,
      stock: product.stock,
      image: product.image,
      isavailable: product.stock > 0,
    }));

    // Check for duplicate products
    for (const product of productsToCreate) {
      const existingProduct = await Product.findOne({
        name: product.name,
        brand: product.brand,
        category: product.category,
      });

      if (existingProduct) {
        return res.status(409).json({
          message: `Product already exists: ${product.name}`,
        });
      }
    }
    // Insert all products into MongoDB
    const createdProducts = await Product.insertMany(productsToCreate);

    // Send successful response
    res.status(201).json({
      message: "Products created successfully",
      count: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    // Handle server/database errors
    res.status(500).json({
      message: error.message,
    });
  }
};

//Get all product Brand Filter + Price Filter
export const getallProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      page,
      limit,
      sort,
    } = req.query;

    // Pagination (bounded to max 1000 to prevent DoS)
    const currentPage = Math.max(Number(page) || 1, 1);
    let itemsPerPage = 10;
    if (limit === "0" || limit === "all" || limit === "1000") {
      itemsPerPage = 1000;
    } else if (Number(limit) > 0) {
      itemsPerPage = Math.min(Math.max(Number(limit), 1), 1000);
    }
    const skip = (currentPage - 1) * itemsPerPage;

    const filter = { isActive: { $ne: false } };

    // Search
    if (search && typeof search === "string") {
      const safeSearch = escapeRegex(search.trim());
      if (safeSearch.length > 0) {
        filter.$or = [
          { name: { $regex: safeSearch, $options: "i" } },
          { category: { $regex: safeSearch, $options: "i" } },
          { brand: { $regex: safeSearch, $options: "i" } },
        ];
      }
    }

    // Filter by multiple categories (with alias mapping)
    if (category) {
      const categoryMap = {
        "graphics cards": ["Graphic Cards", "Graphics Cards", "Graphic Card", "Cards", "GPU"],
        "graphic cards": ["Graphic Cards", "Graphics Cards", "Graphic Card", "Cards", "GPU"],
        "graphic card": ["Graphic Cards", "Graphics Cards", "Graphic Card", "Cards", "GPU"],
        "gpu": ["Graphic Cards", "Graphics Cards", "Graphic Card", "Cards", "GPU"],
        "power supplies": ["Power Supply", "Power Supplies", "PSU"],
        "power supply": ["Power Supply", "Power Supplies", "PSU"],
        "psu": ["Power Supply", "Power Supplies", "PSU"],
        "storage": ["SSD", "Storage", "SSDs", "SSDs & Storage", "HDD", "Hard Drive"],
        "ssd": ["SSD", "Storage", "SSDs", "SSDs & Storage", "HDD", "Hard Drive"],
        "ssds": ["SSD", "Storage", "SSDs", "SSDs & Storage", "HDD", "Hard Drive"],
        "processors": ["Processors", "Processor", "CPU"],
        "processor": ["Processors", "Processor", "CPU"],
        "cpu": ["Processors", "Processor", "CPU"],
        "ram": ["RAM", "Memory", "Memory (RAM)"],
        "memory": ["RAM", "Memory", "Memory (RAM)"],
        "motherboards": ["Motherboards", "Motherboard"],
        "motherboard": ["Motherboards", "Motherboard"],
        "cameras": ["Cameras", "Camera", "Cinematic Camera Collection", "Camera Collection"],
        "camera": ["Cameras", "Camera", "Cinematic Camera Collection", "Camera Collection"],
        "drones": ["Drones", "Drone", "Drone Zone", "Next-Gen Drone Collection"],
        "drone": ["Drones", "Drone", "Drone Zone", "Next-Gen Drone Collection"]
      };

      const categoryStr = typeof category === "string" ? category : (Array.isArray(category) ? category.join(",") : "");
      const rawItems = categoryStr
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const expandedCategories = [];
      rawItems.forEach((item) => {
        const key = item.toLowerCase();
        if (categoryMap[key]) {
          expandedCategories.push(...categoryMap[key]);
        } else {
          expandedCategories.push(item);
        }
      });

      if (expandedCategories.length > 0) {
        filter.category = {
          $in: expandedCategories.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i"))
        };
      }
    }

    // Filter by multiple brands
    if (brand) {
      const brandStr = typeof brand === "string" ? brand : (Array.isArray(brand) ? brand.join(",") : "");
      const brands = brandStr
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (brands.length > 0) {
        filter.brand = {
          $in: brands.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i")),
        };
      }
    }


    // Minimum price
    if (minPrice !== undefined) {
      const minimumPrice = Number(minPrice);

      if (Number.isNaN(minimumPrice) || minimumPrice < 0) {
        return res.status(400).json({
          message: "Invalid minimum price",
        });
      }

      filter.price = {
        ...filter.price,
        $gte: minimumPrice,
      };
    }

    // Maximum price
    if (maxPrice !== undefined) {
      const maximumPrice = Number(maxPrice);

      if (Number.isNaN(maximumPrice) || maximumPrice < 0) {
        return res.status(400).json({
          message: "Invalid maximum price",
        });
      }

      filter.price = {
        ...filter.price,
        $lte: maximumPrice,
      };
    }

    // Validate price range
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      Number(minPrice) > Number(maxPrice)
    ) {
      return res.status(400).json({
        message: "Minimum price cannot be greater than maximum price",
      });
    }

    // Total products
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    // Sorting
    let sortOption = {};

    if (sort === "price_asc") {
      sortOption.price = 1;
    } else if (sort === "price_desc") {
      sortOption.price = -1;
    } else if (sort === "newest") {
      sortOption.createdAt = -1;
    } else if (sort === "rating") {
      sortOption.ratingAverage = -1;
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(itemsPerPage);

    const productsWithDiscount = products.map((product) => {
      const productData = product.toObject();

      const discountAmount =
        (productData.price * productData.discount) / 100;

      productData.discountAmount = discountAmount;

      productData.discountedPrice =
        productData.price - discountAmount;

      // Stock status
      if (productData.stock === 0) {
        productData.stockStatus = "Out of Stock";
      } else if (productData.stock <= 5) {
        productData.stockStatus = "Low Stock";
      } else {
        productData.stockStatus = "In Stock";
      }

      return productData;
    });
    res.status(200).json({
      message: "Products retrieved successfully",
      count: products.length,
      totalProducts,
      currentPage,
      totalPages,
      products,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
//-----------------------------------------------------------------------------------------
// Get product by id function
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product retrieved successfully",
      product: product,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//-----------------------------------------------------------------------------------------
// updateProduct function
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (updateData.price !== undefined) {
      if (typeof updateData.price !== "number" || updateData.price < 0) {
        return res.status(400).json({
          message: "Product price must be a non-negative number",
        });
      }
    }

    if (updateData.stock !== undefined) {
      if (typeof updateData.stock !== "number" || updateData.stock < 0) {
        return res.status(400).json({
          message: "Product stock must be a non-negative number",
        });
      }
      updateData.isavailable = updateData.stock > 0;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// deleteProduct function
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      product: deletedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

//--------------------------------------------------------------------------------------------------
